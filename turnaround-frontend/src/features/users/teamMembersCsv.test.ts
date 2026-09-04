import { describe, it, expect } from 'vitest';
import { parseTeamMembersCsv } from './teamMembersCsv';

describe('parseTeamMembersCsv', () => {
  it('parses team member rows with flexible headers', () => {
    const csv = `name,email,role,phone,status
Jane Doe,jane@turnaround.co,fleet_manager,+254700000001,active
John Smith,john@turnaround.co,analyst,+254700000002,inactive`;

    expect(parseTeamMembersCsv(csv)).toEqual([
      {
        name: 'Jane Doe',
        email: 'jane@turnaround.co',
        role: 'fleet_manager',
        phone: '+254700000001',
        status: 'active',
      },
      {
        name: 'John Smith',
        email: 'john@turnaround.co',
        role: 'analyst',
        phone: '+254700000002',
        status: 'inactive',
      },
    ]);
  });

  it('normalizes alternate header names and defaults missing values', () => {
    const csv = `full_name,employee_email,staff_role,mobile,member_status\nMary Wanjiru,mary@turnaround.co,chief_executive,+254700000003,active`;

    expect(parseTeamMembersCsv(csv)).toEqual([
      {
        name: 'Mary Wanjiru',
        email: 'mary@turnaround.co',
        role: 'admin',
        phone: '+254700000003',
        status: 'active',
      },
    ]);
  });
});
