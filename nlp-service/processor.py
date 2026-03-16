"""
Skill extraction processor.

Finds JobPosting documents where processed=False, runs the existing
extract_skills_from_text() function on each description, and writes the
extracted skills back to MongoDB while marking the document as processed.

After each batch it triggers weekly snapshot aggregation (Phase 3).
"""

import logging
from datetime import datetime, timezone

from db import get_db

logger = logging.getLogger(__name__)


def process_unprocessed_jobs(batch_size: int = 100) -> dict:
    """
    Pull up to `batch_size` unprocessed job postings, extract skills from each
    description using the NLP keyword extractor, and persist the results.

    Calls aggregate_weekly_snapshots() after processing to keep snapshots current.

    Returns:
        { processed_count: int, skills_found: int }
    """
    # Import here to avoid circular dependency with main.py at module level.
    from main import extract_skills_from_text

    db = get_db()
    collection = db["job_postings"]

    cursor = collection.find({"processed": False}).limit(batch_size)
    jobs = list(cursor)

    if not jobs:
        logger.info("Processor: no unprocessed jobs found.")
        return {"processed_count": 0, "skills_found": 0}

    processed_count = 0
    total_skills = 0

    for job in jobs:
        try:
            skills: list[str] = extract_skills_from_text(job.get("description", ""))
            collection.update_one(
                {"_id": job["_id"]},
                {
                    "$set": {
                        "extractedSkills": skills,
                        "processed": True,
                    }
                },
            )
            processed_count += 1
            total_skills += len(skills)
        except Exception as exc:
            logger.error("Failed to process job %s: %s", job.get("_id"), exc)

    logger.info(
        "Processor: processed=%d skills_found=%d",
        processed_count, total_skills,
    )

    # Trigger aggregation after processing so snapshots stay current.
    try:
        from aggregator import aggregate_weekly_snapshots
        agg_result = aggregate_weekly_snapshots()
        logger.info("Aggregation triggered after processing: %s", agg_result)
    except Exception as exc:
        logger.error("Aggregation failed after processing: %s", exc)

    return {"processed_count": processed_count, "skills_found": total_skills}
