import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Truck, MapPin, Clock, CheckCircle2, Container,
  ShieldCheck, Ticket, RefreshCw, Ban, Archive, Navigation,
  Phone, Package, Route, Calendar, Compass, FileCheck,
  AlertTriangle, ChevronRight,
} from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { formatDateTime } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { queryKeys } from '../../lib/query-keys';
import type { Trip } from '../../lib/api/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const get = (t: any, ...keys: string[]) => {
  for (const k of keys) if (t?.[k]) return t[k];
  return null;
};

const tripVehicleReg  = (t: any) => get(t, 'vehicle_reg') || t?.vehicle?.registration_number || '—';
const tripDriver      = (t: any) => get(t, 'driver_name') || t?.vehicle?.driver_name || 'Unassigned';
const tripDriverPhone = (t: any) => get(t, 'driver_phone') || t?.vehicle?.driver_phone || null;
const tripOrigin      = (t: any) => get(t, 'origin_name') || t?.origin?.name || '—';
const tripDest        = (t: any) => get(t, 'destination_name') || t?.destination?.name || '—';
const tripCargo       = (t: any) => get(t, 'cargo_type') || t?.cargo_description || null;
const tripWeight      = (t: any) => get(t, 'cargo_weight_tonnes') || null;
const tripCont        = (t: any) => get(t, 'container_number') || null;
const tripSeal        = (t: any) => get(t, 'customs_seal_number') || t?.customs_seal_number || null;
const tripVehicleType = (t: any) => get(t, 'vehicle_type') || t?.vehicle?.vehicle_type || null;

function statusConfig(s: string) {
  switch (s) {
    case 'in_transit': return { label: 'In Transit',  cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', dot: 'bg-emerald-500 animate-pulse' };
    case 'delayed':    return { label: 'Delayed',     cls: 'bg-red-500/15 text-red-500 border-red-500/30',             dot: 'bg-red-500 animate-pulse' };
    case 'overdue':    return { label: 'Overdue',     cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30',       dot: 'bg-amber-500 animate-pulse' };
    case 'planned':    return { label: 'Scheduled',   cls: 'bg-[#250C77]/15 text-[#250C77] border-[#250C77]/30',       dot: 'bg-[#250C77]' };
    case 'completed':  return { label: 'Delivered',   cls: 'bg-blue-500/15 text-blue-500 border-blue-500/30',          dot: 'bg-blue-500' };
    case 'cancelled':  return { label: 'Cancelled',   cls: 'bg-gray-500/15 text-gray-500 border-gray-500/30',          dot: 'bg-gray-400' };
    case 'archived':   return { label: 'Archived',    cls: 'bg-gray-400/15 text-gray-400 border-gray-400/30',          dot: 'bg-gray-300' };
    default:           return { label: s,             cls: 'bg-bg-surface-raised text-text-tertiary border-border-default', dot: 'bg-text-tertiary' };
  }
}

function resolveStatus(t: any): string {
  if (t?.status === 'planned' && t?.planned_departure && new Date(t.planned_departure).getTime() < Date.now()) return 'overdue';
  return t?.status || 'planned';
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

const ConfirmDialog: React.FC<{
  title: string; message: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}> = ({ title, message, confirmLabel, danger, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-text-primary">{title}</h3>
      <p className="text-xs text-text-secondary leading-relaxed">{message}</p>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="small" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} size="small" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  </div>
);

// ── Info Row ──────────────────────────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value?: string | null; mono?: boolean; icon?: React.ReactNode }> = ({
  label, value, mono, icon,
}) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border-default last:border-0">
    <div className="flex items-center gap-2 shrink-0">
      {icon && <span className="text-text-tertiary">{icon}</span>}
      <span className="text-xs text-text-tertiary font-medium">{label}</span>
    </div>
    <span className={`text-xs font-semibold text-text-primary text-right ${mono ? 'font-mono' : ''} ${!value ? 'text-text-tertiary italic' : ''}`}>
      {value || '—'}
    </span>
  </div>
);

// ── Timeline Step ─────────────────────────────────────────────────────────────

const TimelineStep: React.FC<{
  label: string; time?: string | null; done: boolean; active: boolean; last?: boolean;
}> = ({ label, time, done, active, last }) => (
  <div className="flex gap-3">
    <div className="flex flex-col items-center">
      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
        done   ? 'border-emerald-500 bg-emerald-500' :
        active ? 'border-[#ED642B] bg-[#ED642B]/10 animate-pulse' :
                 'border-border-default bg-bg-surface-raised'
      }`}>
        {done && <CheckCircle2 size={12} className="text-white" />}
        {active && <span className="h-2 w-2 rounded-full bg-[#ED642B]" />}
      </div>
      {!last && <div className={`w-px flex-1 mt-1 ${done ? 'bg-emerald-500/40' : 'bg-border-default'}`} />}
    </div>
    <div className="pb-5 min-w-0">
      <p className={`text-xs font-semibold ${done || active ? 'text-text-primary' : 'text-text-tertiary'}`}>{label}</p>
      {time && <p className="text-[10px] text-text-tertiary font-numeric mt-0.5">{formatDateTime(time)}</p>}
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const TripDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { role } = useAuth();
  const { toast } = useToast();
  const canMutate = role === 'admin' || role === 'fleet_manager' || role === 'dispatcher';
  const canManage = role === 'admin' || role === 'fleet_manager';

  const [confirm, setConfirm] = useState<{ action: string } | null>(null);

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => apiClient.getTripById(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

  const { data: allPasses = [] } = useQuery({
    queryKey: queryKeys.gatePasses.byTrip(id!),
    queryFn: () => apiClient.getGatePasses(),
    enabled: !!id,
    staleTime: 30_000,
  });
  const gatePasses = (allPasses as any[]).filter((p: any) => p.trip_id === id);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['trip', id] });
    qc.invalidateQueries({ queryKey: ['trips'] });
  };

  const cancelMutation = useMutation({
    mutationFn: () => apiClient.cancelTrip(id!),
    onSuccess: () => { invalidate(); setConfirm(null); toast({ variant: 'success', title: 'Trip Cancelled' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });
  const completeMutation = useMutation({
    mutationFn: () => apiClient.completeTrip(id!),
    onSuccess: () => { invalidate(); setConfirm(null); toast({ variant: 'success', title: 'Trip Delivered' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });
  const startMutation = useMutation({
    mutationFn: () => apiClient.startTrip(id!),
    onSuccess: () => { invalidate(); toast({ variant: 'success', title: 'Trip Started' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });
  const archiveMutation = useMutation({
    mutationFn: () => apiClient.archiveTrip(id!),
    onSuccess: () => { invalidate(); setConfirm(null); toast({ variant: 'success', title: 'Trip Archived' }); navigate('/trips'); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4 animate-pulse">
        <div className="h-8 bg-bg-surface-raised rounded w-48" />
        <div className="h-32 bg-bg-surface-raised rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-bg-surface-raised rounded-2xl" />
          <div className="h-48 bg-bg-surface-raised rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-text-secondary text-sm">Trip not found.</p>
        <Button variant="outline" size="small" icon={<ArrowLeft size={13} />} onClick={() => navigate('/trips')}>
          Back to Trips
        </Button>
      </div>
    );
  }

  const rs = resolveStatus(trip);
  const sc = statusConfig(rs);
  const t = trip as any;

  const isActive = rs === 'planned' || rs === 'overdue' || rs === 'in_transit';
  const isDone   = rs === 'completed' || rs === 'cancelled' || rs === 'archived';

  const runConfirm = () => {
    if (!confirm) return;
    if (confirm.action === 'cancel')   cancelMutation.mutate();
    if (confirm.action === 'complete') completeMutation.mutate();
    if (confirm.action === 'archive')  archiveMutation.mutate();
  };

  return (
    <div className="max-w-4xl space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-tertiary">
        <button onClick={() => navigate('/trips')} className="hover:text-text-primary transition-colors cursor-pointer flex items-center gap-1">
          <Route size={12} /> Trips
        </button>
        <ChevronRight size={12} />
        <span className="font-mono font-bold text-text-primary">{tripVehicleReg(t)}</span>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#250C77]/10 flex items-center justify-center shrink-0">
              <Truck size={22} className="text-[#250C77]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-black font-mono text-text-primary">{tripVehicleReg(t)}</h1>
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${sc.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />{sc.label}
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-1">{tripDriver(t)}{tripDriverPhone(t) ? ` · ${tripDriverPhone(t)}` : ''}</p>
              {tripVehicleType(t) && <p className="text-xs text-text-tertiary mt-0.5">{tripVehicleType(t)}</p>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {canMutate && rs === 'planned' && (
              <Button variant="outline" size="small" icon={<Navigation size={12} className="text-emerald-500" />}
                loading={startMutation.isPending} onClick={() => startMutation.mutate()}>
                Mark Departed
              </Button>
            )}
            {canMutate && rs === 'in_transit' && (
              <Button variant="outline" size="small" icon={<CheckCircle2 size={12} className="text-emerald-500" />}
                onClick={() => setConfirm({ action: 'complete' })}>
                Mark Delivered
              </Button>
            )}
            {canMutate && (
              <Button variant="outline" size="small" icon={<Ticket size={12} className="text-[#ED642B]" />}
                onClick={() => navigate('/trips')}>
                Gate Pass
              </Button>
            )}
            {canManage && isActive && (
              <Button variant="danger" size="small" icon={<Ban size={12} />}
                onClick={() => setConfirm({ action: 'cancel' })}>
                Cancel
              </Button>
            )}
            {canManage && isDone && (
              <Button variant="ghost" size="small" icon={<Archive size={12} />}
                onClick={() => setConfirm({ action: 'archive' })}>
                Archive
              </Button>
            )}
            <Link
              to={`/map?focus=${t.vehicle_id}&origin_lat=${t.origin?.latitude ?? ''}&origin_lng=${t.origin?.longitude ?? ''}&dest_lat=${t.destination?.latitude ?? ''}&dest_lng=${t.destination?.longitude ?? ''}&origin_name=${encodeURIComponent(tripOrigin(t))}&dest_name=${encodeURIComponent(tripDest(t))}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-surface-raised transition-colors">
              <Compass size={12} className="text-[#ED642B]" /> Track Live
            </Link>
          </div>
        </div>

        {/* Route banner */}
        <div className="mt-5 flex items-center gap-3 p-3.5 rounded-xl bg-bg-surface-raised/60 border border-border-default">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-0.5">Origin</p>
            <p className="text-sm font-bold text-text-primary truncate">{tripOrigin(t)}</p>
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0 px-2">
            <div className="flex items-center gap-1">
              <div className="h-px w-8 bg-border-default" />
              <Route size={14} className="text-[#ED642B]" />
              <div className="h-px w-8 bg-border-default" />
            </div>
            <p className="text-[10px] text-text-tertiary font-medium">{t.corridor_name || 'Corridor'}</p>
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[10px] text-text-tertiary uppercase tracking-wider mb-0.5">Destination</p>
            <p className="text-sm font-bold text-text-primary truncate">{tripDest(t)}</p>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Timeline */}
        <div className="lg:col-span-1 rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-4">Journey Timeline</h2>
          <div className="space-y-0">
            <TimelineStep
              label="Scheduled"
              time={t.planned_departure}
              done={rs !== 'planned' && rs !== 'overdue'}
              active={rs === 'planned' || rs === 'overdue'}
            />
            <TimelineStep
              label="Departed"
              time={t.actual_departure}
              done={!!t.actual_departure}
              active={rs === 'in_transit' && !t.actual_departure}
            />
            <TimelineStep
              label="In Transit"
              time={undefined}
              done={rs === 'completed' || rs === 'archived'}
              active={rs === 'in_transit'}
            />
            <TimelineStep
              label="Delivered"
              time={t.actual_arrival}
              done={rs === 'completed' || rs === 'archived'}
              active={false}
              last
            />
          </div>

          {/* ETA */}
          <div className="mt-4 pt-4 border-t border-border-default">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Planned ETA</span>
              <span className="font-numeric font-semibold text-text-primary">{formatDateTime(t.planned_arrival) || '—'}</span>
            </div>
            {t.actual_arrival && (
              <div className="flex items-center justify-between text-xs mt-1.5">
                <span className="text-text-tertiary">Actual Arrival</span>
                <span className="font-numeric font-semibold text-emerald-600">{formatDateTime(t.actual_arrival)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle: Trip Details */}
        <div className="lg:col-span-1 rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2">Trip Details</h2>
          <InfoRow label="Vehicle Reg"   value={tripVehicleReg(t)} mono icon={<Truck size={12} />} />
          <InfoRow label="Vehicle Type"  value={tripVehicleType(t)} icon={<Truck size={12} />} />
          <InfoRow label="Driver"        value={tripDriver(t)} icon={<Phone size={12} />} />
          <InfoRow label="Phone"         value={tripDriverPhone(t)} mono icon={<Phone size={12} />} />
          <InfoRow label="Corridor"      value={t.corridor_name} icon={<Route size={12} />} />
          <InfoRow label="Departure"     value={formatDateTime(t.planned_departure)} mono icon={<Calendar size={12} />} />
          <InfoRow label="ETA"           value={formatDateTime(t.planned_arrival)} mono icon={<Calendar size={12} />} />
          <InfoRow label="Trip ID"       value={t.id} mono icon={<Package size={12} />} />
        </div>

        {/* Right: Cargo & Passes */}
        <div className="lg:col-span-1 space-y-5">

          {/* Cargo */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-2">Cargo & Customs</h2>
            <InfoRow label="Container"    value={tripCont(t)} mono icon={<Container size={12} />} />
            <InfoRow label="Customs Seal" value={tripSeal(t)} mono icon={<ShieldCheck size={12} />} />
            <InfoRow label="Cargo Type"   value={tripCargo(t)} icon={<Package size={12} />} />
            <InfoRow label="Weight"       value={tripWeight(t) ? `${tripWeight(t)} Tonnes` : null} icon={<Package size={12} />} />
          </div>

          {/* Gate passes */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Gate Passes</h2>
              <span className="text-[10px] font-bold text-text-tertiary bg-bg-surface-raised px-2 py-0.5 rounded-full">
                {(gatePasses as any[]).length}
              </span>
            </div>
            {(gatePasses as any[]).length === 0 ? (
              <p className="text-xs text-text-tertiary italic">No passes issued for this trip.</p>
            ) : (
              <div className="space-y-2">
                {(gatePasses as any[]).slice(0, 4).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border-default last:border-0">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-bold text-text-primary truncate">{p.pass_number}</p>
                      <p className="text-[10px] text-text-tertiary truncate">{p.terminal_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                        p.status === 'approved' || p.status === 'pre_approved' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' :
                        p.status === 'revoked' || p.status === 'expired' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                        'bg-gray-500/15 text-gray-500 border-gray-500/30'
                      }`}>{p.status}</span>
                      <button onClick={() => navigate(`/gate-pass/${p.id}`, { state: { pass: p } })}
                        className="p-1 rounded text-text-tertiary hover:text-[#250C77] transition-colors cursor-pointer">
                        <FileCheck size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Confirm */}
      {confirm && (
        <ConfirmDialog
          title={
            confirm.action === 'cancel'   ? 'Cancel Trip' :
            confirm.action === 'complete' ? 'Mark as Delivered' :
            'Archive Trip'
          }
          message={
            confirm.action === 'cancel'
              ? `Cancel this trip for ${tripVehicleReg(t)}? This cannot be undone.`
              : confirm.action === 'complete'
              ? `Mark ${tripVehicleReg(t)} as delivered to ${tripDest(t)}?`
              : 'Archive this trip? It will be hidden from active lists.'
          }
          confirmLabel={
            confirm.action === 'cancel' ? 'Cancel Trip' :
            confirm.action === 'complete' ? 'Mark Delivered' : 'Archive'
          }
          danger={confirm.action === 'cancel'}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};
