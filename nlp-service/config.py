import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI             = os.getenv("MONGO_URI", "mongodb://mongo:27017/career-intelligence")
ADZUNA_APP_ID         = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY        = os.getenv("ADZUNA_APP_KEY", "")
REMOTIVE_ENABLED      = os.getenv("REMOTIVE_ENABLED", "true").lower() == "true"
TOPJOBS_ENABLED       = os.getenv("TOPJOBS_ENABLED", "true").lower() == "true"
XPRESSJOBS_ENABLED    = os.getenv("XPRESSJOBS_ENABLED", "true").lower() == "true"
ITPRO_ENABLED         = os.getenv("ITPRO_ENABLED", "true").lower() == "true"
SCRAPE_INTERVAL_HOURS = int(os.getenv("SCRAPE_INTERVAL_HOURS", "24"))
MAX_JOBS_PER_RUN      = int(os.getenv("MAX_JOBS_PER_RUN", "200"))
INTERNAL_TOKEN        = os.getenv("INTERNAL_TOKEN", "changeme")

# ML thresholds
RISING_SLOPE_THRESHOLD  = float(os.getenv("RISING_SLOPE_THRESHOLD", "0.001"))
FALLING_SLOPE_THRESHOLD = float(os.getenv("FALLING_SLOPE_THRESHOLD", "-0.001"))
MIN_DATA_POINTS         = int(os.getenv("MIN_DATA_POINTS", "4"))
