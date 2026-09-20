import { describe, it, expect } from 'vitest';
import { parseFleetStaffCsv } from './driverRosterCsv';

describe('parseFleetStaffCsv', () => {
  it('parses driver and co-driver rows from a CSV', () => {
    const csv = `name,phone,license_number,staff_type,status,notes
John Doe,+254700000001,DL-001,driver,active,Primary route
Jane Smith,+254700000002,DL-002,co-driver,inactive,Relief co-driver`;

    expect(parseFleetStaffCsv(csv)).toEqual([
      {
        name: 'John Doe',
        phone: '+254700000001',
        license_number: 'DL-001',
        staff_type: 'driver',
        status: 'active',
        notes: 'Primary route',
      },
      {
        name: 'Jane Smith',
        phone: '+254700000002',
        license_number: 'DL-002',
        staff_type: 'co_driver',
        status: 'inactive',
        notes: 'Relief co-driver',
      },
    ]);
  });

  it('accepts alternate header names and ignores blank rows', () => {
    const csv = `full name,contact,licence,role,state,comment

Mary Ngugi,+254700000003,DL-003,co_driver,active,Night shift
,, , , ,`;

    expect(parseFleetStaffCsv(csv)).toEqual([
      {
        name: 'Mary Ngugi',
        phone: '+254700000003',
        license_number: 'DL-003',
        staff_type: 'co_driver',
        status: 'active',
        notes: 'Night shift',
      },
    ]);
  });
});
