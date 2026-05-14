"""
ML Trend Analysis & Forecasting — Phase 4.

Provides three public functions:

    compute_trend(skill, weeks)
        Fetches the last `weeks` snapshots for a skill, fits a
        LinearRegression on (week_index → relativeFreq), and returns
        slope, R², direction, and the raw data points.

    generate_forecast(skill, weeks_ahead, history_weeks)
        Extends compute_trend with projected future data points and
        ±1.5σ confidence bands.

    refresh_all_forecasts(top_n)
        Fetches the top N skills by average relativeFreq over the last
        12 weeks, generates a forecast for each, and upserts the result
        into the skill_forecasts collection.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np
from sklearn.linear_model import LinearRegression

from config import (
    FALLING_SLOPE_THRESHOLD,
    MIN_DATA_POINTS,
    RISING_SLOPE_THRESHOLD,
)
from db import get_db

logger = logging.getLogger(__name__)

# ── Public API ─────────────────────────────────────────────────────────────────


def compute_trend(skill: str, weeks: int = 12, market_scope: str = "combined") -> dict:
    """
    Fetch the last `weeks` snapshots for a skill and fit a LinearRegression.

    Args:
        skill:        Canonical (lowercase) skill name.
        weeks:        Number of most-recent weekly snapshots to use.
        market_scope: One of 'global', 'local-lk', 'combined'.

    Returns:
        {
            skill:       str,
            slope:       float,   # weekly change in relativeFreq
            r_squared:   float,   # R² of the regression (0–1)
            direction:   str,     # 'rising' | 'falling' | 'stable'
            data_points: [{ period_start: str, relative_freq: float }],
            data_points_used: int,
        }
        Returns direction='stable' with slope/r_squared=0 when fewer than
        MIN_DATA_POINTS snapshots exist.
    """
    snapshots = _fetch_snapshots(skill, weeks, market_scope)

    if len(snapshots) < MIN_DATA_POINTS:
        return {
            "skill":           skill,
            "slope":           0.0,
            "r_squared":       0.0,
            "direction":       "stable",
            "data_points":     snapshots,
            "data_points_used": len(snapshots),
        }

    x = np.arange(len(snapshots)).reshape(-1, 1)
    y = np.array([pt["relative_freq"] for pt in snapshots])

    model = LinearRegression().fit(x, y)
    slope     = float(model.coef_[0])
    r_squared = float(model.score(x, y))
    direction = _classify_direction(slope)

    return {
        "skill":            skill,
        "slope":            round(slope, 8),
        "r_squared":        round(r_squared, 6),
        "direction":        direction,
        "data_points":      snapshots,
        "data_points_used": len(snapshots),
    }


def generate_forecast(
    skill: str,
    weeks_ahead: int = 8,
    history_weeks: int = 16,
    market_scope: str = "combined",
) -> dict:
    """
    Project `weeks_ahead` future data points using a fitted LinearRegression.

    Args:
        skill:         Canonical (lowercase) skill name.
        weeks_ahead:   Number of future weekly points to project.
        history_weeks: Number of historical weekly snapshots to train on.
        market_scope:  One of 'global', 'local-lk', 'combined'.

    Returns:
        {
            skill:           str,
            model_used:      'linear',
            trend_direction: str,
            trend_slope:     float,
            r_squared:       float,
            data_points_used: int,
            historical:      [{ period_start: str, relative_freq: float }],
            forecast:        [{ period_start: str, predicted_freq: float,
                                lower_bound: float, upper_bound: float }],
        }
    """
    snapshots = _fetch_snapshots(skill, history_weeks, market_scope)
    n = len(snapshots)

    if n < MIN_DATA_POINTS:
        return {
            "skill":            skill,
            "market_scope":     market_scope,
            "model_used":       "linear",
            "trend_direction":  "stable",
            "trend_slope":      0.0,
            "r_squared":        0.0,
            "data_points_used": n,
            "historical":       snapshots,
            "forecast":         [],
        }

    x = np.arange(n).reshape(-1, 1)
    y = np.array([pt["relative_freq"] for pt in snapshots])

    model     = LinearRegression().fit(x, y)
    slope     = float(model.coef_[0])
    intercept = float(model.intercept_)
    r_squared = float(model.score(x, y))
    direction = _classify_direction(slope)

    # Residual standard deviation for confidence bands
    y_pred    = model.predict(x)
    residuals = y - y_pred
    std_resid = float(np.std(residuals)) if len(residuals) > 1 else 0.0
    half_band = 1.5 * std_resid

    # Determine the start date for the first forecast week
    last_period_str = snapshots[-1]["period_start"]
    last_period_dt  = datetime.fromisoformat(last_period_str)
    if last_period_dt.tzinfo is None:
        last_period_dt = last_period_dt.replace(tzinfo=timezone.utc)

    forecast_points = []
    for i in range(1, weeks_ahead + 1):
        x_idx          = n - 1 + i
        predicted      = intercept + slope * x_idx
        predicted      = max(predicted, 0.0)          # clamp to non-negative
        lower          = max(predicted - half_band, 0.0)
        upper          = predicted + half_band
        period_start   = last_period_dt + timedelta(weeks=i)
        forecast_points.append({
            "period_start":   period_start.strftime("%Y-%m-%d"),
            "predicted_freq": round(predicted, 8),
            "lower_bound":    round(lower, 8),
            "upper_bound":    round(upper, 8),
        })

    return {
        "skill":            skill,
        "market_scope":     market_scope,
        "model_used":       "linear",
        "trend_direction":  direction,
        "trend_slope":      round(slope, 8),
        "r_squared":        round(r_squared, 6),
        "data_points_used": n,
        "historical":       snapshots,
        "forecast":         forecast_points,
    }


def refresh_all_forecasts(top_n: int = 100, market_scope: str = "combined") -> dict:
    """
    Regenerate and upsert SkillForecast documents for the top N skills.

    Selects skills by average relativeFreq across the last 12 weeks, then
    calls generate_forecast() for each and upserts into skill_forecasts.
    Only skills with at least MIN_DATA_POINTS snapshots are included.

    Args:
        top_n:        Maximum number of skills to (re)forecast.
        market_scope: Market scope filter passed to generate_forecast.

    Returns:
        { refreshed: int, skipped: int, errors: int, skills: [str] }
    """
    db            = get_db()
    snapshots_col = db["skill_snapshots"]
    forecasts_col = db["skill_forecasts"]

    cutoff = _weeks_ago(12)

    # Aggregate the top-N skills by average relativeFreq over the last 12 weeks
    pipeline = [
        {
            "$match": {
                "marketScope": market_scope,
                "periodStart": {"$gte": cutoff},
            }
        },
        {
            "$group": {
                "_id":         "$skill",
                "avgFreq":     {"$avg": "$relativeFreq"},
                "weeksCovered": {"$sum": 1},
            }
        },
        {
            "$match": {"weeksCovered": {"$gte": MIN_DATA_POINTS}}
        },
        {"$sort": {"avgFreq": -1}},
        {"$limit": top_n},
    ]

    top_skills = list(snapshots_col.aggregate(pipeline))
    logger.info(
        "refresh_all_forecasts: %d skills qualify (scope=%s, top_n=%d)",
        len(top_skills), market_scope, top_n,
    )

    refreshed = 0
    skipped   = 0
    errors    = 0
    skill_names: list[str] = []

    for entry in top_skills:
        skill = entry["_id"]
        try:
            result = generate_forecast(skill, market_scope=market_scope)
            _upsert_forecast(forecasts_col, result, market_scope)
            refreshed += 1
            skill_names.append(skill)
        except Exception as exc:                       # noqa: BLE001
            logger.error(
                "refresh_all_forecasts: error forecasting '%s': %s", skill, exc
            )
            errors += 1

    # Count how many top-N candidates were skipped due to <MIN_DATA_POINTS
    skipped = max(0, len(top_skills) - refreshed - errors)

    logger.info(
        "refresh_all_forecasts complete: refreshed=%d skipped=%d errors=%d",
        refreshed, skipped, errors,
    )
    return {
        "refreshed": refreshed,
        "skipped":   skipped,
        "errors":    errors,
        "skills":    skill_names,
    }


# ── Private helpers ────────────────────────────────────────────────────────────


def _fetch_snapshots(skill: str, weeks: int, market_scope: str) -> list[dict]:
    """
    Return up to `weeks` weekly snapshots for a skill, sorted oldest-first.

    Each snapshot is: { period_start: str (ISO date), relative_freq: float }.
    """
    db            = get_db()
    snapshots_col = db["skill_snapshots"]

    cursor = (
        snapshots_col
        .find(
            {"skill": skill.lower(), "marketScope": market_scope},
            {"periodStart": 1, "relativeFreq": 1, "_id": 0},
        )
        .sort("periodStart", -1)
        .limit(weeks)
    )

    # Reverse so results are oldest-first (needed for regression x-axis)
    docs = list(cursor)
    docs.reverse()

    return [
        {
            "period_start": doc["periodStart"].strftime("%Y-%m-%d")
            if isinstance(doc["periodStart"], datetime)
            else str(doc["periodStart"])[:10],
            "relative_freq": round(float(doc.get("relativeFreq", 0.0)), 8),
        }
        for doc in docs
    ]


def _classify_direction(slope: float) -> str:
    if slope > RISING_SLOPE_THRESHOLD:
        return "rising"
    if slope < FALLING_SLOPE_THRESHOLD:
        return "falling"
    return "stable"


def _weeks_ago(n: int) -> datetime:
    """Return a UTC datetime `n` weeks before now."""
    return datetime.now(tz=timezone.utc) - timedelta(weeks=n)


def _upsert_forecast(forecasts_col, result: dict, market_scope: str) -> None:
    """Upsert a SkillForecast document from a generate_forecast() result."""
    now = datetime.now(tz=timezone.utc)

    forecast_points = [
        {
            "periodStart":   pt["period_start"],
            "predictedFreq": pt["predicted_freq"],
            "lowerBound":    pt["lower_bound"],
            "upperBound":    pt["upper_bound"],
        }
        for pt in result.get("forecast", [])
    ]

    forecasts_col.update_one(
        {"skill": result["skill"], "marketScope": market_scope},
        {
            "$set": {
                "skill":           result["skill"],
                "marketScope":     market_scope,
                "generatedAt":     now,
                "trendDirection":  result["trend_direction"],
                "trendSlope":      result["trend_slope"],
                "trendConfidence": result["r_squared"],
                "forecastPoints":  forecast_points,
                "dataPointsUsed":  result["data_points_used"],
                "modelUsed":       result["model_used"],
            }
        },
        upsert=True,
    )
