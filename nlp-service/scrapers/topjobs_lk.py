"""
TopJobs.lk scraper — Sri Lanka local market.

Scrapes the public IT/Tech job listings from https://www.topjobs.lk/
using httpx + BeautifulSoup4 on server-rendered HTML pages.

Page structure (confirmed via live inspection):
- Listing page: each job is an <a href="JavaScript:openSizeWindow('employer/...)"> link.
  The link text contains the job title; a <h5> inside it carries the company name.
- Detail page: accessible directly at the servlet URL without JavaScript.
  Title is in <h3>, company in <h5>, location and closing date in plain text.
  Full job description is not present in server-rendered HTML (requires JS).

Ethics:
- Public listing pages only; no applicant personal data.
- 1–1.5 s sleep between requests; realistic User-Agent.
- Maximum 10 pages per run.
"""

import hashlib
import logging
import re
import time
from datetime import datetime, timezone
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from dateutil import parser as dateparser

from config import MAX_JOBS_PER_RUN
from db import get_db

logger = logging.getLogger(__name__)

_BASE       = "https://www.topjobs.lk"
_LISTING_URL = f"{_BASE}/applicant/vacancy/searchVacancy.htm"
_MAX_PAGES  = 10
_PAGE_SLEEP = 1.5    # between listing pages
_DETAIL_SLEEP = 0.6  # between detail fetches

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

# Category names as recognised by topjobs.lk search
_IT_CATEGORIES = ["Information Technology", "Software/QA"]


def scrape(max_jobs: int = MAX_JOBS_PER_RUN) -> dict:
    """
    Scrape IT job listings from TopJobs.lk and upsert into job_postings.

    Returns:
        { scraped, inserted, skipped }
    """
    db = get_db()
    collection = db["job_postings"]

    scraped = inserted = skipped = 0

    with httpx.Client(timeout=30, headers=_HEADERS, follow_redirects=True) as client:
        for category in _IT_CATEGORIES:
            for page_num in range(1, _MAX_PAGES + 1):
                if scraped >= max_jobs:
                    break

                listings = _fetch_listing_page(client, category, page_num)
                if not listings:
                    logger.info(
                        "TopJobs.lk: no listings (cat=%s page=%d), stopping.",
                        category, page_num,
                    )
                    break

                for listing in listings:
                    if scraped >= max_jobs:
                        break

                    source_id = listing["source_id"]
                    if not source_id:
                        continue

                    detail = _fetch_job_detail(client, listing["detail_url"])

                    # Use structured detail if available; fall back to listing values
                    title    = detail.get("title")   or listing["title"]
                    company  = detail.get("company") or listing["company"]
                    location = detail.get("location") or "Sri Lanka"

                    # Combine title + any detail summary for richer skill extraction
                    summary  = detail.get("summary", "")
                    description = f"{title}. {summary}".strip(". ") if summary else title

                    if not description:
                        continue

                    doc = {
                        "title": title,
                        "company": company,
                        "location": location,
                        "description": description,
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

    logger.info(
        "TopJobs.lk: scraped=%d inserted=%d skipped=%d", scraped, inserted, skipped
    )
    return {"scraped": scraped, "inserted": inserted, "skipped": skipped}


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _fetch_listing_page(client: httpx.Client, category: str, page: int) -> list[dict]:
    """
    Fetch one listing page and return job stub dicts with:
      { title, company, source_id, detail_url }
    """
    try:
        resp = client.get(
            _LISTING_URL,
            params={"funct": "search", "category": category, "page": page},
        )
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("TopJobs.lk listing fetch failed (cat=%s p=%d): %s", category, page, exc)
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    listings = []

    # Each job entry is an <a> whose href calls openSizeWindow(servletPath, ...)
    for a_tag in soup.select('a[href*="openSizeWindow"]'):
        href = a_tag.get("href", "")
        servlet_match = re.search(r"openSizeWindow\('([^']+)'", href)
        if not servlet_match:
            continue
        servlet_path = servlet_match.group(1)  # e.g. "employer/JobAdvertismentServlet?..."

        # Job code: unique numeric ID in the servlet URL (jc=XXXXXXXXXX)
        jc_match = re.search(r"jc=(\d+)", servlet_path)
        source_id = jc_match.group(1) if jc_match else None

        # Company is inside an <h5> within the link
        company_tag = a_tag.select_one("h5")
        company = company_tag.get_text(strip=True) if company_tag else ""

        # Title = all link text minus the company substring
        raw_text = a_tag.get_text(separator=" ", strip=True)
        title = raw_text.replace(company, "").strip()

        listings.append({
            "title": title,
            "company": company,
            "source_id": source_id,
            "detail_url": f"{_BASE}/{servlet_path}",
        })

    return listings


def _fetch_job_detail(client: httpx.Client, url: str) -> dict:
    """
    Fetch the job detail popup page (server-rendered).
    Returns { title, company, location, summary, postedAt } — all optional.
    Note: full description is not available without JavaScript rendering.
    """
    time.sleep(_DETAIL_SLEEP)
    result: dict = {}

    try:
        resp = client.get(url)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.debug("TopJobs.lk detail fetch failed (%s): %s", url, exc)
        return result

    soup = BeautifulSoup(resp.text, "lxml")

    title_tag   = soup.select_one("h3")
    company_tag = soup.select_one("h5")

    if title_tag:
        result["title"] = title_tag.get_text(strip=True)
    if company_tag:
        result["company"] = company_tag.get_text(strip=True)

    # Try to extract location from visible text near known keywords
    page_text = soup.get_text(separator=" ")
    location = _extract_field(page_text, "Location")
    if location:
        result["location"] = location

    # Try to get closing / posted date
    closing = _extract_field(page_text, r"Closing Date|Posted Date")
    if closing:
        result["postedAt"] = _parse_date(closing)

    # Any plain-text summary (meta description or ld+json description)
    meta_desc = soup.select_one('meta[name="description"]')
    if meta_desc and meta_desc.get("content"):
        content = meta_desc["content"].strip()
        if len(content) > 20 and "refer" not in content.lower():
            result["summary"] = content

    return result


def _extract_field(text: str, label_pattern: str) -> Optional[str]:
    """Extract the value that follows a label in a block of plain text."""
    m = re.search(rf"(?:{label_pattern})\s*[:\-]?\s*([^\n\r]{{3,80}})", text, re.IGNORECASE)
    return m.group(1).strip() if m else None


def _parse_date(text: str) -> Optional[datetime]:
    try:
        return dateparser.parse(text, dayfirst=True).replace(tzinfo=timezone.utc)
    except Exception:
        return None
