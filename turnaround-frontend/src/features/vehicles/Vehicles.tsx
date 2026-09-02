import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractErrorMessage } from '../../lib/api/client';
import { formatCurrency } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Search, Plus, ArrowRight, Truck, Container, Trash2, Edit2, AlertTriangle,
  Table as TableIcon, LayoutGrid, X, Radio, User, Camera,
  Package, Settings, AlertCircle, Navigation2
} from 'lucide-react';
import type { Vehicle } from '../../lib/api/types';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { EmptyStatePresentational } from '../../components/ui/EmptyStatePresentational';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import {
  MetricCard,
  MetricCardHeader,
  MetricCardLabel,
  MetricCardContent,
  MetricCardValue,
  MetricCardDifferential,
  MetricCardSparkline,
} from '../../components/ui/MetricCard';

const TRACKER_MODELS = [
  { id: 'teltonika',   name: 'Teltonika FMB920 / FMB120 (Direct IMEI)' },
  { id: 'concox',      name: 'Concox GT06N / Jimi JM-VL02 (Direct IMEI)' },
  { id: 'queclink',    name: 'Queclink GV300 / GL300 (Direct IMEI)' },
  { id: 'tramigo',     name: 'Tramigo T23 Fleet (Direct IMEI)' },
  { id: 'samsara',     name: 'Samsara Cloud Telematics (API Integration)' },
  { id: 'cartrack',    name: 'Cartrack Fleet Telematics (API Integration)' },
  { id: 'driver_app',  name: 'Turnaround Driver Mobile App (Live GPS Stream)' },
];

const PRESET_CONFIGS = [
  { label: 'Semi-Trailer (40ft)',    type: 'Semi-Trailer (28T)',    capacity: 28, cost: 7500 },
  { label: 'Container Chassis (32T)', type: 'Container Chassis (32T)', capacity: 32, cost: 8200 },
  { label: 'Petroleum Tanker',       type: 'Fuel Tanker (35KL)',    capacity: 35, cost: 9500 },
  { label: 'Flatbed Hauler (30T)',   type: 'Flatbed Hauler (30T)',  capacity: 30, cost: 7000 },
  { label: 'Refrigerated Reefer',    type: 'Reefer Truck (24T)',    capacity: 24, cost: 11000 },
  { label: 'Medium Box Body (10T)',   type: 'Box Truck (10T)',       capacity: 10, cost: 4500 },
];

const vehicleSchema = zod.object({
  registration_number:  zod.string().min(3, 'Min 3 characters').max(20),
  vehicle_type:         zod.string().min(2, 'Enter a vehicle classification'),
  capacity:             zod.number().positive('Must be > 0'),
  hourly_operating_cost: zod.number().positive('Must be positive'),
  status:               zod.enum(['active', 'idle', 'maintenance', 'in_transit', 'delayed'] as const),
  // Driver
  driver_name:          zod.string().optional(),
  driver_phone:         zod.string().optional(),
  driver_license:       zod.string().optional(),
  driver_status:        zod.enum(['on_duty', 'resting', 'driving']).optional(),
  // Container / Cargo
  trailer_number:       zod.string().optional(),
  container_number:     zod.string().optional(),
  container_type:       zod.string().optional(),
  cargo_type:           zod.string().optional(),
  // Telematics
  telematics_provider:  zod.string().optional(),
  tracker_imei:         zod.string().optional(),
  // Maintenance
  maintenance_status:   zod.enum(['good', 'due_soon', 'in_service']).optional(),
  next_inspection_date: zod.string().optional(),
  odometer_km:          zod.number().optional(),
  fuel_level:           zod.number().min(0).max(100).optional(),
});

type VehicleFormValues = zod.infer<typeof vehicleSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

const normalizeFormStatus = (s?: string): 'moving' | 'stationary' | 'delayed' => {
  if (!s) return 'stationary';
  if (s === 'moving' || s === 'in_transit' || s === 'active') return 'moving';
  if (s === 'delayed') return 'delayed';
  return 'stationary';
};

const statusLabel = (s: string) =>
  s === 'moving' || s === 'in_transit' || s === 'active' ? 'In Transit' : s === 'delayed' ? 'Delayed' : 'Stationary';

const statusColor = (s: string) =>
  s === 'moving' || s === 'in_transit' || s === 'active' ? 'bg-status-good/15 text-status-good' :
  s === 'delayed' ? 'bg-red-500/15 text-red-500' :
                    'bg-bg-surface-raised text-text-tertiary';

const maintenanceBadge = (m?: string) => {
  if (m === 'in_service')  return { label: 'In Service', cls: 'bg-yellow-500/15 text-yellow-500' };
  if (m === 'due_soon')    return { label: 'Due Soon',   cls: 'bg-orange-500/15 text-orange-400' };
  return { label: 'Good',            cls: 'bg-status-good/15 text-status-good' };
};

const driverStatusColor = (s?: string) =>
  s === 'driving' ? 'text-status-good' :
  s === 'resting' ? 'text-yellow-500'  : 'text-text-tertiary';

// ── Image Upload component ──────────────────────────────────────────────────

const VehicleImageUpload: React.FC<{
  currentUrl?: string;
  onChange: (dataUrl: string) => void;
}> = ({ currentUrl, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="relative h-28 w-full rounded-xl overflow-hidden border-2 border-dashed border-border-default hover:border-[#ED642B]/60 transition-colors cursor-pointer group"
      onClick={() => fileRef.current?.click()}
    >
      {currentUrl ? (
        <>
          <img src={currentUrl} alt="Vehicle" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={20} className="text-white" />
          </div>
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-2 text-text-tertiary group-hover:text-[#ED642B] transition-colors">
          <Camera size={22} />
          <span className="text-[11px] font-semibold">Upload Photo</span>
          <span className="text-[10px]">JPG, PNG or WEBP</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

export const Vehicles: React.FC = () => {
  const queryClient = useQueryClient();
  const { role }    = useAuth();
  const { toast }   = useToast();
  const canMutate   = role === 'admin' || role === 'fleet_manager';

  const [searchTerm,     setSearchTerm]     = useState('');
  const [statusFilter,   setStatusFilter]   = useState<string>('all');
  const [typeFilter,     setTypeFilter]     = useState<string>('all');
  const [viewMode,       setViewMode]       = useState<'grid' | 'table'>('grid');
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [submitError,      setSubmitError]      = useState('');
  const [imageDataUrl,     setImageDataUrl]     = useState<string | undefined>();
  const [activeTab,        setActiveTab]        = useState<'specs' | 'driver' | 'cargo' | 'telematics'>('specs');
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);

  const { data: vehicles, isLoading, isError, refetch } = useQuery({
    queryKey:        ['vehicles'],
    queryFn:         apiClient.getVehicles,
    select: (data: Vehicle[]) => {
      if (!Array.isArray(data)) return [];
      const seen = new Set<string>();
      return data.filter((vh) => {
        const key = vh.registration_number ? vh.registration_number.trim().toUpperCase() : vh.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    refetchInterval: 30000,
  });

  const { data: gpsData } = useQuery({
    queryKey:        ['liveGPS'],
    queryFn:         apiClient.getLiveGPSEvents,
    refetchInterval: 15000,
    enabled:         !!vehicles && vehicles.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: apiClient.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowAddModal(false);
      reset();
      setImageDataUrl(undefined);
      toast({ variant: 'success', title: 'Asset Registered', message: 'Vehicle added to fleet.' });
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
      setImageDataUrl(undefined);
      toast({ variant: 'success', title: 'Asset Updated', message: 'Fleet asset details saved.' });
    },
    onError: (err: any) => setSubmitError(err?.message || 'Failed to update vehicle.'),
  });

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast({ variant: 'info', title: 'Asset Removed', message: 'Vehicle decommissioned from fleet.' });
    },
  });

  const {
    register, handleSubmit, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { status: 'idle', capacity: 28, hourly_operating_cost: 7500, driver_status: 'on_duty', maintenance_status: 'good' },
  });

  const handleOpenAdd = () => {
    setSubmitError(''); setActiveTab('specs');
    setEditingVehicle(null);
    reset({
      registration_number: '',
      vehicle_type: '',
      capacity: 28,
      hourly_operating_cost: 3500,
      status: 'idle',
      driver_name: '',
      driver_phone: '',
      driver_license: '',
      driver_status: 'on_duty',
      trailer_number: '',
      container_number: '',
      container_type: '',
      cargo_type: '',
      telematics_provider: '',
      tracker_imei: '',
      maintenance_status: 'good',
      next_inspection_date: '',
      odometer_km: undefined,
      fuel_level: undefined,
    });
    setImageDataUrl(undefined);
    setShowAddModal(true);
  };

  const populateVehicleForm = (v: Vehicle) => {
    setEditingVehicle(v);
    setImageDataUrl(v.image_url);
    reset({
      registration_number:  v.registration_number || '',
      vehicle_type:         v.vehicle_type || '',
      capacity:             v.capacity || 28,
      hourly_operating_cost: v.hourly_operating_cost || 3500,
      status:               (v.status as any) || 'idle',
      driver_name:          v.driver_name || '',
      driver_phone:         v.driver_phone || '',
      driver_license:       v.driver_license || '',
      driver_status:        (v.driver_status as any) || 'on_duty',
      trailer_number:       v.trailer_number || '',
      container_number:     v.container_number || '',
      container_type:       v.container_type || '',
      cargo_type:           v.cargo_type || '',
      telematics_provider:  v.telematics_provider || '',
      tracker_imei:         v.tracker_imei || '',
      maintenance_status:   (v.maintenance_status as any) || 'good',
      next_inspection_date: v.next_inspection_date || '',
      odometer_km:          v.odometer_km ?? undefined,
      fuel_level:           v.fuel_level ?? undefined,
    });
  };

  const handleOpenEdit = async (v: Vehicle) => {
    setSubmitError('');
    setActiveTab('specs');
    populateVehicleForm(v);
    // Fetch full details asynchronously in case list response had partial fields
    try {
      const full = await apiClient.getVehicleById(v.id);
      if (full) populateVehicleForm(full);
    } catch {
      // Fallback already populated
    }
  };

  const applyPreset = (idx: number) => {
    const p = PRESET_CONFIGS[idx];
    if (!p) return;
    setValue('vehicle_type', p.type, { shouldValidate: true });
    setValue('capacity', p.capacity, { shouldValidate: true });
    setValue('hourly_operating_cost', p.cost, { shouldValidate: true });
  };

  const onSubmit = (data: VehicleFormValues) => {
    setSubmitError('');
    const targetReg = data.registration_number.trim().toUpperCase();

    // Check for duplicates
    if (vehicles) {
      const duplicate = vehicles.find(
        (v) =>
          v.registration_number.trim().toUpperCase() === targetReg &&
          (!editingVehicle || v.id !== editingVehicle.id)
      );
      if (duplicate) {
        setSubmitError(`Registration number ${targetReg} is already assigned to an existing vehicle.`);
        return;
      }
    }

    const payload = { ...data, image_url: imageDataUrl } as any;
    // status is already the correct backend enum value — no mapping needed
    // Strip undefined/null/empty-string/NaN fields so PATCH only sends changed values
    Object.keys(payload).forEach(k => {
      const v = payload[k];
      if (v === undefined || v === null || v === '') {
        delete payload[k];
        return;
      }
      // Remove NaN numbers (empty number inputs)
      if (typeof v === 'number' && isNaN(v)) {
        delete payload[k];
        return;
      }
      // Remove zero-value numbers that are optional (odometer, fuel)
      if ((k === 'odometer_km' || k === 'fuel_level') && v === 0) {
        delete payload[k];
      }
    });
    // Ensure required numbers are proper
    if (payload.capacity !== undefined) payload.capacity = Number(payload.capacity);
    if (payload.hourly_operating_cost !== undefined) payload.hourly_operating_cost = Number(payload.hourly_operating_cost);
    if (payload.fuel_level !== undefined) payload.fuel_level = parseInt(String(payload.fuel_level));
    if (payload.odometer_km !== undefined) payload.odometer_km = parseInt(String(payload.odometer_km));
    if (editingVehicle) updateMutation.mutate({ id: editingVehicle.id, data: payload });
    else createMutation.mutate(payload as any);
  };

  const handleDelete = (id: string, reg: string) => {
    if (window.confirm(`Decommission ${reg}? This cannot be undone.`)) deleteMutation.mutate(id);
  };

  // ── LOADING / ERROR ──
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-full bg-bg-surface-raised rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-bg-surface-raised rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 bg-bg-surface-raised rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError || !vehicles) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-surface border border-border-default rounded-2xl">
        <AlertTriangle size={32} className="text-status-danger mb-3" />
        <h2 className="text-sm font-bold text-text-primary">Fleet data unavailable</h2>
        <p className="text-xs text-text-secondary mt-1">Cannot connect to the asset registry. Check that the backend is running.</p>
        <button onClick={() => refetch()} className="mt-4 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] px-4 py-2 text-xs font-bold text-white shadow transition-colors cursor-pointer">Retry</button>
      </div>
    );
  }

  // ── DERIVED COUNTS ──
  const totalFleet      = vehicles.length;
  const activeCount     = vehicles.filter(v => v.status === 'moving').length;
  const delayedCount    = vehicles.filter(v => v.status === 'delayed').length;

  // Vehicle type breakdown
  const typeGroups: Record<string, number> = {};
  vehicles.forEach(v => {
    const category = v.vehicle_type?.split('(')[0]?.trim() || 'Other';
    typeGroups[category] = (typeGroups[category] || 0) + 1;
  });
  const sortedTypes = Object.entries(typeGroups).sort((a, b) => b[1] - a[1]);

  // Drivers on duty
  const driversOnDuty = vehicles.filter(v => v.driver_name).length;

  // Containers in system
  const containersTracked = vehicles.filter(v => v.container_number).length;

  // Unique type options for filter
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    ...sortedTypes.map(([label]) => ({ value: label, label }))
  ];

  const filteredVehicles = vehicles.filter(v => {
    const matchSearch  = !searchTerm ||
      v.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.driver_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.container_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus  = statusFilter === 'all' || v.status === statusFilter;
    const matchType    = typeFilter === 'all' || (v.vehicle_type || '').startsWith(typeFilter);
    return matchSearch && matchStatus && matchType;
  });

  const inputCls = "w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none";

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-text-primary tracking-tight">Fleet Assets</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage vehicles, drivers, containers, GPS trackers, and operational specs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-border-default bg-bg-surface p-0.5">
            <button onClick={() => setViewMode('grid')}  title="Grid"  className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${viewMode === 'grid'  ? 'bg-[#ED642B] text-white' : 'text-text-tertiary hover:text-text-primary'}`}><LayoutGrid size={13} /></button>
            <button onClick={() => setViewMode('table')} title="Table" className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${viewMode === 'table' ? 'bg-[#ED642B] text-white' : 'text-text-tertiary hover:text-text-primary'}`}><TableIcon size={13} /></button>
          </div>
          {canMutate && (
            <Button
              variant="primary"
              size="small"
              icon={<Plus size={13} />}
              onClick={handleOpenAdd}
            >
              Register Asset
            </Button>
          )}
        </div>
      </div>

      {/* ── OVERVIEW KPI GRID (SUPABASE METRIC CARD PATTERN) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard isLoading={isLoading}>
          <MetricCardHeader href="/vehicles">
            <MetricCardLabel
              tooltip="Total fleet asset units registered in system"
              icon={<Truck size={13} className="text-[#250C77]" />}
            >
              Fleet Total
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{totalFleet}</MetricCardValue>
            <MetricCardDifferential variant="positive">
              {activeCount} active
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={Array.from({ length: 8 }, (_, i) => ({ value: 10 + i * 2 }))}
            color="#250C77"
          />
        </MetricCard>

        <MetricCard isLoading={isLoading}>
          <MetricCardHeader href="/vehicles">
            <MetricCardLabel
              tooltip="Drivers currently assigned to vehicles with active duty status"
              icon={<User size={13} className="text-[#ED642B]" />}
            >
              Assigned Drivers
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{driversOnDuty}</MetricCardValue>
            <MetricCardDifferential variant="positive">
              on duty
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={Array.from({ length: 8 }, (_, i) => ({ value: 8 + i * 1.5 }))}
            color="#ED642B"
          />
        </MetricCard>

        <MetricCard isLoading={isLoading}>
          <MetricCardHeader href="/vehicles">
            <MetricCardLabel
              tooltip="ISO shipping containers tracked across terminal corridors"
              icon={<Container size={13} className="text-indigo-500" />}
            >
              Tracked Containers
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{containersTracked}</MetricCardValue>
            <MetricCardDifferential variant="positive">
              units
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={Array.from({ length: 8 }, (_, i) => ({ value: 4 + i * 2 }))}
            color="#6366F1"
          />
        </MetricCard>

        <MetricCard isLoading={isLoading}>
          <MetricCardHeader href="/insights">
            <MetricCardLabel
              tooltip="Vehicles currently exceeding SLA dwell threshold at facilities"
              icon={<AlertCircle size={13} className={delayedCount > 0 ? 'text-red-500' : 'text-text-tertiary'} />}
            >
              Delayed Assets
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className={delayedCount > 0 ? 'text-red-500' : ''}>
              {delayedCount}
            </MetricCardValue>
            <MetricCardDifferential variant={delayedCount > 0 ? 'negative' : 'positive'}>
              {delayedCount > 0 ? 'Exceeding SLA' : 'Optimal'}
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={Array.from({ length: 8 }, (_, i) => ({ value: delayedCount > 0 ? 3 + i * 2 : 0 }))}
            color="#EF4444"
          />
        </MetricCard>
      </div>

      {/* ── VEHICLE TYPE BREAKDOWN ── */}
      {sortedTypes.length > 0 && (
        <div className="rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Fleet Composition by Type</h3>
            <span className="text-[10px] font-numeric text-text-tertiary">{sortedTypes.length} categories</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedTypes.map(([type, count]) => {
              const pct = Math.round((count / totalFleet) * 100);
              return (
                <div
                  key={type}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border-default bg-bg-surface-raised hover:border-[#ED642B]/40 transition-colors cursor-pointer"
                  onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                >
                  <Truck size={12} className="text-[#250C77]" />
                  <span className="text-xs font-semibold text-text-primary">{type}</span>
                  <span className="font-numeric font-extrabold text-xs text-[#ED642B]">{count}</span>
                  <span className="text-[10px] text-text-tertiary">({pct}%)</span>
                </div>
              );
            })}
          </div>
          {/* Stacked bar */}
          <div className="mt-3 h-2 rounded-full overflow-hidden flex">
            {sortedTypes.map(([type, count], idx) => {
              const colors = ['#250C77', '#ED642B', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'];
              const pct = (count / totalFleet) * 100;
              return <div key={type} title={`${type}: ${count}`} style={{ width: `${pct}%`, backgroundColor: colors[idx % colors.length] }} />;
            })}
          </div>
        </div>
      )}

      {/* ── ASSET CATEGORY TABS ── */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {([
          { id: 'all',        label: 'All Assets',   icon: '🚛', count: vehicles.length },
          { id: 'truck',      label: 'Trucks',       icon: '🚚', count: vehicles.filter(v => /truck|tractor|semi/i.test(v.vehicle_type || '')).length },
          { id: 'container',  label: 'Containers',   icon: '📦', count: vehicles.filter(v => v.container_number).length },
          { id: 'trailer',    label: 'Trailers',     icon: '🚌', count: vehicles.filter(v => /trailer|chassis/i.test(v.vehicle_type || '')).length },
          { id: 'tanker',     label: 'Tankers',      icon: '⛽', count: vehicles.filter(v => /tanker|fuel/i.test(v.vehicle_type || '')).length },
          { id: 'unloaded',   label: 'No Load',      icon: '🔲', count: vehicles.filter(v => !v.container_number && !v.cargo_type).length },
        ]).map(cat => {
          if (cat.id !== 'all' && cat.count === 0) return null;
          const isActive = typeFilter === cat.id;
          return (
            <button key={cat.id}
              onClick={() => setTypeFilter(cat.id === 'all' ? 'all' : cat.id === 'container' ? 'all' : cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#250C77] text-white border-[#250C77] shadow-sm'
                  : 'bg-bg-surface border-border-default text-text-secondary hover:text-text-primary hover:border-[#ED642B]/40'
              }`}>
              <span>{cat.icon}</span>
              {cat.label}
              <span className={`font-numeric text-[10px] ${isActive ? 'text-white/70' : 'text-text-tertiary'}`}>{cat.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── FILTERS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search plate, type, driver, container..."
            className="w-full bg-bg-surface border border-border-default rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
          />
        </div>
        <div className="w-full sm:w-40">
          <Select value={statusFilter} onChange={setStatusFilter} options={[
            { value: 'all',        label: 'All Statuses' },
            { value: 'moving',     label: 'In Transit' },
            { value: 'stationary', label: 'Stationary' },
            { value: 'delayed',    label: 'Delayed' },
          ]} />
        </div>
        <div className="w-full sm:w-48">
          <Select value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
        </div>
      </div>

      {/* ── GRID VIEW ── */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVehicles.length === 0 ? (
            <div className="col-span-full py-8">
              <EmptyStatePresentational
                icon={Truck}
                title="No fleet assets found"
                description={
                  searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your search criteria or resetting filters to find active vehicles.'
                    : 'No vehicles have been registered in your fleet database yet.'
                }
              >
                {canMutate && (
                  <Button
                    size="tiny"
                    variant="primary"
                    icon={<Plus size={13} />}
                    onClick={handleOpenAdd}
                  >
                    Register Asset
                  </Button>
                )}
                {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                  <Button
                    size="tiny"
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </EmptyStatePresentational>
            </div>
          ) : filteredVehicles.map(vh => {
            const gps  = gpsData?.[vh.id];
            const mtx  = maintenanceBadge(vh.maintenance_status);
            return (
              <Link key={vh.id} to={`/vehicles/${vh.id}`} className="rounded-2xl border border-border-default bg-bg-surface shadow-sm hover:border-[#ED642B]/40 transition-all hover:shadow-md overflow-hidden flex flex-col cursor-pointer group">
                {/* Vehicle Image */}
                <div className="relative h-32 bg-gradient-to-br from-[#250C77]/10 to-[#ED642B]/10 overflow-hidden">
                  {vh.image_url ? (
                    <img src={vh.image_url} alt={vh.registration_number} className="w-full h-full object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Truck size={36} className="text-[#250C77]/20" />
                    </div>
                  )}
                  {/* Status badge overlay */}
                  <div className="absolute top-2 right-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow ${statusColor(vh.status)}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {statusLabel(vh.status)}
                    </span>
                  </div>
                  {/* Maintenance badge */}
                  {vh.maintenance_status && vh.maintenance_status !== 'good' && (
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow ${mtx.cls}`}>
                        <Settings size={9} />
                        {mtx.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 space-y-3">
                  {/* Title */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-sm font-extrabold text-text-primary group-hover:text-[#ED642B] transition-colors">
                        {vh.registration_number}
                      </span>
                      <p className="text-[11px] text-text-secondary mt-0.5">{vh.vehicle_type}</p>
                    </div>
                    {canMutate && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenEdit(vh); }} className="p-1 rounded text-text-tertiary hover:text-text-primary cursor-pointer"><Edit2 size={13} /></button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(vh.id, vh.registration_number); }} className="p-1 rounded text-text-tertiary hover:text-red-500 cursor-pointer"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>

                  {/* Driver Info */}
                  {vh.driver_name ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-bg-surface-raised border border-border-default">
                      <div className="h-7 w-7 rounded-lg bg-[#250C77] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {vh.driver_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-text-primary truncate">{vh.driver_name}</p>
                        <p className={`text-[10px] font-semibold ${driverStatusColor(vh.driver_status)}`}>
                          {vh.driver_phone || '—'} · {vh.driver_status?.replace('_', ' ') || 'on duty'}
                        </p>
                      </div>
                      {vh.driver_license && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#250C77]/10 text-[#250C77] font-mono font-bold shrink-0">{vh.driver_license}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-bg-surface-raised border border-dashed border-border-default text-text-tertiary">
                      <User size={13} />
                      <span className="text-[11px]">No driver assigned</span>
                    </div>
                  )}

                  {/* Container / Cargo — with weight */}
                  {(vh.container_number || vh.cargo_type) && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                      <Container size={13} className="text-indigo-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        {vh.container_number && (
                          <p className="text-[11px] font-bold font-mono text-indigo-500">{vh.container_number}</p>
                        )}
                        {vh.cargo_type && (
                          <p className="text-[10px] text-text-secondary">{vh.cargo_type} {vh.container_type ? `· ${vh.container_type}` : ''}</p>
                        )}
                      </div>
                      {vh.capacity && (
                        <span className="text-[10px] font-numeric font-bold text-indigo-500 shrink-0 bg-indigo-500/10 px-1.5 py-0.5 rounded">{vh.capacity}T</span>
                      )}
                    </div>
                  )}

                  {/* GPS Signal */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <Radio size={12} className={gps ? 'text-status-good' : 'text-text-tertiary'} />
                    {gps ? (
                      <span className="text-text-secondary font-semibold">
                        {gps.speed?.toFixed(0)} km/h · {gps.latitude?.toFixed(4)}, {gps.longitude?.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">No live signal — assign tracker</span>
                    )}
                  </div>

                  {/* Specs row */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-default text-xs font-numeric">
                    <div>
                      <p className="text-[10px] text-text-tertiary">Capacity</p>
                      <p className="font-bold text-text-primary">{vh.capacity}T</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-tertiary">Idle Rate</p>
                      <p className="font-bold text-[#ED642B]">{formatCurrency(vh.hourly_operating_cost)}/h</p>
                    </div>
                    {vh.odometer_km ? (
                      <div>
                        <p className="text-[10px] text-text-tertiary">Odometer</p>
                        <p className="font-bold text-text-primary">{vh.odometer_km.toLocaleString()} km</p>
                      </div>
                    ) : <div />}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-[#ED642B] flex items-center gap-1">
                      View Profile <ArrowRight size={11} />
                    </span>
                    {vh.telematics_provider && (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-bg-surface-raised border border-border-default text-text-tertiary font-semibold">
                        {vh.telematics_provider}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── TABLE VIEW (SUPABASE UI PATTERN) ── */}
      {viewMode === 'table' && (
        <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-4">
                  <Checkbox
                    id="select-all-vehicles"
                    checked={
                      filteredVehicles.length > 0 &&
                      selectedVehicles.length === filteredVehicles.length
                    }
                    indeterminate={
                      selectedVehicles.length > 0 &&
                      selectedVehicles.length < filteredVehicles.length
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedVehicles(filteredVehicles.map((v) => v.id));
                      } else {
                        setSelectedVehicles([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Container</TableHead>
                <TableHead>GPS Telemetry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Operating Rate</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-text-tertiary">
                    No vehicles match your search or filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vh) => {
                  const gps = gpsData?.[vh.id];
                  const isSelected = selectedVehicles.includes(vh.id);

                  return (
                    <TableRow
                      key={vh.id}
                      className={isSelected ? 'bg-bg-surface-raised/40' : ''}
                    >
                      <TableCell className="w-10 pl-4">
                        <Checkbox
                          id={`select-vh-${vh.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedVehicles((prev) => [...prev, vh.id]);
                            } else {
                              setSelectedVehicles((prev) =>
                                prev.filter((id) => id !== vh.id)
                              );
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg overflow-hidden border border-border-default shrink-0 bg-gradient-to-br from-[#250C77]/10 to-[#ED642B]/10 flex items-center justify-center">
                            {vh.image_url ? (
                              <img src={vh.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Truck size={13} className="text-[#250C77]/40" />
                            )}
                          </div>
                          <div>
                            <Link
                              to={`/vehicles/${vh.id}`}
                              className="font-numeric text-xs font-semibold text-text-primary hover:text-[#ED642B] transition-colors"
                            >
                              {vh.registration_number}
                            </Link>
                            <p className="text-[10px] text-text-tertiary">{vh.vehicle_type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {vh.driver_name ? (
                          <div>
                            <p className="font-medium text-xs text-text-primary">{vh.driver_name}</p>
                            <p className="text-[10px] text-text-tertiary">{vh.driver_phone || '—'}</p>
                          </div>
                        ) : (
                          <span className="text-text-tertiary text-[11px]">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {vh.container_number ? (
                          <div>
                            <p className="font-semibold text-xs text-indigo-400">{vh.container_number}</p>
                            <p className="text-[10px] text-text-tertiary">{vh.cargo_type || '—'}</p>
                          </div>
                        ) : (
                          <span className="text-text-tertiary text-[11px]">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {gps ? (
                          <span className="flex items-center gap-1.5 text-[11px] text-text-secondary font-numeric">
                            <span className="h-1.5 w-1.5 rounded-full bg-status-good animate-pulse" />
                            {gps.speed?.toFixed(0)} km/h
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                            <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
                            No signal
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor(
                            vh.status
                          )}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {statusLabel(vh.status)}
                        </span>
                      </TableCell>
                      <TableCell className="font-numeric text-xs font-semibold text-[#ED642B]">
                        {formatCurrency(vh.hourly_operating_cost)}/hr
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/vehicles/${vh.id}`}
                            className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors"
                          >
                            <ArrowRight size={13} />
                          </Link>
                          {canMutate && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(vh)}
                                className="p-1 rounded text-text-tertiary hover:text-text-primary cursor-pointer transition-colors"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(vh.id, vh.registration_number)}
                                className="p-1 rounded text-text-tertiary hover:text-red-500 cursor-pointer transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      {(showAddModal || editingVehicle) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-bg-surface border border-border-strong p-6 shadow-2xl space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {editingVehicle ? `Edit Asset — ${editingVehicle.registration_number}` : 'Register New Fleet Asset'}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Vehicle specs, driver assignment, container tracking, and telematics.
                </p>
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingVehicle(null); }} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised cursor-pointer transition-colors">
                <X size={16} />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-500">{submitError}</div>
            )}

            {/* Vehicle Photo */}
            <VehicleImageUpload currentUrl={imageDataUrl} onChange={setImageDataUrl} />

            {/* Tab Navigation */}
            <div className="flex gap-1 border-b border-border-default pb-px overflow-x-auto">
              {[
                { id: 'specs',      label: 'Vehicle Specs', icon: <Truck size={12} /> },
                { id: 'driver',     label: 'Driver',        icon: <User size={12} /> },
                { id: 'cargo',      label: 'Cargo & Container', icon: <Package size={12} /> },
                { id: 'telematics', label: 'Telematics',    icon: <Navigation2 size={12} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
                    activeTab === tab.id
                      ? 'border-[#ED642B] text-[#ED642B]'
                      : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

              {/* SPECS TAB */}
              {activeTab === 'specs' && (
                <div className="space-y-4">
                  {!editingVehicle && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-text-secondary">Quick type presets:</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {PRESET_CONFIGS.map((p, i) => (
                          <button key={i} type="button" onClick={() => applyPreset(i)}
                            className="p-2 rounded-xl bg-bg-surface-raised hover:bg-[#ED642B]/10 border border-border-default hover:border-[#ED642B]/40 text-left transition-colors cursor-pointer text-xs">
                            <span className="font-bold text-text-primary text-[10px] block truncate">{p.type}</span>
                            <span className="text-[9.5px] text-text-tertiary">{p.capacity}T · KES {p.cost.toLocaleString()}/hr</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Registration Plate *</label>
                      <input {...register('registration_number')} placeholder="e.g. KDF 489X" className={`${inputCls} uppercase font-numeric font-bold`} />
                      {errors.registration_number && <p className="text-[11px] text-red-500 mt-1">{errors.registration_number.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Vehicle Classification *</label>
                      <input {...register('vehicle_type')} placeholder="e.g. Semi-Trailer (28T)" className={inputCls} />
                      {errors.vehicle_type && <p className="text-[11px] text-red-500 mt-1">{errors.vehicle_type.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Payload Capacity (Tonnes) *</label>
                      <input type="number" step="0.1" {...register('capacity', { valueAsNumber: true })} className={inputCls} />
                      {errors.capacity && <p className="text-[11px] text-red-500 mt-1">{errors.capacity.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Idle Rate (KES/hr) *</label>
                      <input type="number" step="100" {...register('hourly_operating_cost', { valueAsNumber: true })} className={inputCls} />
                      {errors.hourly_operating_cost && <p className="text-[11px] text-red-500 mt-1">{errors.hourly_operating_cost.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Current Status *</label>
                      <select {...register('status')} className={`${inputCls} cursor-pointer`}>
                        <option value="active">Active</option>
                        <option value="in_transit">In Transit</option>
                        <option value="idle">Stationary / Idle</option>
                        <option value="delayed">Delayed</option>
                        <option value="maintenance">Under Maintenance</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Maintenance Status</label>
                      <select {...register('maintenance_status')} className={`${inputCls} cursor-pointer`}>
                        <option value="good">Good</option>
                        <option value="due_soon">Due Soon</option>
                        <option value="in_service">In Service</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Odometer (km)</label>
                      <input type="number" {...register('odometer_km', { valueAsNumber: true })} placeholder="e.g. 120000" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Next Inspection Date</label>
                      <input type="date" {...register('next_inspection_date')} className={inputCls} />
                    </div>
                  </div>
                </div>
              )}

              {/* DRIVER TAB */}
              {activeTab === 'driver' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Driver Full Name</label>
                      <input {...register('driver_name')} placeholder="e.g. James Mwangi" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Phone / WhatsApp</label>
                      <input {...register('driver_phone')} placeholder="e.g. +254 712 345 678" className={`${inputCls} font-numeric`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">License Number</label>
                      <input {...register('driver_license')} placeholder="e.g. DL/2024/00123" className={`${inputCls} font-mono`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Driver Status</label>
                      <select {...register('driver_status')} className={`${inputCls} cursor-pointer`}>
                        <option value="on_duty">On Duty</option>
                        <option value="driving">Driving</option>
                        <option value="resting">Resting</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* CARGO TAB */}
              {activeTab === 'cargo' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Container Number</label>
                      <input {...register('container_number')} placeholder="e.g. MSCU1234567" className={`${inputCls} font-mono uppercase`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Container Type</label>
                      <select {...register('container_type')} className={`${inputCls} cursor-pointer`}>
                        <option value="">— Select type —</option>
                        <option value="20ft Dry">20ft Dry</option>
                        <option value="40ft Dry">40ft Dry</option>
                        <option value="40ft HC">40ft High Cube</option>
                        <option value="20ft Reefer">20ft Reefer</option>
                        <option value="40ft Reefer">40ft Reefer</option>
                        <option value="Open Top">Open Top</option>
                        <option value="Flat Rack">Flat Rack</option>
                        <option value="Tank Container">Tank Container</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Trailer / Chassis Number</label>
                      <input {...register('trailer_number')} placeholder="e.g. TR-KBN-2024-001" className={`${inputCls} font-mono`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Cargo Description</label>
                      <input {...register('cargo_type')} placeholder="e.g. Electronics / FMCG / Fuel" className={inputCls} />
                    </div>
                  </div>
                </div>
              )}

              {/* TELEMATICS TAB */}
              {activeTab === 'telematics' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Tracker Model / Provider</label>
                      <select {...register('telematics_provider')} className={`${inputCls} cursor-pointer`}>
                        <option value="">— Select tracker —</option>
                        {TRACKER_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Device IMEI / Serial</label>
                      <input {...register('tracker_imei')} placeholder="e.g. 868204041234567" className={`${inputCls} font-mono`} />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-bg-surface-raised/60 border border-border-default text-[11px] text-text-tertiary">
                    Telemetry webhook: <code className="text-[#ED642B] font-mono">POST /api/v1/gps/events</code> — configure in your tracker's server URL.
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => { setShowAddModal(false); setEditingVehicle(null); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  type="submit"
                  loading={isSubmitting}
                >
                  {editingVehicle ? 'Update Asset' : 'Register Asset'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
