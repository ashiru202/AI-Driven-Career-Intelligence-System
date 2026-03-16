"""
XpressJobs.lk scraper — Sri Lanka local market.

Scrapes the public IT/Software/Engineering job listings from
https://www.xpressjobs.lk/ using httpx + BeautifulSoup4.

Ethics:
- Public listing pages only; no applicant profile data.
- 1–2 s sleep between requests; realistic User-Agent.
- Maximum 10 pages per run.
"""

import hashlib
import logging
import time
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup

from config import MAX_JOBS_PER_RUN
from db import get_db

logger = logging.getLogger(__name__)

_BASE_URL = "https://www.xpressjobs.lk/job-list/"
_MAX_PAGES = 10
_PAGE_SLEEP = 1.5

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; CareerIntelligenceBot/1.0; "
        "+https://github.com/your-org/ai-career-intelligence)"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

_IT_SLUGS = ["information-technology", "software-qa", "engineering"]


def scrape(max_jobs: int = MAX_JOBS_PER_RUN) -> dict:
    """
    Scrape IT job listings from XpressJobs.lk and upsert into job_postings.

    Returns:
        { scraped, inserted, skipped }
    """
    db = get_db()
    collection = db["job_postings"]

    scraped = inserted = skipped = 0

    with httpx.Client(
        timeout=30,
        headers=_HEADERS,
        follow_redirects=True,
    ) as client:
        for category_slug in _IT_SLUGS:
            for page_num in range(1, _MAX_PAGES + 1):
                if scraped >= max_jobs:
                    break

                listings = _fetch_listing_page(client, category_slug, page_num)
                if not listings:
                    logger.info(
                        "XpressJobs.lk: no listings (cat=%s page=%d), stopping.",
                        category_slug, page_num,
                    )
                    break

                for listing in listings:
                    if scraped >= max_jobs:
                        break

                    detail = _fetch_job_detail(client, listing)
                    if not detail or not detail.get("description"):
                        continue

                    source_id = _make_source_id(
                        detail["title"], detail["company"], detail.get("posted_raw", "")
                    )

                    doc = {
                        "title": detail["title"],
                        "company": detail["company"],
                        "location": detail.get("location", "Sri Lanka"),
                        "description": detail["description"],
                        "extractedSkills": [],
                        "source": "xpressjobs_lk",
                        "sourceId": source_id,
                        "marketScope": "local-lk",
                        "postedAt": detail.get("postedAt"),
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

    logger.info("XpressJobs.lk: scraped=%d inserted=%d skipped=%d", scraped, inserted, skipped)
    return {"scraped": scraped, "inserted": inserted, "skipped": skipped}


def _fetch_listing_page(client: httpx.Client, category: str, page: int) -> list[dict]:
    """Fetch a category listing page and return job stub dicts."""
    url = f"{_BASE_URL}{category}/page/{page}/"
    try:
        resp = client.get(url)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("XpressJobs.lk listing failed (%s p%d): %s", category, page, exc)
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    listings = []

    # XpressJobs uses WordPress-based job board layouts (WP Job Manager / similar).
    for article in soup.select("li.job_listing, article.job_listing, div.job-listing"):
        title_tag = article.select_one("h3 a, h2 a, .job-title a, a.position")
        if not title_tag:
            continue
        company_tag = article.select_one(
            ".company strong, .company-name, span.company, .job_listing-company"
        )
        listings.append(
            {
                "title": title_tag.get_text(strip=True),
                "company": company_tag.get_text(strip=True) if company_tag else "",
                "detail_url": title_tag.get("href", ""),
            }
        )

    return listings


def _fetch_job_detail(client: httpx.Client, listing: dict) -> Optional[dict]:
    """Fetch a job detail page and extract full description."""
    url = listing.get("detail_url", "")
    if not url:
        return None

    time.sleep(0.5)

    try:
        resp = client.get(url)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("XpressJobs.lk detail failed (%s): %s", url, exc)
        return None

    soup = BeautifulSoup(resp.text, "lxml")

    desc_tag = soup.select_one(
        "div.job_description, div.job-description, section.job-description, div#job-description"
    )
    desc = desc_tag.get_text(separator=" ", strip=True) if desc_tag else ""

    location_tag = soup.select_one(
        "li.location span, span.location, .job-location, dd.location"
    )
    location = location_tag.get_text(strip=True) if location_tag else "Sri Lanka"

    posted_tag = soup.select_one(
        "li.date-posted span, time.entry-date, span.date, .posted-date"
    )
    posted_raw = posted_tag.get_text(strip=True) if posted_tag else ""
    posted_at = _parse_date_lk(posted_raw)

    return {
        "title": listing["title"],
        "company": listing["company"],
        "location": location,
        "description": desc,
        "posted_raw": posted_raw,
        "postedAt": posted_at,
    }


def _make_source_id(title: str, company: str, posted_raw: str) -> str:
    raw = f"{title.lower().strip()}|{company.lower().strip()}|{posted_raw}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def _parse_date_lk(text: str) -> Optional[datetime]:
    from dateutil import parser as dateparser
    try:
        return dateparser.parse(text, dayfirst=True).replace(tzinfo=timezone.utc)
    except Exception:
        return None
