from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, ConfigDict
from app.db.models.vehicle import VehicleStatus, DriverStatus, MaintenanceStatus


class VehicleBase(BaseModel):
    registration_number: str = Field(..., description="Vehicle registration plate e.g. KBZ 482T")
    vehicle_type: str = Field("Semi-Trailer Truck", description="Vehicle classification")
    capacity: Optional[float] = Field(None, description="Payload capacity in tonnes")
    hourly_operating_cost: float = Field(3500.0, description="Operating cost per hour in KES")
    status: VehicleStatus = Field(VehicleStatus.ACTIVE, description="Current vehicle operational state")

    # Asset image
    image_url: Optional[str] = Field(None, description="Vehicle photo URL or base64 data URI")

    # Driver
    driver_name: Optional[str] = Field(None, description="Assigned driver full name")
    driver_phone: Optional[str] = Field(None, description="Driver phone / WhatsApp")
    driver_license: Optional[str] = Field(None, description="Driver license number")
    driver_avatar: Optional[str] = Field(None, description="Driver avatar image URL")
    driver_status: Optional[DriverStatus] = Field(None, description="Driver duty state")
    driver_id: Optional[str] = None
    co_driver_id: Optional[str] = None

    # Container / Cargo
    trailer_number: Optional[str] = Field(None, description="Trailer or chassis number")
    container_number: Optional[str] = Field(None, description="ISO container number e.g. MSCU1234567")
    container_type: Optional[str] = Field(None, description="Container size and type e.g. 40ft Dry")
    cargo_type: Optional[str] = Field(None, description="Cargo description")

    # Telematics
    telematics_provider: Optional[str] = Field(None, description="GPS tracker model or provider ID")
    tracker_imei: Optional[str] = Field(None, description="Tracker IMEI or serial number")

    # Operational
    fuel_level: Optional[int] = Field(None, ge=0, le=100, description="Fuel level percentage 0-100")
    fuel_tank_capacity_liters: Optional[float] = Field(None, gt=0)
    fuel_consumption_liters_per_100km: Optional[float] = Field(None, gt=0)
    odometer_km: Optional[int] = Field(None, description="Current odometer reading in km")
    maintenance_status: Optional[MaintenanceStatus] = Field(
        MaintenanceStatus.GOOD, description="Maintenance state of vehicle"
    )
    next_inspection_date: Optional[str] = Field(None, description="Next scheduled inspection date YYYY-MM-DD")


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    """All fields optional for PATCH requests."""
    registration_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    capacity: Optional[float] = None
    hourly_operating_cost: Optional[float] = None
    status: Optional[VehicleStatus] = None

    image_url: Optional[str] = None

    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    driver_license: Optional[str] = None
    driver_avatar: Optional[str] = None
    driver_status: Optional[DriverStatus] = None
    driver_id: Optional[str] = None
    co_driver_id: Optional[str] = None

    trailer_number: Optional[str] = None
    container_number: Optional[str] = None
    container_type: Optional[str] = None
    cargo_type: Optional[str] = None

    telematics_provider: Optional[str] = None
    tracker_imei: Optional[str] = None

    fuel_level: Optional[int] = None
    fuel_tank_capacity_liters: Optional[float] = None
    fuel_consumption_liters_per_100km: Optional[float] = None
    odometer_km: Optional[int] = None
    maintenance_status: Optional[MaintenanceStatus] = None
    next_inspection_date: Optional[str] = None

    model_config = ConfigDict(extra='ignore')  # silently drop unknown fields


class VehicleResponse(VehicleBase):
    id: str
    company_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
