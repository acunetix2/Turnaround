"""
Notification service — creates notifications for company-wide or user-specific events.
Called from routers after significant actions.
"""
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime, timezone

from app.db.models.notification import Notification, NotificationSeverity, NotificationCategory


async def push(
    db: AsyncSession,
    *,
    company_id: str,
    title: str,
    description: str,
    category: NotificationCategory,
    severity: NotificationSeverity = NotificationSeverity.INFO,
    user_id: Optional[str] = None,       # None = broadcast to whole company
    link: Optional[str] = None,
    meta: Optional[dict] = None,
) -> Notification:
    """Create and persist a notification. Fire-and-forget — caller does not need to await result."""
    n = Notification(
        id=str(uuid.uuid4()),
        company_id=company_id,
        user_id=user_id,
        title=title,
        description=description,
        severity=severity,
        category=category,
        link=link,
        meta=meta or {},
        read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(n)
    # No explicit commit — caller's transaction handles it
    return n


# ── Convenience helpers ───────────────────────────────────────────────────────

async def trip_dispatched(db: AsyncSession, company_id: str, trip_id: str,
                           vehicle_reg: str, origin: str, dest: str) -> None:
    await push(db, company_id=company_id, title=f"Trip Dispatched: {vehicle_reg}",
               description=f"New consignment dispatched from {origin} → {dest}.",
               category=NotificationCategory.TRIP, severity=NotificationSeverity.INFO,
               link=f"/trips/{trip_id}", meta={"trip_id": trip_id})


async def trip_status_changed(db: AsyncSession, company_id: str, trip_id: str,
                               vehicle_reg: str, new_status: str) -> None:
    label_map = {
        "in_transit": ("In Transit", NotificationSeverity.INFO),
        "completed":  ("Delivered", NotificationSeverity.LOW),
        "cancelled":  ("Cancelled", NotificationSeverity.MEDIUM),
        "delayed":    ("Delayed", NotificationSeverity.HIGH),
    }
    label, sev = label_map.get(new_status, (new_status.title(), NotificationSeverity.INFO))
    await push(db, company_id=company_id, title=f"Trip {label}: {vehicle_reg}",
               description=f"Consignment for {vehicle_reg} is now {label.lower()}.",
               category=NotificationCategory.TRIP, severity=sev,
               link=f"/trips/{trip_id}", meta={"trip_id": trip_id, "status": new_status})


async def gate_pass_issued(db: AsyncSession, company_id: str, pass_id: str,
                            pass_number: str, vehicle_reg: str, terminal: str) -> None:
    await push(db, company_id=company_id, title=f"Gate Pass Issued: {pass_number}",
               description=f"{vehicle_reg} issued entry pass for {terminal}.",
               category=NotificationCategory.GATE_PASS, severity=NotificationSeverity.INFO,
               link=f"/gate-pass/{pass_id}", meta={"pass_id": pass_id})


async def gate_pass_revoked(db: AsyncSession, company_id: str, pass_id: str,
                             pass_number: str, vehicle_reg: str) -> None:
    await push(db, company_id=company_id, title=f"Gate Pass Revoked: {pass_number}",
               description=f"Access for {vehicle_reg} has been revoked.",
               category=NotificationCategory.GATE_PASS, severity=NotificationSeverity.MEDIUM,
               link=f"/gate-pass/{pass_id}", meta={"pass_id": pass_id})


async def demurrage_flagged(db: AsyncSession, company_id: str, claim_id: str,
                             vehicle_reg: str, location: str, amount_kes: float) -> None:
    await push(db, company_id=company_id, title=f"Demurrage Flagged: {vehicle_reg}",
               description=f"Excess dwell at {location}. Estimated loss: KES {amount_kes:,.0f}.",
               category=NotificationCategory.DEMURRAGE, severity=NotificationSeverity.HIGH,
               link=f"/demurrage", meta={"claim_id": claim_id, "amount_kes": amount_kes})


async def user_added(db: AsyncSession, company_id: str, admin_id: str,
                     new_user_name: str, new_user_role: str) -> None:
    await push(db, company_id=company_id, user_id=admin_id,
               title=f"User Added: {new_user_name}",
               description=f"{new_user_name} has been added as {new_user_role.replace('_', ' ')}.",
               category=NotificationCategory.USER, severity=NotificationSeverity.INFO,
               link="/users")


async def user_suspended(db: AsyncSession, company_id: str, admin_id: str,
                          suspended_name: str) -> None:
    await push(db, company_id=company_id, user_id=admin_id,
               title=f"User Suspended: {suspended_name}",
               description=f"{suspended_name}'s account has been suspended.",
               category=NotificationCategory.USER, severity=NotificationSeverity.MEDIUM,
               link="/users")
