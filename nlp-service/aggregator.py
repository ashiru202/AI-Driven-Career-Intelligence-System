"""
Skill Snapshot Aggregation — Phase 3.

Provides two public functions:

    aggregate_weekly_snapshots(target_week_start)
        Groups processed job postings for a given ISO week by skill,
        counts occurrences, computes relativeFreq, and upserts into
        skill_snapshots. Three passes: global, local-lk, combined.

    backfill_all_weeks()
        Finds the earliest scrapedAt in job_postings and calls
        aggregate_weekly_snapshots() for every week up to today.
        Used on first setup or after schema changes.
"""

import logging
from collections import Counter
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from db import get_db

logger = logging.getLogger(__name__)

_SCOPES = ["global", "local-lk", "combined"]


# ── Public API ────────────────────────────────────────────────────────────────

def aggregate_weekly_snapshots(target_week_start: Optional[date] = None) -> dict:
    """
    Aggregate skill frequencies for one ISO week and upsert into skill_snapshots.

    Args:
        target_week_start: The Monday of the target week. Defaults to the
                           Monday of the current week if None.

    Returns:
        {
            week_start: str (ISO date),
            total_jobs: int,          # combined scope total
            unique_skills_found: int, # combined scope unique skills
            by_scope: {
                "global":   { total_jobs, unique_skills },
                "local-lk": { total_jobs, unique_skills },
                "combined": { total_jobs, unique_skills },
            }
        }
    """
    monday = _to_monday(target_week_start or date.today())
    period_start = datetime(monday.year, monday.month, monday.day, tzinfo=timezone.utc)
    period_end   = period_start + timedelta(days=7) - timedelta(seconds=1)

    db = get_db()
    jobs_col      = db["job_postings"]
    snapshots_col = db["skill_snapshots"]

    by_scope: dict = {}

    for scope in _SCOPES:
        query = {
            "processed": True,
            "scrapedAt": {"$gte": period_start, "$lte": period_end},
        }
        if scope != "combined":
            query["marketScope"] = scope

        jobs = list(jobs_col.find(query, {"extractedSkills": 1, "source": 1}))
        total_jobs = len(jobs)

        if total_jobs == 0:
            by_scope[scope] = {"total_jobs": 0, "unique_skills": 0}
            logger.info(
                "Aggregation: scope=%s week=%s — no jobs, skipping.", scope, monday
            )
            continue

        skill_counter: Counter = Counter()
        sources_seen: set = set()

        for job in jobs:
            for skill in job.get("extractedSkills", []):
                if skill:
                    skill_counter[skill.lower()] += 1
            sources_seen.add(job.get("source", "unknown"))

        for skill, count in skill_counter.items():
            relative_freq = round(count / total_jobs, 6)
            snapshots_col.update_one(
                {
                    "skill":       skill,
                    "periodStart": period_start,
                    "marketScope": scope,
                },
                {
                    "$set": {
                        "skill":        skill,
                        "periodStart":  period_start,
                        "periodEnd":    period_end,
                        "count":        count,
                        "totalJobs":    total_jobs,
                        "relativeFreq": relative_freq,
                        "marketScope":  scope,
                        "sources":      sorted(sources_seen),
                    }
                },
                upsert=True,
            )

        by_scope[scope] = {
            "total_jobs":    total_jobs,
            "unique_skills": len(skill_counter),
        }
        logger.info(
            "Aggregation: scope=%s week=%s jobs=%d skills=%d",
            scope, monday, total_jobs, len(skill_counter),
        )

    combined = by_scope.get("combined", {})
    result = {
        "week_start":          monday.isoformat(),
        "total_jobs":          combined.get("total_jobs", 0),
        "unique_skills_found": combined.get("unique_skills", 0),
        "by_scope":            by_scope,
    }
    return result


def backfill_all_weeks() -> list:
    """
    Find the earliest scrapedAt in job_postings and call
    aggregate_weekly_snapshots() for every week from then until today.

    Returns a list of per-week aggregation result dicts.
    """
    db = get_db()
    jobs_col = db["job_postings"]

    earliest = jobs_col.find_one(
        {"processed": True}, sort=[("scrapedAt", 1)], projection={"scrapedAt": 1}
    )
    if not earliest:
        logger.info("Backfill: no processed jobs found, nothing to backfill.")
        return []

    start_monday = _to_monday(earliest["scrapedAt"].date())
    today_monday = _to_monday(date.today())

    results = []
    current = start_monday
    while current <= today_monday:
        logger.info("Backfill: aggregating week %s", current)
        result = aggregate_weekly_snapshots(target_week_start=current)
        results.append(result)
        current += timedelta(weeks=1)

    logger.info("Backfill complete: %d weeks processed.", len(results))
    return results


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_monday(d: date) -> date:
    """Return the Monday of the ISO week containing `d`."""
    return d - timedelta(days=d.weekday())
