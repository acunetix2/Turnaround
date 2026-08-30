import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { formatCurrency } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Search, Plus, ArrowRight, Truck,
  Trash2, Edit2, AlertTriangle,
  Table as TableIcon, LayoutGrid, X, Radio,
} from 'lucide-react';
import type { Vehicle } from '../../lib/api/types';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';

// ── Tracker hardware models the company can choose from ──
const TRACKER_MODELS = [
  { id: 'teltonika', name: 'Teltonika FMB920 / FMB120 (Direct IMEI)' },
  { id: 'concox',    name: 'Concox GT06N / Jimi JM-VL02 (Direct IMEI)' },
  { id: 'queclink',  name: 'Queclink GV300 / GL300 (Direct IMEI)' },
  { id: 'tramigo',   name: 'Tramigo T23 Fleet (Direct IMEI)' },
  { id: 'samsara',   name: 'Samsara Cloud Telematics (API Integration)' },
  { id: 'cartrack',  name: 'Cartrack Fleet Telematics (API Integration)' },
  { id: 'driver_app', name: 'Turnaround Driver Mobile App (Live GPS Stream)' },
];

// ── Quick-fill vehicle type presets ──
const PRESET_CONFIGS = [
  { label: 'Semi-Trailer (40ft Container)', type: 'Semi-Trailer (28T)', capacity: 28, cost: 7500 },
  { label: 'Container Chassis (32T)',        type: 'Container Chassis (32T)', capacity: 32, cost: 8200 },
  { label: 'Petroleum Tanker (35,000L)',     type: 'Fuel Tanker (35KL)', capacity: 35, cost: 9500 },
  { label: 'Flatbed Hauler (30T)',           type: 'Flatbed Hauler (30T)', capacity: 30, cost: 7000 },
  { label: 'Refrigerated Reefer (24T)',      type: 'Reefer Truck (24T)', capacity: 24, cost: 11000 },
  { label: 'Medium Box Body (10T)',          type: 'Box Truck (10T)', capacity: 10, cost: 4500 },
];

const vehicleSchema = zod.object({
  registration_number: zod.string().min(3, 'Min 3 characters.').max(15, 'Too long.'),
  vehicle_type: zod.string().min(2, 'Enter a vehicle classification.'),
  capacity: zod.number().positive('Capacity must be > 0.'),
  hourly_operating_cost: zod.number().positive('Operating cost must be positive.'),
  status: zod.enum(['moving', 'stationary', 'delayed'] as const),
  tracker_model: zod.string().optional(),
  tracker_imei: zod.string().optional(),
  driver_name: zod.string().optional(),
  driver_phone: zod.string().optional(),
});

type VehicleFormValues = zod.infer<typeof vehicleSchema>;

export const Vehicles: React.FC = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { toast } = useToast();

  const canMutate = role === 'admin' || role === 'fleet_manager';

  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode]         = useState<'table' | 'grid'>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [submitError, setSubmitError]   = useState('');

  // ── REAL DATA: fetch vehicles from /api/v1/vehicles ──
  const { data: vehicles, isLoading, isError, refetch } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiClient.getVehicles,
    refetchInterval: 30000, // auto-refresh every 30 s
  });

  // ── REAL DATA: fetch latest GPS events per vehicle from /api/v1/gps/events/{id} ──
  // We only fetch GPS state for vehicles that are loaded to avoid N+1 on mount
  const { data: gpsData } = useQuery({
    queryKey: ['liveGPS'],
    queryFn: apiClient.getLiveGPSEvents,
    refetchInterval: 15000,
    enabled: !!vehicles && vehicles.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: apiClient.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowAddModal(false);
      reset();
      toast({ variant: 'success', title: 'Vehicle Registered', message: 'New vehicle added to fleet.' });
    },
    onError: (err: any) => setSubmitError(err?.message || 'Failed to register vehicle.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) =>
      apiClient.updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setEditingVehicle(null);
      reset();
      toast({ variant: 'success', title: 'Vehicle Updated', message: 'Fleet asset updated.' });
    },
    onError: (err: any) => setSubmitError(err?.message || 'Failed to update vehicle.'),
  });

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast({ variant: 'info', title: 'Vehicle Removed', message: 'Vehicle decommissioned from fleet.' });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { status: 'stationary', capacity: 28, hourly_operating_cost: 7500 },
  });

  const handleOpenAdd = () => {
    setSubmitError('');
    reset({ registration_number: '', vehicle_type: '', capacity: 28, hourly_operating_cost: 7500, status: 'stationary' });
    setShowAddModal(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    setSubmitError('');
    setEditingVehicle(v);
    reset({
      registration_number:  v.registration_number,
      vehicle_type:         v.vehicle_type,
      capacity:             v.capacity,
      hourly_operating_cost: v.hourly_operating_cost,
      status:               v.status,
    });
  };

  const applyPreset = (idx: number) => {
    const p = PRESET_CONFIGS[idx];
    if (!p) return;
    setValue('vehicle_type',          p.type,   { shouldValidate: true });
    setValue('capacity',              p.capacity, { shouldValidate: true });
    setValue('hourly_operating_cost', p.cost,   { shouldValidate: true });
    toast({ variant: 'info', title: 'Specs Applied', message: `${p.type} specs loaded.` });
  };

  const onSubmitCreate = (data: VehicleFormValues) => { setSubmitError(''); createMutation.mutate(data as any); };
  const onSubmitEdit   = (data: VehicleFormValues) => {
    if (!editingVehicle) return;
    setSubmitError('');
    updateMutation.mutate({ id: editingVehicle.id, data: data as any });
  };

  const handleDelete = (id: string, reg: string) => {
    if (window.confirm(`Decommission ${reg}? This cannot be undone.`)) deleteMutation.mutate(id);
  };

  // ── LOADING / ERROR STATES ──
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-full bg-bg-surface-raised rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-bg-surface-raised rounded-xl" />)}
        </div>
        <div className="h-96 w-full bg-bg-surface-raised rounded-xl" />
      </div>
    );
  }

  if (isError || !vehicles) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-surface border border-border-default rounded-2xl">
        <AlertTriangle size={32} className="text-status-danger mb-3" />
        <h2 className="text-sm font-bold text-text-primary">Fleet data unavailable</h2>
        <p className="text-xs text-text-secondary mt-1">Cannot connect to the vehicle registry. Check that the backend is running.</p>
        <button onClick={() => refetch()} className="mt-4 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] px-4 py-2 text-xs font-bold text-white shadow transition-colors cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  // ── DERIVED COUNTS FROM REAL DATA ──
  const totalFleet      = vehicles.length;
  const activeCount     = vehicles.filter(v => v.status === 'moving').length;
  const delayedCount    = vehicles.filter(v => v.status === 'delayed').length;
  const stationaryCount = vehicles.filter(v => v.status === 'stationary').length;

  const filteredVehicles = vehicles.filter(v => {
    const matchSearch = !searchTerm ||
      v.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusLabel = (s: string) => s === 'moving' ? 'In Transit' : s === 'delayed' ? 'Delayed' : 'Stationary';
  const statusColor = (s: string) =>
    s === 'moving'   ? 'bg-status-good/15 text-status-good' :
    s === 'delayed'  ? 'bg-status-danger-bg text-status-danger' :
                       'bg-bg-surface-raised text-text-tertiary';

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">Trucks & GPS Telematics</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage your commercial fleet, assign GPS trackers, and configure telematics streams.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border-default bg-bg-surface p-0.5">
            <button onClick={() => setViewMode('table')} title="Table" className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${viewMode === 'table' ? 'bg-[#ED642B] text-white' : 'text-text-tertiary hover:text-text-primary'}`}><TableIcon size={14} /></button>
            <button onClick={() => setViewMode('grid')}  title="Grid"  className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${viewMode === 'grid'  ? 'bg-[#ED642B] text-white' : 'text-text-tertiary hover:text-text-primary'}`}><LayoutGrid size={14} /></button>
          </div>
          {canMutate && (
            <button onClick={handleOpenAdd} className="flex items-center gap-1.5 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] px-4 py-2 text-xs font-bold text-white shadow-md transition-colors cursor-pointer">
              <Plus size={14} /> Add Vehicle & GPS
            </button>
          )}
        </div>
      </div>

      {/* ── REAL KPI METRICS (from vehicles query) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-semibold text-text-secondary">Fleet Size</span>
          <p className="font-numeric text-2xl font-extrabold text-text-primary mt-1">{totalFleet}</p>
          <span className="text-[11px] text-text-tertiary">registered vehicles</span>
        </div>
        <div className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-semibold text-text-secondary">In Transit</span>
          <p className="font-numeric text-2xl font-extrabold text-status-good mt-1">{activeCount}</p>
          <span className="text-[11px] text-text-tertiary">moving right now</span>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm ${delayedCount > 0 ? 'bg-status-danger-bg/30 border-status-danger/30' : 'bg-bg-surface border-border-default'}`}>
          <span className="text-xs font-semibold text-text-secondary">Delayed</span>
          <p className={`font-numeric text-2xl font-extrabold mt-1 ${delayedCount > 0 ? 'text-status-danger' : 'text-text-primary'}`}>{delayedCount}</p>
          <span className="text-[11px] text-text-tertiary">exceeding stop target</span>
        </div>
        <div className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-semibold text-text-secondary">Stationary</span>
          <p className="font-numeric text-2xl font-extrabold text-[#250C77] mt-1">{stationaryCount}</p>
          <span className="text-[11px] text-text-tertiary">parked or loading</span>
        </div>
      </div>

      {/* ── SEARCH & FILTER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by plate or vehicle type..."
            className="w-full bg-bg-surface border border-border-default rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all',        label: 'All Statuses' },
              { value: 'moving',     label: 'In Transit' },
              { value: 'stationary', label: 'Stationary' },
              { value: 'delayed',    label: 'Delayed' },
            ]}
          />
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      {viewMode === 'table' && (
        <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-dense">
              <thead>
                <tr className="bg-bg-surface-raised/40">
                  <th>Registration</th>
                  <th>Classification</th>
                  <th>GPS Telematics</th>
                  <th>Status</th>
                  <th>Capacity</th>
                  <th>Idle Rate</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-text-tertiary">
                      No vehicles match your search.
                    </td>
                  </tr>
                ) : filteredVehicles.map(vh => {
                  const gps = gpsData?.[vh.id];
                  return (
                    <tr key={vh.id} className="hover:bg-bg-surface-raised/30 transition-colors">
                      <td className="font-numeric text-xs font-bold text-text-primary">
                        <Link to={`/vehicles/${vh.id}`} className="hover:text-[#ED642B] transition-colors flex items-center gap-2">
                          <Truck size={14} className="text-[#250C77]" />
                          {vh.registration_number}
                        </Link>
                      </td>
                      <td className="text-xs font-semibold text-text-secondary">{vh.vehicle_type}</td>
                      <td className="text-xs">
                        {gps ? (
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-status-good animate-pulse" />
                            <span className="text-[11px] font-numeric text-text-secondary">
                              {gps.speed?.toFixed(0)} km/h · {new Date(gps.recorded_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-text-tertiary" />
                            <span className="text-[11px] text-text-tertiary">No live signal</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${statusColor(vh.status)}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {statusLabel(vh.status)}
                        </span>
                      </td>
                      <td className="font-numeric text-xs text-text-secondary">{vh.capacity} T</td>
                      <td className="font-numeric text-xs font-bold text-money-accent">{formatCurrency(vh.hourly_operating_cost)}/hr</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to={`/vehicles/${vh.id}`} className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors" title="View Details">
                            <ArrowRight size={14} />
                          </Link>
                          {canMutate && (
                            <>
                              <button onClick={() => handleOpenEdit(vh)} className="p-1 rounded text-text-tertiary hover:text-text-primary cursor-pointer" title="Edit">
                                <Edit2 size={13} />
                              </button>
                              <button onClick={() => handleDelete(vh.id, vh.registration_number)} className="p-1 rounded text-text-tertiary hover:text-status-danger cursor-pointer" title="Decommission">
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map(vh => {
            const gps = gpsData?.[vh.id];
            return (
              <div key={vh.id} className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3 hover:border-[#ED642B]/40 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/vehicles/${vh.id}`} className="font-numeric text-base font-bold text-text-primary hover:text-[#ED642B] transition-colors">
                      {vh.registration_number}
                    </Link>
                    <p className="text-xs text-text-secondary mt-0.5">{vh.vehicle_type}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${statusColor(vh.status)}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {statusLabel(vh.status)}
                  </span>
                </div>

                {/* Live GPS state from real API */}
                <div className="p-2.5 rounded-xl bg-bg-surface-raised border border-border-default/60 flex items-center gap-2 text-xs">
                  <Radio size={13} className={gps ? 'text-status-good' : 'text-text-tertiary'} />
                  {gps ? (
                    <div>
                      <p className="text-[11px] font-bold text-text-primary">Live GPS Signal</p>
                      <p className="text-[9.5px] font-numeric text-text-tertiary">
                        {gps.latitude?.toFixed(4)}, {gps.longitude?.toFixed(4)} · {gps.speed?.toFixed(0)} km/h
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[11px] font-bold text-text-tertiary">No Active GPS Signal</p>
                      <p className="text-[9.5px] text-text-tertiary">Assign a tracker to this vehicle to enable live tracking.</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-default text-xs font-numeric">
                  <div>
                    <span className="text-[10px] text-text-tertiary">Capacity</span>
                    <p className="font-bold text-text-primary">{vh.capacity} Tonnes</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary">Idle Rate</span>
                    <p className="font-bold text-money-accent">{formatCurrency(vh.hourly_operating_cost)}/hr</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-default">
                  <Link to={`/vehicles/${vh.id}`} className="text-xs font-bold text-[#ED642B] hover:text-[#D4521D] flex items-center gap-1 transition-colors">
                    View GPS Profile <ArrowRight size={12} />
                  </Link>
                  {canMutate && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenEdit(vh)} className="p-1 rounded text-text-tertiary hover:text-text-primary cursor-pointer"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(vh.id, vh.registration_number)} className="p-1 rounded text-text-tertiary hover:text-status-danger cursor-pointer"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ADD / EDIT VEHICLE + GPS TRACKER MODAL ── */}
      {(showAddModal || editingVehicle) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-bg-surface border border-border-strong p-6 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {editingVehicle ? 'Edit Vehicle' : 'Register New Vehicle & GPS Tracker'}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Set vehicle specs and link the GPS hardware tracker.
                </p>
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingVehicle(null); }} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised cursor-pointer transition-colors">
                <X size={16} />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-status-danger-bg border border-status-danger/30 text-xs text-status-danger">{submitError}</div>
            )}

            {/* Quick type preset selector */}
            {!editingVehicle && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-text-secondary">Quick vehicle type presets:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PRESET_CONFIGS.slice(0, 4).map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyPreset(i)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-bg-surface-raised hover:bg-[#ED642B]/10 border border-border-default hover:border-[#ED642B]/40 text-left transition-colors cursor-pointer text-xs"
                    >
                      <span className="font-bold text-text-primary truncate">{p.type}</span>
                      <span className="text-[10px] font-numeric text-text-tertiary">{p.capacity}T</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(editingVehicle ? onSubmitEdit : onSubmitCreate)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Registration Plate *</label>
                  <input {...register('registration_number')} placeholder="e.g. KDF 489X" className="w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary uppercase font-numeric font-bold focus:border-[#ED642B] focus:outline-none" />
                  {errors.registration_number && <p className="text-[11px] text-status-danger mt-1">{errors.registration_number.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Vehicle Classification *</label>
                  <input {...register('vehicle_type')} placeholder="e.g. Semi-Trailer (28T)" className="w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none" />
                  {errors.vehicle_type && <p className="text-[11px] text-status-danger mt-1">{errors.vehicle_type.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Payload (Tonnes) *</label>
                  <input type="number" step="0.1" {...register('capacity', { valueAsNumber: true })} className="w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none" />
                  {errors.capacity && <p className="text-[11px] text-status-danger mt-1">{errors.capacity.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Idle Rate (KES/hr) *</label>
                  <input type="number" step="100" {...register('hourly_operating_cost', { valueAsNumber: true })} className="w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none" />
                  {errors.hourly_operating_cost && <p className="text-[11px] text-status-danger mt-1">{errors.hourly_operating_cost.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Current Status *</label>
                <select {...register('status')} className="w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none cursor-pointer">
                  <option value="moving">In Transit (Moving)</option>
                  <option value="stationary">Stationary</option>
                  <option value="delayed">Delayed (Excess Dwell)</option>
                </select>
              </div>

              {/* GPS Telematics Configuration */}
              <div className="p-4 rounded-xl bg-bg-surface-raised border border-border-default space-y-3">
                <div className="flex items-center gap-2">
                  <Radio size={14} className="text-[#ED642B]" />
                  <span className="text-xs font-bold text-text-primary">GPS Telematics Hardware</span>
                  <span className="text-[10px] text-text-tertiary">(optional — configurable later)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Tracker Model / Provider</label>
                    <select {...register('tracker_model')} className="w-full bg-bg-surface border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none cursor-pointer">
                      <option value="">— Select tracker —</option>
                      {TRACKER_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Device IMEI / Serial Number</label>
                    <input {...register('tracker_imei')} placeholder="e.g. 868204041234567" className="w-full bg-bg-surface border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Assigned Driver Name</label>
                    <input {...register('driver_name')} placeholder="e.g. James Mwangi" className="w-full bg-bg-surface border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Driver Phone / WhatsApp</label>
                    <input {...register('driver_phone')} placeholder="e.g. +254 712 345 678" className="w-full bg-bg-surface border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none" />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-bg-surface/80 border border-border-default text-[11px] text-text-tertiary">
                  Telemetry webhook endpoint: <code className="text-[#ED642B] font-numeric">POST /api/v1/gps/events</code> — configure in your tracker's server URL setting.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-default">
                <button type="button" onClick={() => { setShowAddModal(false); setEditingVehicle(null); }} className="px-4 py-2 rounded-xl border border-border-default text-xs font-semibold text-text-secondary hover:bg-bg-surface-raised transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
