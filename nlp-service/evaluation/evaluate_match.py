"""
Task 9.3 — Match Score Evaluation Script

Computes Mean Absolute Error (MAE) between the system's matchScore and
human annotator ratings, showing whether the scoring algorithm aligns
with human judgement.

Usage:
    python evaluate_match.py [labels_path]

    labels_path: path to match_labels.json
                 (defaults to ./match_labels.json)

Label format (match_labels.json):
    Each entry must contain:
      - comparisonId    : str   — MongoDB Comparison document ID
      - systemMatchScore: int   — score produced by the platform (0–100)
      - humanRating     : int   — annotator's numeric score (0–100)
      - humanRatingBand : str   — "poor" | "fair" | "strong"
      - annotator       : str   — annotator identifier (for IAA computation)

Output:
    - Overall MAE, RMSE, mean/std of errors
    - Per-rating-band breakdown
    - Per-annotator breakdown (useful for inter-annotator agreement)
    - Cases where system and human disagree most (|error| > 20 points)
"""

from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

# ── Metric helpers ────────────────────────────────────────────────────────────


def _mae(errors: list[float]) -> float:
    return sum(abs(e) for e in errors) / len(errors) if errors else 0.0


def _rmse(errors: list[float]) -> float:
    return math.sqrt(sum(e**2 for e in errors) / len(errors)) if errors else 0.0


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = _mean(values)
    return math.sqrt(sum((v - m) ** 2 for v in values) / (len(values) - 1))


# ── Cohen's Kappa (band-level agreement between two annotators) ───────────────


def _cohens_kappa(labels_a: list[str], labels_b: list[str]) -> float | None:
    """
    Compute Cohen's Kappa for two lists of categorical labels.
    Returns None if fewer than 2 shared items.
    """
    if len(labels_a) != len(labels_b) or len(labels_a) < 2:
        return None

    categories = sorted(set(labels_a) | set(labels_b))
    n = len(labels_a)
    cat_idx = {c: i for i, c in enumerate(categories)}
    k = len(categories)

    # Build confusion matrix
    matrix = [[0] * k for _ in range(k)]
    for a, b in zip(labels_a, labels_b):
        matrix[cat_idx[a]][cat_idx[b]] += 1

    # Observed agreement
    po = sum(matrix[i][i] for i in range(k)) / n

    # Expected agreement
    row_sums = [sum(matrix[i]) for i in range(k)]
    col_sums = [sum(matrix[i][j] for i in range(k)) for j in range(k)]
    pe = sum(r * c for r, c in zip(row_sums, col_sums)) / (n**2)

    if pe == 1.0:
        return 1.0
    return round((po - pe) / (1 - pe), 4)


# ── Main evaluation function ──────────────────────────────────────────────────


def evaluate_match(labels_path: str) -> dict[str, Any]:
    """
    Loads match_labels.json, computes MAE, RMSE, and per-band statistics
    between the system's matchScore and human ratings.

    Returns:
        {
            "n":               int,
            "mae":             float,
            "rmse":            float,
            "mean_error":      float,   # signed mean (positive = system over-estimates)
            "std_error":       float,
            "per_band":        { "poor"|"fair"|"strong": { n, mae, rmse } },
            "per_annotator":   { "<name>": { n, mae } },
            "cohens_kappa":    float | None,   # only if exactly 2 annotators
            "large_discrepancies": list[dict], # |error| > 20
        }
    """
    path = Path(labels_path)
    if not path.exists():
        raise FileNotFoundError(f"Labels file not found: {path}")

    with open(path, encoding="utf-8") as fh:
        labels = json.load(fh)

    if not labels:
        raise ValueError("Labels file is empty — add at least one annotated entry.")

    signed_errors: list[float] = []
    by_band: dict[str, list[float]] = defaultdict(list)
    by_annotator: dict[str, list[float]] = defaultdict(list)
    large_discrepancies: list[dict] = []

    # For Cohen's Kappa: collect band assignments per comparison per annotator
    # (only useful when the same comparison is rated by ≥2 annotators)
    annotator_bands: dict[str, dict[str, str]] = defaultdict(dict)  # annotator → {compId: band}

    for entry in labels:
        system_score = entry.get("systemMatchScore", 0)
        human_score = entry.get("humanRating", 0)
        band = entry.get("humanRatingBand", "unknown")
        annotator = entry.get("annotator", "unknown")
        comp_id = entry.get("comparisonId", "unknown")

        error = system_score - human_score  # signed: positive = system overestimates
        signed_errors.append(error)
        by_band[band].append(error)
        by_annotator[annotator].append(error)
        annotator_bands[annotator][comp_id] = band

        if abs(error) > 20:
            large_discrepancies.append({
                "comparisonId": comp_id,
                "systemMatchScore": system_score,
                "humanRating": human_score,
                "error": error,
                "band": band,
                "annotator": annotator,
                "notes": entry.get("notes", ""),
            })

    per_band = {
        band: {
            "n": len(errs),
            "mae": round(_mae(errs), 2),
            "rmse": round(_rmse(errs), 2),
        }
        for band, errs in by_band.items()
    }

    per_annotator = {
        ann: {
            "n": len(errs),
            "mae": round(_mae(errs), 2),
        }
        for ann, errs in by_annotator.items()
    }

    # Cohen's Kappa — only meaningful when 2 annotators rated the same comparisons
    kappa: float | None = None
    annotator_names = list(annotator_bands.keys())
    if len(annotator_names) == 2:
        a_name, b_name = annotator_names
        shared_ids = sorted(
            set(annotator_bands[a_name]) & set(annotator_bands[b_name])
        )
        if len(shared_ids) >= 2:
            labels_a = [annotator_bands[a_name][c] for c in shared_ids]
            labels_b = [annotator_bands[b_name][c] for c in shared_ids]
            kappa = _cohens_kappa(labels_a, labels_b)

    return {
        "n": len(labels),
        "mae": round(_mae(signed_errors), 2),
        "rmse": round(_rmse(signed_errors), 2),
        "mean_error": round(_mean(signed_errors), 2),
        "std_error": round(_std(signed_errors), 2),
        "per_band": per_band,
        "per_annotator": per_annotator,
        "cohens_kappa": kappa,
        "large_discrepancies": large_discrepancies,
    }


# ── CLI entry point ────────────────────────────────────────────────────────────


def _print_report(result: dict[str, Any]) -> None:
    sep = "─" * 62

    print(f"\n{'MATCH SCORE EVALUATION':^62}")
    print(sep)
    print(f"  Dataset size : {result['n']} labelled comparisons")
    print(f"  MAE          : {result['mae']:.1f} points")
    print(f"  RMSE         : {result['rmse']:.1f} points")
    print(
        f"  Mean error   : {result['mean_error']:+.1f} points "
        f"({'system over-estimates' if result['mean_error'] > 0 else 'system under-estimates'})"
    )
    print(f"  Std of error : {result['std_error']:.1f} points")

    if result["cohens_kappa"] is not None:
        print(f"  Cohen's Kappa: {result['cohens_kappa']:.3f}  (inter-annotator agreement)")

    print()
    print("  Per rating-band breakdown:")
    for band in ("poor", "fair", "strong"):
        if band in result["per_band"]:
            s = result["per_band"][band]
            print(
                f"    {band:<8}  n={s['n']:>3}  MAE={s['mae']:>5.1f}  RMSE={s['rmse']:>5.1f}"
            )

    print()
    print("  Per annotator:")
    for ann, stats in result["per_annotator"].items():
        print(f"    {ann:<20}  n={stats['n']:>3}  MAE={stats['mae']:>5.1f}")

    if result["large_discrepancies"]:
        print()
        print(f"  Large discrepancies (|error| > 20) — {len(result['large_discrepancies'])}:")
        for d in result["large_discrepancies"]:
            print(
                f"    {d['comparisonId']}  system={d['systemMatchScore']}  "
                f"human={d['humanRating']}  error={d['error']:+d}  [{d['band']}]"
            )
            if d["notes"]:
                print(f"      note: {d['notes']}")

    print(sep)
    print()


if __name__ == "__main__":
    default_path = Path(__file__).parent / "match_labels.json"
    labels_path = sys.argv[1] if len(sys.argv) > 1 else str(default_path)

    result = evaluate_match(labels_path)
    _print_report(result)
