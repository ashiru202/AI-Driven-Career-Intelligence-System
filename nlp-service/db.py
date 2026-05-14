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
    def ensure_index(collection, keys, *, unique: bool = False, name: str | None = None) -> str:
        """Ensure an index exists, regardless of its current name.

        MongoDB considers index identity to be the key pattern + options. If an
        index already exists under a different name, attempting to create it
        again with a custom name raises IndexOptionsConflict.
        """
        key_list = [(field, int(direction)) for field, direction in keys]

        for existing_name, meta in collection.index_information().items():
            if meta.get("key") != key_list:
                continue
            if unique and not meta.get("unique"):
                collection.drop_index(existing_name)
                break
            return existing_name

        return collection.create_index(keys, unique=unique, name=name)

    # ── job_postings ─────────────────────────────────────────────────────────
    jp = db["job_postings"]
    ensure_index(
        jp,
        [("sourceId", ASCENDING), ("source", ASCENDING)],
        unique=True,
        name="sourceId_source_unique",
    )
    ensure_index(jp, [("scrapedAt", DESCENDING)], name="scrapedAt_desc")
    ensure_index(jp, [("processed", ASCENDING)], name="processed_asc")
    ensure_index(
        jp,
        [("marketScope", ASCENDING), ("scrapedAt", DESCENDING)],
        name="marketScope_scrapedAt",
    )

    # ── skill_snapshots ───────────────────────────────────────────────────────
    ss = db["skill_snapshots"]
    ensure_index(
        ss,
        [("skill", ASCENDING), ("periodStart", ASCENDING), ("marketScope", ASCENDING)],
        unique=True,
        name="skill_periodStart_marketScope_unique",
    )
    ensure_index(ss, [("periodStart", DESCENDING)], name="periodStart_desc")
    ensure_index(
        ss,
        [("relativeFreq", DESCENDING), ("periodStart", DESCENDING)],
        name="relativeFreq_periodStart",
    )

    # ── skill_forecasts ───────────────────────────────────────────────────────
    sf = db["skill_forecasts"]

    # Backfill legacy rows that predate marketScope-aware forecasts.
    sf.update_many(
        {"marketScope": {"$exists": False}},
        {"$set": {"marketScope": "combined"}},
    )

    # Replace legacy unique index on skill with scoped uniqueness.
    for idx_name, meta in sf.index_information().items():
        key = meta.get("key", [])
        if meta.get("unique") and key == [("skill", 1)]:
            sf.drop_index(idx_name)

    # These indexes are also declared by the backend Mongoose model, which uses
    # MongoDB's default naming. Do not force a different name here.
    ensure_index(sf, [("skill", ASCENDING), ("marketScope", ASCENDING)], unique=True)
    ensure_index(
        sf,
        [("marketScope", ASCENDING), ("trendDirection", ASCENDING), ("trendSlope", DESCENDING)],
    )
    ensure_index(sf, [("generatedAt", DESCENDING)])
