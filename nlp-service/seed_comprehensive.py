"""
Creates comprehensive historical skill snapshots for realistic trend forecasting.
Generates 8 weeks of historical data with realistic skill frequency variations.
"""
import sys
import random
from datetime import timedelta
sys.path.insert(0, "/app")

from db import get_db
from forecaster import refresh_all_forecasts

random.seed(42)
db = get_db()

def create_historical_data(weeks_back=8):
    """Create historical skill snapshots with realistic trends."""

    # Get current snapshots as baseline
    current_snapshots = list(db["skill_snapshots"].find({}))
    if not current_snapshots:
        print("No current snapshots found. Run the pipeline first.")
        return

    current_week = max(s["periodStart"] for s in current_snapshots)
    current_data = [s for s in current_snapshots if s["periodStart"] == current_week]

    print(f"Creating {weeks_back} weeks of historical data from {len(current_data)} skills...")

    # Define skill categories with different trend patterns
    trending_up = ['artificial intelligence', 'machine learning', 'kubernetes', 'typescript', 'react', 'aws', 'docker']
    trending_down = ['php', 'jquery', 'flash', 'silverlight']
    stable_skills = ['java', 'python', 'javascript', 'sql', 'git']

    to_insert = []

    for week_offset in range(1, weeks_back + 1):
        week_start = current_week - timedelta(weeks=week_offset)
        week_end = week_start + timedelta(days=6)

        for snap in current_data:
            if snap.get("skill"):  # Ensure skill field exists
                copy = dict(snap)
                del copy["_id"]
                copy["periodStart"] = week_start
                copy["periodEnd"] = week_end

                skill_name = snap["skill"].lower()
                base_freq = snap["relativeFreq"]

                # Apply trend-based multipliers
                if any(skill in skill_name for skill in trending_up):
                    # Trending up: lower frequency in the past
                    multiplier = 0.4 + (0.6 * (weeks_back - week_offset) / weeks_back)
                elif any(skill in skill_name for skill in trending_down):
                    # Trending down: higher frequency in the past
                    multiplier = 0.8 + (0.4 * week_offset / weeks_back)
                elif any(skill in skill_name for skill in stable_skills):
                    # Stable: minor random variations
                    multiplier = random.uniform(0.9, 1.1)
                else:
                    # Random trend for other skills
                    if random.random() < 0.3:  # 30% trending up
                        multiplier = 0.5 + (0.5 * (weeks_back - week_offset) / weeks_back)
                    elif random.random() < 0.3:  # 30% trending down
                        multiplier = 0.7 + (0.6 * week_offset / weeks_back)
                    else:  # 40% stable
                        multiplier = random.uniform(0.85, 1.15)

                # Add some noise
                multiplier *= random.uniform(0.9, 1.1)

                copy["relativeFreq"] = round(base_freq * multiplier, 6)
                copy["count"] = max(1, round(snap["count"] * multiplier))

                to_insert.append(copy)

    # Clear existing historical data
    deleted = db["skill_snapshots"].delete_many({
        "periodStart": {"$lt": current_week}
    })
    print(f"Removed {deleted.deleted_count} existing historical snapshots")

    # Insert new historical data
    if to_insert:
        result = db["skill_snapshots"].insert_many(to_insert)
        print(f"Inserted {len(result.inserted_ids)} historical snapshots")

    # Regenerate forecasts
    print("Regenerating forecasts with new historical data...")
    forecast_result = refresh_all_forecasts()
    print(f"Forecast generation complete: {forecast_result}")

if __name__ == "__main__":
    create_historical_data()