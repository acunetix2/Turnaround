import { describe, expect, it } from 'vitest';
import { parseVehicleCsv } from './vehicleCsv';

describe('parseVehicleCsv', () => {
  it('parses asset registration rows and aliases', () => {
    expect(parseVehicleCsv(`plate,type,capacity_tonnes,operating_cost,fuel_percentage,maintenance
KDA 123A,truck,28,7500,65,due\nKDB 456B,tanker,35,9500,80,good`)).toEqual([
      {
        registration_number: 'KDA 123A', vehicle_type: 'truck', capacity: 28, hourly_operating_cost: 7500,
        status: 'idle', fuel_level: 65, odometer_km: undefined, maintenance_status: 'due_soon', next_inspection_date: undefined,
      },
      {
        registration_number: 'KDB 456B', vehicle_type: 'tanker', capacity: 35, hourly_operating_cost: 9500,
        status: 'idle', fuel_level: 80, odometer_km: undefined, maintenance_status: 'good', next_inspection_date: undefined,
      },
    ]);
  });
});
