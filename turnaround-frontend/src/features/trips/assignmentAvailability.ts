import type { Trip } from '../../lib/api/types';

export type AssignmentResource = 'vehicle' | 'driver' | 'co_driver';

const activeStatuses = new Set(['planned', 'in_transit', 'in_progress', 'delayed']);

const overlaps = (start: number, end: number, otherStart: number, otherEnd: number) => start < otherEnd && otherStart < end;

export const getAssignmentConflict = (
  trips: Trip[],
  candidate: Pick<Trip, 'vehicle_id' | 'planned_departure' | 'planned_arrival' | 'driver_name'> & { driver_id?: string; co_driver_id?: string },
  resource: AssignmentResource,
  excludeTripId?: string,
): string | null => {
  const start = new Date(candidate.planned_departure).getTime();
  const end = new Date(candidate.planned_arrival).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'Arrival time must be after departure time.';

  const resourceId = resource === 'vehicle' ? candidate.vehicle_id : resource === 'driver' ? candidate.driver_id : candidate.co_driver_id;
  const resourceName = resource === 'vehicle' ? 'vehicle' : resource === 'driver' ? 'driver' : 'co-driver';
  if (!resourceId && resource === 'vehicle') return 'A vehicle is required.';

  const conflict = trips.find((trip) => {
    if (trip.id === excludeTripId || !activeStatuses.has(trip.status || 'planned')) return false;
    const otherStart = new Date(trip.planned_departure).getTime();
    const otherEnd = new Date(trip.planned_arrival).getTime();
    if (!Number.isFinite(otherStart) || !Number.isFinite(otherEnd)) return false;

    const sameResource = resource === 'vehicle'
      ? trip.vehicle_id === resourceId
      : resource === 'driver'
        ? (trip as any).driver_id === resourceId || trip.driver_name === candidate.driver_name
        : (trip as any).co_driver_id === resourceId;
    return sameResource && overlaps(start, end, otherStart, otherEnd);
  });

  return conflict ? `The ${resourceName} is already assigned during this time window.` : null;
};
