import pytest

from app.engines.ai_advisor import AIAdvisorEngine


@pytest.mark.asyncio
async def test_copilot_query_distinguishes_platform_from_turnaround_time(monkeypatch):
    engine = AIAdvisorEngine(api_key="test-key")
    captured = {}

    async def fake_call(messages, temperature=0.2, max_tokens=1500):
        captured["messages"] = messages
        return "Turnaround is the logistics operating platform for fleet operations. Turnaround time is a metric measuring dwell duration."

    monkeypatch.setattr(engine, "_call_groq", fake_call)

    await engine.copilot_query(
        query="What is the Turnaround platform?",
        fleet_context={"company_name": "Demo Fleet"},
    )

    system_prompt = captured["messages"][0]["content"]
    assert "Turnaround platform" in system_prompt or "operating platform" in system_prompt.lower()
    assert "turnaround time" in system_prompt.lower()
    assert "product" in system_prompt.lower()
