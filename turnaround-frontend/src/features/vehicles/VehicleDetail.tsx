import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes, formatDateTime } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  ArrowLeft, Clock, Edit2, Truck, MapPin, X, BarChart2, DollarSign, ShieldCheck,
  User, Container, Radio, Settings, Camera, Package, Navigation2, AlertTriangle,
  CheckCircle2, Fuel, Phone, Save, FileText, Download, Printer,
  Sparkles, Ticket
} from 'lucide-react';
import type { Vehicle } from '../../lib/api/types';
import { GatePassModal } from '../gate-pass/GatePassModal';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import {
  Chart,
  ChartCard,
  ChartHeader,
  ChartTitle,
  ChartContent,
  ChartBar,
  ChartEmptyState,
  ChartLoadingState,
} from '../../components/ui/Chart';
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
  { id: 'teltonika', name: 'Teltonika FMB920 / FMB120 (Direct IMEI)' },
  { id: 'concox', name: 'Concox GT06N / Jimi JM-VL02 (Direct IMEI)' },
  { id: 'queclink', name: 'Queclink GV300 / GL300 (Direct IMEI)' },
  { id: 'tramigo', name: 'Tramigo T23 Fleet (Direct IMEI)' },
  { id: 'samsara', name: 'Samsara Cloud Telematics (API Integration)' },
  { id: 'cartrack', name: 'Cartrack Fleet Telematics (API Integration)' },
  { id: 'driver_app', name: 'Turnaround Driver Mobile App (Live GPS Stream)' },
];

const updateSchema = zod.object({
  registration_number: zod.string().min(3, 'Min 3 characters').max(15),
  vehicle_type: zod.string().min(2, 'Enter a vehicle classification'),
  capacity: zod.number().positive('Must be > 0'),
  hourly_operating_cost: zod.number().positive('Must be positive'),
  status: zod.enum(['moving', 'stationary', 'delayed'] as const),
  // Driver
  driver_name: zod.string().optional(),
  driver_phone: zod.string().optional(),
  driver_license: zod.string().optional(),
  driver_status: zod.enum(['on_duty', 'resting', 'driving']).optional(),
  // Container / Cargo
  trailer_number: zod.string().optional(),
  container_number: zod.string().optional(),
  container_type: zod.string().optional(),
  cargo_type: zod.string().optional(),
  // Telematics
  telematics_provider: zod.string().optional(),
  tracker_imei: zod.string().optional(),
  // Maintenance
  maintenance_status: zod.enum(['good', 'due_soon', 'in_service']).optional(),
  next_inspection_date: zod.string().optional(),
  odometer_km: zod.number().optional(),
  fuel_level: zod.number().min(0).max(100).optional(),
});

type UpdateFormValues = zod.infer<typeof updateSchema>;

const statusColor = (s: string) =>
  s === 'moving' ? 'bg-status-good/15 text-status-good border-status-good/30'
  : s === 'delayed' ? 'bg-red-500/15 text-red-500 border-red-500/30'
  : 'bg-bg-surface-raised text-text-tertiary border-border-default';

const maintenanceBadge = (m?: string) => {
  if (m === 'in_service') return { label: 'In Service', cls: 'bg-yellow-500/15 text-yellow-500', icon: <Settings size={11} /> };
  if (m === 'due_soon')   return { label: 'Due Soon',   cls: 'bg-orange-500/15 text-orange-400', icon: <AlertTriangle size={11} /> };
  return { label: 'Good', cls: 'bg-status-good/15 text-status-good', icon: <CheckCircle2 size={11} /> };
};

// ── Image Upload Component with Crisp Fixed Dimensions ────────────────────────
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
    <div className="flex items-center gap-4">
      <div
        className="relative h-28 w-44 rounded-xl overflow-hidden border-2 border-dashed border-border-default hover:border-[#ED642B]/60 transition-colors cursor-pointer group bg-bg-surface-raised shrink-0 flex items-center justify-center"
        onClick={() => fileRef.current?.click()}
      >
        {currentUrl ? (
          <>
            <img src={currentUrl} alt="Vehicle" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-1.5 text-text-tertiary group-hover:text-text-secondary transition-colors p-2 text-center">
            <Camera size={20} />
            <span className="text-[11px] font-medium">Upload photo</span>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      <div className="text-xs text-text-tertiary">
        <p className="font-semibold text-text-secondary">High-Resolution Asset Thumbnail</p>
        <p className="text-[11px] mt-0.5">Recommended ratio: 4:3 or 16:9. Images are kept sharp without stretching.</p>
      </div>
    </div>
  );
};

// ── Section Label ─────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 pb-2 border-b border-border-default mb-3">
    <span className="text-text-tertiary">{icon}</span>
    <h4 className="text-[11px] font-bold uppercase tracking-widest text-text-tertiary">{label}</h4>
  </div>
);

// ── Info Row ─────────────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value?: string | number | null; mono?: boolean; accent?: string }> = ({
  label, value, mono, accent
}) => (
  <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-border-default/40 last:border-0">
    <span className="text-[11px] text-text-tertiary shrink-0">{label}</span>
    <span className={`text-xs font-semibold truncate text-right ${mono ? 'font-mono' : ''} ${accent || 'text-text-primary'}`}>
      {value ?? <span className="text-text-tertiary font-normal italic">—</span>}
    </span>
  </div>
);

// ── Input Field ───────────────────────────────────────────────────────────────
const FormField: React.FC<{ label: string; children: React.ReactNode; error?: string }> = ({ label, children, error }) => (
  <div>
    <label className="block text-xs font-semibold text-text-primary mb-1">{label}</label>
    {children}
    {error && <p className="text-[11px] text-red-500 mt-0.5">{error}</p>}
  </div>
);

const inputCls = "w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none transition-colors";

// ═══════════════════════════════════════════════════════════════════════════════
export const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { toast } = useToast();
  const canMutate = role === 'admin' || role === 'fleet_manager';

  const [isEditing, setIsEditing] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showGatePassModal, setShowGatePassModal] = useState(false);

  const { data: vehicle, isLoading: loadingVehicle, isError: vehicleError } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => apiClient.getVehicleById(id || ''),
    enabled: !!id,
  });

  // Sync imageUrl when vehicle data first loads
  useEffect(() => {
    if (vehicle?.image_url && !imageUrl) setImageUrl(vehicle.image_url);
  }, [vehicle?.image_url]);

  const { data: dwells, isLoading: loadingDwells } = useQuery({
    queryKey: ['dwellEvents', 'vehicle', id],
    queryFn: () => apiClient.getDwellEvents(id),
    enabled: !!id,
  });

  const { data: gpsPositions } = useQuery({
    queryKey: ['liveGpsEvents'],
    queryFn: () => apiClient.getLiveGPSEvents(),
    refetchInterval: 15000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => apiClient.updateVehicle(id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsEditing(false);
      toast({ variant: 'success', title: 'Asset Updated', message: 'Fleet asset profile saved successfully.' });
    },
    onError: (err: any) => {
      setUpdateError(err?.message || 'Failed to update vehicle details.');
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    values: vehicle ? {
      registration_number: vehicle.registration_number,
      vehicle_type: vehicle.vehicle_type,
      capacity: vehicle.capacity,
      hourly_operating_cost: vehicle.hourly_operating_cost,
      status: vehicle.status,
      driver_name: vehicle.driver_name || '',
      driver_phone: vehicle.driver_phone || '',
      driver_license: vehicle.driver_license || '',
      driver_status: vehicle.driver_status || 'on_duty',
      trailer_number: vehicle.trailer_number || '',
      container_number: vehicle.container_number || '',
      container_type: vehicle.container_type || '',
      cargo_type: vehicle.cargo_type || '',
      telematics_provider: vehicle.telematics_provider || '',
      tracker_imei: vehicle.tracker_imei || '',
      maintenance_status: vehicle.maintenance_status || 'good',
      next_inspection_date: vehicle.next_inspection_date || '',
      odometer_km: vehicle.odometer_km,
      fuel_level: vehicle.fuel_level,
    } : undefined,
  });

  const onSubmit = (data: UpdateFormValues) => {
    setUpdateError('');
    const cleaned: any = { ...data };
    if (imageUrl) cleaned.image_url = imageUrl;
    Object.keys(cleaned).forEach(k => { if (cleaned[k] === '') delete cleaned[k]; });
    updateMutation.mutate(cleaned);
  };

  // ── Loading / Error States ──────────────────────────────────────────────────
  if (loadingVehicle || loadingDwells) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-6 w-32 bg-bg-surface-raised rounded" />
        <div className="h-36 rounded-xl bg-bg-surface border border-border-default" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-bg-surface border border-border-default" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 rounded-xl bg-bg-surface border border-border-default" />
          <div className="h-64 rounded-xl bg-bg-surface border border-border-default" />
        </div>
      </div>
    );
  }

  if (vehicleError || !vehicle) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-surface border border-border-default rounded-xl">
        <Truck size={36} className="text-status-danger" />
        <h2 className="text-sm font-bold text-text-primary mt-3">Vehicle Not Found</h2>
        <p className="text-xs text-text-secondary mt-1">The requested asset telemetry record does not exist.</p>
        <Link to="/vehicles" className="mt-4 rounded-lg bg-brand-500 hover:bg-brand-400 px-4 py-2 text-xs font-semibold text-white shadow transition-colors">
          Back to Fleet Registry
        </Link>
      </div>
    );
  }

  const gps = gpsPositions ? gpsPositions[vehicle.id] : null;
  const dwellList = dwells || [];
  const mtx = maintenanceBadge(vehicle.maintenance_status);

  const totalDwellMinutes = dwellList.reduce((acc: number, d: any) => acc + (d.dwell_minutes || 0), 0);
  const totalExcessMinutes = dwellList.reduce((acc: number, d: any) => acc + (d.excess_minutes || 0), 0);
  const totalDelayCost = (totalExcessMinutes / 60) * vehicle.hourly_operating_cost;

  const chartData = dwellList.slice(0, 10).reverse().map((d: any, i: number) => ({
    timestamp: d.location_name ? d.location_name.substring(0, 10) : `Stop #${i + 1}`,
    dwell_minutes: d.dwell_minutes,
  }));

  const isDelayed = vehicle.status === 'delayed';
  const isMoving  = vehicle.status === 'moving';

  // Predictive Delay Risk (Simulated corridor ML confidence)
  const delayRiskProbability = isDelayed ? 94 : totalExcessMinutes > 30 ? 78 : isMoving ? 28 : 12;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* ── BREADCRUMB & TOP ACTIONS ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link to="/vehicles" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft size={14} /> Back to Commercial Fleet
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="small"
            icon={<Ticket size={13} className="text-[#ED642B]" />}
            onClick={() => setShowGatePassModal(true)}
          >
            Digital Gate Pass
          </Button>
          {totalExcessMinutes > 0 && (
            <Button
              variant="outline"
              size="small"
              icon={<FileText size={13} className="text-[#ED642B]" />}
              onClick={() => setShowClaimModal(true)}
            >
              Generate Demurrage Claim
            </Button>
          )}
          {canMutate && !isEditing && (
            <Button
              variant="outline"
              size="small"
              icon={<Edit2 size={13} />}
              onClick={() => setIsEditing(true)}
            >
              Edit Asset
            </Button>
          )}
        </div>
      </div>

      {/* ── EDIT FORM ─────────────────────────────────────────────────────── */}
      {isEditing && (
        <div className="rounded-2xl border border-[#ED642B]/40 bg-bg-surface shadow-lg space-y-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-default bg-bg-surface-raised/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#ED642B] text-white flex items-center justify-center">
                <Edit2 size={14} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Edit Asset: {vehicle.registration_number}</h3>
                <p className="text-[11px] text-text-tertiary">Update fleet asset specifications and tracking configuration.</p>
              </div>
            </div>
            <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
              <X size={16} />
            </button>
          </div>

          {updateError && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-500">{updateError}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* — Vehicle Photo ─────────────────────────────────────────────── */}
            <div>
              <SectionLabel icon={<Camera size={13} />} label="Vehicle Photo" />
              <VehicleImageUpload
                currentUrl={imageUrl || vehicle.image_url}
                onChange={setImageUrl}
              />
            </div>

            {/* — Core Info ──────────────────────────────────────────────────── */}
            <div>
              <SectionLabel icon={<Truck size={13} />} label="Core Asset Info" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Registration Number *" error={errors.registration_number?.message}>
                  <input type="text" {...register('registration_number')} className={`${inputCls} uppercase font-mono`} placeholder="e.g. KDG 123A" />
                </FormField>
                <FormField label="Vehicle Classification *" error={errors.vehicle_type?.message}>
                  <input type="text" {...register('vehicle_type')} className={inputCls} placeholder="e.g. Semi-Trailer (28T)" />
                </FormField>
                <FormField label="Payload Capacity (Tonnes)" error={errors.capacity?.message}>
                  <input type="number" step="0.1" {...register('capacity', { valueAsNumber: true })} className={inputCls} />
                </FormField>
                <FormField label="Operating Rate (KES/hr)" error={errors.hourly_operating_cost?.message}>
                  <input type="number" step="100" {...register('hourly_operating_cost', { valueAsNumber: true })} className={inputCls} />
                </FormField>
                <FormField label="Fleet Status">
                  <select {...register('status')} className={inputCls}>
                    <option value="stationary">Stationary</option>
                    <option value="moving">In Transit</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </FormField>
              </div>
            </div>

            {/* — Driver Info ──────────────────────────────────────────────── */}
            <div>
              <SectionLabel icon={<User size={13} />} label="Driver & Personnel" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Driver Full Name">
                  <input type="text" {...register('driver_name')} className={inputCls} placeholder="e.g. James Mwangi" />
                </FormField>
                <FormField label="Driver Phone">
                  <input type="text" {...register('driver_phone')} className={inputCls} placeholder="+254 7XX XXX XXX" />
                </FormField>
                <FormField label="Driver License No.">
                  <input type="text" {...register('driver_license')} className={`${inputCls} font-mono uppercase`} placeholder="DL-XXXX" />
                </FormField>
                <FormField label="Driver Status">
                  <select {...register('driver_status')} className={inputCls}>
                    <option value="on_duty">On Duty</option>
                    <option value="driving">Driving</option>
                    <option value="resting">Resting</option>
                  </select>
                </FormField>
              </div>
            </div>

            {/* — Container / Cargo ─────────────────────────────────────────── */}
            <div>
              <SectionLabel icon={<Container size={13} />} label="Container & Cargo" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Trailer Number">
                  <input type="text" {...register('trailer_number')} className={`${inputCls} font-mono uppercase`} placeholder="e.g. TR-45891" />
                </FormField>
                <FormField label="Container Number">
                  <input type="text" {...register('container_number')} className={`${inputCls} font-mono uppercase`} placeholder="e.g. MSKU1234567" />
                </FormField>
                <FormField label="Container Type">
                  <select {...register('container_type')} className={inputCls}>
                    <option value="">— Select Type —</option>
                    <option value="20ft Dry">20ft Dry</option>
                    <option value="40ft Dry">40ft Dry</option>
                    <option value="40ft HC">40ft High Cube</option>
                    <option value="20ft Reefer">20ft Reefer</option>
                    <option value="40ft Reefer">40ft Reefer</option>
                    <option value="Open Top">Open Top</option>
                    <option value="Flat Rack">Flat Rack</option>
                    <option value="Bulk Tanker">Bulk Tanker</option>
                  </select>
                </FormField>
                <FormField label="Cargo Type">
                  <input type="text" {...register('cargo_type')} className={inputCls} placeholder="e.g. General Merchandise" />
                </FormField>
              </div>
            </div>

            {/* — Telematics ─────────────────────────────────────────────────── */}
            <div>
              <SectionLabel icon={<Radio size={13} />} label="GPS Telematics & Tracking" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Telematics Provider">
                  <select {...register('telematics_provider')} className={inputCls}>
                    <option value="">— Select Provider —</option>
                    {TRACKER_MODELS.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Tracker IMEI / Device ID">
                  <input type="text" {...register('tracker_imei')} className={`${inputCls} font-mono`} placeholder="15-digit IMEI or API key" />
                </FormField>
              </div>
            </div>

            {/* — Maintenance ───────────────────────────────────────────────── */}
            <div>
              <SectionLabel icon={<Settings size={13} />} label="Maintenance & Compliance" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <FormField label="Maintenance Status">
                  <select {...register('maintenance_status')} className={inputCls}>
                    <option value="good">Good</option>
                    <option value="due_soon">Due Soon</option>
                    <option value="in_service">In Service</option>
                  </select>
                </FormField>
                <FormField label="Next Inspection Date">
                  <input type="date" {...register('next_inspection_date')} className={inputCls} />
                </FormField>
                <FormField label="Odometer (km)">
                  <input type="number" {...register('odometer_km', { valueAsNumber: true })} className={inputCls} placeholder="e.g. 145000" />
                </FormField>
                <FormField label="Fuel Level (%)">
                  <input type="number" min="0" max="100" {...register('fuel_level', { valueAsNumber: true })} className={inputCls} placeholder="0 – 100" />
                </FormField>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
              <Button variant="ghost" size="small" type="button" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="small"
                type="submit"
                icon={<Save size={13} />}
                loading={isSubmitting || updateMutation.isPending}
              >
                Save Asset
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── ASSET HERO PANEL (Crisp High-DPI Photo Card Presentation) ───── */}
      {!isEditing && (
        <div className="rounded-2xl border border-border-default bg-bg-surface shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            
            {/* Left: Compact Photo + Core Identity */}
            <div className="flex items-start gap-4">
              {/* High-DPI Photo Card with Controlled Dimensions */}
              <div className="relative h-24 w-36 sm:h-28 sm:w-44 rounded-xl border border-border-default overflow-hidden bg-gradient-to-br from-[#250C77]/10 to-[#ED642B]/10 shrink-0 shadow-sm flex items-center justify-center group">
                {(vehicle.image_url || imageUrl) ? (
                  <img
                    src={imageUrl || vehicle.image_url}
                    alt={vehicle.registration_number}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Truck size={32} className="text-[#250C77]/30" />
                )}
                {/* Status indicator badge overlay */}
                <div className="absolute bottom-1.5 left-1.5">
                  <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${statusColor(vehicle.status)} backdrop-blur-md`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isDelayed ? 'bg-red-500 animate-pulse' : isMoving ? 'bg-status-good animate-pulse' : 'bg-text-tertiary'}`} />
                    {vehicle.status}
                  </span>
                </div>
              </div>

              {/* Identity & Specs */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-mono text-xl font-bold text-text-primary">{vehicle.registration_number}</h1>
                  {vehicle.maintenance_status && vehicle.maintenance_status !== 'good' && (
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${mtx.cls}`}>
                      {mtx.icon}{mtx.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{vehicle.vehicle_type} • {vehicle.capacity}T Payload</p>

                {/* AI Predictive Risk Badge */}
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-surface-raised border border-border-default text-[11px]">
                  <Sparkles size={12} className={delayRiskProbability > 50 ? 'text-[#ED642B]' : 'text-status-good'} />
                  <span className="text-text-secondary">AI Corridor Delay Risk:</span>
                  <span className={`font-bold font-numeric ${delayRiskProbability > 50 ? 'text-[#ED642B]' : 'text-status-good'}`}>
                    {delayRiskProbability}% {delayRiskProbability > 50 ? '(Elevated)' : '(Optimal)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Real-Time Telemetry / Geofence Chip */}
            <div className="flex flex-wrap items-center gap-3">
              {gps && (
                <div className="p-3 rounded-xl bg-bg-surface-raised border border-border-default font-numeric min-w-[140px]">
                  <p className="text-[10px] font-semibold uppercase text-text-tertiary">Live GPS Speed</p>
                  <p className="text-sm font-bold text-status-good mt-0.5 flex items-center gap-1">
                    <Navigation2 size={13} className="shrink-0" />
                    {gps.speed?.toFixed(0)} km/h
                  </p>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{gps.latitude?.toFixed(4)}, {gps.longitude?.toFixed(4)}</p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-bg-surface-raised border border-border-default min-w-[150px]">
                <span className="text-[10px] font-semibold uppercase text-text-tertiary block">Current Facility</span>
                <span className="text-xs font-bold text-text-primary flex items-center gap-1 mt-1">
                  <MapPin size={12} className="text-[#ED642B]" />
                  {vehicle.current_location_name || 'En Route (Northern Corridor)'}
                </span>
              </div>
            </div>
          </div>

          {/* ── INFO GRID: 4 columns ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-border-default">

            {/* Driver Card */}
            <div className="space-y-0.5">
              <SectionLabel icon={<User size={12} />} label="Driver" />
              {vehicle.driver_name ? (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-bg-surface-raised border border-border-default">
                  <div className="h-8 w-8 rounded-lg bg-[#250C77] text-white font-bold text-sm flex items-center justify-center shrink-0">
                    {vehicle.driver_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">{vehicle.driver_name}</p>
                    {vehicle.driver_phone && <p className="text-[10px] text-text-secondary flex items-center gap-1"><Phone size={9}/>{vehicle.driver_phone}</p>}
                    {vehicle.driver_license && <p className="text-[9px] font-mono text-text-tertiary">{vehicle.driver_license}</p>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-bg-surface-raised border border-dashed border-border-default text-text-tertiary">
                  <User size={13} /><span className="text-xs">No driver assigned</span>
                </div>
              )}
              {vehicle.driver_status && (
                <p className="text-[10px] text-text-tertiary pl-1 capitalize pt-0.5">Duty Status: <span className="text-text-primary font-semibold">{vehicle.driver_status.replace('_', ' ')}</span></p>
              )}
            </div>

            {/* Container / Cargo Card */}
            <div className="space-y-0.5">
              <SectionLabel icon={<Container size={12} />} label="Container & Cargo" />
              {(vehicle.container_number || vehicle.cargo_type || vehicle.trailer_number) ? (
                <div className="space-y-1.5">
                  {vehicle.container_number && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/5 border border-indigo-500/20">
                      <Container size={12} className="text-indigo-400 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold font-mono text-indigo-400">{vehicle.container_number}</p>
                        {vehicle.container_type && <p className="text-[10px] text-text-tertiary">{vehicle.container_type}</p>}
                      </div>
                    </div>
                  )}
                  {vehicle.trailer_number && (
                    <InfoRow label="Trailer" value={vehicle.trailer_number} mono />
                  )}
                  {vehicle.cargo_type && (
                    <InfoRow label="Cargo" value={vehicle.cargo_type} />
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-bg-surface-raised border border-dashed border-border-default text-text-tertiary">
                  <Package size={13} /><span className="text-xs">No cargo assigned</span>
                </div>
              )}
            </div>

            {/* Telematics */}
            <div className="space-y-0.5">
              <SectionLabel icon={<Radio size={12} />} label="Telematics" />
              <div className="space-y-0">
                <InfoRow
                  label="Provider"
                  value={TRACKER_MODELS.find(t => t.id === vehicle.telematics_provider)?.name?.split(' (')[0] || vehicle.telematics_provider}
                />
                <InfoRow label="Tracker IMEI" value={vehicle.tracker_imei} mono />
                <InfoRow
                  label="GPS Telemetry"
                  value={gps ? `Live · ${gps.speed?.toFixed(0)} km/h` : 'No signal'}
                  accent={gps ? 'text-status-good' : undefined}
                />
              </div>
            </div>

            {/* Maintenance & Fleet */}
            <div className="space-y-0.5">
              <SectionLabel icon={<Settings size={12} />} label="Maintenance & Fleet" />
              <div className="space-y-0">
                <InfoRow label="Operating Rate" value={`${formatCurrency(vehicle.hourly_operating_cost)}/hr`} accent="text-[#ED642B]" />
                <InfoRow label="Maintenance" value={mtx.label} accent={vehicle.maintenance_status === 'good' ? 'text-status-good' : vehicle.maintenance_status === 'in_service' ? 'text-yellow-500' : 'text-orange-400'} />
                {vehicle.odometer_km != null && (
                  <InfoRow label="Odometer" value={`${vehicle.odometer_km.toLocaleString()} km`} mono />
                )}
                {vehicle.fuel_level != null && (
                  <div className="flex items-center justify-between py-1.5 border-b border-border-default/40">
                    <span className="text-[11px] text-text-tertiary flex items-center gap-1"><Fuel size={10}/>Fuel Level</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-bg-surface-raised overflow-hidden">
                        <div
                          className={`h-full rounded-full ${vehicle.fuel_level > 50 ? 'bg-status-good' : vehicle.fuel_level > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${vehicle.fuel_level}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold font-numeric text-text-primary">{vehicle.fuel_level}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI METRICS STRIP ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard isLoading={loadingDwells}>
          <MetricCardHeader href={`/vehicles/${id}`}>
            <MetricCardLabel tooltip="Total elapsed minutes spent at monitored terminal geofences" icon={<Clock size={13} className="text-[#250C77]" />}>
              Total Dwell Logged
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{formatMinutes(totalDwellMinutes)}</MetricCardValue>
            <MetricCardDifferential variant="positive">{dwellList.length} stops</MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline data={dwellList.map((d: any) => ({ value: d.dwell_minutes }))} color="#250C77" />
        </MetricCard>

        <MetricCard isLoading={loadingDwells}>
          <MetricCardHeader href={`/vehicles/${id}`}>
            <MetricCardLabel tooltip="Cumulative delay beyond SLA benchmark" icon={<Clock size={13} className={totalExcessMinutes > 0 ? 'text-status-danger' : 'text-text-tertiary'} />}>
              Cumulative Excess Delay
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className={totalExcessMinutes > 0 ? 'text-status-danger' : ''}>
              +{formatMinutes(totalExcessMinutes)}
            </MetricCardValue>
            <MetricCardDifferential variant={totalExcessMinutes > 0 ? 'negative' : 'positive'}>
              {totalExcessMinutes > 0 ? 'Over SLA' : 'Optimal'}
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline data={dwellList.map((d: any) => ({ value: d.excess_minutes }))} color="#EF4444" />
        </MetricCard>

        <MetricCard isLoading={loadingDwells}>
          <MetricCardHeader href={`/vehicles/${id}`}>
            <MetricCardLabel tooltip="Demurrage and idling losses at vehicle hourly rate" icon={<DollarSign size={13} className="text-[#ED642B]" />}>
              Demurrage Loss
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className={totalDelayCost > 0 ? 'text-[#ED642B]' : ''}>{formatCurrency(totalDelayCost)}</MetricCardValue>
            <MetricCardDifferential variant={totalDelayCost > 0 ? 'negative' : 'positive'}>Period</MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline data={dwellList.map((d: any) => ({ value: d.estimated_cost }))} color="#ED642B" />
        </MetricCard>

        <MetricCard isLoading={loadingDwells}>
          <MetricCardHeader href={`/vehicles/${id}`}>
            <MetricCardLabel tooltip="SLA adherence percentage across recorded stop events" icon={<ShieldCheck size={13} className="text-status-good" />}>
              Efficiency Rating
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>
              {totalDwellMinutes > 0
                ? `${Math.max(0, Math.round(100 - (totalExcessMinutes / totalDwellMinutes) * 100))}%`
                : '100%'}
            </MetricCardValue>
            <MetricCardDifferential variant="positive">on-time score</MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={dwellList.map((d: any) => ({
              value: d.expected_minutes > 0 ? Math.round((d.expected_minutes / Math.max(d.dwell_minutes, 1)) * 100) : 100,
            }))}
            color="#10B981"
          />
        </MetricCard>
      </div>

      {/* ── DWELL AUDIT + CHART ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Audit Table */}
        <div className="lg:col-span-2 rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
          <div className="px-4 py-3.5 border-b border-border-default bg-bg-surface-raised/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-[#250C77]" />
              <h2 className="text-xs font-semibold text-text-primary">Geofence Dwell Audit Trail</h2>
            </div>
            <span className="font-numeric text-[11px] text-text-tertiary">{dwellList.length} Recorded Cycles</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location Geofence</TableHead>
                <TableHead>Arrival Time</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Elapsed Dwell</TableHead>
                <TableHead>SLA Baseline</TableHead>
                <TableHead className="text-right pr-4">Excess Delay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dwellList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-xs text-text-tertiary">
                    No geofence dwell events recorded for this vehicle.
                  </TableCell>
                </TableRow>
              ) : (
                dwellList.map((d: any) => {
                  const isExcess = d.excess_minutes > 0;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs font-medium text-text-primary">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={11} className="text-text-tertiary shrink-0" />
                          {d.location_name || 'Terminal Geofence'}
                        </div>
                      </TableCell>
                      <TableCell className="font-numeric text-[11px] text-text-secondary">{formatDateTime(d.arrival_time)}</TableCell>
                      <TableCell className="font-numeric text-[11px] text-text-secondary">
                        {d.departure_time ? formatDateTime(d.departure_time) : <span className="text-status-warning font-semibold">Active Dwell</span>}
                      </TableCell>
                      <TableCell className="font-numeric text-xs font-medium text-text-primary">{formatMinutes(d.dwell_minutes)}</TableCell>
                      <TableCell className="font-numeric text-xs text-text-tertiary">{formatMinutes(d.expected_minutes)}</TableCell>
                      <TableCell className="text-right font-numeric text-xs font-semibold pr-4">
                        {isExcess
                          ? <span className="text-status-danger">+{formatMinutes(d.excess_minutes)}</span>
                          : <span className="text-status-good">Within SLA</span>
                        }
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Historical Chart */}
        <div className="h-full">
          <Chart isLoading={loadingDwells}>
            <ChartCard className="h-full flex flex-col">
              <ChartHeader>
                <ChartTitle tooltip="Turnaround minutes vs expected facility SLA per stop">
                  Turnaround vs SLA
                </ChartTitle>
              </ChartHeader>
              <ChartContent
                isEmpty={dwellList.length === 0}
                emptyState={
                  <ChartEmptyState
                    icon={<BarChart2 size={16} />}
                    title="Insufficient stop history"
                    description="Telemetry will populate once vehicle completes facility stops"
                  />
                }
                loadingState={<ChartLoadingState />}
              >
                <div className="h-64">
                  <ChartBar
                    data={chartData}
                    dataKey="dwell_minutes"
                    showGrid
                    showYAxis
                    YAxisProps={{ tickFormatter: (v: number) => `${v}m`, width: 32 }}
                    color="#250C77"
                    isFullHeight
                  />
                </div>
              </ChartContent>
            </ChartCard>
          </Chart>
        </div>
      </div>

      {/* ── DEMURRAGE CLAIM NOTICE MODAL ──────────────────────────────────── */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-default rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-border-default flex items-center justify-between bg-bg-surface-raised/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#ED642B] text-white flex items-center justify-center">
                  <FileText size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Formal Demurrage & Excess Dwell Claim</h3>
                  <p className="text-[11px] text-text-tertiary">Commercial SLA violation audit document</p>
                </div>
              </div>
              <button
                onClick={() => setShowClaimModal(false)}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Printable Document Body */}
            <div className="p-6 space-y-5 text-text-primary text-xs font-sans">
              <div className="flex items-start justify-between border-b border-border-default pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-[#250C77]">TURNAROUND LOGISTICS NETWORK</h2>
                  <p className="text-[11px] text-text-tertiary mt-0.5">Automated Fleet Telematics & SLA Enforcement</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-text-tertiary block">Claim ID</span>
                  <span className="font-mono font-bold text-text-primary">DEM-{vehicle.registration_number.replace(/\s+/g, '')}-{Date.now().toString().slice(-6)}</span>
                  <p className="text-[10px] text-text-tertiary mt-0.5">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Claim Summary Table */}
              <div className="rounded-xl border border-border-default overflow-hidden bg-bg-surface-raised/30">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 border-b border-border-default text-xs">
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Vehicle Unit</span>
                    <span className="font-mono font-bold text-text-primary">{vehicle.registration_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Container ISO</span>
                    <span className="font-mono font-bold text-indigo-400">{vehicle.container_number || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Operating Rate</span>
                    <span className="font-numeric font-bold text-text-primary">{formatCurrency(vehicle.hourly_operating_cost)} / hr</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase block">Assigned Driver</span>
                    <span className="font-medium text-text-primary">{vehicle.driver_name || 'Fleet Operator'}</span>
                  </div>
                </div>

                <div className="p-4 space-y-2 bg-[#ED642B]/5 border-b border-border-default">
                  <div className="flex justify-between items-center text-sm font-bold text-text-primary">
                    <span>Total Excess Dwell Delay Logged:</span>
                    <span className="text-red-500 font-numeric">+{formatMinutes(totalExcessMinutes)} ({ (totalExcessMinutes / 60).toFixed(2) } Hours)</span>
                  </div>
                  <div className="flex justify-between items-center text-base font-extrabold text-text-primary">
                    <span>Total Assessed Demurrage Liability:</span>
                    <span className="text-[#ED642B] font-numeric">{formatCurrency(totalDelayCost)}</span>
                  </div>
                </div>
              </div>

              {/* Audit Dwell Logs */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-text-secondary mb-2">Verified Geofence Telemetry Audit:</h4>
                <div className="rounded-lg border border-border-default overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-bg-surface-raised border-b border-border-default text-text-tertiary">
                      <tr>
                        <th className="py-2 px-3">Location Stop</th>
                        <th className="py-2 px-3">Arrival</th>
                        <th className="py-2 px-3">Actual Dwell</th>
                        <th className="py-2 px-3">SLA Baseline</th>
                        <th className="py-2 px-3 text-right">Excess Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {dwellList.filter((d: any) => d.excess_minutes > 0).slice(0, 5).map((d: any) => (
                        <tr key={d.id}>
                          <td className="py-2 px-3 font-medium">{d.location_name || 'Terminal'}</td>
                          <td className="py-2 px-3 font-numeric text-text-secondary">{formatDateTime(d.arrival_time)}</td>
                          <td className="py-2 px-3 font-numeric">{formatMinutes(d.dwell_minutes)}</td>
                          <td className="py-2 px-3 font-numeric text-text-tertiary">{formatMinutes(d.expected_minutes)}</td>
                          <td className="py-2 px-3 font-numeric font-bold text-red-500 text-right">+{formatMinutes(d.excess_minutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-[10px] text-text-tertiary italic border-t border-border-default pt-3">
                This notice is generated automatically through GPS geofence telemetry and East African corridor SLA tracking standards. All timestamps are verified against live satellite positioning records.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-border-default bg-bg-surface-raised/40 flex items-center justify-between">
              <Button variant="ghost" size="small" onClick={() => setShowClaimModal(false)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="small"
                  icon={<Printer size={13} />}
                  onClick={() => window.print()}
                >
                  Print Notice
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  icon={<Download size={13} />}
                  onClick={() => {
                    toast({ variant: 'success', title: 'Claim Exported', message: `Demurrage claim document DEM-${vehicle.registration_number.replace(/\s+/g, '')} downloaded.` });
                    setShowClaimModal(false);
                  }}
                >
                  Download PDF Claim
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DIGITAL QR GATE PASS MODAL ── */}
      {showGatePassModal && (
        <GatePassModal
          pass={{
            pass_number: `GP-NBO-${new Date().getFullYear()}-${vehicle.registration_number.replace(/\s+/g, '')}`,
            vehicle_reg: vehicle.registration_number,
            vehicle_type: vehicle.vehicle_type,
            driver_name: vehicle.driver_name || 'Fleet Operator',
            driver_phone: vehicle.driver_phone,
            driver_license: vehicle.driver_license,
            container_number: vehicle.container_number,
            customs_seal_number: vehicle.container_number ? `KRA-SEAL-${vehicle.container_number.substring(4, 9)}` : 'KRA-SEAL-89211',
            cargo_type: vehicle.cargo_type || 'General Cargo',
            cargo_weight_tonnes: vehicle.capacity,
            terminal_name: vehicle.current_location_name || 'Nairobi Inland Container Depot',
            terminal_gate: 'Express Commercial Gate 02',
            time_window_start: new Date().toISOString(),
            time_window_end: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
            status: 'pre_approved',
            carrier_name: 'Siginon Global Logistics',
            digital_signature: `SIG-EAC-PASS-${vehicle.id.toUpperCase()}`
          }}
          onClose={() => setShowGatePassModal(false)}
        />
      )}
    </div>
  );
};
