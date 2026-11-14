"""Deterministic AETHRA Core policy tests (no LLM).

Run: python3 tests/test_aethra_agent.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "apps/web"


def test_policy_cases_pass_on_node() -> None:
    proc = subprocess.run(
        [
            "node",
            "--experimental-strip-types",
            "--no-warnings",
            str(WEB / "lib/agent/run-policy-tests.ts"),
        ],
        cwd=WEB,
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise AssertionError(proc.stdout + proc.stderr)
    assert "FAIL" not in proc.stdout


def test_api_route_is_allowlisted_and_has_no_llm() -> None:
    route = (WEB / "app/api/aethra/ask/route.ts").read_text(encoding="utf-8")
    assert "orchestrateAsk" in route
    for banned in ("anthropic", "generateText"):
        assert banned not in route.lower()
    orch = (WEB / "lib/agent/orchestrate.ts").read_text(encoding="utf-8")
    assert "answerQuestion" in orch
    assert "paraphraseIsFaithful" in orch
    ask = (WEB / "lib/agent/ask.ts").read_text(encoding="utf-8")
    assert "Theil" not in ask or "do not" in ask.lower()
    assert "benjamini" not in ask.lower()


def test_cyl_register_count_matches_knowledge_claim() -> None:
    infra = json.loads(
        (WEB / "public/data/energy-infrastructure.json").read_text(encoding="utf-8")
    )
    claims = (WEB / "lib/agent/knowledge/claims.ts").read_text(encoding="utf-8")
    n = infra["counts"]["installations"]
    assert n == 652
    assert f"CYL_INCLUDED_INSTALLATIONS = {n}" in claims


def test_question_bank_has_at_least_200_cases() -> None:
    bank = (WEB / "lib/agent/knowledge/question-bank.ts").read_text(encoding="utf-8")
    assert bank.count("id:") >= 200


def test_supported_answers_must_use_real_card_ids() -> None:
    cards = json.loads((WEB / "public/data/evidence-cards.json").read_text(encoding="utf-8"))["cards"]
    ids = {c["id"] for c in cards}
    assert "gate-a-temperature-R0" in ids
    cases = (WEB / "lib/agent/policy-cases.ts").read_text(encoding="utf-8")
    assert "gate-a-temperature-R0" in cases
    assert "energy-gap-ES24" in cases


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print("PASS", name)
            except AssertionError as e:
                fails += 1
                print("FAIL", name, str(e)[:400])
    sys.exit(1 if fails else 0)
