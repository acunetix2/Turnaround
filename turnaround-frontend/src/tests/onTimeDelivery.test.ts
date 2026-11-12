import { describe, expect, it } from 'vitest';
import { getOnTimeDeliveryMetrics } from '../lib/onTimeDelivery';
import type { Trip } from '../lib/api/types';

const makeTrip = (overrides: Partial<Trip>): Trip => ({
  id: 'trip-1',
  vehicle_id: 'vehicle-1',
  origin_id: 'origin-1',
  destination_id: 'destination-1',
  planned_departure: '2026-01-01T08:00:00Z',
  planned_arrival: '2026-01-01T12:00:00Z',
  actual_arrival: '2026-01-01T12:00:00Z',
  status: 'completed',
  ...overrides,
});

describe('getOnTimeDeliveryMetrics', () => {
  it('uses only completed trips with schedule data and compares actual to planned arrival', () => {
    const trips = [
      makeTrip({ id: 'on-time' }),
      makeTrip({ id: 'late', actual_arrival: '2026-01-01T12:01:00Z' }),
      makeTrip({ id: 'active', status: 'in_transit' }),
      makeTrip({ id: 'no-plan', planned_arrival: undefined }),
    ];

    expect(getOnTimeDeliveryMetrics(trips)).toEqual({
      completedTrips: 2,
      onTimeTrips: 1,
      rate: 50,
    });
  });

  it('returns no rate when there are no completed trips with valid schedule data', () => {
    expect(getOnTimeDeliveryMetrics([makeTrip({ status: 'planned' })])).toEqual({
      completedTrips: 0,
      onTimeTrips: 0,
      rate: null,
    });
  });
});
