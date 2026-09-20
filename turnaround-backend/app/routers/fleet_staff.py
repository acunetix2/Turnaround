from typing import Annotated
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.rbac import require_role
from app.db.models.fleet_staff import FleetStaff
from app.db.models.user import User, UserRole
from app.db.models.vehicle import Vehicle
from app.db.session import get_db
from app.deps import get_current_company
from app.schemas.fleet_staff import FleetStaffCreate, FleetStaffResponse, FleetStaffUpdate

router = APIRouter(prefix="/fleet-staff", tags=["Fleet Staff"])
ADMIN_ONLY = require_role(UserRole.ADMIN)


def _response(staff: FleetStaff, count: int = 0) -> FleetStaffResponse:
    return FleetStaffResponse(
        id=staff.id, company_id=staff.company_id, name=staff.name, phone=staff.phone,
        license_number=staff.license_number, license_expiry_date=staff.license_expiry_date,
        availability_status=staff.availability_status, staff_type=staff.staff_type, status=staff.status,
        notes=staff.notes, created_at=staff.created_at, assigned_vehicle_count=count,
    )


@router.get("", response_model=list[FleetStaffResponse])
async def list_staff(db: Annotated[AsyncSession, Depends(get_db)], company_id: Annotated[str, Depends(get_current_company)]):
    result = await db.execute(select(FleetStaff).where(FleetStaff.company_id == company_id).order_by(FleetStaff.name))
    staff = result.scalars().all()
    return [_response(entry) for entry in staff]


@router.post("", response_model=FleetStaffResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(payload: FleetStaffCreate, db: Annotated[AsyncSession, Depends(get_db)], company_id: Annotated[str, Depends(get_current_company)], _admin: bool = Depends(ADMIN_ONLY)):
    entry = FleetStaff(id=str(uuid.uuid4()), company_id=company_id, **payload.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return _response(entry)


@router.patch("/{staff_id}", response_model=FleetStaffResponse)
async def update_staff(staff_id: str, payload: FleetStaffUpdate, db: Annotated[AsyncSession, Depends(get_db)], company_id: Annotated[str, Depends(get_current_company)], _admin: bool = Depends(ADMIN_ONLY)):
    entry = (await db.execute(select(FleetStaff).where(FleetStaff.id == staff_id, FleetStaff.company_id == company_id))).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Staff member not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    await db.commit()
    await db.refresh(entry)
    return _response(entry)


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(staff_id: str, db: Annotated[AsyncSession, Depends(get_db)], company_id: Annotated[str, Depends(get_current_company)], _admin: bool = Depends(ADMIN_ONLY)):
    entry = (await db.execute(select(FleetStaff).where(FleetStaff.id == staff_id, FleetStaff.company_id == company_id))).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Staff member not found")
    await db.delete(entry)
    await db.commit()