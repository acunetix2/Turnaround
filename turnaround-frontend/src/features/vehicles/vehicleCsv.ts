export type VehicleCsvRow = {
  registration_number: string;
  vehicle_type: string;
  capacity: number;
  hourly_operating_cost: number;
  status: 'active' | 'idle' | 'maintenance' | 'in_transit' | 'delayed';
  fuel_level?: number;
  fuel_tank_capacity_liters?: number;
  fuel_consumption_liters_per_100km?: number;
  odometer_km?: number;
  maintenance_status?: 'good' | 'due_soon' | 'in_service';
  next_inspection_date?: string;
};

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const text = (value?: string) => (value ?? '').trim();
const number = (value: string | undefined, fallback: number) => {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const optionalNumber = (value?: string) => {
  const raw = text(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeStatus = (value?: string): VehicleCsvRow['status'] => {
  const raw = text(value).toLowerCase().replace(/\s+/g, '_');
  if (raw === 'moving') return 'in_transit';
  if (raw === 'stationary') return 'idle';
  if (['active', 'idle', 'maintenance', 'in_transit', 'delayed'].includes(raw)) return raw as VehicleCsvRow['status'];
  return 'idle';
};

const normalizeMaintenance = (value?: string): VehicleCsvRow['maintenance_status'] => {
  const raw = text(value).toLowerCase().replace(/\s+/g, '_');
  if (raw === 'due' || raw === 'due_soon') return 'due_soon';
  if (raw === 'in_service' || raw === 'service' || raw === 'maintenance') return 'in_service';
  return 'good';
};

export const parseVehicleCsv = (csv: string): VehicleCsvRow[] => {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const fields = line.split(',').map((field) => field.trim());
    const record: Record<string, string> = {};
    headers.forEach((header, index) => { record[header] = fields[index] ?? ''; });

    const registration_number = text(record.registration_number || record.registration || record.plate_number || record.plate || record.reg_no);
    const vehicle_type = text(record.vehicle_type || record.asset_type || record.type) || 'Truck';
    if (!registration_number) return null;

    return {
      registration_number,
      vehicle_type,
      capacity: number(record.capacity || record.capacity_tonnes, 0),
      hourly_operating_cost: number(record.hourly_operating_cost || record.operating_cost, 0),
      status: normalizeStatus(record.status || record.asset_status),
      fuel_level: optionalNumber(record.fuel_level || record.fuel_percent || record.fuel_percentage),
      fuel_tank_capacity_liters: optionalNumber(record.fuel_tank_capacity_liters || record.tank_capacity_liters || record.tank_liters),
      fuel_consumption_liters_per_100km: optionalNumber(record.fuel_consumption_liters_per_100km || record.fuel_consumption || record.liters_per_100km),
      odometer_km: optionalNumber(record.odometer_km || record.odometer),
      maintenance_status: normalizeMaintenance(record.maintenance_status || record.maintenance),
      next_inspection_date: text(record.next_inspection_date || record.inspection_date) || undefined,
    } satisfies VehicleCsvRow;
  }).filter((row): row is VehicleCsvRow => row !== null)
    .map((row) => ({
      ...row,
      fuel_level: row.fuel_level,
      odometer_km: row.odometer_km,
    }));
};
