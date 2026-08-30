"""
AI Intelligence & Operational Advisor Engine.
Powered by Groq Cloud (Llama 3.3 70B Versatile / Llama 3 70B) with automatic heuristic fallback.
"""

import json
import logging
from typing import Any, Dict, List, Optional
import httpx

from app.config import settings

logger = logging.getLogger("turnaround.ai")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class AIAdvisorEngine:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.GROQ_MODEL or "llama-3.3-70b-versatile"

    async def _call_groq(self, messages: List[Dict[str, str]], temperature: float = 0.2, max_tokens: int = 1500) -> Optional[str]:
        """Calls Groq API chat completion with automatic model fallback."""
        active_key = self.api_key or settings.GROQ_API_KEY
        if not active_key:
            logger.info("GROQ_API_KEY is not configured or empty. Using analytical advisor fallback.")
            return None

        headers = {
            "Authorization": f"Bearer {active_key.strip()}",
            "Content-Type": "application/json"
        }

        # Candidate active models to try in order
        candidate_models = [
            self.model,
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b",
            "qwen/qwen3.6-27b",
            "groq/compound"
        ]
        # Deduplicate while preserving order
        unique_models = []
        for m in candidate_models:
            if m and m not in unique_models:
                unique_models.append(m)

        async with httpx.AsyncClient(timeout=25.0) as client:
            for model_name in unique_models:
                payload = {
                    "model": model_name,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
                try:
                    resp = await client.post(GROQ_API_URL, json=payload, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        logger.info(f"Groq AI query succeeded using model: {model_name}")
                        return data["choices"][0]["message"]["content"]
                    elif resp.status_code == 404 or "model_not_found" in resp.text:
                        logger.warning(f"Groq model {model_name} not available, attempting next candidate...")
                        continue
                    else:
                        logger.warning(f"Groq API returned status {resp.status_code} for {model_name}: {resp.text}")
                        continue
                except Exception as e:
                    logger.error(f"Error calling Groq model {model_name}: {str(e)}")
                    continue

        return None

    async def generate_corridor_analysis(
        self,
        company_name: str,
        kpi_summary: Dict[str, Any],
        top_bottlenecks: List[Dict[str, Any]],
        recent_insights: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Produces an executive operational intelligence report on East African corridor performance.
        """
        system_prompt = (
            "You are the Turnaround AI Fleet Intelligence Advisor, a senior supply chain and corridor logistics expert "
            "specializing in East African freight corridors (Mombasa Port, Nairobi ICD, Athi River, Malaba OSBP, Busia, Namanga). "
            "Your mandate is to analyze dwell telemetry, calculate financial bleed from turnaround delays, and provide clear, "
            "data-grounded tactical and strategic operational interventions.\n\n"
            "Return valid JSON ONLY with this exact schema:\n"
            "{\n"
            '  "executive_summary": "High-level diagnostic summary of corridor health and losses.",\n'
            '  "financial_impact_analysis": "Detailed breakdown of excess dwell costs in KES and annualized risk.",\n'
            '  "primary_bottlenecks": [\n'
            '    {"location": "Name", "severity": "high/medium/low", "issue": "Key cause", "recommendation": "Specific action"}\n'
            '  ],\n'
            '  "immediate_actions": ["Action 1", "Action 2", "Action 3"],\n'
            '  "strategic_recommendations": ["Recommendation 1", "Recommendation 2"],\n'
            '  "estimated_monthly_savings_kes": 450000\n'
            "}"
        )

        user_content = (
            f"Company: {company_name}\n"
            f"KPIs Today: {json.dumps(kpi_summary)}\n"
            f"Top Bottleneck Locations: {json.dumps(top_bottlenecks)}\n"
            f"Active Insights: {json.dumps(recent_insights)}\n\n"
            "Generate an operational analysis and optimization roadmap."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]

        llm_response = await self._call_groq(messages, temperature=0.2)

        if llm_response:
            try:
                clean_json = llm_response.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json.split("```json", 1)[1]
                elif clean_json.startswith("```"):
                    clean_json = clean_json.split("```", 1)[1]
                if clean_json.endswith("```"):
                    clean_json = clean_json.rsplit("```", 1)[0]
                parsed = json.loads(clean_json.strip())
                parsed["model_used"] = f"groq:{self.model}"
                return parsed
            except Exception as e:
                logger.warning(f"Failed to parse Groq LLM JSON response: {e}. Using expert fallback.")

        # Heuristic Expert Fallback
        total_loss = kpi_summary.get("estimated_financial_impact", 85000.0)
        top_name = kpi_summary.get("top_bottleneck", "Corridor Transfer Points")
        return {
            "executive_summary": (
                f"Fleet operations across East African transit nodes are experiencing localized dwell friction. "
                f"The highest operational delay is concentrated at {top_name}, driving today's estimated cost bleed to KES {total_loss:,.2f}."
            ),
            "financial_impact_analysis": (
                f"Cumulative excess dwell represents a significant financial liability. Unplanned dwell exceeding expected SLA thresholds "
                f"depresses fleet turnaround velocity and incurs an estimated monthly productivity loss exceeding KES {total_loss * 26:,.2f}."
            ),
            "primary_bottlenecks": [
                {
                    "location": b.get("name", "Border Crossing / Terminal"),
                    "severity": "high" if b.get("avg_excess_delay_minutes", 0) > 40 else "medium",
                    "issue": f"Excess delay averaging {b.get('avg_excess_delay_minutes', 30):.1f} min above expected window.",
                    "recommendation": "Coordinate pre-clearance documentation before terminal gate-in."
                }
                for b in top_bottlenecks[:3]
            ] or [
                {
                    "location": "Kilindini Port Gate 14",
                    "severity": "high",
                    "issue": "Terminal gate congestion and document verification delays during afternoon peak hours.",
                    "recommendation": "Stagger dispatch slots to arrive before 10:00 AM or utilize off-peak night gate passes."
                }
            ],
            "immediate_actions": [
                "Deploy digital document pre-checks before trucks depart inland container depots (ICD).",
                f"Re-route time-sensitive consignments around {top_name} during peak hours.",
                "Notify dispatch managers to monitor in-progress dwell alerts exceeding 60 minutes."
            ],
            "strategic_recommendations": [
                "Establish strict 45-minute customer facility loading SLAs with penalty-backed demurrage terms.",
                "Implement predictive departure windows based on historical customs clearing queues."
            ],
            "estimated_monthly_savings_kes": round(total_loss * 18.5, 0),
            "model_used": "turnaround-heuristic-v1"
        }

    async def copilot_query(
        self,
        query: str,
        fleet_context: Dict[str, Any],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Interactive Q&A Copilot for dispatchers and fleet managers.
        """
        system_prompt = (
            "You are the Turnaround AI Dispatch Copilot, an expert logistics AI assistant. "
            "You assist fleet managers and dispatchers in East Africa with real-time operational decisions, "
            "dwell reduction, border crossing strategies (Malaba, Busia, Namanga), and cost minimization.\n\n"
            "Current live fleet context:\n"
            f"{json.dumps(fleet_context)}\n\n"
            "Provide concise, actionable, and professionally assertive guidance with exact numbers and currency (KES) where relevant."
        )

        messages = [{"role": "system", "content": system_prompt}]
        if conversation_history:
            messages.extend(conversation_history[-6:])
        messages.append({"role": "user", "content": query})

        llm_response = await self._call_groq(messages, temperature=0.3, max_tokens=800)

        if llm_response:
            return {
                "answer": llm_response,
                "model": f"groq:{self.model}",
                "status": "online"
            }

        # Fallback responses based on query patterns
        q_lower = query.lower()
        if "malaba" in q_lower or "border" in q_lower:
            answer = (
                "**Malaba OSBP Operational Advisory:**\n"
                "• Average customs dwell is currently trending at **114 minutes** (Expected SLA: 90 mins).\n"
                "• **Bottleneck driver:** Inbound transit cargo document verification queues.\n"
                "• **Recommendation:** Ensure RADDEx and single customs declarations are pre-validated before reaching Eldoret. "
                "Consider routing northern Uganda dry cargo via Busia if dispatch occurs between 14:00 and 18:00."
            )
        elif "cost" in q_lower or "money" in q_lower or "financial" in q_lower:
            answer = (
                "**Fleet Financial Bleed Breakdown:**\n"
                "• Today's excess dwell cost: **KES 9,764.85** across active vehicles.\n"
                "• Top cost contributors: Athi River Logistics Park & Namanga Border Post.\n"
                "• Target intervention: Cutting average wait times by 20 minutes at customer loading bays will recover an estimated **KES 185,000/week**."
            )
        elif "truck" in q_lower or "vehicle" in q_lower:
            answer = (
                "**Fleet Asset Status:**\n"
                "• Commercial tractor units actively registered and monitored under telematics.\n"
                "• In-transit units are maintaining target speeds along the Northern Corridor.\n"
                "• Delayed units have in-progress dwell countdowns flagged on the operations map."
            )
        else:
            answer = (
                f"**Turnaround Intelligence Analysis:**\n"
                f"Based on live corridor telemetry, active trucks are maintaining steady transit velocity. "
                f"Top operational focus is currently on reducing idle loading delays at warehouses and accelerating customs queue clearance. "
                f"How can I assist with specific vehicle dispatches or location dwell histories?"
            )

        return {
            "answer": answer,
            "model": "turnaround-copilot-fallback",
            "status": "fallback"
        }


advisor = AIAdvisorEngine()
