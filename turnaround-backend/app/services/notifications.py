"""
Notification service — creates notifications for company-wide or user-specific events.
Called from routers after significant actions.
"""
from typing import Optional
import asyncio
import json
import logging
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime, timezone

from app.config import settings
from app.db.models.notification import Notification, NotificationDevice, NotificationSeverity, NotificationCategory
from app.db.models.user import User
from sqlalchemy import select, or_

logger = logging.getLogger(__name__)
_firebase_initialized = False


def _preference_field(category: NotificationCategory):
    return {
        NotificationCategory.DELAY: User.notify_on_delay,
        NotificationCategory.TRIP: User.notify_on_arrival,
        NotificationCategory.GATE_PASS: User.notify_on_gate_pass,
        NotificationCategory.DEMURRAGE: User.notify_on_demurrage,
    }.get(category)


def _firebase_messaging():
    global _firebase_initialized
    if not settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
        if not _firebase_initialized:
            credential = credentials.Certificate(json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON))
            firebase_admin.initialize_app(credential)
            _firebase_initialized = True
        return messaging
    except Exception:
        logger.exception("Firebase Admin could not be initialized")
        return None


async def _send_push(db: AsyncSession, notification: Notification) -> None:
    messaging = _firebase_messaging()
    if messaging is None:
        return
    query = select(NotificationDevice.token).join(User, User.id == NotificationDevice.user_id)
    query = query.where(User.push_notifications.is_(True))
    preference = _preference_field(notification.category)
    if preference is not None:
        query = query.where(preference.is_(True))
    if notification.user_id:
        query = query.where(NotificationDevice.user_id == notification.user_id)
    else:
        query = query.where(User.company_id == notification.company_id)
    result = await db.execute(query)
    tokens = [row[0] for row in result.all()]
    if not tokens:
        return
    message_data = {"link": notification.link or "/notifications", "notification_id": notification.id}
    for start in range(0, len(tokens), 500):
        batch = tokens[start:start + 500]
        message = messaging.MulticastMessage(
            tokens=batch,
            notification=messaging.Notification(title=notification.title, body=notification.description),
            data=message_data,
        )
        try:
            await asyncio.to_thread(messaging.send_each_for_multicast, message)
        except Exception:
            logger.exception("Firebase push delivery failed")


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
    await db.flush()
    await _send_push(db, n)
    # No explicit commit — caller's transaction handles it
    return n


# ── Convenience helpers ───────────────────────────────────────────────────────

async def trip_dispatched(db: AsyncSession, company_id: str, trip_id: str,
                           vehicle_reg: str, origin: str, dest: str) -> None:
    await push(db, company_id=company_id, title=f"Trip Dispatched: {vehicle_reg}",
               description=f"New consignment dispatched from {origin} → {dest}.",
               category=NotificationCategory.TRIP, severity=NotificationSeverity.INFO,
               link=f"/trips/{trip_id}", meta={"trip_id": trip_id})


async def trip_created(db: AsyncSession, company_id: str, trip_id: str,
                       vehicle_reg: str, origin: str, dest: str) -> None:
    await push(db, company_id=company_id, title=f"Trip Planned: {vehicle_reg}",
               description=f"New consignment planned from {origin} to {dest}.",
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
    category = NotificationCategory.DELAY if new_status == "delayed" else NotificationCategory.TRIP
    await push(db, company_id=company_id, title=f"Trip {label}: {vehicle_reg}",
               description=f"Consignment for {vehicle_reg} is now {label.lower()}.",
               category=category, severity=sev,
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


async def gate_pass_status_changed(db: AsyncSession, company_id: str, pass_id: str,
                                   pass_number: str, status: str) -> None:
    await push(db, company_id=company_id, title=f"Gate Pass Updated: {pass_number}",
               description=f"Gate pass status changed to {status.replace('_', ' ')}.",
               category=NotificationCategory.GATE_PASS, severity=NotificationSeverity.INFO,
               link=f"/gate-pass/{pass_id}", meta={"pass_id": pass_id, "status": status})


async def demurrage_flagged(db: AsyncSession, company_id: str, claim_id: str,
                             vehicle_reg: str, location: str, amount_kes: float) -> None:
    await push(db, company_id=company_id, title=f"Demurrage Flagged: {vehicle_reg}",
               description=f"Excess dwell at {location}. Estimated loss: KES {amount_kes:,.0f}.",
               category=NotificationCategory.DEMURRAGE, severity=NotificationSeverity.HIGH,
               link=f"/demurrage", meta={"claim_id": claim_id, "amount_kes": amount_kes})


async def demurrage_status_changed(db: AsyncSession, company_id: str, claim_id: str,
                                   claim_number: str, status: str) -> None:
    await push(db, company_id=company_id, title=f"Demurrage Claim Updated: {claim_number}",
               description=f"Claim status changed to {status.replace('_', ' ')}.",
               category=NotificationCategory.DEMURRAGE, severity=NotificationSeverity.INFO,
               link="/demurrage", meta={"claim_id": claim_id, "status": status})


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


async def user_activated(db: AsyncSession, company_id: str, admin_id: str,
                         activated_name: str) -> None:
    await push(db, company_id=company_id, user_id=admin_id,
               title=f"User Activated: {activated_name}",
               description=f"{activated_name}'s account has been activated.",
               category=NotificationCategory.USER, severity=NotificationSeverity.INFO,
               link="/users")
