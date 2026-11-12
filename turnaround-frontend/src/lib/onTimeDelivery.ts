import type { Trip } from './api/types';

export interface OnTimeDeliveryMetrics {
  completedTrips: number;
  onTimeTrips: number;
  rate: number | null;
}

export function getOnTimeDeliveryMetrics(trips: readonly Trip[]): OnTimeDeliveryMetrics {
  const completedWithSchedule = trips.filter((trip) => {
    if (trip.status !== 'completed' || !trip.planned_arrival || !trip.actual_arrival) return false;
    return Number.isFinite(Date.parse(trip.planned_arrival)) && Number.isFinite(Date.parse(trip.actual_arrival));
  });
  const onTimeTrips = completedWithSchedule.filter(
    (trip) => Date.parse(trip.actual_arrival ?? '') <= Date.parse(trip.planned_arrival ?? ''),
  ).length;

  return {
    completedTrips: completedWithSchedule.length,
    onTimeTrips,
    rate: completedWithSchedule.length
      ? Math.round((onTimeTrips / completedWithSchedule.length) * 1000) / 10
      : null,
  };
}
