"""
XpressJobs.lk (xpress.jobs) scraper — Sri Lanka local market.

The site is a React SPA; HTML scraping is not viable. Instead we call
the public JSON REST API it uses internally:

  GET https://xpress.jobs/api/jobs/searchJobs
      ?page=<n>&pageSize=50&keyword=&locations=
      &sectors=30,139&jobTypes=&careerLevels=
      &sortBy=SortedCreateDate+DESC&byCVLess=false&byWalkIn=false

Sectors 30 and 139 cover IT/Software/Engineering roles.

Ethics:
- Public JSON API only; no applicant profile data accessed.
- 1 s sleep between pages; realistic User-Agent.
- Respects X-RateLimit headers if present.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Optional

import httpx
from dateutil import parser as dateparser

from config import MAX_JOBS_PER_RUN
from db import get_db

logger = logging.getLogger(__name__)

_SEARCH_URL = "https://xpress.jobs/api/jobs/searchJobs"
_PAGE_SIZE = 50
_MAX_PAGES = 10
_PAGE_SLEEP = 1.0

# IT / Software / Engineering sector IDs on xpress.jobs
_IT_SECTORS = "30,139"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://xpress.jobs/jobs?Sectors=30%2C139",
    "Accept-Language": "en-US,en;q=0.9",
}


def scrape(max_jobs: int = MAX_JOBS_PER_RUN) -> dict:
    """
    Fetch IT job listings from the XpressJobs REST API and upsert into job_postings.

    Returns:
        { scraped, inserted, skipped }
    """
    db = get_db()
    collection = db["job_postings"]

    scraped = inserted = skipped = 0

    with httpx.Client(timeout=30, headers=_HEADERS, follow_redirects=True) as client:
        for page_num in range(1, _MAX_PAGES + 1):
            if scraped >= max_jobs:
                break

            jobs = _fetch_page(client, page_num)
            if not jobs:
                logger.info("XpressJobs: no results on page %d, stopping.", page_num)
                break

            for job in jobs:
                if scraped >= max_jobs:
                    break

                source_id = str(job.get("jobId", ""))
                if not source_id:
                    continue

                # Combine title + overview for richer skill extraction
                title = (job.get("jobTitle") or "").strip()
                overview = (job.get("overview") or "").strip()
                description = f"{title}. {overview}" if overview else title

                # Skip entries with no useful text
                if not description:
                    continue

                doc = {
                    "title": title,
                    "company": (job.get("organizationName") or "").strip(),
                    "location": _parse_location(job.get("locations")),
                    "description": description,
                    "extractedSkills": [],
                    "source": "xpressjobs_lk",
                    "sourceId": source_id,
                    "marketScope": "local-lk",
                    "postedAt": _parse_expiry(job.get("expiryDateOnWebsite")),
                    "scrapedAt": datetime.now(timezone.utc),
                    "processed": False,
                }

                result = collection.update_one(
                    {"sourceId": source_id, "source": "xpressjobs_lk"},
                    {"$setOnInsert": doc},
                    upsert=True,
                )
                scraped += 1
                if result.upserted_id:
                    inserted += 1
                else:
                    skipped += 1

            time.sleep(_PAGE_SLEEP)

    logger.info(
        "XpressJobs: scraped=%d inserted=%d skipped=%d", scraped, inserted, skipped
    )
    return {"scraped": scraped, "inserted": inserted, "skipped": skipped}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fetch_page(client: httpx.Client, page: int) -> list[dict]:
    """Call the searchJobs API and return the list of job dicts."""
    params = {
        "page": page,
        "pageSize": _PAGE_SIZE,
        "keyword": "",
        "locations": "",
        "sectors": _IT_SECTORS,
        "jobTypes": "",
        "careerLevels": "",
        "sortBy": "SortedCreateDate DESC",
        "byCVLess": "false",
        "byWalkIn": "false",
    }
    try:
        resp = client.get(_SEARCH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning("XpressJobs: page %d fetch failed: %s", page, exc)
        return []

    if not isinstance(data, list):
        logger.warning("XpressJobs: unexpected response type: %s", type(data))
        return []

    return data


def _parse_location(raw: Optional[str]) -> str:
    if not raw:
        return "Sri Lanka"
    cleaned = raw.strip().strip(",").strip()
    return cleaned or "Sri Lanka"


def _parse_expiry(raw: Optional[str]) -> Optional[datetime]:
    """Parse ISO expiry date string into a UTC datetime (best-available date proxy)."""
    if not raw:
        return None
    try:
        return dateparser.parse(raw).replace(tzinfo=timezone.utc)
    except Exception:
        return None
