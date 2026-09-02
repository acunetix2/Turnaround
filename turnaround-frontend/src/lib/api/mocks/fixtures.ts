import type {
  Vehicle,
  Location,
  DwellEvent,
  Insight,
  DashboardStats,
  LocationStats,
  VehicleStats,
  TrendDataPoint,
  User,
  Trip,
  DemurrageClaim,
  GPSEvent
} from '../types';

export const mockUser: User = {
  id: 'usr_982347',
  company_id: 'co_129847',
  name: 'Alex Mercer',
  email: 'alex.mercer@turnaroundlogistics.com',
  role: 'fleet_manager',
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
};

export const mockCompany = {
  id: 'co_129847',
  name: 'Turnaround Logistics Ltd',
  created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
};

export const mockLocations: Location[] = [
  {
    id: 'loc_abc_dist',
    company_id: 'co_129847',
    name: 'ABC Distribution Centre',
    location_type: 'warehouse',
    latitude: -1.2921,
    longitude: 36.8219,
    geofence_radius: 300,
    expected_dwell_minutes: 60
  },
  {
    id: 'loc_mombasa_port',
    company_id: 'co_129847',
    name: 'Mombasa Port Gate 12',
    location_type: 'port',
    latitude: -4.0435,
    longitude: 39.6682,
    geofence_radius: 500,
    expected_dwell_minutes: 180
  },
  {
    id: 'loc_eldoret_depot',
    company_id: 'co_129847',
    name: 'Eldoret Transit Depot',
    location_type: 'depot',
    latitude: 0.5143,
    longitude: 35.2698,
    geofence_radius: 250,
    expected_dwell_minutes: 90
  },
  {
    id: 'loc_busia_border',
    company_id: 'co_129847',
    name: 'Busia Border Clearance',
    location_type: 'border_crossing',
    latitude: 0.4632,
    longitude: 34.1115,
    geofence_radius: 400,
    expected_dwell_minutes: 240
  },
  {
    id: 'loc_nairobi_inland',
    company_id: 'co_129847',
    name: 'Nairobi ICD Loading Bay',
    location_type: 'loading_point',
    latitude: -1.3321,
    longitude: 36.8821,
    geofence_radius: 200,
    expected_dwell_minutes: 75
  }
];

export const mockVehicles: Vehicle[] = [
  {
    id: 'vh_kda123x',
    company_id: 'co_129847',
    registration_number: 'KDA 123X',
    vehicle_type: 'Rigid Truck (10T)',
    capacity: 10,
    hourly_operating_cost: 4500,
    status: 'delayed',
    today_excess_dwell_minutes: 252,
    driver_name: 'James Mwangi',
    driver_phone: '+254 712 345 678',
    driver_license: 'DL/KE/2022/00341',
    driver_status: 'on_duty',
    container_number: 'MSCU1234567',
    container_type: '20ft Dry',
    cargo_type: 'Electronics',
    telematics_provider: 'teltonika',
    tracker_imei: '868204041234567',
    maintenance_status: 'good',
    odometer_km: 187420,
    fuel_level: 72,
  },
  {
    id: 'vh_kcb456y',
    company_id: 'co_129847',
    registration_number: 'KCB 456Y',
    vehicle_type: 'Semi-Trailer (28T)',
    capacity: 28,
    hourly_operating_cost: 7500,
    status: 'in_transit',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    current_location_name: 'On Highway A104',
    today_excess_dwell_minutes: 0,
    driver_name: 'Samuel Otieno',
    driver_phone: '+254 722 891 234',
    driver_license: 'DL/KE/2021/00892',
    driver_status: 'driving',
    trailer_number: 'TR-KBN-2023-018',
    cargo_type: 'FMCG Goods',
    telematics_provider: 'cartrack',
    maintenance_status: 'good',
    odometer_km: 241300,
    fuel_level: 58,
  },
  {
    id: 'vh_kcc789z',
    company_id: 'co_129847',
    registration_number: 'KCC 789Z',
    vehicle_type: 'Container Carrier (32T)',
    capacity: 32,
    hourly_operating_cost: 8500,
    status: 'active',
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    current_location_name: 'Eldoret Transit Depot',
    today_excess_dwell_minutes: 45,
    driver_name: 'Peter Kamau',
    driver_phone: '+254 733 567 890',
    driver_license: 'DL/KE/2020/01204',
    driver_status: 'resting',
    container_number: 'HLCU9876543',
    container_type: '40ft HC',
    cargo_type: 'Textile / Apparel',
    trailer_number: 'TR-KCC-2022-041',
    telematics_provider: 'samsara',
    maintenance_status: 'due_soon',
    next_inspection_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    odometer_km: 312800,
    fuel_level: 41,
  },
  {
    id: 'vh_kcd999a',
    company_id: 'co_129847',
    registration_number: 'KCD 999A',
    vehicle_type: 'Flatbed Trailer (15T)',
    capacity: 15,
    hourly_operating_cost: 5000,
    status: 'in_transit',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    current_location_name: 'On Highway Coast Road',
    today_excess_dwell_minutes: 0,
    telematics_provider: 'concox',
    tracker_imei: '868204049876543',
    maintenance_status: 'good',
    odometer_km: 98700,
    fuel_level: 85,
  },
  {
    id: 'vh_kce111b',
    company_id: 'co_129847',
    registration_number: 'KCE 111B',
    vehicle_type: 'Fuel Tanker (24T)',
    capacity: 24,
    hourly_operating_cost: 6800,
    status: 'delayed',
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    current_location_name: 'Mombasa Port Gate 12',
    today_excess_dwell_minutes: 120,
    driver_name: 'Grace Njoroge',
    driver_phone: '+254 711 234 567',
    driver_license: 'DL/KE/2023/00567',
    driver_status: 'on_duty',
    cargo_type: 'Petroleum — AGO',
    telematics_provider: 'teltonika',
    tracker_imei: '868204041111222',
    maintenance_status: 'in_service',
    odometer_km: 411250,
    fuel_level: 30,
  }
];


export const mockTrips: Trip[] = [
  {
    id: 'tr_001',
    vehicle_id: 'vh_kda123x',
    vehicle_reg: 'KDA 123X',
    vehicle_type: 'Semi-Trailer (28T)',
    driver_name: 'Francis Mwangi',
    driver_phone: '+254 712 345 678',
    container_number: 'MSKU-9821430',
    customs_seal_number: 'KRA-SEAL-89211',
    cargo_type: 'Electronics & General Cargo',
    cargo_weight_tonnes: 26.4,
    origin_id: 'loc_mombasa_port',
    origin_name: 'Kilindini Port (Mombasa Harbor)',
    destination_id: 'loc_nairobi_inland',
    destination_name: 'Nairobi ICD (Embakasi Terminal)',
    corridor_name: 'Northern Corridor (Mombasa - Nairobi)',
    status: 'in_transit',
    planned_departure: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    planned_arrival: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    departure_time: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
    risk_score: 24,
    current_speed_kmh: 72,
    current_latitude: -2.2855,
    current_longitude: 37.8211,
    checkpoints: [
      {
        id: 'chk_1',
        location_id: 'loc_mock_1',
        location_name: 'Kilindini Port Gate 14',
        location_type: 'port',
        status: 'completed',
        arrival_time: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        departure_time: new Date(Date.now() - 5.5 * 60 * 60 * 1000).toISOString(),
        expected_dwell_minutes: 60,
        actual_dwell_minutes: 90,
        excess_dwell_minutes: 30
      },
      {
        id: 'chk_2',
        location_id: 'loc_mock_2',
        location_name: 'Mariakani Weighbridge',
        location_type: 'loading_point',
        status: 'completed',
        arrival_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        departure_time: new Date(Date.now() - 3.7 * 60 * 60 * 1000).toISOString(),
        expected_dwell_minutes: 20,
        actual_dwell_minutes: 18,
        excess_dwell_minutes: 0
      },
      {
        id: 'chk_3',
        location_id: 'loc_mock_3',
        location_name: 'Mtito Andei Rest & Inspection',
        location_type: 'depot',
        status: 'completed',
        arrival_time: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
        departure_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        expected_dwell_minutes: 30,
        actual_dwell_minutes: 30,
        excess_dwell_minutes: 0
      },
      {
        id: 'chk_4',
        location_id: 'loc_mock_4',
        location_name: 'Nairobi ICD (Embakasi)',
        location_type: 'depot',
        status: 'current',
        eta: '2h 15m',
        expected_dwell_minutes: 60
      }
    ]
  },
  {
    id: 'tr_002',
    vehicle_id: 'vh_kcb456y',
    vehicle_reg: 'KCB 456Y',
    vehicle_type: 'Prime Mover (32T)',
    driver_name: 'Hassan Omar',
    driver_phone: '+254 722 890 123',
    container_number: 'CMAU-4412091',
    customs_seal_number: 'EAC-TRANSIT-3041',
    cargo_type: 'Pharmaceutical Supplies (Reefer)',
    cargo_weight_tonnes: 28.0,
    origin_id: 'loc_nairobi_inland',
    origin_name: 'Nairobi ICD (Embakasi Terminal)',
    destination_id: 'loc_malaba_border',
    destination_name: 'Malaba OSBP Border Clearance',
    corridor_name: 'Great Lakes Link (Nairobi - Malaba - Kampala)',
    status: 'delayed',
    planned_departure: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    planned_arrival: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    departure_time: new Date(Date.now() - 13.5 * 60 * 60 * 1000).toISOString(),
    risk_score: 88,
    current_speed_kmh: 0,
    current_latitude: 0.6355,
    current_longitude: 34.2751,
    checkpoints: [
      {
        id: 'chk_201',
        location_id: 'loc_mock_201',
        location_name: 'Nairobi ICD Departure Bay',
        location_type: 'depot',
        status: 'completed',
        arrival_time: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
        departure_time: new Date(Date.now() - 13.5 * 60 * 60 * 1000).toISOString(),
        expected_dwell_minutes: 60,
        actual_dwell_minutes: 90,
        excess_dwell_minutes: 30
      },
      {
        id: 'chk_202',
        location_id: 'loc_mock_202',
        location_name: 'Gilgil Weighbridge',
        location_type: 'loading_point',
        status: 'completed',
        arrival_time: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        departure_time: new Date(Date.now() - 8.5 * 60 * 60 * 1000).toISOString(),
        expected_dwell_minutes: 20,
        actual_dwell_minutes: 30,
        excess_dwell_minutes: 10
      },
      {
        id: 'chk_203',
        location_id: 'loc_mock_203',
        location_name: 'Eldoret Transit Depot',
        location_type: 'depot',
        status: 'completed',
        arrival_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        departure_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        expected_dwell_minutes: 45,
        actual_dwell_minutes: 60,
        excess_dwell_minutes: 15
      },
      {
        id: 'chk_204',
        location_id: 'loc_mock_204',
        location_name: 'Malaba OSBP Border Clearance',
        location_type: 'border_crossing',
        status: 'current',
        arrival_time: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
        expected_dwell_minutes: 120,
        actual_dwell_minutes: 210,
        excess_dwell_minutes: 90
      }
    ]
  },
  {
    id: 'tr_003',
    vehicle_id: 'vh_kcc789z',
    vehicle_reg: 'KCC 789Z',
    vehicle_type: 'Box Truck (14T)',
    driver_name: 'David Kiprono',
    driver_phone: '+254 733 456 789',
    container_number: 'SUDU-7721832',
    customs_seal_number: 'KRA-DOM-11029',
    cargo_type: 'FMCG & Dry Packaged Foods',
    cargo_weight_tonnes: 12.8,
    origin_id: 'loc_nairobi_inland',
    origin_name: 'Nairobi ICD (Embakasi Terminal)',
    destination_id: 'loc_namanga_border',
    destination_name: 'Namanga One-Stop Border Post',
    corridor_name: 'Tanzania Link (Nairobi - Namanga - Arusha)',
    status: 'planned',
    planned_departure: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    planned_arrival: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    risk_score: 15,
    checkpoints: [
      {
        id: 'chk_301',
        location_id: 'loc_mock_301',
        location_name: 'Nairobi ICD Staging Area',
        location_type: 'depot',
        status: 'pending',
        expected_dwell_minutes: 45
      },
      {
        id: 'chk_302',
        location_id: 'loc_mock_302',
        location_name: 'Athi River Interchange Inspection',
        location_type: 'loading_point',
        status: 'pending',
        expected_dwell_minutes: 30
      },
      {
        id: 'chk_303',
        location_id: 'loc_mock_303',
        location_name: 'Namanga OSBP Commercial Yard',
        location_type: 'border_crossing',
        status: 'pending',
        expected_dwell_minutes: 120
      }
    ]
  },
  {
    id: 'tr_004',
    vehicle_id: 'vh_kcd999a',
    vehicle_reg: 'KCD 999A',
    vehicle_type: 'Flatbed Trailer (26T)',
    driver_name: 'Peter Wambua',
    driver_phone: '+254 701 654 321',
    container_number: 'TEMU-1092834',
    customs_seal_number: 'KRA-EXP-77210',
    cargo_type: 'Construction Materials & Steel Rods',
    cargo_weight_tonnes: 25.5,
    origin_id: 'loc_mombasa_port',
    origin_name: 'Kilindini Port (Mombasa Harbor)',
    destination_id: 'loc_nairobi_inland',
    destination_name: 'Nairobi ICD (Embakasi Terminal)',
    corridor_name: 'Northern Corridor (Mombasa - Nairobi)',
    status: 'completed',
    planned_departure: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    planned_arrival: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    departure_time: new Date(Date.now() - 35.5 * 60 * 60 * 1000).toISOString(),
    arrival_time: new Date(Date.now() - 23.8 * 60 * 60 * 1000).toISOString(),
    risk_score: 5,
    checkpoints: [
      {
        id: 'chk_401',
        location_id: 'loc_mock_401',
        location_name: 'Kilindini Port Gate 12',
        location_type: 'port',
        status: 'completed',
        expected_dwell_minutes: 60,
        actual_dwell_minutes: 55,
        excess_dwell_minutes: 0
      },
      {
        id: 'chk_402',
        location_id: 'loc_mock_402',
        location_name: 'Nairobi ICD Final Clear',
        location_type: 'depot',
        status: 'completed',
        expected_dwell_minutes: 60,
        actual_dwell_minutes: 58,
        excess_dwell_minutes: 0
      }
    ]
  }
];

export const mockDemurrageClaims: DemurrageClaim[] = [
  {
    id: 'clm_001',
    claim_number: 'CLM-MSA-2026-081',
    vehicle_id: 'vh_kda123x',
    vehicle_reg: 'KDA 123X',
    location_id: 'loc_mombasa_port',
    location_name: 'Kilindini Port Gate 14',
    container_number: 'MSKU-9821430',
    driver_name: 'Francis Mwangi',
    carrier_name: 'Siginon Global Logistics',
    responsible_party: 'terminal_operator',
    arrival_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    departure_time: new Date(Date.now() - 2.8 * 24 * 60 * 60 * 1000).toISOString(),
    sla_threshold_minutes: 180,
    total_dwell_minutes: 360,
    excess_delay_minutes: 180,
    hourly_operating_rate: 3500,
    claimed_amount_kes: 10500,
    settled_amount_kes: 10500,
    status: 'settled',
    invoice_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    settlement_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Crane breakdown at Berth 3 caused queue spillover. Claim accepted without dispute.',
    created_at: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'clm_002',
    claim_number: 'CLM-MLB-2026-094',
    vehicle_id: 'vh_kcb456y',
    vehicle_reg: 'KCB 456Y',
    location_id: 'loc_malaba_border',
    location_name: 'Malaba OSBP Border Clearance',
    container_number: 'CMAU-4412091',
    driver_name: 'Hassan Omar',
    carrier_name: 'Siginon Global Logistics',
    responsible_party: 'customs_authority',
    arrival_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    departure_time: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    sla_threshold_minutes: 240,
    total_dwell_minutes: 540,
    excess_delay_minutes: 300,
    hourly_operating_rate: 4200,
    claimed_amount_kes: 21000,
    status: 'invoiced',
    invoice_date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Single-window server outage between 02:00 and 06:00. Formal invoice served to port agency.',
    created_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'clm_003',
    claim_number: 'CLM-NBO-2026-112',
    vehicle_id: 'vh_kce111b',
    vehicle_reg: 'KCE 111B',
    location_id: 'loc_abc_dist',
    location_name: 'ABC Distribution Centre',
    container_number: 'HLXU-3091823',
    driver_name: 'Grace Njoroge',
    carrier_name: 'Siginon Global Logistics',
    responsible_party: 'shipper',
    arrival_time: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    departure_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    sla_threshold_minutes: 60,
    total_dwell_minutes: 420,
    excess_delay_minutes: 360,
    hourly_operating_rate: 6800,
    claimed_amount_kes: 40800,
    status: 'disputed',
    invoice_date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    dispute_reason: 'Shipper claims warehouse power outage delayed bay docking.',
    notes: 'Awaiting revised demurrage reconciliation from consignee receiver.',
    created_at: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'clm_004',
    claim_number: 'CLM-ATH-2026-125',
    vehicle_id: 'vh_kcc789z',
    vehicle_reg: 'KCC 789Z',
    location_id: 'loc_athi_river',
    location_name: 'Athi River Logistics Park',
    container_number: 'MSKU-4401923',
    driver_name: 'David Kiprono',
    carrier_name: 'Siginon Global Logistics',
    responsible_party: 'terminal_operator',
    arrival_time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    sla_threshold_minutes: 45,
    total_dwell_minutes: 165,
    excess_delay_minutes: 120,
    hourly_operating_rate: 2800,
    claimed_amount_kes: 5600,
    status: 'flagged',
    notes: 'Active excess dwell in progress. Claim drafted automatically by Turnaround SLA engine.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];


export const mockLiveGpsEvents: Record<string, GPSEvent> = {
  vh_kda123x: {
    id: 'gps_kda_1',
    vehicle_id: 'vh_kda123x',
    latitude: -1.2918, // stationary slightly offset from center
    longitude: 36.8222,
    speed: 0,
    recorded_at: new Date().toISOString()
  },
  vh_kcb456y: {
    id: 'gps_kcb_1',
    vehicle_id: 'vh_kcb456y',
    latitude: -1.2863, // on highway heading to ICD
    longitude: 36.8912,
    speed: 68,
    recorded_at: new Date().toISOString()
  },
  vh_kcc789z: {
    id: 'gps_kcc_1',
    vehicle_id: 'vh_kcc789z',
    latitude: 0.5141, // stationary at Eldoret Depot
    longitude: 35.2699,
    speed: 0,
    recorded_at: new Date().toISOString()
  },
  vh_kcd999a: {
    id: 'gps_kcd_1',
    vehicle_id: 'vh_kcd999a',
    latitude: -2.3124, // moving on coast road
    longitude: 38.1245,
    speed: 74,
    recorded_at: new Date().toISOString()
  },
  vh_kce111b: {
    id: 'gps_kce_1',
    vehicle_id: 'vh_kce111b',
    latitude: -4.0438, // stationary at Mombasa Port
    longitude: 39.6680,
    speed: 0,
    recorded_at: new Date().toISOString()
  }
};

export const mockDwellEvents: DwellEvent[] = [
  // Finished Dwell Event reproducing the spec details: KDA 123X, ABC Dist Centre, 5h12m dwell
  {
    id: 'dw_001',
    vehicle_id: 'vh_kda123x',
    location_id: 'loc_abc_dist',
    trip_id: 'tr_001',
    arrival_time: new Date(Date.now() - 4 * 60 * 60 * 1000 - 12 * 60 * 1000).toISOString(), // 4h12m ago
    dwell_minutes: 312, // 5 hours 12 minutes
    expected_minutes: 60,
    excess_minutes: 252, // 4 hours 12 minutes
    estimated_cost: 18900, // (252 / 60) * 4500 KES
    vehicle_reg: 'KDA 123X',
    location_name: 'ABC Distribution Centre',
    location_type: 'warehouse'
  },
  {
    id: 'dw_002',
    vehicle_id: 'vh_kce111b',
    location_id: 'loc_mombasa_port',
    arrival_time: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    departure_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    dwell_minutes: 300, // 5 hours
    expected_minutes: 180, // 3 hours
    excess_minutes: 120, // 2 hours
    estimated_cost: 13600, // (120/60) * 6800 KES
    vehicle_reg: 'KCE 111B',
    location_name: 'Mombasa Port Gate 12',
    location_type: 'port'
  },
  {
    id: 'dw_003',
    vehicle_id: 'vh_kcc789z',
    location_id: 'loc_eldoret_depot',
    arrival_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    departure_time: new Date(Date.now() - 21.75 * 60 * 60 * 1000).toISOString(),
    dwell_minutes: 135, // 2 hours 15 mins
    expected_minutes: 90, // 1.5 hours
    excess_minutes: 45,
    estimated_cost: 6375, // (45/60) * 8500 KES
    vehicle_reg: 'KCC 789Z',
    location_name: 'Eldoret Transit Depot',
    location_type: 'depot'
  },
  {
    id: 'dw_004',
    vehicle_id: 'vh_kcb456y',
    location_id: 'loc_abc_dist',
    arrival_time: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    departure_time: new Date(Date.now() - 29 * 60 * 60 * 1000).toISOString(),
    dwell_minutes: 60, // 1 hour
    expected_minutes: 60,
    excess_minutes: 0,
    estimated_cost: 0,
    vehicle_reg: 'KCB 456Y',
    location_name: 'ABC Distribution Centre',
    location_type: 'warehouse'
  },
  {
    id: 'dw_005',
    vehicle_id: 'vh_kda123x',
    location_id: 'loc_busia_border',
    arrival_time: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    departure_time: new Date(Date.now() - 42 * 60 * 60 * 1000).toISOString(),
    dwell_minutes: 360, // 6 hours
    expected_minutes: 240, // 4 hours
    excess_minutes: 120, // 2 hours
    estimated_cost: 9000, // 2 * 4500
    vehicle_reg: 'KDA 123X',
    location_name: 'Busia Border Clearance',
    location_type: 'border_crossing'
  }
];

export const mockInsights: Insight[] = [
  {
    id: 'ins_001',
    company_id: 'co_129847',
    type: 'EXCESSIVE_DWELL',
    severity: 'high',
    title: 'Excess Dwell at ABC Distribution Centre',
    description: 'ABC Distribution Centre accounts for 31% of total excess dwell time. Deliveries average 5h12m (expected: 1h).',
    location_id: 'loc_abc_dist',
    financial_impact: 384000,
    recommendation: 'Schedule deliveries between 08:00 AM – 10:00 AM. Historical data shows clearance is 42% faster in the morning.',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    location_name: 'ABC Distribution Centre'
  },
  {
    id: 'ins_002',
    company_id: 'co_129847',
    type: 'RECURRING_BOTTLENECK',
    severity: 'medium',
    title: 'Recurring Delays at Mombasa Port Gate 12',
    description: 'Averaging 2 hours of excess dwell over the last 15 visits, causing delays in customs clearance.',
    location_id: 'loc_mombasa_port',
    financial_impact: 185000,
    recommendation: 'Schedule port entry on Tuesday/Wednesday. Avoid Friday afternoon shifts where queue wait-times increase by 80%.',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    location_name: 'Mombasa Port Gate 12'
  },
  {
    id: 'ins_003',
    company_id: 'co_129847',
    type: 'DELAY_RISK',
    severity: 'low',
    title: 'Eldoret Depot Dispatch Delays',
    description: 'Stationary times at Eldoret Depot have increased by 15% during weekend operations.',
    location_id: 'loc_eldoret_depot',
    financial_impact: 42000,
    recommendation: 'Ensure dispatch logs are pre-approved by Friday 4:00 PM to circumvent weekend staff shortages.',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    location_name: 'Eldoret Transit Depot'
  }
];

export const mockDashboardStats: DashboardStats = {
  active_trucks: 5,
  trucks_delayed: 2, // KDA 123X (at ABC Dist) and KCE 111B (at Mombasa Port)
  excess_dwell_today_minutes: 372, // 252 (KDA) + 120 (KCE)
  estimated_financial_impact: 32500, // Current active delay estimated cost + today completed cost (e.g. 18,900 + active runs)
  top_bottleneck: {
    location_id: 'loc_abc_dist',
    location_name: 'ABC Distribution Centre',
    financial_impact: 384000
  },
  average_excess_delay_minutes: 129
};

export const mockLocationStats: LocationStats[] = [
  {
    location_id: 'loc_abc_dist',
    location_name: 'ABC Distribution Centre',
    location_type: 'warehouse',
    total_visits: 42,
    avg_dwell_minutes: 185,
    expected_dwell_minutes: 60,
    avg_excess_delay_minutes: 125,
    financial_impact: 384000,
    highest_risk_days: ['Monday', 'Thursday'],
    highest_risk_period: '13:00 - 17:00'
  },
  {
    location_id: 'loc_mombasa_port',
    location_name: 'Mombasa Port Gate 12',
    location_type: 'port',
    total_visits: 28,
    avg_dwell_minutes: 275,
    expected_dwell_minutes: 180,
    avg_excess_delay_minutes: 95,
    financial_impact: 185000,
    highest_risk_days: ['Friday', 'Saturday'],
    highest_risk_period: '14:00 - 20:00'
  },
  {
    location_id: 'loc_eldoret_depot',
    location_name: 'Eldoret Transit Depot',
    location_type: 'depot',
    total_visits: 19,
    avg_dwell_minutes: 110,
    expected_dwell_minutes: 90,
    avg_excess_delay_minutes: 20,
    financial_impact: 42000,
    highest_risk_days: ['Saturday'],
    highest_risk_period: '09:00 - 12:00'
  },
  {
    location_id: 'loc_busia_border',
    location_name: 'Busia Border Clearance',
    location_type: 'border_crossing',
    total_visits: 12,
    avg_dwell_minutes: 290,
    expected_dwell_minutes: 240,
    avg_excess_delay_minutes: 50,
    financial_impact: 90000,
    highest_risk_days: ['Tuesday'],
    highest_risk_period: '22:00 - 02:00'
  }
];

export const mockVehicleStats: VehicleStats[] = [
  {
    vehicle_id: 'vh_kda123x',
    registration_number: 'KDA 123X',
    vehicle_type: 'Rigid Truck (10T)',
    total_trips: 18,
    total_dwell_events: 22,
    total_excess_dwell_minutes: 680,
    total_financial_loss: 51000,
    avg_dwell_minutes: 195
  },
  {
    vehicle_id: 'vh_kce111b',
    registration_number: 'KCE 111B',
    vehicle_type: 'Fuel Tanker (24T)',
    total_trips: 12,
    total_dwell_events: 14,
    total_excess_dwell_minutes: 420,
    total_financial_loss: 47600,
    avg_dwell_minutes: 210
  }
];

// Seeded time series chart data over the last 14 days
export const mockTrendData: TrendDataPoint[] = Array.from({ length: 14 }).map((_, i) => {
  const date = new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  // simulate lower costs on weekends (days 0, 1, 7, 8 in some offsets)
  const d = new Date(date).getDay();
  const isWeekend = d === 0 || d === 6;
  const multiplier = isWeekend ? 0.3 : 1.0;

  return {
    date,
    average_dwell_minutes: Math.round((120 + Math.sin(i) * 30) * multiplier),
    excess_dwell_minutes: Math.round(Math.max(0, 45 + Math.sin(i) * 20) * multiplier),
    estimated_cost: Math.round(Math.max(0, 15000 + Math.sin(i) * 8000) * multiplier),
    visit_count: isWeekend ? 3 : 8 + (i % 3),
    delayed_visit_count: isWeekend ? 1 : 2 + (i % 2)
  };
});
