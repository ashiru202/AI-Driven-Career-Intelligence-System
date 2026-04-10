# Evaluation — AI-Driven Career Intelligence System

This directory contains the labelled datasets and evaluation scripts used to
measure the accuracy of the NLP extraction and skill-matching pipeline.  The
results feed directly into the evaluation chapter of the research report.

---

## Directory Structure

```
evaluation/
├── skill_extraction_labels.json   Task 9.1 — annotated job postings
├── evaluate_extraction.py         Task 9.2 — precision / recall / F1 script
├── match_labels.json              Task 9.3 — human-rated match comparisons
├── evaluate_match.py              Task 9.3 — MAE script
└── README.md                      This file (Task 9.4)
```

---

## Running the Evaluations

### Skill Extraction Evaluation

```bash
cd nlp-service
python evaluation/evaluate_extraction.py
# or specify a custom labels file:
python evaluation/evaluate_extraction.py path/to/skill_extraction_labels.json
```

### Match Score Evaluation

```bash
cd nlp-service
python evaluation/evaluate_match.py
# or specify a custom labels file:
python evaluation/evaluate_match.py path/to/match_labels.json
```

---

## Dataset — Skill Extraction (Task 9.1)

### Annotation Process

1. Exported raw job postings from the `job_postings` MongoDB collection.
2. Sampled across all four sources for coverage.
3. For each posting, a human annotator read the description and listed every
   skill **explicitly mentioned** (not implied).
4. Canonical skill names follow the same normalisation used by the extractor
   (e.g. "JS" → "JavaScript", "k8s" → "Kubernetes").
5. Items marked with `REPLACE_WITH_REAL_ID_*` are placeholder examples —
   replace them with real exported entries before running the evaluation.

### Annotation Rules

- Label only skills **explicitly mentioned**, not skills that can be inferred
  from context (e.g. if the job mentions "React", do **not** auto-label "JavaScript").
- Use the **canonical** skill name (see `SKILL_PATTERNS` / `skill_map` in `main.py`).
- For inter-annotator agreement, aim for at least 2 annotators on ≥ 30 items.

### Dataset Size & Source Breakdown

> **Fill in after collecting real labels:**

| Source         | Count | Notes                              |
|----------------|-------|------------------------------------|
| topjobs_lk     | XX    | Sri Lankan domestic postings       |
| xpressjobs_lk  | XX    | Sri Lankan domestic postings       |
| adzuna         | XX    | Global / remote postings           |
| remotive       | XX    | Global / remote postings           |
| **Total**      | **XX** |                                   |

Target: 150–200 annotated postings.

---

## Skill Extraction Results (Task 9.2)

> **Fill in after running `evaluate_extraction.py`:**

### Overall (macro-averaged)

| Metric    | Score |
|-----------|-------|
| Precision | XX%   |
| Recall    | XX%   |
| F1        | XX%   |

### Per-Source Breakdown

| Source         | n   | Precision | Recall | F1    |
|----------------|-----|-----------|--------|-------|
| topjobs_lk     | XX  | XX%       | XX%    | XX%   |
| xpressjobs_lk  | XX  | XX%       | XX%    | XX%   |
| adzuna         | XX  | XX%       | XX%    | XX%   |
| remotive       | XX  | XX%       | XX%    | XX%   |

### Key Findings

> **Fill in after analysis:**

- LK postings showed lower recall because …
- The extractor missed the following skill terms in LK ads: …
- Global postings showed higher F1 because …

---

## Dataset — Match Score (Task 9.3)

### Annotation Process

1. Selected 30–50 `Comparison` documents from MongoDB spanning a range of
   match scores (low / mid / high).
2. For each, an annotator reviewed the resume skill list and job skill list
   and assigned a **human rating band**:
   - `poor` (0–30)
   - `fair`  (31–60)
   - `strong` (61–100)
3. Also recorded a numeric score within the band for MAE computation.

### Dataset Size

> **Fill in after collecting real labels:**

| Band   | Count |
|--------|-------|
| poor   | XX    |
| fair   | XX    |
| strong | XX    |
| Total  | XX    |

---

## Match Score Results (Task 9.3)

> **Fill in after running `evaluate_match.py`:**

### Overall

| Metric      | Value         |
|-------------|---------------|
| MAE         | XX.X points   |
| RMSE        | XX.X points   |
| Mean error  | ±XX.X points  |

### Per Rating-Band

| Band   | n  | MAE  | RMSE |
|--------|----|------|------|
| poor   | XX | XX.X | XX.X |
| fair   | XX | XX.X | XX.X |
| strong | XX | XX.X | XX.X |

### Inter-Annotator Agreement

> Only applicable if ≥ 2 annotators rated the same comparisons.

| Metric        | Value |
|---------------|-------|
| Cohen's Kappa | XX    |
| Interpretation | Slight / Fair / Moderate / Substantial / Almost Perfect |

A kappa ≥ 0.60 is considered acceptable for this task.

---

## Identified Failure Cases

> **Fill in after reviewing `evaluate_extraction.py` output's `failure_cases` list:**

### Skill Extraction Failures

Skills commonly missed in LK job postings:

| Missed Skill     | Source        | Frequency | Root Cause                     |
|------------------|---------------|-----------|-------------------------------|
| Temenos T24      | topjobs_lk    | XX        | Not in SKILL_PATTERNS          |
| SAP FICO         | topjobs_lk    | XX        | Variant "sap-fico" not matched |
| Crystal Reports  | xpressjobs_lk | XX        | Multi-word pattern missing     |
| …                | …             | …         | …                              |

### Match Score Discrepancies

Cases where system and human ratings diverged by > 20 points:

| Pattern                    | System tendency | Root cause                      |
|----------------------------|-----------------|---------------------------------|
| Semantic synonyms (e.g. TF vs PyTorch) | Under-estimates | Keyword fallback active |
| Adjacent skills (K8s → CI/CD) | Under-estimates | No skill inference |
| …                          | …               | …                               |

---

## Fixes Applied (Task 9.5)

Based on the evaluation findings, the following changes were made to the
extractor in `nlp-service/main.py`:

### LK-Specific Skill Patterns Added to `SKILL_PATTERNS`

| Pattern Added            | Reason                                              |
|--------------------------|-----------------------------------------------------|
| `temenos`, `t24`         | Widely used in Sri Lankan banking sector            |
| `sap s/4hana`            | Common SAP module variant in SL enterprise ads      |
| `crystal reports`        | Common BI tool in SL finance roles                  |
| `power bi`               | High frequency in LK BI/analytics roles             |
| `togaf`, `prince2`       | Common certifications in LK IT management ads       |
| `ifs`                    | IFS Applications used in SL manufacturing           |
| `flexcube`               | Oracle banking platform in SL banks                 |
| *(see main.py for full list)* |                                                |

### Re-Evaluation After Fix

> **Fill in after re-running `evaluate_extraction.py` post-fix:**

| Metric    | Before | After | Delta |
|-----------|--------|-------|-------|
| Precision | XX%    | XX%   | +XX%  |
| Recall    | XX%    | XX%   | +XX%  |
| F1        | XX%    | XX%   | +XX%  |

---

*Evaluation conducted: 2026-03-16*
