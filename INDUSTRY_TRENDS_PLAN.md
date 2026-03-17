# Industry Trends & Future Skill Forecasting — Implementation Plan

**Feature Summary:** Periodically scrape public job postings, extract skill frequencies over
time, apply time-series ML to forecast which skills are rising or falling in demand, and
surface the results to users as interactive trend graphs.

**Research contribution angle:** Most career tools show a skill gap snapshot. This feature
builds a longitudinal skill-demand dataset from real job postings and applies forecasting so
users can prepare for *future* market shifts, not just the current state.

**Stack alignment:**
- Scraper + ML lives inside the existing `nlp-service` (Python/FastAPI), extended with new
  endpoints and an APScheduler background job.
- New MongoDB collections are added alongside existing ones.
- Backend exposes new REST endpoints following existing patterns (asyncHandler, successResponse,
  paginationMeta).
- Frontend adds a new page using Recharts (already used in `Analytics.jsx`).

---

## Phases Overview

| # | Phase | Primary Location |
|---|---|---|
| 1 | MongoDB Data Models | `backend/src/models/` |
| 2 | Job Scraping Pipeline — Global + Sri Lanka | `nlp-service/` |
| 3 | Skill Snapshot Aggregation | `nlp-service/` + cron |
| 4 | ML Trend Analysis & Forecasting | `nlp-service/` |
| 5 | Backend API Layer | `backend/src/` |
| 6 | Frontend Trend Dashboard | `frontend/src/pages/` |
| 7 | Docker & Scheduler Integration | `docker-compose.yml` |
| 8 | Testing | Both services |
| 9 | Labelled Dataset Evaluation | Manual + `nlp-service/` |

---

## Phase 1 — MongoDB Data Models

### Task 1.1 — Create `JobPosting` model

**File:** `backend/src/models/JobPosting.js`

Fields:
```
title          String   required
company        String
location       String
description    String   required (raw text, used for skill extraction)
extractedSkills [String]
source         String   enum: ['adzuna', 'remotive', 'topjobs_lk', 'xpressjobs_lk', 'mock']
sourceId       String   (unique ID from the source API, for dedup)
marketScope    String   enum: ['global', 'local-lk']  default: 'global'
                        'local-lk' = jobs scraped from Sri Lankan boards
postedAt       Date     (original posting date from source)
scrapedAt      Date     default: Date.now
processed      Boolean  default: false (whether skills have been extracted)
```

Indexes:
- `{ sourceId: 1, source: 1 }` — unique compound, prevents duplicate imports
- `{ scrapedAt: -1 }` — for time-range queries
- `{ processed: 1 }` — for the processing queue
- `{ marketScope: 1, scrapedAt: -1 }` — for market-filtered queries (global vs LK)

### Task 1.2 — Create `SkillSnapshot` model

**File:** `backend/src/models/SkillSnapshot.js`

This is the aggregated, time-bucketed skill frequency table. One document per
(skill, week, marketScope) triple — so global and LK trends are tracked separately.

Fields:
```
skill          String   required, lowercased canonical form
periodStart    Date     required (Monday of the ISO week)
periodEnd      Date     required (Sunday of the ISO week)
count          Number   required (number of job postings containing this skill that week)
totalJobs      Number   required (total job postings scraped that week, for normalization)
relativeFreq   Number   computed: count / totalJobs (stored for fast querying)
marketScope    String   enum: ['global', 'local-lk', 'combined']  default: 'combined'
sources        [String] which scrape sources contributed
```

Indexes:
- `{ skill: 1, periodStart: 1, marketScope: 1 }` — unique compound
- `{ periodStart: -1 }` — for recent-weeks queries
- `{ relativeFreq: -1, periodStart: -1 }` — for top-skills-this-week queries

### Task 1.3 — Create `SkillForecast` model

**File:** `backend/src/models/SkillForecast.js`

Stores cached ML forecast results so the frontend never waits for computation.

Fields:
```
skill            String   required
generatedAt      Date     default: Date.now
trendDirection   String   enum: ['rising', 'falling', 'stable']
trendSlope       Number   (linear regression slope, weekly change in relativeFreq)
trendConfidence  Number   0–1 (R² of the regression)
forecastPoints   [{
  periodStart: Date,
  predictedFreq: Number,
  lowerBound:   Number,
  upperBound:   Number
}]
dataPointsUsed   Number   (how many weekly snapshots trained this forecast)
modelUsed        String   enum: ['linear', 'prophet'] default: 'linear'
```

Indexes:
- `{ skill: 1 }` — unique
- `{ trendDirection: 1, trendSlope: -1 }` — for rising/falling leaderboards
- `{ generatedAt: -1 }` — for cache invalidation

---

## Phase 2 — Job Scraping Pipeline

All work in `nlp-service/`. The existing FastAPI app gets new routers and a
background scheduler.

### Task 2.1 — Add scraping dependencies

**File:** `nlp-service/requirements.txt` — append:
```
# Scraping & scheduling
httpx>=0.27.0          # already present, used for HTTP calls to job APIs
apscheduler>=3.10.4
python-dateutil>=2.9.0
pymongo>=4.8.0         # direct Mongo access from Python side
python-dotenv>=1.0.0

# ML / forecasting
scikit-learn>=1.5.0
numpy>=1.26.0
pandas>=2.2.0
# prophet>=1.1.5       # optional, heavier – add only if linear model is insufficient
```

### Task 2.2 — Create scraper configuration

**File:** `nlp-service/config.py`

```python
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI          = os.getenv("MONGO_URI", "mongodb://mongo:27017/career-intelligence")
ADZUNA_APP_ID      = os.getenv("ADZUNA_APP_ID", "")
ADZUNA_APP_KEY     = os.getenv("ADZUNA_APP_KEY", "")
REMOTIVE_ENABLED   = os.getenv("REMOTIVE_ENABLED", "true").lower() == "true"
TOPJOBS_ENABLED    = os.getenv("TOPJOBS_ENABLED", "true").lower() == "true"
XPRESSJOBS_ENABLED = os.getenv("XPRESSJOBS_ENABLED", "true").lower() == "true"
SCRAPE_INTERVAL_HOURS = int(os.getenv("SCRAPE_INTERVAL_HOURS", "24"))
MAX_JOBS_PER_RUN   = int(os.getenv("MAX_JOBS_PER_RUN", "200"))
```

### Task 2.3 — Create MongoDB client helper for Python

**File:** `nlp-service/db.py`

```python
from pymongo import MongoClient, ASCENDING, DESCENDING
from config import MONGO_URI

_client = None

def get_db():
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client["career-intelligence"]
```

Ensure the unique indexes on `job_postings` and `skill_snapshots` are created
here with `create_index` calls on first connection.

### Task 2.4 — Implement Adzuna scraper

**File:** `nlp-service/scrapers/adzuna.py`

- Use Adzuna's free Jobs Search API (`api.adzuna.com/v1/api/jobs/us/search/1`).
- Fetch pages of results filtered by category (IT jobs, Engineering, etc.).
- Map API response fields to the `JobPosting` schema.
- Return a list of dicts ready for MongoDB insert.
- Deduplicate using `sourceId` before inserting (use `update_one` with
  `upsert=True` on `{ source: 'adzuna', sourceId: id }`).
- Store raw `description` as the text that will go through skill extraction.
- Respect rate limits: add 0.5 s sleep between pages.

Sign-up for free API credentials at: https://developer.adzuna.com/

### Task 2.5 — Implement Remotive scraper (global/remote)

**File:** `nlp-service/scrapers/remotive.py`

- Remotive has a free, no-auth JSON API: `https://remotive.com/api/remote-jobs`
- No API key needed.
- Pull categories: software-dev, devops-sysadmin, data, product, design.
- Same dedup + upsert pattern as Adzuna.
- Set `marketScope = 'global'` on all inserted documents.
- This gives free historical data and good tech skill coverage for global trends.

### Task 2.6 — Implement TopJobs.lk scraper (Sri Lanka)

**File:** `nlp-service/scrapers/topjobs_lk.py`

- TopJobs.lk is Sri Lanka's largest job board. Scrape their public job listing
  pages using `httpx` + HTML parsing with `beautifulsoup4` (add to requirements).
- Target URL pattern: `https://www.topjobs.lk/` — filter by IT/Tech categories.
- For each job listing extract: `title`, `company`, `location`, `description`.
- Generate a stable `sourceId` by hashing `(title + company + postedAt)` since
  TopJobs has no public API with unique IDs.
- Set `source = 'topjobs_lk'` and `marketScope = 'local-lk'` on all documents.
- Dedup with upsert on `{ sourceId, source }` as with other scrapers.
- Respect the site: add 1–2 s sleep between page requests, set a realistic
  `User-Agent` header, limit to 5–10 pages per run.
- Add `beautifulsoup4>=4.12.0` and `lxml>=5.2.0` to `requirements.txt`.

### Task 2.7 — Implement XpressJobs.lk scraper (Sri Lanka)

**File:** `nlp-service/scrapers/xpressjobs_lk.py`

- XpressJobs is another active Sri Lankan tech job board.
- Same HTML scraping approach as TopJobs.lk using httpx + BeautifulSoup.
- Target IT/Software/Engineering category pages.
- Set `source = 'xpressjobs_lk'` and `marketScope = 'local-lk'`.
- Same dedup, rate limiting, and User-Agent rules as Task 2.6.

> **Note on LK scraping ethics:** Both boards are publicly accessible and do not
> have a paid API. The scraper must honour `robots.txt`, use respectful delays,
> and store only job description text — no personal data from applicant profiles.

### Task 2.8 — Create scrape orchestrator

**File:** `nlp-service/scrapers/orchestrator.py`

```python
def run_scrape() -> dict:
    """
    Runs all enabled scrapers (Adzuna, Remotive, TopJobs.lk, XpressJobs.lk),
    inserts results into job_postings collection.
    Returns summary: { scraped, inserted, skipped, by_source: {...} }
    """
```

- Calls each scraper conditionally based on config flags (`TOPJOBS_ENABLED`, etc.).
- Inserts with `upsert=True` so reruns are safe.
- Returns a per-source breakdown in the summary dict for logging.

### Task 2.9 — Create skill extraction processor

**File:** `nlp-service/processor.py`

```python
def process_unprocessed_jobs(batch_size: int = 100) -> dict:
    """
    Finds JobPostings where processed=False, runs skill extraction on each,
    updates the document with extractedSkills and processed=True.
    Returns { processed_count, skills_found }
    """
```

- Reuses the existing `extract_skills(text)` logic already in `main.py`.
- Processes in batches to avoid memory issues.
- After processing, calls `aggregate_weekly_snapshots()` (Phase 3).

---

## Phase 3 — Skill Snapshot Aggregation

### Task 3.1 — Weekly aggregation function

**File:** `nlp-service/aggregator.py`

```python
def aggregate_weekly_snapshots(target_week_start: date = None) -> dict:
    """
    Groups all processed job postings for a given ISO week by skill,
    counts occurrences, computes relativeFreq, upserts into skill_snapshots.
    Runs three passes: marketScope='global', 'local-lk', and 'combined'.
    Defaults to the current week if target_week_start is None.
    Returns { week_start, total_jobs, unique_skills_found, by_scope: {...} }
    """
```

Logic:
1. Determine the Monday of the target week.
2. For each `marketScope` value (`['global', 'local-lk', 'combined']`):
   - Query `job_postings` for that week — filter by `marketScope` for the first
     two passes; no filter for `'combined'`.
   - Flatten `extractedSkills` across all documents, count per skill.
   - `totalJobs` = count of distinct job postings in that scope.
   - For each skill: `relativeFreq = count / totalJobs`.
   - Upsert into `skill_snapshots` on `{ skill, periodStart, marketScope }`.

This means the frontend can show "Global trends" vs "Sri Lanka trends" vs "Combined"
as a toggle — all from the same collection with a `marketScope` filter.

### Task 3.2 — Backfill utility

**File:** `nlp-service/aggregator.py` (add function)

```python
def backfill_all_weeks() -> list:
    """
    Finds earliest scrapedAt in job_postings, iterates week by week
    calling aggregate_weekly_snapshots() for each. Used on first setup.
    """
```

This lets you re-aggregate historical data if the snapshot schema changes.

---

## Phase 4 — ML Trend Analysis & Forecasting

### Task 4.1 — Linear trend classifier

**File:** `nlp-service/forecaster.py`

```python
import numpy as np
from sklearn.linear_model import LinearRegression

def compute_trend(skill: str, weeks: int = 12) -> dict:
    """
    Fetches the last `weeks` snapshots for a skill, fits a LinearRegression
    on (week_index → relativeFreq), returns:
    {
      skill, slope, r_squared, direction,
      data_points: [{ period_start, relative_freq }]
    }
    direction: 'rising' if slope > threshold, 'falling' if slope < -threshold, else 'stable'
    """
```

Thresholds (tunable via env vars):
- `RISING_SLOPE_THRESHOLD = 0.001` (0.1% weekly increase in relative freq)
- `FALLING_SLOPE_THRESHOLD = -0.001`
- `MIN_DATA_POINTS = 4` (need at least 4 weeks of data to classify)

### Task 4.2 — Forecast generator

**File:** `nlp-service/forecaster.py` (add function)

```python
def generate_forecast(skill: str, weeks_ahead: int = 8, history_weeks: int = 16) -> dict:
    """
    Uses the fitted LinearRegression to project `weeks_ahead` future data points.
    Adds confidence interval bands (±1.5 * residual std).
    Returns:
    {
      skill, model_used: 'linear', trend_direction, trend_slope, r_squared,
      historical: [{ period_start, relative_freq }],
      forecast: [{ period_start, predicted_freq, lower_bound, upper_bound }]
    }
    """
```

Note on Prophet (optional upgrade path): If linear regression proves too simplistic
for cyclical patterns (e.g. seasonal hiring), swap in `prophet` for skills with
sufficient data (`data_points_used > 26`). Keep linear as default/fallback.

### Task 4.3 — Batch forecast runner

**File:** `nlp-service/forecaster.py` (add function)

```python
def refresh_all_forecasts(top_n: int = 100) -> dict:
    """
    Fetches the top N skills by average relativeFreq across last 12 weeks,
    generates + upserts a SkillForecast document for each.
    Returns { refreshed, errors }
    """
```

- Only forecasts skills with `>= MIN_DATA_POINTS` weekly snapshots.
- Upserts into `skill_forecasts` collection on `{ skill: 1 }`.
- Called after every aggregation cycle.

---

## Phase 5 — Backend API Layer

### Task 5.1 — Create `TrendRoutes.js`

**File:** `backend/src/routes/trendRoutes.js`

```
GET  /api/trends/skills              → list skills with their latest snapshot + trend
GET  /api/trends/skills/:skill       → full history + forecast for one skill
GET  /api/trends/rising              → top N rising skills (sorted by trendSlope desc)
GET  /api/trends/falling             → top N falling skills (sorted by trendSlope asc)
GET  /api/trends/snapshot-summary    → weekly summary (total jobs, skills tracked, last updated)
```

All routes: `requireAuth` only (not admin-restricted — users should see trends).

Admin-only (add to `adminRoutes.js`):
```
POST /api/admin/trends/trigger-scrape    → manually kicks off a scrape + process cycle
POST /api/admin/trends/trigger-forecast  → manually refreshes all forecasts
GET  /api/admin/trends/scrape-status     → last run time, job counts, errors
```

### Task 5.2 — Create `trendController.js`

**File:** `backend/src/controllers/trendController.js`

Follow the existing pattern: all handlers wrapped with `asyncHandler`, all
responses via `successResponse` / `errorResponse`.

**`getSkillsList(req, res)`**
- Query params: `?direction=rising|falling|stable&limit=20&page=1&search=&marketScope=combined|global|local-lk`
- Joins `skill_forecasts` with latest `skill_snapshots` filtered by `marketScope`.
- Returns paginated list with `paginationMeta`.
- Default sort: `trendSlope DESC` for rising, `trendSlope ASC` for falling,
  `relativeFreq DESC` for stable/all.

**`getSkillDetail(req, res)`**
- Param: `:skill` (URL-decoded, lowercased)
- Query: `?marketScope=combined|global|local-lk`
- Returns full historical snapshots array + forecast points from `SkillForecast`.
- If no forecast exists yet: return historical data with a `forecastPending: true` flag.

**`getRisingSkills(req, res)`**
- Query: `?limit=10&marketScope=combined` (default limit 10, max 50)
- Returns top rising skills sorted by `trendSlope DESC` where `direction = 'rising'`
  and `marketScope` matches.

**`getFallingSkills(req, res)`**
- Mirror of getRisingSkills for falling direction.

**`getSnapshotSummary(req, res)`**
- Returns: `{ lastScrapedAt, totalJobsIndexed, skillsTracked, weeksCovered, lastForecastAt }`

**`triggerScrape(req, res)`** (admin)
- Makes HTTP POST to NLP service endpoint `POST /internal/trigger-scrape`.
- Returns the scrape summary from NLP service.

**`triggerForecast(req, res)`** (admin)
- Makes HTTP POST to NLP service `POST /internal/trigger-forecast`.

### Task 5.3 — Register routes in `app.js`

**File:** `backend/src/app.js`

```js
const trendRoutes = require('./routes/trendRoutes');
app.use('/api/trends', trendRoutes);
```

Admin trigger routes go into `adminRoutes.js`:
```js
router.post('/trends/trigger-scrape', triggerScrape);
router.post('/trends/trigger-forecast', triggerForecast);
router.get('/trends/scrape-status', getScrapeStatus);
```

### Task 5.4 — Add internal NLP service endpoints

**File:** `nlp-service/main.py` — add new routes:

```python
POST /internal/trigger-scrape    → calls orchestrator.run_scrape() + processor.process_unprocessed_jobs()
POST /internal/trigger-forecast  → calls forecaster.refresh_all_forecasts()
GET  /internal/scrape-status     → returns { last_run, jobs_in_db, snapshots_in_db, forecasts_in_db }
GET  /trends/skills              → same data as backend endpoint, can be called directly for testing
GET  /trends/rising              → top rising skills
GET  /trends/forecast/{skill}    → forecast for a single skill
```

These `/internal/` routes should be protected: check for a shared secret header
`X-Internal-Token` (set in both services via env `INTERNAL_TOKEN`).

---

## Phase 6 — Frontend Trend Dashboard

### Task 6.1 — Create `TrendsPage.jsx`

**File:** `frontend/src/pages/TrendsPage.jsx`

**Layout (top to bottom):**

1. **Page Header**
   - Title: "Industry Skill Trends"
   - Subtitle: "Live analysis of skill demand from thousands of job postings"
   - "Last updated: X days ago" pill badge (from `/api/trends/snapshot-summary`)

2. **Summary Stats Bar** — 4 stat cards in a grid:
   - Total jobs indexed
   - Skills tracked
   - Weeks of data
   - Forecasts generated

3. **Rising & Falling Skills** — 2-column layout:
   - Left: "Rising Skills" card — list of top 8 rising skills, each with:
     - Skill name + green upward-arrow badge
     - Sparkline (mini 8-week trend, React inline SVG or Recharts `LineChart`)
     - Slope percentage change label ("↑ +2.3% / week")
   - Right: "Falling Skills" card — mirror layout with red downward-arrow badges

4. **Skill Trend Explorer** — Full-width section:
   - Search/select input for a skill (autocomplete via skill list)
   - Default selected skill: highest-slope rising skill
   - Recharts `ComposedChart` showing:
     - `Area` for historical `relativeFreq` (last 16 weeks, solid color)
     - `Line` for forecast `predictedFreq` (next 8 weeks, dashed)
     - `Area` for confidence band (`lowerBound` to `upperBound`, low opacity)
     - `ReferenceLine` at the current week dividing history vs future
     - X axis: week start dates, formatted as "MMM D"
     - Y axis: percentage (relativeFreq × 100, e.g. "5.2%")
   - Below chart: trend direction badge + slope + R² confidence score
   - "Appears in X% of job postings this week" stat

5. **Top 20 Skills Table** — with columns:
   - Skill name
   - This week's frequency
   - 4-week change (delta)
   - 12-week trend (sparkline)
   - Forecast direction badge
   - Filterable by direction (All / Rising / Falling / Stable)
   - Paginated (use existing pagination pattern from `UserManagement.jsx`)

### Task 6.2 — Add Axios API calls

**File:** `frontend/src/api/trendsApi.js` (new file, mirrors pattern of other api helpers)

```js
import api from './api';

export const getSnapshotSummary   = ()           => api.get('/trends/snapshot-summary');
export const getRisingSkills      = (limit = 8)  => api.get(`/trends/rising?limit=${limit}`);
export const getFallingSkills     = (limit = 8)  => api.get(`/trends/falling?limit=${limit}`);
export const getSkillsList        = (params)     => api.get('/trends/skills', { params });
export const getSkillDetail       = (skill)      => api.get(`/trends/skills/${encodeURIComponent(skill)}`);
```

### Task 6.3 — Add route and nav link

**File:** `frontend/src/App.js`

```jsx
import TrendsPage from './pages/TrendsPage';
// Add to protected routes:
<Route path="/trends" element={<TrendsPage />} />
```

**File:** `frontend/src/components/Navbar.jsx` (or wherever nav links live)

Add "Industry Trends" link pointing to `/trends`. Place it between Analytics and
Job Tracker in the nav order.

### Task 6.4 — Add skill detail drill-down (optional enhancement)

When a user clicks any skill in the Rising/Falling cards or the table, update the
Trend Explorer section (scroll into view) with that skill's detailed chart. This
avoids a separate page and keeps context.

### Task 6.5 — Add "Your Skills vs Trends" widget

**File:** Integrate into `TrendsPage.jsx` or `Analytics.jsx`

If the user has at least one resume with `extractedSkills`:
- Cross-reference their resume skills with `SkillForecast` data.
- Show a table: "Skills you have that are rising", "Skills you have that are falling".
- This is the personalization hook that makes the feature directly actionable.
- Call `GET /api/trends/skills?skills=react,python,docker` with their skill list
  as a filter query param.

### Task 6.6 — Add Market Scope toggle (Global vs Sri Lanka)

**File:** `frontend/src/pages/TrendsPage.jsx`

Add a segmented control / tab group at the top of the page:
```
[ Combined ]  [ Global / Remote ]  [ Sri Lanka ]
```

- Passes `?marketScope=combined|global|local-lk` as a query param to all trend
  API calls.
- When "Sri Lanka" is selected, the page title changes to "Sri Lanka Skill Trends"
  and a badge "LK Market" appears next to rising/falling skill labels.
- This toggle makes the localization contribution visible and interactive for users.
- Store selected scope in `useState`, re-fetch on change.

Update `trendsApi.js` to accept and forward the `marketScope` param:
```js
export const getRisingSkills  = (limit = 8, scope = 'combined') =>
  api.get(`/trends/rising?limit=${limit}&marketScope=${scope}`);
export const getFallingSkills = (limit = 8, scope = 'combined') =>
  api.get(`/trends/falling?limit=${limit}&marketScope=${scope}`);
export const getSkillsList    = (params) => api.get('/trends/skills', { params });
export const getSkillDetail   = (skill, scope = 'combined') =>
  api.get(`/trends/skills/${encodeURIComponent(skill)}?marketScope=${scope}`);
```

---

## Phase 7 — Docker & Scheduler Integration

### Task 7.1 — Add APScheduler to NLP service

**File:** `nlp-service/main.py` — add on startup:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def start_scheduler():
    scheduler.add_job(
        run_daily_pipeline,          # scrape → process → aggregate → forecast
        IntervalTrigger(hours=SCRAPE_INTERVAL_HOURS),
        id="daily_pipeline",
        replace_existing=True
    )
    scheduler.start()
```

`run_daily_pipeline()` chains: `run_scrape()` → `process_unprocessed_jobs()` →
`aggregate_weekly_snapshots()` → `refresh_all_forecasts()` → log summary.

### Task 7.2 — Update docker-compose environment variables

**File:** `docker-compose.yml`

Add to `nlp-service` environment:
```yaml
environment:
  MONGO_URI: mongodb://mongo:27017/career-intelligence
  ADZUNA_APP_ID: ${ADZUNA_APP_ID:-}
  ADZUNA_APP_KEY: ${ADZUNA_APP_KEY:-}
  REMOTIVE_ENABLED: "true"
  TOPJOBS_ENABLED: "true"
  XPRESSJOBS_ENABLED: "true"
  SCRAPE_INTERVAL_HOURS: "24"
  MAX_JOBS_PER_RUN: "200"
  INTERNAL_TOKEN: ${INTERNAL_TOKEN:-changeme}
```

Add to `backend` environment:
```yaml
  NLP_INTERNAL_TOKEN: ${INTERNAL_TOKEN:-changeme}
```

### Task 7.3 — Update `.env` files

**File:** `backend/.env` — add:
```
INTERNAL_TOKEN=your-shared-secret-here
```

**File:** `nlp-service/.env` (create if not exists):
```
MONGO_URI=mongodb://localhost:27017/career-intelligence
ADZUNA_APP_ID=
ADZUNA_APP_KEY=
REMOTIVE_ENABLED=true
TOPJOBS_ENABLED=true
XPRESSJOBS_ENABLED=true
INTERNAL_TOKEN=your-shared-secret-here
SCRAPE_INTERVAL_HOURS=24
```

---

## Phase 8 — Testing

### Task 8.1 — NLP service unit tests

**File:** `nlp-service/tests/test_trends.py` (new file)

Tests to write:
- `test_remotive_scraper_returns_list` — mock httpx, assert returns list of dicts
  with required fields.
- `test_scraper_deduplicates_source_ids` — call scraper twice with same mocked
  response, assert no duplicate sourceIds.
- `test_aggregate_snapshot_counts_correctly` — insert mock job postings to test
  DB, run aggregation, assert counts match expected.
- `test_linear_trend_rising` — feed synthetic increasing relativeFreq series,
  assert `direction == 'rising'`.
- `test_linear_trend_falling` — feed decreasing series.
- `test_linear_trend_stable` — flat series within threshold.
- `test_forecast_generates_future_points` — assert `len(forecast) == weeks_ahead`.
- `test_forecast_confidence_bounds_valid` — assert `lower <= predicted <= upper`.
- `test_internal_trigger_endpoint_requires_token` — assert 401 without token.
- `test_internal_trigger_scrape_returns_summary` — with valid token, returns
  `{ scraped, inserted, skipped }` shape.

### Task 8.2 — Backend controller tests

**File:** `backend/src/tests/trends.test.js` (or wherever existing tests live)

Tests to write:
- `GET /api/trends/snapshot-summary` — 200 with correct shape.
- `GET /api/trends/rising` — 200, result is array, each has `trendSlope` > 0.
- `GET /api/trends/falling` — 200, each has `trendSlope` < 0.
- `GET /api/trends/skills` — paginated, respects `?limit=` and `?direction=`.
- `GET /api/trends/skills/:skill` — 200 for known skill, 404 for unknown.
- `POST /api/admin/trends/trigger-scrape` — requires ADMIN role, returns summary.
- Unauthorized user `GET /api/trends/rising` — 401 without auth cookie.

### Task 8.3 — Frontend smoke tests (optional)

If the project has React Testing Library set up:
- Render `TrendsPage`, mock all 3 API calls, assert Rising/Falling sections
  appear with correct data.
- Assert the ComposedChart renders when a skill is selected.
- Assert the market scope toggle re-fetches data with the correct `marketScope` param.

---

## Phase 9 — Labelled Dataset Evaluation

This phase validates that the NLP extraction and matching pipeline is accurate
enough to trust the trend data and match scores. It is an evaluation exercise,
not a new feature — but it produces the precision/recall numbers required in the
research report.

### Task 9.1 — Build the skill extraction evaluation dataset

**Goal:** Measure how accurately the NLP service extracts skills from job descriptions.

**Process:**
1. Export 150–200 raw job postings from the `job_postings` collection — sample
   across sources: ~50 from Adzuna/Remotive (global), ~50 from TopJobs.lk,
   ~50 from XpressJobs.lk.
2. For each posting, manually read the description and write the ground-truth
   skill list (what skills are actually mentioned).
3. Store the labelled set as a JSON file:
   ```json
   [
     {
       "sourceId": "abc123",
       "source": "topjobs_lk",
       "description": "We need a developer with React, Node.js and AWS experience...",
       "ground_truth_skills": ["React", "Node.js", "AWS"]
     }
   ]
   ```
4. Save at: `nlp-service/evaluation/skill_extraction_labels.json`

**Annotation rules:**
- Only label skills explicitly mentioned, not implied.
- Use the canonical skill name (same normalisation as the extractor).
- Aim for 2 annotators on ≥ 30 items to measure inter-annotator agreement.

### Task 9.2 — Run extraction evaluation script

**File:** `nlp-service/evaluation/evaluate_extraction.py`

```python
def evaluate_skill_extraction(labels_path: str) -> dict:
    """
    Loads ground-truth labels, runs extract_skills() on each description,
    computes precision, recall, F1 per posting and macro-averaged.
    Returns { precision, recall, f1, per_source_breakdown }
    """
```

Metrics definitions:
- **Precision** = correctly extracted skills / total extracted skills
  (how many of what the extractor found were actually there?)
- **Recall** = correctly extracted skills / total ground-truth skills
  (how many of the actual skills did the extractor find?)
- **F1** = harmonic mean of precision and recall

Also compute per-source breakdown to show whether the extractor performs
differently on LK vs global postings (expected: lower recall on LK posts if
they use different terminology).

### Task 9.3 — Build the skills gap / matching evaluation dataset

**Goal:** Measure match score accuracy compared to human judgements.

**Process:**
1. Take 30–50 existing `Comparison` documents from the database.
2. For each, a human annotator reads the resume skill list and job skill list,
   assigns a match rating: `poor (0–30)`, `fair (31–60)`, `strong (61–100)`.
3. Store in: `nlp-service/evaluation/match_labels.json`
4. Compare annotator ratings against the system's `matchScore`.
5. Compute Mean Absolute Error (MAE) between human ratings and system scores.

### Task 9.4 — Document evaluation results

**File:** Add an `evaluation/README.md` summarising:
- Dataset size and sources
- Skill extraction: precision / recall / F1 (global vs LK breakdown)
- Match score: MAE vs human ratings
- Inter-annotator agreement (Cohen's Kappa if 2 annotators)
- Identified failure cases (e.g. skills the extractor misses in LK postings)
- What was fixed based on findings (e.g. added LK-specific skill patterns)

This section maps directly to the evaluation chapter of the research report.

### Task 9.5 — Add LK-specific skill patterns based on evaluation findings

**File:** `nlp-service/main.py` — extend `SKILL_PATTERNS`

After reviewing the evaluation failures from Task 9.2, add any Sri Lanka-specific
skills or local terminology that the extractor misses. Examples of what to look for:
- Local ERP systems used by Sri Lankan enterprises
- Skills mentioned in Sinhala-adjacent transliterations
- Regional certifications or tooling common in local job ads

This closes the loop: evaluate → identify gaps → fix extractor → re-evaluate.

---

## Implementation Order (Recommended)

Work top-to-bottom within each phase, but phases 1 and 2 can partially overlap:

```
Week 1:  Phase 1 (Models) + Phase 2 Tasks 2.1–2.3 (setup + config)
Week 2:  Phase 2 Tasks 2.4–2.9 (all 4 scrapers + orchestrator + processor)
Week 3:  Phase 3 (aggregation, with marketScope) + Phase 4 (ML forecasting)
Week 4:  Phase 5 (Backend API with marketScope param support)
Week 5:  Phase 6 (Frontend — trends page + market scope toggle)
Week 6:  Phase 7 (Docker) + Phase 8 (Tests)
Week 7:  Phase 9 (Labelled dataset collection + evaluation scripts)
Week 8:  Phase 9 follow-up (fix extractor based on findings, re-evaluate, document)
```

---

## Key Design Decisions & Notes

**Why extend nlp-service instead of a new service?**
The Python NLP service already has the skill extraction logic (`SKILL_PATTERNS`,
normalization), a MongoDB connection, and a Docker slot. Extending it adds
capabilities without new infra.

**Why both global and Sri Lankan jobs?**
Global/remote jobs (Adzuna, Remotive) give high volume and broad tech-stack
coverage, producing reliable trend lines quickly. Sri Lankan jobs (TopJobs.lk,
XpressJobs.lk) are lower volume but provide the localization that is the key
research differentiator. Keeping them as separate `marketScope` values means
forecasts can be generated independently — you don't need LK data to produce
global trends, and vice versa. The `combined` view merges both for users who
want the biggest possible dataset.

**Why scrape LK boards with HTML parsing instead of an API?**
Neither TopJobs.lk nor XpressJobs.lk offer a public developer API. HTML
scraping is the only programmatic option. BeautifulSoup + httpx is sufficient
for the scale needed (hundreds of listings per run, not millions).

**Why linear regression first?**
It's interpretable (slope = weekly demand change), fast to compute for 100 skills,
and has no extra dependencies. Prophet can be added later for skills with 6+ months
of data where seasonality matters.

**Why weekly buckets, not daily?**
Daily job posting counts are too noisy (Monday spikes, weekend drops). Weekly
smoothing produces cleaner trend lines while still showing month-over-month shifts.

**Data sufficiency:**
With 200 jobs/day scraping, after 4 weeks you have ~5,600 postings and enough
coverage for statistically meaningful skill frequencies. Add a UI notice if fewer
than 4 weeks of data exist: "Trend analysis improves with more data — check back
after X more weeks."

**Adzuna free tier limit:**
The free Adzuna plan gives 500 API calls/month. With pagination at 50 results/page,
that's 25,000 job listings/month. Remotive (free, unlimited) covers the rest.
Plan the scraper to hit Adzuna first, then top up with Remotive.

**Legal/ethical note:**
Both Adzuna and Remotive explicitly provide public APIs intended for
developer use. Always send a proper `User-Agent` header identifying your
application and respect rate limits in the scraper.

---

## Unique Research Contribution Summary

Most career platforms (LinkedIn, Glassdoor) show current job counts. What makes
this different:

1. **Longitudinal dataset** — you build your own skill-frequency time series from
   raw job postings, not aggregated third-party stats.
2. **Relative frequency normalization** — tracks skill share of market (skill count /
   total jobs that week), so skill trends reflect real demand shifts, not just
   hiring volume changes.
3. **Forward-facing forecasts** — users see predicted demand 8 weeks out, not just
   the current snapshot, with confidence intervals to communicate uncertainty.
4. **Personalized overlay** — cross-referencing forecasts with a user's own resume
   skills ("your Python skills are rising: +2.1%/week") makes the insight
   immediately actionable.
5. **Sri Lankan market localization** — the system scrapes TopJobs.lk and
   XpressJobs.lk to build a Sri Lanka-specific skill-demand dataset. Users can
   toggle between global/remote trends and local LK trends — addressing a gap
   where most career AI tools are calibrated for Western job markets only.
6. **Empirical evaluation with labelled data** — a manually annotated ground-truth
   dataset measures extraction precision/recall and match score accuracy, with a
   per-market breakdown (global vs LK) demonstrating where the system performs
   well and where localization improvements were made.

---

## Key Design Decisions & Notes
