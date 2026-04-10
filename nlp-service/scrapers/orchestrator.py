"""
Scrape orchestrator — runs all enabled scrapers in sequence and aggregates results.
"""

import logging

from config import (
    ADZUNA_APP_ID,
    REMOTIVE_ENABLED,
    TOPJOBS_ENABLED,
    XPRESSJOBS_ENABLED,
    ITPRO_ENABLED,
    MAX_JOBS_PER_RUN,
)

logger = logging.getLogger(__name__)


def run_scrape(max_jobs: int = MAX_JOBS_PER_RUN) -> dict:
    """
    Run all enabled scrapers (Adzuna, Remotive, TopJobs.lk, XpressJobs.lk, ITPro.lk),
    inserting results into the job_postings collection via upsert.

    Returns:
        {
            scraped:   int,
            inserted:  int,
            skipped:   int,
            by_source: { source_name: { scraped, inserted, skipped } }
        }
    """
    totals = {"scraped": 0, "inserted": 0, "skipped": 0, "by_source": {}}

    # ── Adzuna ────────────────────────────────────────────────────────────────
    if ADZUNA_APP_ID:
        from scrapers import adzuna
        logger.info("Running Adzuna scraper…")
        result = adzuna.scrape(max_jobs=max_jobs)
        _merge(totals, "adzuna", result)
    else:
        logger.info("Adzuna skipped (no credentials).")

    # ── Remotive ──────────────────────────────────────────────────────────────
    if REMOTIVE_ENABLED:
        from scrapers import remotive
        logger.info("Running Remotive scraper…")
        result = remotive.scrape(max_jobs=max_jobs)
        _merge(totals, "remotive", result)

    # ── TopJobs.lk ───────────────────────────────────────────────────────────
    if TOPJOBS_ENABLED:
        from scrapers import topjobs_lk
        logger.info("Running TopJobs.lk scraper…")
        result = topjobs_lk.scrape(max_jobs=max_jobs)
        _merge(totals, "topjobs_lk", result)

    # ── XpressJobs.lk ────────────────────────────────────────────────────────
    if XPRESSJOBS_ENABLED:
        from scrapers import xpressjobs_lk
        logger.info("Running XpressJobs.lk scraper…")
        result = xpressjobs_lk.scrape(max_jobs=max_jobs)
        _merge(totals, "xpressjobs_lk", result)

    # ── ITPro.lk ──────────────────────────────────────────────────────────────
    if ITPRO_ENABLED:
        from scrapers import itpro_lk
        logger.info("Running ITPro.lk scraper…")
        result = itpro_lk.scrape(max_jobs=max_jobs)
        _merge(totals, "itpro_lk", result)

    logger.info(
        "Scrape complete — scraped=%d inserted=%d skipped=%d",
        totals["scraped"], totals["inserted"], totals["skipped"],
    )
    return totals


def _merge(totals: dict, source: str, result: dict) -> None:
    """Accumulate per-source result into totals."""
    totals["scraped"]  += result.get("scraped", 0)
    totals["inserted"] += result.get("inserted", 0)
    totals["skipped"]  += result.get("skipped", 0)
    totals["by_source"][source] = result
