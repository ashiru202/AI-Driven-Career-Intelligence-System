import sys
sys.path.insert(0, "/app")

from db import get_db
from datetime import timedelta

db = get_db()

snapshots = list(db["skill_snapshots"].find({}))
print(f"Found {len(snapshots)} current snapshots")

if not snapshots:
    print("No snapshots found. Run run_pipeline.py first.")
    sys.exit(1)

current_week = snapshots[0]["periodStart"]
prev_week    = current_week - timedelta(weeks=1)

existing = db["skill_snapshots"].count_documents({"periodStart": prev_week})
if existing > 0:
    print(f"Previous week already seeded ({existing} docs). Skipping.")
    sys.exit(0)

to_insert = []
for snap in snapshots:
    copy = dict(snap)
    del copy["_id"]
    copy["periodStart"] = prev_week
    copy["periodEnd"]   = prev_week + timedelta(days=6)
    to_insert.append(copy)

result = db["skill_snapshots"].insert_many(to_insert)
print(f"Inserted {len(result.inserted_ids)} backdated snapshots for week of {prev_week.date()}")
print("Now run the forecaster.")
