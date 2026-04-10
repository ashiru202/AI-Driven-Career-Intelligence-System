"""
Remotive job scraper — global / remote market.

Uses the free, no-auth Remotive API:
  https://remotive.com/api/remote-jobs?category=<category>

No API key required. Good tech coverage; updated frequently.
"""

import logging
import time
from datetime import datetime, timezone

import httpx

from config import MAX_JOBS_PER_RUN
from db import get_db

logger = logging.getLogger(__name__)

_BASE_URL = "https://remotive.com/api/remote-jobs"
_CATEGORIES = ["software-dev", "devops-sysadmin", "data", "product", "design"]
_REQUEST_SLEEP = 1.0  # polite delay between category requests


def scrape(max_jobs: int = MAX_JOBS_PER_RUN) -> dict:
    """
    Fetch jobs from Remotive API and upsert into job_postings collection.

    Returns:
        { scraped, inserted, skipped }
    """
    db = get_db()
    collection = db["job_postings"]

    scraped = inserted = skipped = 0

    with httpx.Client(timeout=30, headers={"User-Agent": "CareerIntelligenceBot/1.0"}) as client:
        for category in _CATEGORIES:
            if scraped >= max_jobs:
                break

            try:
                resp = client.get(_BASE_URL, params={"category": category})
                resp.raise_for_status()
                data = resp.json()
            except (httpx.HTTPError, ValueError) as exc:
                logger.error("Remotive request failed (cat %s): %s", category, exc)
                time.sleep(_REQUEST_SLEEP)
                continue

            jobs = data.get("jobs", [])
            for job in jobs:
                if scraped >= max_jobs:
                    break

                source_id = str(job.get("id", ""))
                if not source_id:
                    continue

                description = job.get("description") or job.get("job_description") or ""
                # Strip HTML tags from Remotive descriptions
                description = _strip_html(description)

                if not description:
                    continue

                doc = {
                    "title": job.get("title", ""),
                    "company": job.get("company_name", ""),
                    "location": job.get("candidate_required_location", "Remote"),
                    "description": description,
                    "extractedSkills": [],
                    "source": "remotive",
                    "sourceId": source_id,
                    "marketScope": "global",
                    "postedAt": _parse_date(job.get("publication_date")),
                    "scrapedAt": datetime.now(timezone.utc),
                    "processed": False,
                }

                result = collection.update_one(
                    {"sourceId": source_id, "source": "remotive"},
                    {"$setOnInsert": doc},
                    upsert=True,
                )
                scraped += 1
                if result.upserted_id:
                    inserted += 1
                else:
                    skipped += 1

            time.sleep(_REQUEST_SLEEP)

    logger.info("Remotive: scraped=%d inserted=%d skipped=%d", scraped, inserted, skipped)
    return {"scraped": scraped, "inserted": inserted, "skipped": skipped}


def _strip_html(text: str) -> str:
    import re
    return re.sub(r"<[^>]+>", " ", text).strip()


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None
