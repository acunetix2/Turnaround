"""
Background sweep task — expires stale gate passes every 15 minutes.

A gate pass is stale when:
  status = PRE_APPROVED  AND  time_window_end < now (UTC)

This runs as an asyncio background task started in the FastAPI lifespan.
The lazy expiry in the router handles individual reads; this sweep handles
passes that are never fetched (e.g. abandoned passes on old trips).
"""
import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory as AsyncSessionLocal
from app.db.models.gate_pass import GatePass, GatePassStatus

logger = logging.getLogger("turnaround.expiry_sweep")

SWEEP_INTERVAL_SECONDS = 15 * 60  # 15 minutes


async def _run_expiry_sweep() -> int:
    """Bulk-expire stale pre-approved gate passes. Returns count of rows updated."""
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        result = await db.execute(
            update(GatePass)
            .where(
                GatePass.status == GatePassStatus.PRE_APPROVED,
                GatePass.time_window_end < now,
            )
            .values(status=GatePassStatus.EXPIRED, updated_at=now)
            .returning(GatePass.id)
        )
        expired_ids = result.fetchall()
        count = len(expired_ids)
        if count:
            await db.commit()
            logger.info(f"Expiry sweep: expired {count} stale gate pass(es)")
        return count


async def start_expiry_sweep_loop() -> None:
    """
    Long-running background coroutine — call once from the FastAPI lifespan.
    Runs the expiry sweep every SWEEP_INTERVAL_SECONDS.
    """
    logger.info("Gate pass expiry sweep loop started (interval: 15 min)")
    while True:
        try:
            await _run_expiry_sweep()
        except Exception as exc:
            logger.error(f"Expiry sweep error: {exc}", exc_info=True)
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
