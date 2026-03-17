import logging
from pymongo import MongoClient, ASCENDING, DESCENDING
from config import MONGO_URI

logger = logging.getLogger(__name__)

_client = None


def get_db():
    """Return the career-intelligence database, initialising indexes on first call."""
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
        _ensure_indexes(_client["career-intelligence"])
        logger.info("MongoDB connection established and indexes ensured.")
    return _client["career-intelligence"]


def _ensure_indexes(db) -> None:
    """Create all collection indexes idempotently."""
    # ── job_postings ─────────────────────────────────────────────────────────
    jp = db["job_postings"]
    jp.create_index(
        [("sourceId", ASCENDING), ("source", ASCENDING)],
        unique=True,
        name="sourceId_source_unique",
    )
    jp.create_index([("scrapedAt", DESCENDING)], name="scrapedAt_desc")
    jp.create_index([("processed", ASCENDING)], name="processed_asc")
    jp.create_index(
        [("marketScope", ASCENDING), ("scrapedAt", DESCENDING)],
        name="marketScope_scrapedAt",
    )

    # ── skill_snapshots ───────────────────────────────────────────────────────
    ss = db["skill_snapshots"]
    ss.create_index(
        [("skill", ASCENDING), ("periodStart", ASCENDING), ("marketScope", ASCENDING)],
        unique=True,
        name="skill_periodStart_marketScope_unique",
    )
    ss.create_index([("periodStart", DESCENDING)], name="periodStart_desc")
    ss.create_index(
        [("relativeFreq", DESCENDING), ("periodStart", DESCENDING)],
        name="relativeFreq_periodStart",
    )

    # ── skill_forecasts ───────────────────────────────────────────────────────
    sf = db["skill_forecasts"]
    sf.create_index([("skill", ASCENDING)], unique=True, name="skill_unique")
    sf.create_index(
        [("trendDirection", ASCENDING), ("trendSlope", DESCENDING)],
        name="trendDirection_trendSlope",
    )
    sf.create_index([("generatedAt", DESCENDING)], name="generatedAt_desc")
