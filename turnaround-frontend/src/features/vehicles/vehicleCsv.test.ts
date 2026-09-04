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

  it('parses assignment, cargo, and telematics fields while omitting image data', () => {
    const [asset] = parseVehicleCsv(`registration_number,vehicle_type,capacity,hourly_operating_cost,status,driver_id,co_driver_id,trailer_number,container_number,container_type,cargo_type,telematics_provider,tracker_imei
KDA 123A,Truck,28,7500,idle,driver-1,co-driver-1,TRL-001,MSCU1234567,40ft Dry,General Cargo,Teltonika,352093080000001`);

    expect(asset).toMatchObject({
      registration_number: 'KDA 123A',
      driver_id: 'driver-1',
      co_driver_id: 'co-driver-1',
      trailer_number: 'TRL-001',
      container_number: 'MSCU1234567',
      container_type: '40ft Dry',
      cargo_type: 'General Cargo',
      telematics_provider: 'Teltonika',
      tracker_imei: '352093080000001',
    });
    expect(asset).not.toHaveProperty('image_url');
  });

  it('reads an image filename link without embedding image bytes in the CSV parser', () => {
    const [asset] = parseVehicleCsv(`registration_number,image_filename,vehicle_type,capacity,hourly_operating_cost,status\nKDA 123A,kda-482t.jpg,Truck,28,7500,idle`);

    expect(asset.image_filename).toBe('kda-482t.jpg');
    expect(asset).not.toHaveProperty('image_url');
  });
});
