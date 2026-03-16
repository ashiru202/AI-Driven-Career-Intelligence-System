"""
TopJobs.lk scraper — Sri Lanka local market.

Scrapes the public IT/Tech job listings from https://www.topjobs.lk/
using httpx + BeautifulSoup4 HTML parsing. No public API exists.

Ethics:
- Respects robots.txt guidance (public listing pages only).
- Adds 1–2 s sleep between page requests.
- Stores only job description text, no applicant personal data.
- Realistic User-Agent header identifying the application.
- Limits to 10 pages per run.
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

_BASE_URL = "https://www.topjobs.lk/applicant/vacancy/searchVacancy.htm"
_LIST_URL = "https://www.topjobs.lk/applicant/vacancy/SearchVacancyListUser.htm"
_DETAIL_URL = "https://www.topjobs.lk/applicant/vacancy/ViewJobVacancyDetail.htm"
_MAX_PAGES = 10
_PAGE_SLEEP = 1.5  # seconds between requests

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; CareerIntelligenceBot/1.0; "
        "+https://github.com/your-org/ai-career-intelligence)"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
_IT_CATEGORIES = ["Information Technology", "Software/QA", "Engineering"]


def scrape(max_jobs: int = MAX_JOBS_PER_RUN) -> dict:
    """
    Scrape IT job listings from TopJobs.lk and upsert into job_postings.

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
        for page_num in range(1, _MAX_PAGES + 1):
            if scraped >= max_jobs:
                break

            listings = _fetch_listing_page(client, page_num)
            if not listings:
                logger.info("TopJobs.lk: no listings on page %d, stopping.", page_num)
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
                    "source": "topjobs_lk",
                    "sourceId": source_id,
                    "marketScope": "local-lk",
                    "postedAt": detail.get("postedAt"),
                    "scrapedAt": datetime.now(timezone.utc),
                    "processed": False,
                }

                result = collection.update_one(
                    {"sourceId": source_id, "source": "topjobs_lk"},
                    {"$setOnInsert": doc},
                    upsert=True,
                )
                scraped += 1
                if result.upserted_id:
                    inserted += 1
                else:
                    skipped += 1

            time.sleep(_PAGE_SLEEP)

    logger.info("TopJobs.lk: scraped=%d inserted=%d skipped=%d", scraped, inserted, skipped)
    return {"scraped": scraped, "inserted": inserted, "skipped": skipped}


def _fetch_listing_page(client: httpx.Client, page: int) -> list[dict]:
    """Fetch a listing page and return a list of {title, company, detail_url} dicts."""
    try:
        resp = client.get(
            _BASE_URL,
            params={
                "funct": "search",
                "category": "Information Technology",
                "page": page,
            },
        )
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("TopJobs.lk listing page %d failed: %s", page, exc)
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    listings = []

    # TopJobs renders each vacancy as a table row or div; adapt selectors to
    # the actual site structure. These are common patterns across their layout.
    for row in soup.select("table.vacancyTable tr, div.vacancy-item, li.job-item"):
        title_tag = row.select_one("a.vacancyTitle, a.job-title, a[href*='ViewJobVacancyDetail']")
        if not title_tag:
            continue
        company_tag = row.select_one("span.companyName, span.company, td.company")
        listings.append(
            {
                "title": title_tag.get_text(strip=True),
                "company": company_tag.get_text(strip=True) if company_tag else "",
                "detail_url": _absolute(title_tag.get("href", "")),
            }
        )

    return listings


def _fetch_job_detail(client: httpx.Client, listing: dict) -> Optional[dict]:
    """Fetch a job detail page and extract description."""
    url = listing.get("detail_url", "")
    if not url:
        return None

    time.sleep(0.5)

    try:
        resp = client.get(url)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("TopJobs.lk detail fetch failed (%s): %s", url, exc)
        return None

    soup = BeautifulSoup(resp.text, "lxml")

    description_tag = soup.select_one(
        "div.jobDescription, div.vacancy-description, div#jobDescription, td.jobDescription"
    )
    desc = description_tag.get_text(separator=" ", strip=True) if description_tag else ""

    location_tag = soup.select_one("span.location, td.location, span.district")
    location = location_tag.get_text(strip=True) if location_tag else "Sri Lanka"

    posted_tag = soup.select_one("span.postedDate, td.postedDate, span.date-posted")
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


def _absolute(href: str) -> str:
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return "https://www.topjobs.lk" + href
    return "https://www.topjobs.lk/" + href


def _make_source_id(title: str, company: str, posted_raw: str) -> str:
    raw = f"{title.lower().strip()}|{company.lower().strip()}|{posted_raw}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def _parse_date_lk(text: str) -> Optional[datetime]:
    from dateutil import parser as dateparser
    try:
        return dateparser.parse(text, dayfirst=True).replace(tzinfo=timezone.utc)
    except Exception:
        return None
