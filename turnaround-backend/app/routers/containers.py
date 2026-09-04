from typing import Annotated
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.rbac import require_role
from app.db.models.container import Container
from app.db.models.user import UserRole
from app.db.session import get_db
from app.deps import get_current_company
from app.schemas.container import ContainerCreate, ContainerResponse

router = APIRouter(prefix="/containers", tags=["Containers"])
WRITE_ROLES = require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER, UserRole.DISPATCHER)


@router.get("", response_model=list[ContainerResponse])
async def list_containers(
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
):
    result = await db.execute(select(Container).where(Container.company_id == company_id).order_by(Container.container_number))
    return result.scalars().all()


@router.post("", response_model=ContainerResponse, status_code=status.HTTP_201_CREATED)
async def create_container(
    payload: ContainerCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    company_id: Annotated[str, Depends(get_current_company)],
    _rbac: bool = Depends(WRITE_ROLES),
):
    existing = await db.execute(select(Container).where(Container.company_id == company_id, Container.container_number == payload.container_number))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Container number is already registered")
    container = Container(id=str(uuid.uuid4()), company_id=company_id, **payload.model_dump())
    db.add(container)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Container number is already registered") from exc
    await db.refresh(container)
    return container
