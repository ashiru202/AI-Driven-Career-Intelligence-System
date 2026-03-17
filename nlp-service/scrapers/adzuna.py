"""
Adzuna job scraper — global market.

Uses the free Adzuna Jobs Search API:
  https://api.adzuna.com/v1/api/jobs/us/search/{page}

Sign up for credentials at: https://developer.adzuna.com/
Free tier: 500 calls / month (50 results/page → up to 25,000 listings/month).
"""

import logging
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from config import ADZUNA_APP_ID, ADZUNA_APP_KEY, MAX_JOBS_PER_RUN
from db import get_db

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.adzuna.com/v1/api/jobs/us/search/{page}"
_CATEGORIES = ["it-jobs", "engineering-jobs"]
_RESULTS_PER_PAGE = 50
_PAGE_SLEEP = 0.5  # seconds between pagination requests


def scrape(max_jobs: int = MAX_JOBS_PER_RUN) -> dict:
    """
    Fetch job postings from Adzuna and upsert into job_postings collection.

    Returns:
        { scraped, inserted, skipped }
    """
    if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
        logger.warning("Adzuna credentials not set — skipping Adzuna scrape.")
        return {"scraped": 0, "inserted": 0, "skipped": 0}

    db = get_db()
    collection = db["job_postings"]

    scraped = inserted = skipped = 0

    with httpx.Client(timeout=30, headers={"User-Agent": "CareerIntelligenceBot/1.0"}) as client:
        for category in _CATEGORIES:
            page = 1
            while scraped < max_jobs:
                url = _BASE_URL.format(page=page)
                params = {
                    "app_id": ADZUNA_APP_ID,
                    "app_key": ADZUNA_APP_KEY,
                    "results_per_page": _RESULTS_PER_PAGE,
                    "category": category,
                    "content-type": "application/json",
                }

                try:
                    resp = client.get(url, params=params)
                    resp.raise_for_status()
                    data = resp.json()
                except (httpx.HTTPError, ValueError) as exc:
                    logger.error("Adzuna request failed (page %d, cat %s): %s", page, category, exc)
                    break

                results: list[dict[str, Any]] = data.get("results", [])
                if not results:
                    break  # no more pages

                for job in results:
                    if scraped >= max_jobs:
                        break

                    source_id = str(job.get("id", ""))
                    if not source_id:
                        continue

                    doc = {
                        "title": job.get("title", ""),
                        "company": (job.get("company") or {}).get("display_name", ""),
                        "location": (job.get("location") or {}).get("display_name", ""),
                        "description": job.get("description", ""),
                        "extractedSkills": [],
                        "source": "adzuna",
                        "sourceId": source_id,
                        "marketScope": "global",
                        "postedAt": _parse_date(job.get("created")),
                        "scrapedAt": datetime.now(timezone.utc),
                        "processed": False,
                    }

                    if not doc["description"]:
                        continue

                    result = collection.update_one(
                        {"sourceId": source_id, "source": "adzuna"},
                        {"$setOnInsert": doc},
                        upsert=True,
                    )
                    scraped += 1
                    if result.upserted_id:
                        inserted += 1
                    else:
                        skipped += 1

                page += 1
                time.sleep(_PAGE_SLEEP)

    logger.info("Adzuna: scraped=%d inserted=%d skipped=%d", scraped, inserted, skipped)
    return {"scraped": scraped, "inserted": inserted, "skipped": skipped}


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
