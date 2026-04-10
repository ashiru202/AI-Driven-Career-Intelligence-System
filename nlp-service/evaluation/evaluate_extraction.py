"""
Task 9.2 — Skill Extraction Evaluation Script

Computes precision, recall, and F1 for the NLP keyword extractor against
manually annotated ground-truth labels.

Usage:
    python evaluate_extraction.py [labels_path]

    labels_path: path to skill_extraction_labels.json
                 (defaults to ./skill_extraction_labels.json)

Output:
    - Per-posting metrics printed to stdout
    - Macro-averaged overall + per-source breakdown
    - JSON result dict returned by evaluate_skill_extraction()
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

# ── Allow importing from nlp-service root ─────────────────────────────────────
NLP_ROOT = Path(__file__).resolve().parent.parent
if str(NLP_ROOT) not in sys.path:
    sys.path.insert(0, str(NLP_ROOT))

from main import extract_skills_from_text  # noqa: E402

# ── Metric helpers ────────────────────────────────────────────────────────────


def _normalize(skills: list[str]) -> set[str]:
    """Lower-case + strip for case-insensitive comparison."""
    return {s.lower().strip() for s in skills if s.strip()}


def _metrics(extracted: list[str], ground_truth: list[str]) -> dict[str, float | int]:
    extracted_norm = _normalize(extracted)
    gt_norm = _normalize(ground_truth)

    tp = len(extracted_norm & gt_norm)
    fp = len(extracted_norm - gt_norm)
    fn = len(gt_norm - extracted_norm)

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "tp": tp,
        "fp": fp,
        "fn": fn,
    }


def _macro_avg(rows: list[dict]) -> dict[str, float]:
    if not rows:
        return {"precision": 0.0, "recall": 0.0, "f1": 0.0}
    return {
        "precision": round(sum(r["precision"] for r in rows) / len(rows), 4),
        "recall": round(sum(r["recall"] for r in rows) / len(rows), 4),
        "f1": round(sum(r["f1"] for r in rows) / len(rows), 4),
    }


# ── Main evaluation function ──────────────────────────────────────────────────


def evaluate_skill_extraction(labels_path: str) -> dict[str, Any]:
    """
    Loads ground-truth labels, runs extract_skills_from_text() on each
    description, computes precision, recall, and F1 per posting and
    macro-averaged.

    Returns:
        {
            "n":                   int,
            "precision":           float,   # macro-average
            "recall":              float,
            "f1":                  float,
            "per_source_breakdown": {
                "<source>": { "n", "precision", "recall", "f1" }
            },
            "per_posting":         list[dict],   # one row per label entry
            "failure_cases":       list[dict],   # entries where recall < 0.5
        }
    """
    path = Path(labels_path)
    if not path.exists():
        raise FileNotFoundError(f"Labels file not found: {path}")

    with open(path, encoding="utf-8") as fh:
        labels = json.load(fh)

    if not labels:
        raise ValueError("Labels file is empty — add at least one annotated entry.")

    per_posting: list[dict] = []
    by_source: dict[str, list[dict]] = defaultdict(list)

    for entry in labels:
        source_id = entry.get("sourceId", "unknown")
        source = entry.get("source", "unknown")
        description = entry.get("description", "")
        ground_truth = entry.get("ground_truth_skills", [])

        extracted = extract_skills_from_text(description)
        m = _metrics(extracted, ground_truth)

        row = {
            "sourceId": source_id,
            "source": source,
            "extracted": extracted,
            "ground_truth": ground_truth,
            **m,
        }
        per_posting.append(row)
        by_source[source].append(m)

    overall = _macro_avg(per_posting)

    per_source_breakdown: dict[str, dict] = {}
    for src, rows in by_source.items():
        avg = _macro_avg(rows)
        per_source_breakdown[src] = {"n": len(rows), **avg}

    failure_cases = [r for r in per_posting if r["recall"] < 0.5]

    return {
        "n": len(labels),
        **overall,
        "per_source_breakdown": per_source_breakdown,
        "per_posting": per_posting,
        "failure_cases": failure_cases,
    }


# ── CLI entry point ────────────────────────────────────────────────────────────


def _print_report(result: dict[str, Any]) -> None:
    sep = "─" * 62

    print(f"\n{'SKILL EXTRACTION EVALUATION':^62}")
    print(sep)
    print(f"  Dataset size : {result['n']} annotated postings")
    print(f"  Precision    : {result['precision']:.2%}")
    print(f"  Recall       : {result['recall']:.2%}")
    print(f"  F1           : {result['f1']:.2%}")
    print()

    print("  Per-source breakdown:")
    for src, stats in result["per_source_breakdown"].items():
        print(
            f"    {src:<20}  n={stats['n']:>3}  "
            f"P={stats['precision']:.2%}  R={stats['recall']:.2%}  "
            f"F1={stats['f1']:.2%}"
        )
    print()

    if result["failure_cases"]:
        print(f"  Low-recall postings (recall < 50%) — {len(result['failure_cases'])} entries:")
        for fc in result["failure_cases"]:
            missed = [
                s for s in fc["ground_truth"]
                if s.lower() not in {x.lower() for x in fc["extracted"]}
            ]
            print(
                f"    [{fc['source']}] {fc['sourceId']}"
                f"  recall={fc['recall']:.2%}"
                f"  missed={missed}"
            )
    else:
        print("  No low-recall postings found.")

    print(sep)
    print()


if __name__ == "__main__":
    default_path = Path(__file__).parent / "skill_extraction_labels.json"
    labels_path = sys.argv[1] if len(sys.argv) > 1 else str(default_path)

    result = evaluate_skill_extraction(labels_path)
    _print_report(result)
