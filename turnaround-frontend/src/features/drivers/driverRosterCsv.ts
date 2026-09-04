export type FleetStaffCsvRow = {
  name: string;
  phone?: string;
  license_number?: string;
  license_expiry_date?: string;
  availability_status?: 'available' | 'on_leave' | 'driving' | 'assigned' | 'unavailable';
  staff_type: 'driver' | 'co_driver' | 'maintenance_technician' | 'engineer' | 'supervisor';
  status: 'active' | 'inactive';
  notes?: string;
};

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const normalizeString = (value?: string) => (value ?? '').trim();

const normalizeStatus = (value?: string): 'active' | 'inactive' => {
  const normalized = normalizeString(value).toLowerCase();
  return normalized === 'inactive' || normalized === 'suspended' || normalized === 'off' ? 'inactive' : 'active';
};

const normalizeAvailability = (value?: string): FleetStaffCsvRow['availability_status'] => {
  const normalized = normalizeString(value).toLowerCase().replace(/\s+/g, '_');
  if (['on_leave', 'driving', 'assigned', 'unavailable'].includes(normalized)) return normalized as FleetStaffCsvRow['availability_status'];
  return 'available';
};

const normalizeStaffType = (value?: string): FleetStaffCsvRow['staff_type'] => {
  const normalized = normalizeString(value).toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'co_driver' || normalized === 'co-driver' || normalized === 'codriver' || normalized === 'co driver') return 'co_driver';
  if (normalized === 'maintenance' || normalized === 'maintenance_technician' || normalized === 'technician') return 'maintenance_technician';
  if (normalized === 'engineer' || normalized === 'engineering') return 'engineer';
  if (normalized === 'supervisor' || normalized === 'workshop_supervisor') return 'supervisor';
  return 'driver';
};

export const parseFleetStaffCsv = (csv: string): FleetStaffCsvRow[] => {
  const lines = csv
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(',').map((header) => normalizeHeader(header));
  const rows = lines.slice(1);

  return rows
    .map((row) => {
      const rawFields = row.split(',').map((field) => field.trim());
      const values = rawFields.length > headers.length ? rawFields : [...rawFields, ...Array(headers.length - rawFields.length).fill('')];

      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ?? '';
      });

      const name = normalizeString(
        record.name || record.full_name || record['full_name'] || record['employee_name'] || record['driver_name'] || record['staff_name']
      );
      if (!name) return null;

      const phone = normalizeString(record.phone || record.contact || record.mobile || record['mobile_number'] || record['phone_number']);
      const license_number = normalizeString(record.license_number || record.licence_number || record.licence || record['driver_license'] || record['license'] || record['dl_number']);
      const license_expiry_date = normalizeString(record.license_expiry_date || record.licence_expiry_date || record.expiry_date || record.license_expiry);
      const staff_type = normalizeStaffType(record.staff_type || record.role || record.type || record['staff_role']);
      const status = normalizeStatus(record.status || record.state || record['employee_status']);
      const availability_status = normalizeAvailability(record.availability_status || record.availability || record.duty_status);
      const notes = normalizeString(record.notes || record.comment || record['comments'] || record['remarks']);

      return {
        name,
        phone: phone || undefined,
        license_number: license_number || undefined,
        license_expiry_date: license_expiry_date || undefined,
        ...(record.availability_status || record.availability || record.duty_status ? { availability_status } : {}),
        staff_type,
        status,
        notes: notes || undefined,
      } satisfies FleetStaffCsvRow;
    })
    .filter((item): item is FleetStaffCsvRow => item !== null);
};
