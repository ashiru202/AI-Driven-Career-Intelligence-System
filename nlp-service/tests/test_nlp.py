"""
NLP Microservice Tests
======================
Tests for the FastAPI NLP service endpoints:
  - GET  /health
  - POST /extract-skills

Run with:
  cd nlp-service
  pip install pytest httpx
  pytest tests/ -v

Or from the project root:
  pytest nlp-service/tests/ -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# Make sure `main.py` can be imported when running from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# The service requires INTERNAL_TOKEN at import time (config.py). Tests should
# not depend on CI secrets.
os.environ.setdefault("INTERNAL_TOKEN", "pytest-internal-token")

from main import app  # noqa: E402

client = TestClient(app)


# ──────────────────────────────────────────────────────────────────────────────
# /health
# ──────────────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_returns_200(self):
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_returns_ok_status(self):
        data = client.get("/health").json()
        # Accept either {"status": "ok"} or {"ok": true}
        assert data.get("status") == "ok" or data.get("ok") is True

    def test_health_content_type_is_json(self):
        response = client.get("/health")
        assert "application/json" in response.headers.get("content-type", "")


# ──────────────────────────────────────────────────────────────────────────────
# /extract-skills
# ──────────────────────────────────────────────────────────────────────────────

class TestExtractSkills:
    # ── Basic behaviour ───────────────────────────────────────────────────────

    def test_extract_skills_returns_200(self):
        response = client.post("/extract-skills", json={"text": "We need a Python developer"})
        assert response.status_code == 200

    def test_extract_skills_returns_list(self):
        response = client.post("/extract-skills", json={"text": "We need Python and JavaScript"})
        data = response.json()
        assert "skills" in data
        assert isinstance(data["skills"], list)

    def test_known_skills_are_extracted(self):
        text = "We are looking for a JavaScript and React developer with NodeJS experience"
        data = client.post("/extract-skills", json={"text": text}).json()
        skills = [s.lower() for s in data["skills"]]
        # At least one of the well-known skills should be found
        assert any(skill in skills for skill in ("javascript", "react", "nodejs", "node.js"))

    def test_multiple_skills_extracted(self):
        text = (
            "Required: Python, Docker, Kubernetes, AWS, PostgreSQL, "
            "machine learning, REST API experience"
        )
        data = client.post("/extract-skills", json={"text": text}).json()
        assert len(data["skills"]) >= 3

    def test_skills_are_deduplicated(self):
        text = "We want python python python and javascript javascript"
        data = client.post("/extract-skills", json={"text": text}).json()
        skills = [s.lower() for s in data["skills"]]
        assert len(skills) == len(set(skills)), "Duplicate skills found in response"

    # ── Edge cases ────────────────────────────────────────────────────────────

    def test_empty_text_returns_empty_list(self):
        data = client.post("/extract-skills", json={"text": ""}).json()
        assert data.get("skills") == [] or isinstance(data.get("skills"), list)

    def test_text_with_no_skills_returns_empty_list(self):
        data = client.post("/extract-skills", json={"text": "We value teamwork and communication"}).json()
        assert isinstance(data["skills"], list)

    def test_case_insensitive_extraction(self):
        data_lower = client.post("/extract-skills", json={"text": "experience with python"}).json()
        data_upper = client.post("/extract-skills", json={"text": "experience with PYTHON"}).json()
        skills_lower = [s.lower() for s in data_lower["skills"]]
        skills_upper = [s.lower() for s in data_upper["skills"]]
        assert set(skills_lower) == set(skills_upper)

    def test_multi_word_skill_extraction(self):
        text = "Strong background in machine learning and deep learning required"
        data = client.post("/extract-skills", json={"text": text}).json()
        skills = [s.lower() for s in data["skills"]]
        assert "machine learning" in skills or "deep learning" in skills

    # ── Input validation ──────────────────────────────────────────────────────

    def test_missing_text_field_returns_422(self):
        response = client.post("/extract-skills", json={})
        # FastAPI returns 422 Unprocessable Entity for missing required fields
        assert response.status_code == 422

    def test_null_text_field_returns_422(self):
        response = client.post("/extract-skills", json={"text": None})
        assert response.status_code == 422

    def test_non_json_body_returns_error(self):
        response = client.post(
            "/extract-skills",
            content="plain text body",
            headers={"Content-Type": "text/plain"}
        )
        assert response.status_code in (400, 415, 422)

    # ── Specific skill categories ─────────────────────────────────────────────

    def test_programming_languages_extracted(self):
        text = "We need Java, Kotlin, Swift, Go and Rust developers"
        data = client.post("/extract-skills", json={"text": text}).json()
        skills = [s.lower() for s in data["skills"]]
        found = [s for s in ("java", "kotlin", "swift", "go", "rust") if s in skills]
        assert len(found) >= 2, f"Expected at least 2 languages, got: {found}"

    def test_cloud_skills_extracted(self):
        text = "Must have AWS, Azure, Docker and Kubernetes experience"
        data = client.post("/extract-skills", json={"text": text}).json()
        skills = [s.lower() for s in data["skills"]]
        found = [s for s in ("aws", "azure", "docker", "kubernetes", "k8s") if s in skills]
        assert len(found) >= 2, f"Expected cloud skills, got: {found}"

    def test_database_skills_extracted(self):
        text = "Experience with MongoDB, PostgreSQL, Redis and Elasticsearch"
        data = client.post("/extract-skills", json={"text": text}).json()
        skills = [s.lower() for s in data["skills"]]
        found = [s for s in ("mongodb", "postgresql", "postgres", "redis", "elasticsearch") if s in skills]
        assert len(found) >= 2, f"Expected DB skills, got: {found}"
