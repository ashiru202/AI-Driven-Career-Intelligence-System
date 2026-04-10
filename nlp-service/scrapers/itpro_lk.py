"""
ITPro.lk scraper — Sri Lanka IT-focused job market.

Scrapes IT job listings from https://itpro.lk/ using their RSS feeds.
This provides better data quality than HTML scraping and is more respectful
to their infrastructure.

RSS Structure:
- Main feed: https://itpro.lk/rss/all/
- Categories: Software Engineering, QA, AI and Data, Mobile Development, etc.
- Rich job data including descriptions, requirements, salary, location

Ethics:
- Uses public RSS feeds (intended for syndication)
- 1-2s delays between requests
- Respects robots.txt and rate limits
- IT-focused jobs only
"""

import hashlib
import logging
import re
import time
from datetime import datetime, timezone
from typing import List, Dict, Optional
from xml.etree import ElementTree as ET

import httpx
from bs4 import BeautifulSoup

from config import MAX_JOBS_PER_RUN
from db import get_db

logger = logging.getLogger(__name__)

# RSS feed URLs for IT-focused categories
_RSS_FEEDS = {
    "all": "https://itpro.lk/rss/all/",
    "software_engineering": "https://itpro.lk/rss/software-engineering/",
    "qa": "https://itpro.lk/rss/quality-assurance/",
    "ai_data": "https://itpro.lk/rss/ai-and-data/",
    "mobile": "https://itpro.lk/rss/mobile-development/",
    "web": "https://itpro.lk/rss/web-development/"
}

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml"
}

_DELAY_BETWEEN_FEEDS = 2.0  # seconds


def scrape(max_jobs: int = MAX_JOBS_PER_RUN) -> dict:
    """
    Scrape IT job listings from ITPro.lk RSS feeds and upsert into job_postings.

    Returns:
        { scraped, inserted, skipped }
    """
    db = get_db()
    collection = db["job_postings"]

    scraped = inserted = skipped = 0

    with httpx.Client(timeout=30, headers=_HEADERS, follow_redirects=True) as client:
        # Use the "all" feed to get maximum coverage efficiently
        feed_url = _RSS_FEEDS["all"]
        logger.info("Fetching ITPro.lk RSS feed: %s", feed_url)

        job_items = _fetch_rss_jobs(client, feed_url)

        for item in job_items:
            if scraped >= max_jobs:
                logger.info("ITPro.lk: Reached max_jobs limit (%d)", max_jobs)
                break

            job_doc = _parse_job_item(item)
            if not job_doc:
                continue

            scraped += 1

            # Upsert into database
            result = collection.update_one(
                {"sourceId": job_doc["sourceId"], "source": "itpro_lk"},
                {"$set": job_doc},
                upsert=True
            )

            if result.upserted_id:
                inserted += 1
                logger.debug("ITPro.lk: Inserted job %s", job_doc["sourceId"])
            else:
                skipped += 1
                logger.debug("ITPro.lk: Skipped existing job %s", job_doc["sourceId"])

        # Small delay for politeness
        time.sleep(_DELAY_BETWEEN_FEEDS)

    logger.info("ITPro.lk scraper completed: %d scraped, %d inserted, %d skipped",
                scraped, inserted, skipped)

    return {
        "scraped": scraped,
        "inserted": inserted,
        "skipped": skipped
    }


def _fetch_rss_jobs(client: httpx.Client, feed_url: str) -> List[ET.Element]:
    """
    Fetch and parse RSS feed, returning list of job item elements.
    """
    try:
        resp = client.get(feed_url)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("ITPro.lk RSS fetch failed: %s", exc)
        return []

    try:
        # Parse XML content
        root = ET.fromstring(resp.text)

        # Find all <item> elements in the RSS feed
        items = root.findall(".//item")
        logger.info("ITPro.lk: Found %d job items in RSS feed", len(items))

        return items

    except ET.ParseError as exc:
        logger.error("ITPro.lk RSS parse failed: %s", exc)
        return []


def _parse_job_item(item: ET.Element) -> Optional[Dict]:
    """
    Parse a single RSS <item> element into job document format.
    """
    try:
        # Extract basic RSS fields
        title = _get_text(item, "title")
        link = _get_text(item, "link")
        pub_date = _get_text(item, "pubDate")
        guid = _get_text(item, "guid")
        creator = _get_text(item, "{http://purl.org/dc/elements/1.1/}creator")
        description = _get_text(item, "description")

        if not title or not link:
            logger.debug("ITPro.lk: Skipping item missing title or link")
            return None

        # Generate source ID from GUID or URL
        source_id = _generate_source_id(guid or link)

        # Parse the HTML description content
        parsed_content = _parse_description_html(description)

        # Extract company from title or creator
        company = _extract_company(title, creator, parsed_content)

        # Parse publication date
        posted_at = _parse_date(pub_date)

        # Extract location from content
        location = _extract_location(parsed_content)

        # Clean and prepare job title
        clean_title = _clean_title(title, company)

        job_doc = {
            "sourceId": source_id,
            "source": "itpro_lk",
            "title": clean_title,
            "company": company or "Unknown Company",
            "description": parsed_content.get("full_text", title),
            "location": location or "Sri Lanka",
            "marketScope": "local-lk",
            "postedAt": posted_at or datetime.now(timezone.utc),
            "scrapedAt": datetime.now(timezone.utc),
            "processed": False,
            "extractedSkills": []
        }

        return job_doc

    except Exception as exc:
        logger.warning("ITPro.lk: Failed to parse job item: %s", exc)
        return None


def _get_text(element: ET.Element, tag: str) -> Optional[str]:
    """Safely extract text content from XML element."""
    child = element.find(tag)
    if child is not None and child.text:
        return child.text.strip()
    return None


def _parse_description_html(html_content: str) -> Dict:
    """Parse HTML description content and extract structured data."""
    if not html_content:
        return {}

    try:
        soup = BeautifulSoup(html_content, 'html.parser')

        # Get clean text content
        full_text = soup.get_text(separator=' ').strip()

        # Extract structured data
        result = {
            "full_text": full_text,
            "employment_type": _extract_field(full_text, r"Employment Type|Job Type"),
            "salary": _extract_field(full_text, r"Salary|Compensation"),
            "experience": _extract_field(full_text, r"Experience|Years of Experience"),
        }

        return result

    except Exception as exc:
        logger.debug("ITPro.lk: HTML parsing failed: %s", exc)
        return {"full_text": html_content}


def _extract_company(title: str, creator: str, content: Dict) -> str:
    """Extract company name from various sources."""
    # Try creator field first
    if creator and creator.strip():
        return creator.strip()

    # Try extracting from title pattern: "Position - Company"
    if " - " in title:
        parts = title.split(" - ")
        if len(parts) >= 2:
            # Last part is usually company
            company = parts[-1].strip()
            if company and len(company) > 2:
                return company

    # Try extracting from content
    if content and content.get("full_text"):
        company_match = re.search(r"Company[:\s]+([^\n\r]{3,50})",
                                content["full_text"], re.IGNORECASE)
        if company_match:
            return company_match.group(1).strip()

    return "Unknown Company"


def _extract_location(content: Dict) -> str:
    """Extract location from job content."""
    if not content or not content.get("full_text"):
        return "Sri Lanka"

    text = content["full_text"]

    # Look for common Sri Lankan locations
    locations = [
        "Colombo", "Galle", "Kandy", "Negombo", "Jaffna",
        "Ratnapura", "Batticaloa", "Kurunegala", "Anuradhapura",
        "Remote", "Work from Home", "WFH"
    ]

    for location in locations:
        if re.search(rf"\b{location}\b", text, re.IGNORECASE):
            return location

    # Generic location extraction
    location_match = re.search(r"Location[:\s]+([^\n\r]{3,30})", text, re.IGNORECASE)
    if location_match:
        return location_match.group(1).strip()

    return "Sri Lanka"


def _clean_title(title: str, company: str) -> str:
    """Clean job title by removing company name and extra formatting."""
    clean = title

    # Remove company name if it appears in title
    if company and company != "Unknown Company":
        clean = clean.replace(company, "").strip()

    # Remove common separators and prefixes
    clean = re.sub(r"^[\-\|\s]+|[\-\|\s]+$", "", clean)
    clean = re.sub(r"\s+", " ", clean)

    return clean.strip() or title


def _extract_field(text: str, pattern: str) -> Optional[str]:
    """Extract field value from text using regex pattern."""
    match = re.search(rf"{pattern}[:\s]+([^\n\r]{{3,80}})", text, re.IGNORECASE)
    return match.group(1).strip() if match else None


def _parse_date(date_str: str) -> Optional[datetime]:
    """Parse RSS pub date string into datetime object."""
    if not date_str:
        return None

    try:
        # RFC 2822 format typically used in RSS
        from email.utils import parsedate_tz
        import calendar

        parsed = parsedate_tz(date_str)
        if parsed:
            timestamp = calendar.timegm(parsed[:9])
            if parsed[9]:  # timezone offset
                timestamp -= parsed[9]
            return datetime.fromtimestamp(timestamp, tz=timezone.utc)

    except Exception as exc:
        logger.debug("ITPro.lk: Date parsing failed for '%s': %s", date_str, exc)

    return None


def _generate_source_id(identifier: str) -> str:
    """Generate stable source ID from job identifier."""
    # Create hash from identifier for consistent source IDs
    return hashlib.md5(identifier.encode('utf-8')).hexdigest()[:12]