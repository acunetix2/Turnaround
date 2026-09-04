import { describe, expect, it } from 'vitest';
import { getAssignmentConflict } from './assignmentAvailability';
import type { Trip } from '../../lib/api/types';

const trip = (overrides: Partial<Trip> = {}): Trip => ({
  id: 'trip-1', vehicle_id: 'vehicle-1', origin_id: 'origin', destination_id: 'destination',
  planned_departure: '2026-09-04T08:00:00.000Z', planned_arrival: '2026-09-04T12:00:00.000Z', status: 'planned',
  ...overrides,
});

describe('getAssignmentConflict', () => {
  it('blocks overlapping vehicle windows', () => {
    expect(getAssignmentConflict([trip()], { vehicle_id: 'vehicle-1', planned_departure: '2026-09-04T10:00:00.000Z', planned_arrival: '2026-09-04T14:00:00.000Z', driver_name: '' }, 'vehicle')).toContain('already assigned');
  });

  it('allows adjacent windows and ignores completed trips', () => {
    expect(getAssignmentConflict([trip({ status: 'completed' })], { vehicle_id: 'vehicle-1', planned_departure: '2026-09-04T12:00:00.000Z', planned_arrival: '2026-09-04T14:00:00.000Z', driver_name: '' }, 'vehicle')).toBeNull();
  });
});
