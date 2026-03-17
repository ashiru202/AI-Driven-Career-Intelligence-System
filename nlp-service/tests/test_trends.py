"""
Industry Trends pipeline tests — Phase 8, Task 8.1

Tests:
  - Internal endpoints require X-Internal-Token (missing → 422, wrong → 401)
  - trigger-scrape with valid token returns summary shape
  - trigger-forecast with valid token returns 200
  - Remotive scraper stats dict has correct keys and counts
  - Remotive scraper calls the Remotive API URL
  - Remotive scraper uses sourceId from job id (dedup-stable)
  - aggregate_weekly_snapshots returns week_start and calls upsert
  - compute_trend classifies rising / falling / stable
  - generate_forecast produces correct point count with valid bounds

Run with:
  cd nlp-service && pytest tests/test_trends.py -v
"""

import os
import sys
from datetime import date, datetime, timezone, timedelta
from unittest.mock import MagicMock, patch, call

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ── Suppress APScheduler startup so TestClient can import the app ──────────────
with patch("apscheduler.schedulers.asyncio.AsyncIOScheduler") as _sched_cls:
    _sched_inst = MagicMock()
    _sched_cls.return_value = _sched_inst
    import main as nlp_main  # noqa: E402

client = TestClient(nlp_main.app)

_TEST_TOKEN = "test-internal-token-for-jest-only"


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _auth(token: str = _TEST_TOKEN) -> dict:
    return {"X-Internal-Token": token}


def _make_raw_snapshot_docs(freq_seq: list, skill: str = "python") -> list:
    """
    Build raw DB documents in DESCENDING date order (newest first),
    matching what _fetch_snapshots returns after sort("periodStart", -1).

    freq_seq should be in OLDEST-to-NEWEST order (natural time order).
    The returned list is reversed so the mock "cursor" hands back newest-first,
    and the docs.reverse() inside _fetch_snapshots restores oldest-first order.
    """
    base = datetime(2026, 1, 5, tzinfo=timezone.utc)  # Monday
    docs = [
        {
            "skill": skill,
            "periodStart": base + timedelta(weeks=i),
            "relativeFreq": freq,
            "marketScope": "combined",
        }
        for i, freq in enumerate(freq_seq)
    ]
    docs.reverse()  # newest-first, as the real DB returns with sort("periodStart", -1)
    return docs


def _mock_snapshot_collection(raw_docs: list) -> MagicMock:
    """
    Return a mock pymongo collection whose query chain resolves correctly.
    Forecaster calls: .find(...).sort(...).limit(n)  then  list(cursor)
    """
    cursor = MagicMock()
    cursor.sort.return_value = cursor       # .sort() returns cursor
    cursor.limit.return_value = raw_docs    # .limit() returns the list (list()-able)
    coll = MagicMock()
    coll.find.return_value = cursor
    return coll


def _mock_remotive_http(jobs: list):
    """
    Build a mock that satisfies: httpx.Client().__enter__().get(...).json() == {"jobs": jobs}
    """
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {"jobs": jobs}

    mock_client = MagicMock()
    mock_client.__enter__ = MagicMock(return_value=mock_client)
    mock_client.__exit__ = MagicMock(return_value=False)
    mock_client.get.return_value = mock_resp
    return mock_client


def _mock_db_for_scraper(upserted: bool = True):
    """Build a mock DB whose job_postings collection returns an upsert result."""
    upsert_result = MagicMock()
    upsert_result.upserted_id = "new_id_abc" if upserted else None
    mock_coll = MagicMock()
    mock_coll.update_one.return_value = upsert_result
    mock_db = MagicMock()
    mock_db.__getitem__ = MagicMock(return_value=mock_coll)
    return mock_db, mock_coll


_FAKE_JOBS = [
    {
        "id": 1001,
        "title": "Senior Python Developer",
        "company_name": "Acme Corp",
        "candidate_required_location": "Worldwide",
        "description": "Python Django PostgreSQL experience required.",
        "publication_date": "2026-03-01T00:00:00Z",
    },
    {
        "id": 1002,
        "title": "DevOps Engineer",
        "company_name": "TechCo",
        "candidate_required_location": "Remote",
        "description": "Kubernetes Docker Terraform skills needed.",
        "publication_date": "2026-03-02T00:00:00Z",
    },
]


# ─── Internal endpoint authentication ─────────────────────────────────────────

class TestInternalEndpointsRequireToken:
    """
    Internal endpoints use FastAPI Header(...) (required).
    - Missing header → 422 (FastAPI validation error; the field is required)
    - Wrong header value → 401 (dependency raises HTTPException)
    """

    def test_trigger_scrape_missing_token_rejected(self):
        res = client.post("/internal/trigger-scrape")
        # FastAPI returns 422 when a required Header field is absent
        assert res.status_code == 422

    def test_trigger_scrape_wrong_token_returns_401(self):
        res = client.post("/internal/trigger-scrape", headers={"X-Internal-Token": "bad-secret"})
        assert res.status_code == 401

    def test_trigger_forecast_missing_token_rejected(self):
        res = client.post("/internal/trigger-forecast")
        assert res.status_code == 422

    def test_scrape_status_missing_token_rejected(self):
        res = client.get("/internal/scrape-status")
        assert res.status_code == 422


# ─── Internal trigger endpoints with valid token ───────────────────────────────

class TestInternalTriggerWithToken:
    """trigger-* endpoints with a valid token must succeed."""

    def test_trigger_scrape_returns_ok_true(self):
        scrape_result  = {"scraped": 20, "inserted": 18, "skipped": 2,
                          "by_source": {"remotive": {"scraped": 20, "inserted": 18, "skipped": 2}}}
        process_result = {"processed_count": 18, "skills_found": 72}

        with (
            patch.object(nlp_main, "INTERNAL_TOKEN", _TEST_TOKEN),
            patch("scrapers.orchestrator.run_scrape",         return_value=scrape_result),
            patch("processor.process_unprocessed_jobs",       return_value=process_result),
        ):
            res = client.post("/internal/trigger-scrape", headers=_auth())

        assert res.status_code == 200
        body = res.json()
        assert body.get("ok") is True

    def test_trigger_forecast_returns_ok_true(self):
        forecast_result = {"refreshed": 60, "skipped": 5, "errors": 0, "skills": ["python"]}

        with (
            patch.object(nlp_main, "INTERNAL_TOKEN", _TEST_TOKEN),
            patch("forecaster.refresh_all_forecasts", return_value=forecast_result),
        ):
            res = client.post("/internal/trigger-forecast", headers=_auth())

        assert res.status_code == 200
        assert res.json().get("ok") is True


# ─── Remotive scraper ──────────────────────────────────────────────────────────

class TestRemotiveScraper:
    """
    scrapers.remotive.scrape() uses httpx.Client and upserts into MongoDB.
    Tests verify the returned stats dict shape and dedup behaviour.
    """

    def test_scraper_returns_stats_dict(self):
        mock_client = _mock_remotive_http(_FAKE_JOBS)
        mock_db, _ = _mock_db_for_scraper(upserted=True)

        with (
            patch("scrapers.remotive.httpx.Client", return_value=mock_client),
            patch("scrapers.remotive.get_db",       return_value=mock_db),
        ):
            from scrapers.remotive import scrape
            result = scrape(max_jobs=50)

        assert isinstance(result, dict)
        for key in ("scraped", "inserted", "skipped"):
            assert key in result, f"Missing key '{key}' in scrape stats"

    def test_scraper_counts_match_jobs(self):
        mock_client = _mock_remotive_http(_FAKE_JOBS)
        mock_db, _ = _mock_db_for_scraper(upserted=True)

        with (
            patch("scrapers.remotive.httpx.Client", return_value=mock_client),
            patch("scrapers.remotive.get_db",       return_value=mock_db),
        ):
            from scrapers.remotive import scrape
            result = scrape(max_jobs=50)

        total = result["inserted"] + result["skipped"]
        assert total == result["scraped"], "inserted + skipped must equal scraped"

    def test_scraper_uses_job_id_as_source_id(self):
        """The scraper upserts on { sourceId: str(job["id"]), source: 'remotive' }."""
        mock_client = _mock_remotive_http([_FAKE_JOBS[0]])
        mock_db, mock_coll = _mock_db_for_scraper(upserted=True)

        with (
            patch("scrapers.remotive.httpx.Client", return_value=mock_client),
            patch("scrapers.remotive.get_db",       return_value=mock_db),
        ):
            from scrapers.remotive import scrape
            scrape(max_jobs=50)

        # update_one must have been called with the expected filter
        assert mock_coll.update_one.called
        filter_arg = mock_coll.update_one.call_args[0][0]
        assert filter_arg["sourceId"] == str(_FAKE_JOBS[0]["id"])
        assert filter_arg["source"] == "remotive"

    def test_scraper_stable_source_ids_on_same_input(self):
        """Calling scrape twice with identical API data must use identical sourceIds (dedup-safe)."""
        mock_client_a = _mock_remotive_http([_FAKE_JOBS[0]])
        mock_db_a, mock_coll_a = _mock_db_for_scraper(upserted=True)

        mock_client_b = _mock_remotive_http([_FAKE_JOBS[0]])
        mock_db_b, mock_coll_b = _mock_db_for_scraper(upserted=False)

        with (
            patch("scrapers.remotive.httpx.Client", return_value=mock_client_a),
            patch("scrapers.remotive.get_db",       return_value=mock_db_a),
        ):
            from scrapers.remotive import scrape
            scrape(max_jobs=50)
        filter_a = mock_coll_a.update_one.call_args[0][0]["sourceId"]

        with (
            patch("scrapers.remotive.httpx.Client", return_value=mock_client_b),
            patch("scrapers.remotive.get_db",       return_value=mock_db_b),
        ):
            from scrapers.remotive import scrape  # re-import in case of caching
            scrape(max_jobs=50)
        filter_b = mock_coll_b.update_one.call_args[0][0]["sourceId"]

        assert filter_a == filter_b, "Same job must produce the same sourceId on every run"


# ─── Weekly aggregation ────────────────────────────────────────────────────────

class TestAggregateWeeklySnapshots:
    """aggregate_weekly_snapshots() counts skills and upserts snapshots."""

    def _fake_db(self, job_docs: list) -> tuple:
        cursor = MagicMock()
        cursor.__iter__ = MagicMock(return_value=iter(job_docs))
        job_coll = MagicMock()
        job_coll.find.return_value = cursor
        job_coll.count_documents.return_value = len(job_docs)

        snap_coll = MagicMock()
        snap_coll.update_one = MagicMock()

        db = {"job_postings": job_coll, "skill_snapshots": snap_coll}
        return db, snap_coll

    def test_aggregate_returns_week_start(self):
        target = date(2026, 3, 9)
        db, _ = self._fake_db([
            {"_id": "j1", "extractedSkills": ["python", "react"], "marketScope": "global", "processed": True},
        ])
        with patch("aggregator.get_db", return_value=db):
            from aggregator import aggregate_weekly_snapshots
            result = aggregate_weekly_snapshots(target_week_start=target)

        assert result is not None
        assert "week_start" in result

    def test_aggregate_upserts_into_snapshots(self):
        target = date(2026, 3, 9)
        db, snap_coll = self._fake_db([
            {"_id": "j1", "extractedSkills": ["python", "docker"], "marketScope": "global", "processed": True},
            {"_id": "j2", "extractedSkills": ["python"],            "marketScope": "global", "processed": True},
        ])
        with patch("aggregator.get_db", return_value=db):
            from aggregator import aggregate_weekly_snapshots
            aggregate_weekly_snapshots(target_week_start=target)

        assert snap_coll.update_one.called, "Expected update_one to be called (at least one skill upserted)"


# ─── Linear trend classifier ───────────────────────────────────────────────────

class TestComputeTrend:
    """compute_trend classifies rising / falling / stable from weekly snapshot data."""

    def _run(self, freq_seq: list, skill: str = "test-skill") -> dict:
        raw_docs = _make_raw_snapshot_docs(freq_seq, skill=skill)
        coll = _mock_snapshot_collection(raw_docs)
        with patch("forecaster.get_db", return_value={"skill_snapshots": coll}):
            from forecaster import compute_trend
            return compute_trend(skill, weeks=len(freq_seq))

    def test_rising_trend(self):
        result = self._run([0.01, 0.02, 0.03, 0.04, 0.05], skill="rust")
        assert result["direction"] == "rising", f"Expected rising, got: {result}"
        assert result["slope"] > 0

    def test_falling_trend(self):
        result = self._run([0.05, 0.04, 0.03, 0.02, 0.01], skill="cobol")
        assert result["direction"] == "falling", f"Expected falling, got: {result}"
        assert result["slope"] < 0

    def test_stable_trend(self):
        result = self._run([0.03, 0.03, 0.03, 0.03, 0.03], skill="sql")
        assert result["direction"] == "stable", f"Expected stable, got: {result}"

    def test_result_contains_required_keys(self):
        result = self._run([0.02, 0.03, 0.04, 0.05, 0.06], skill="go")
        for key in ("skill", "slope", "r_squared", "direction", "data_points_used"):
            assert key in result, f"Missing key: '{key}'"


# ─── Forecast generator ────────────────────────────────────────────────────────

class TestGenerateForecast:
    """generate_forecast produces the right number of future points with valid bounds."""

    def _run(self, weeks_ahead: int = 8, history_weeks: int = 16) -> dict:
        raw_docs = _make_raw_snapshot_docs(
            [0.02 + i * 0.001 for i in range(history_weeks)], skill="python"
        )
        coll = _mock_snapshot_collection(raw_docs)
        with patch("forecaster.get_db", return_value={"skill_snapshots": coll}):
            from forecaster import generate_forecast
            return generate_forecast("python", weeks_ahead=weeks_ahead, history_weeks=history_weeks)

    def test_forecast_generates_correct_number_of_points(self):
        result = self._run(weeks_ahead=8)
        assert "forecast" in result
        assert len(result["forecast"]) == 8

    def test_forecast_confidence_bounds_valid(self):
        """For every future point: lower_bound <= predicted_freq <= upper_bound."""
        result = self._run(weeks_ahead=8)
        for pt in result["forecast"]:
            lb, pf, ub = pt["lower_bound"], pt["predicted_freq"], pt["upper_bound"]
            assert lb <= pf <= ub, f"Bounds violated — lower={lb}, predicted={pf}, upper={ub}"

    def test_forecast_contains_historical_points(self):
        result = self._run(history_weeks=16)
        assert "historical" in result
        assert len(result["historical"]) > 0

    def test_forecast_result_shape(self):
        result = self._run()
        for key in ("skill", "model_used", "trend_direction"):
            assert key in result, f"Missing key: '{key}'"
        assert result["trend_direction"] in ("rising", "falling", "stable")
