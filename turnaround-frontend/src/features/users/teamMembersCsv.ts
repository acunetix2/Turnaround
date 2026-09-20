export type TeamMemberCsvRow = {
  name: string;
  email?: string;
  role: 'admin' | 'fleet_manager' | 'dispatcher' | 'driver' | 'analyst' | 'viewer';
  phone?: string;
  status: 'active' | 'inactive';
};

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const normalizeString = (value?: string) => (value ?? '').trim();

const normalizeStatus = (value?: string): 'active' | 'inactive' => {
  const raw = normalizeString(value).toLowerCase();
  return raw === 'inactive' || raw === 'pending' || raw === 'invited' || raw === 'suspended' ? 'inactive' : 'active';
};

const normalizeRole = (value?: string): TeamMemberCsvRow['role'] => {
  const raw = normalizeString(value).toLowerCase().replace(/\s+/g, '_');

  const aliasMap: Record<string, TeamMemberCsvRow['role']> = {
    admin: 'admin',
    ceo: 'admin',
    chief_executive: 'admin',
    executive: 'admin',
    fleet_manager: 'fleet_manager',
    fleetmanager: 'fleet_manager',
    dispatcher: 'dispatcher',
    dispatch: 'dispatcher',
    driver: 'driver',
    analyst: 'analyst',
    viewer: 'viewer',
    read_only: 'viewer',
  };

  return aliasMap[raw] ?? 'viewer';
};

export const parseTeamMembersCsv = (csv: string): TeamMemberCsvRow[] => {
  const lines = csv
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((header) => normalizeHeader(header));
  const rows = lines.slice(1);

  return rows
    .map((row) => {
      const rawFields = row.split(',').map((field) => field.trim());
      const values = rawFields.length > headers.length ? rawFields : [...rawFields, ...Array(headers.length - rawFields.length).fill('')];

      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ?? '';
      });

      const name = normalizeString(record.name || record.full_name || record.employee_name || record.member_name);
      if (!name) return null;

      const email = normalizeString(record.email || record.member_email || record.employee_email || record['email_address']);
      const role = normalizeRole(record.role || record.staff_role || record.team_role || record.position || record.title);
      const phone = normalizeString(record.phone || record.mobile || record['mobile_number'] || record.phone_number || record['contact_number']);
      const status = normalizeStatus(record.status || record.member_status || record.employee_status || record.state);

      return {
        name,
        email: email || undefined,
        role,
        phone: phone || undefined,
        status,
      } satisfies TeamMemberCsvRow;
    })
    .filter((item): item is TeamMemberCsvRow => item !== null);
};
