"""
Re-seeds the previous week's snapshots with varied relativeFreq values
so the forecaster produces a mix of rising, stable and falling trends.
"""
import sys, random
sys.path.insert(0, "/app")

from db import get_db
from datetime import timedelta
from forecaster import refresh_all_forecasts

random.seed(42)
db = get_db()

# Remove the uniform previous-week snapshots we seeded earlier
current_snapshots = list(db["skill_snapshots"].find({}))
if not current_snapshots:
    print("No snapshots found. Run run_pipeline.py first.")
    sys.exit(1)

current_week = max(s["periodStart"] for s in current_snapshots)
prev_week    = current_week - timedelta(weeks=1)

deleted = db["skill_snapshots"].delete_many({"periodStart": prev_week})
print(f"Removed {deleted.deleted_count} uniform previous-week snapshots")

# Re-insert with random variation: ~1/3 rising, ~1/3 falling, ~1/3 stable
current = [s for s in current_snapshots if s["periodStart"] == current_week]
to_insert = []
for snap in current:
    copy = dict(snap)
    del copy["_id"]
    copy["periodStart"] = prev_week
    copy["periodEnd"]   = prev_week + timedelta(days=6)

    # Apply a random multiplier to simulate past frequency
    multiplier = random.choice([
        random.uniform(0.3, 0.7),   # skill was less common → now rising
        random.uniform(0.85, 1.15), # similar → stable
        random.uniform(1.3, 2.0),   # skill was more common → now falling
    ])
    copy["relativeFreq"] = round(snap["relativeFreq"] * multiplier, 6)
    copy["count"]        = max(1, round(snap["count"] * multiplier))
    to_insert.append(copy)

result = db["skill_snapshots"].insert_many(to_insert)
print(f"Inserted {len(result.inserted_ids)} varied snapshots for week of {prev_week.date()}")

# Re-run forecaster
print("Running forecaster...")
out = refresh_all_forecasts()
print(f"Done: {out}")
