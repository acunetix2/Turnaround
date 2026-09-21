import { describe, expect, it } from 'vitest';
import { getLiveVehicles, getVehicleLocationLabel, getMotionStatus, hasValidGps, resolveRouteContext } from '../lib/location';

describe('location helpers', () => {
  it('prefers a named facility when present', () => {
    expect(
      getVehicleLocationLabel({ current_location_name: 'Nairobi Depot' }, { latitude: 1.3, longitude: 36.8 }),
    ).toBe('Nairobi Depot');
  });

  it('falls back to a friendly location label instead of raw GPS coordinates when no facility name is set', () => {
    expect(
      getVehicleLocationLabel({ current_location_name: '   ' }, { latitude: 1.23456, longitude: 36.78901 }),
    ).toBe('Current location');
  });

  it('returns the fallback copy when no live GPS exists', () => {
    expect(getVehicleLocationLabel({}, null)).toBe('GPS signal lost');
  });

  it('uses the last known location copy when previous GPS data exists but the signal is currently lost', () => {
    expect(getVehicleLocationLabel({}, { latitude: null, longitude: 36.8 })).toBe('Last known location');
  });

  it('validates GPS coordinates correctly', () => {
    expect(hasValidGps({ latitude: 1.23, longitude: 36.78 })).toBe(true);
    expect(hasValidGps({ latitude: NaN, longitude: 36.78 })).toBe(false);
  });

  it('resolves the route from the selected trip when no URL params are supplied', () => {
    const resolved = resolveRouteContext(
      {
        originLat: NaN,
        originLng: NaN,
        destLat: NaN,
        destLng: NaN,
      },
      {
        origin: { latitude: -4.05, longitude: 39.68, name: 'Mombasa Port' },
        destination: { latitude: -1.29, longitude: 36.82, name: 'Nairobi Depot' },
      },
    );

    expect(resolved.hasRoute).toBe(true);
    expect(resolved.originName).toBe('Mombasa Port');
    expect(resolved.destName).toBe('Nairobi Depot');
  });

  it('marks a vehicle as in transit when live GPS speed is above the threshold', () => {
    expect(getMotionStatus({ status: 'idle' }, { speed: 18 })).toBe('in_transit');
    expect(getMotionStatus({ status: 'in_transit' }, { speed: 0 })).toBe('idle');
  });

  it('shows only vehicles with live GPS locations in the corridor live list', () => {
    const vehicles = [
      { id: '1', status: 'active', registration_number: 'KCN 234L', current_location_name: 'Nairobi', vehicle_type: 'Land Vehicle' },
      { id: '2', status: 'idle', registration_number: 'KCL 901J', current_location_name: 'Mombasa', vehicle_type: 'Land Vehicle' },
      { id: '3', status: 'in_transit', registration_number: 'KCH 345G', current_location_name: 'Nakuru', vehicle_type: 'Land Vehicle' },
    ];

    const gpsMap = {
      '1': { latitude: -1.287, longitude: 36.815 },
      '2': null,
      '3': { latitude: -0.31, longitude: 36.07 },
    };

    expect(getLiveVehicles(vehicles, gpsMap, '', 'all')).toHaveLength(2);
    expect(getLiveVehicles(vehicles, gpsMap, '', 'all').map(vehicle => vehicle.id)).toEqual(['1', '3']);
  });
});
