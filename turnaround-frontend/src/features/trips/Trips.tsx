import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PageTabs } from '../../components/ui/PageTabs';
import {
  DatePicker,
  DatePickerTrigger,
  DatePickerButton,
  DatePickerContent,
} from '../../components/ui/DatePicker';
import { Calendar } from '../../components/ui/Calendar';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';
import { formatDateTime } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { queryKeys } from '../../lib/query-keys';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Route, Truck, MapPin, Plus, Search, Clock,
  CheckCircle2, ShieldCheck, Container, Package,
  Navigation, X, Compass, Ticket, Ban, RefreshCw,
  Archive, ChevronDown, MoreVertical, LayoutGrid, List,
} from 'lucide-react';
import type { Trip } from '../../lib/api/types';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '../../components/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import {
  MetricCard,
  MetricCardHeader,
  MetricCardLabel,
  MetricCardContent,
  MetricCardValue,
  MetricCardDifferential,
  MetricCardSparkline
} from '../../components/ui/MetricCard';

const createTripSchema = zod.object({
  vehicle_id: zod.string().min(1, 'Select a vehicle'),
  origin_id: zod.string().min(1, 'Select origin facility'),
  destination_id: zod.string().min(1, 'Select destination facility'),
  planned_departure: zod.string().min(1, 'Select departure time'),
  planned_arrival: zod.string().min(1, 'Select estimated arrival time'),
  corridor_name: zod.string().optional(),
  container_number: zod.string().optional(),
  customs_seal_number: zod.string().optional(),
  cargo_type: zod.string().optional(),
  cargo_weight_tonnes: zod.number().positive().optional(),
});

type CreateTripFormValues = zod.infer<typeof createTripSchema>;

// ── Smart status resolver ─────────────────────────────────────────────────────

/** Planned trips whose departure time has passed show as "Overdue" */
function resolveTripStatus(trip: Trip): string {
  if (
    trip.status === 'planned' &&
    trip.planned_departure &&
    new Date(trip.planned_departure).getTime() < Date.now()
  ) {
    return 'overdue';
  }
  return trip.status;
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

// ── Trip Action Menu (3-dot, scoped per trip) ─────────────────────────────────

interface TripMenuProps {
  trip: Trip;
  resolvedStatus: string;
  canMutate: boolean;
  canManage: boolean;
  busyTripId: string | null;
  onGatePass: () => void;
  onStart: () => void;
  onDeliver: () => void;
  onReassign: () => void;
  onEditDates: () => void;
  onCancel: () => void;
  onArchive: () => void;
}

const TripActionMenu: React.FC<TripMenuProps> = ({
  trip, resolvedStatus, canMutate, canManage, busyTripId,
  onGatePass, onStart, onDeliver, onReassign, onEditDates, onCancel, onArchive,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isBusy = busyTripId === trip.id;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on scroll so menu doesn't float away
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setOpen(o => !o);
  };

  const item = (label: string, icon: React.ReactNode, onClick: () => void, danger = false) => (
    <button
      key={label}
      onClick={() => { setOpen(false); onClick(); }}
      disabled={isBusy}
      className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer disabled:opacity-40 ${
        danger ? 'text-red-500 hover:bg-red-500/10' : 'text-text-primary hover:bg-bg-surface-raised'
      }`}
    >
      {icon}{label}
    </button>
  );

  const isActive = resolvedStatus === 'planned' || resolvedStatus === 'overdue' || resolvedStatus === 'in_transit';
  const isDone   = resolvedStatus === 'completed' || resolvedStatus === 'cancelled';

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised transition-colors cursor-pointer"
        title="Actions"
      >
        {isBusy
          ? <span className="h-3.5 w-3.5 border-2 border-text-tertiary border-t-transparent rounded-full animate-spin block" />
          : <MoreVertical size={14} />
        }
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
          className="w-52 bg-bg-surface border border-border-default rounded-xl shadow-2xl py-1 overflow-hidden"
        >
          {item('Generate Gate Pass', <Ticket size={12} className="text-[#ED642B]" />, onGatePass)}

          <div className="my-1 border-t border-border-default" />

          {canMutate && (resolvedStatus === 'planned' || resolvedStatus === 'overdue') &&
            item('Mark as Departed', <Navigation size={12} className="text-emerald-500" />, onStart)}

          {canMutate && resolvedStatus === 'in_transit' &&
            item('Mark as Delivered', <CheckCircle2 size={12} className="text-emerald-500" />, onDeliver)}

          {canMutate && isActive && (
            <>
              <div className="my-1 border-t border-border-default" />
              {item('Reassign Vehicle', <RefreshCw size={12} />, onReassign)}
              {item('Adjust Schedule', <Clock size={12} />, onEditDates)}
            </>
          )}

          {canManage && isActive && (
            <>
              <div className="my-1 border-t border-border-default" />
              {item('Cancel Dispatch', <Ban size={12} />, onCancel, true)}
            </>
          )}

          {canManage && isDone &&
            item('Move to Archive', <Archive size={12} />, onArchive)}
        </div>
      )}
    </>
  );
};

// ── Edit Dates Modal ──────────────────────────────────────────────────────────

const EditDatesModal: React.FC<{
  trip: Trip;
  onConfirm: (plannedDeparture: string, plannedArrival: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}> = ({ trip, onConfirm, onCancel, isSaving }) => {
  const [depDate, setDepDate] = useState<Date | undefined>(
    trip.planned_departure ? new Date(trip.planned_departure) : new Date()
  );
  const [arrDate, setArrDate] = useState<Date | undefined>(
    trip.planned_arrival ? new Date(trip.planned_arrival) : new Date(Date.now() + 8 * 3600 * 1000)
  );
  const [depTime, setDepTime] = useState(
    trip.planned_departure ? new Date(trip.planned_departure).toTimeString().slice(0,5) : '08:00'
  );
  const [arrTime, setArrTime] = useState(
    trip.planned_arrival ? new Date(trip.planned_arrival).toTimeString().slice(0,5) : '16:00'
  );

  const buildIso = (date?: Date, time?: string) => {
    if (!date) return '';
    const [h, m] = (time || '00:00').split(':');
    const d = new Date(date);
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d.toISOString();
  };

  const depIso = buildIso(depDate, depTime);
  const arrIso = buildIso(arrDate, arrTime);
  const canSave = depIso && arrIso && new Date(arrIso) > new Date(depIso);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-border-default flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Adjust Schedule</h3>
            <p className="text-[11px] text-text-tertiary font-mono">{(trip as any).vehicle_reg || trip.vehicle_id}</p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg text-text-tertiary hover:text-text-primary cursor-pointer"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4 text-xs">
          {/* Departure */}
          <div>
            <label className="block font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
              <Clock size={12} className="text-[#ED642B]" /> Planned Departure
            </label>
            <DatePicker>
              <DatePickerTrigger asChild>
                <DatePickerButton variant="outline" className="w-full h-9 text-xs justify-start">
                  {depDate ? format(depDate, 'dd MMM yyyy') : 'Pick date'}
                </DatePickerButton>
              </DatePickerTrigger>
              <DatePickerContent>
                <Calendar mode="single" selected={depDate} onSelect={setDepDate} initialFocus />
              </DatePickerContent>
            </DatePicker>
            <input type="time" value={depTime} onChange={e => setDepTime(e.target.value)}
              className="mt-1.5 w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none" />
          </div>

          {/* Arrival */}
          <div>
            <label className="block font-semibold text-text-primary mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-emerald-500" /> Estimated Arrival (ETA)
            </label>
            <DatePicker>
              <DatePickerTrigger asChild>
                <DatePickerButton variant="outline" className="w-full h-9 text-xs justify-start">
                  {arrDate ? format(arrDate, 'dd MMM yyyy') : 'Pick date'}
                </DatePickerButton>
              </DatePickerTrigger>
              <DatePickerContent>
                <Calendar mode="single" selected={arrDate} onSelect={setArrDate} initialFocus minDate={depDate} />
              </DatePickerContent>
            </DatePicker>
            <input type="time" value={arrTime} onChange={e => setArrTime(e.target.value)}
              className="mt-1.5 w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none" />
          </div>

          {arrIso && depIso && new Date(arrIso) <= new Date(depIso) && (
            <p className="text-[11px] text-red-500 flex items-center gap-1">
              <Ban size={11} /> Arrival must be after departure
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border-default">
            <Button variant="ghost" size="small" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" size="small" loading={isSaving} disabled={!canSave}
              icon={<Clock size={12} />}
              onClick={() => onConfirm(depIso, arrIso)}>
              Update Schedule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Reassign Modal ────────────────────────────────────────────────────────────

const ReassignModal: React.FC<{
  trip: Trip;
  vehicles: any[];
  onConfirm: (vehicleId: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}> = ({ trip, vehicles, onConfirm, onCancel, isSaving }) => {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-border-default flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Reassign Trip</h3>
            <p className="text-[11px] text-text-tertiary">Currently: <span className="font-mono font-bold">{trip.vehicle_reg}</span></p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg text-text-tertiary hover:text-text-primary cursor-pointer"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-text-primary mb-1.5">Select New Vehicle</label>
            <div className="relative">
              <select
                value={selectedVehicle}
                onChange={e => setSelectedVehicle(e.target.value)}
                className="w-full appearance-none bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none pr-8"
              >
                <option value="">— Select vehicle —</option>
                {vehicles.filter(v => v.id !== trip.vehicle_id).map(v => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} ({v.vehicle_type}){v.driver_name ? ` · ${v.driver_name}` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border-default">
            <Button variant="ghost" size="small" onClick={onCancel}>Cancel</Button>
            <Button
              variant="primary"
              size="small"
              loading={isSaving}
              disabled={!selectedVehicle}
              icon={<Truck size={12} />}
              onClick={() => onConfirm(selectedVehicle)}
            >
              Reassign
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Route name helpers (backend returns nested origin/destination/vehicle objects) ─
const tripOrigin = (t: Trip): string =>
  (t as any).origin_name || t.origin?.name || '—';
const tripDest = (t: Trip): string =>
  (t as any).destination_name || t.destination?.name || '—';
const tripVehicleReg = (t: Trip): string =>
  (t as any).vehicle_reg || (t as any).vehicle?.registration_number || '—';
const tripDriver = (t: Trip): string =>
  (t as any).driver_name || (t as any).vehicle?.driver_name || 'Unassigned';
const tripDriverPhone = (t: Trip): string =>
  (t as any).driver_phone || (t as any).vehicle?.driver_phone || '—';

export const Trips: React.FC = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const canMutate = role === 'admin' || role === 'fleet_manager' || role === 'dispatcher';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_transit' | 'delayed' | 'planned' | 'completed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'journeys' | 'table'>('journeys');
  const [showArchived, setShowArchived] = useState(false);
  // Track which specific trip is generating a pass (null = none)
  const [generatingPassForTrip, setGeneratingPassForTrip] = useState<string | null>(null);

  // Generate gate pass via backend API
  const generateGatePass = async (trip: Trip) => {
    if (!trip.vehicle_id || !trip.destination_id) {
      toast({
        variant: 'error',
        title: 'Cannot Generate Pass',
        message: 'Trip must have a vehicle and destination assigned.'
      });
      return;
    }

    setGeneratingPassForTrip(trip.id);

    try {
      // Resolve vehicle_reg: prefer trip join, fall back to vehicles cache
      const vehicle = (vehiclesData?.items ?? vehiclesData ?? []).find(
        (v: any) => v.id === trip.vehicle_id
      );
      const resolvedReg = trip.vehicle_reg || vehicle?.registration_number || '';

      if (!resolvedReg) {
        toast({ variant: 'error', title: 'Cannot Generate Pass', message: 'Vehicle registration number not found.' });
        return;
      }

      // Call backend to create gate pass
      const passData: any = {
        vehicle_id: trip.vehicle_id,
        trip_id: trip.id,
        vehicle_reg: resolvedReg,
        vehicle_type: trip.vehicle_type || vehicle?.vehicle_type,
        driver_name: trip.driver_name || vehicle?.driver_name || 'Driver',
        driver_phone: trip.driver_phone || vehicle?.driver_phone,
        container_number: trip.container_number,
        customs_seal_number: trip.customs_seal_number,
        cargo_type: trip.cargo_type,
        cargo_weight_tonnes: trip.cargo_weight_tonnes,
        terminal_name: trip.destination_name || 'Terminal',
        time_window_start: trip.planned_departure || new Date().toISOString(),
        time_window_end: trip.planned_arrival || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        status: 'pre_approved',
        carrier_name: 'Siginon Global Logistics'
      };

      const createdPass = await apiClient.createGatePass(passData);
      
      // Invalidate gate passes cache
      queryClient.invalidateQueries({ queryKey: queryKeys.gatePasses.all() });
      if (trip.vehicle_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.gatePasses.byVehicle(trip.vehicle_id) });
      }
      if (trip.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.gatePasses.byTrip(trip.id) });
      }
      
      toast({
        variant: 'success',
        title: 'Gate Pass Generated',
        message: `Pass ${createdPass.pass_number} created successfully.`
      });
      
      // Navigate to the gate pass page with both the pass data (state) and ID-based URL
      navigate(`/gate-pass/${createdPass.id}`, { state: { pass: createdPass } });
    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Failed to Generate Pass',
        message: error?.message || 'Could not create gate pass. Please try again.'
      });
    } finally {
      setGeneratingPassForTrip(null);
    }
  };

  // Real backend queries with mock fallbacks
  const { data: tripsData, isLoading: loadingTrips } = useQuery({
    queryKey: queryKeys.trips.all(),
    queryFn: () => apiClient.getTrips(),
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => apiClient.getVehicles(),
  });

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiClient.getLocations(),
  });

  const createTripMutation = useMutation({
    mutationFn: (data: any) => apiClient.createTrip(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowCreateModal(false);
      toast({
        variant: 'success',
        title: 'Shipment Dispatched',
        message: 'Trip scheduled and satellite geofence monitoring initialized.'
      });
    },
    onError: (err: any) => {
      toast({
        variant: 'error',
        title: 'Dispatch Failed',
        message: err?.message || 'Could not schedule consignment dispatch.'
      });
    }
  });

  const updateTripMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Trip> }) => apiClient.updateTrip(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast({
        variant: 'success',
        title: 'Trip Updated',
        message: 'Consignment waypoint status synchronized.'
      });
    }
  });

  // ── Enhanced trip control mutations ──────────────────────────────────────
  const [tripConfirm, setTripConfirm] = useState<{ action: string; trip: Trip } | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Trip | null>(null);
  const [busyTripId, setBusyTripId] = useState<string | null>(null);

  const invalidateTrips = () => {
    queryClient.invalidateQueries({ queryKey: ['trips'] });
    queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
  };

  const cancelTripMutation = useMutation({
    mutationFn: (id: string) => { setBusyTripId(id); return apiClient.cancelTrip(id); },
    onSettled: () => setBusyTripId(null),
    onSuccess: () => { invalidateTrips(); setTripConfirm(null); toast({ variant: 'success', title: 'Trip Cancelled' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Cancel Failed', message: e?.message }),
  });

  const completeTripMutation = useMutation({
    mutationFn: (id: string) => { setBusyTripId(id); return apiClient.completeTrip(id); },
    onSettled: () => setBusyTripId(null),
    onSuccess: () => { invalidateTrips(); setTripConfirm(null); toast({ variant: 'success', title: 'Delivered', message: 'Consignment marked as delivered.' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });

  const archiveTripMutation = useMutation({
    mutationFn: (id: string) => { setBusyTripId(id); return apiClient.archiveTrip(id); },
    onSettled: () => setBusyTripId(null),
    onSuccess: () => { invalidateTrips(); setTripConfirm(null); toast({ variant: 'success', title: 'Trip Archived' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Failed', message: e?.message }),
  });

  const reassignTripMutation = useMutation({
    mutationFn: ({ id, vehicle_id }: { id: string; vehicle_id: string }) => { setBusyTripId(id); return apiClient.reassignTrip(id, { vehicle_id }); },
    onSettled: () => setBusyTripId(null),
    onSuccess: () => { invalidateTrips(); setReassignTarget(null); toast({ variant: 'success', title: 'Trip Reassigned' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Reassign Failed', message: e?.message }),
  });

  const [editDatesTarget, setEditDatesTarget] = useState<Trip | null>(null);

  const editDatesMutation = useMutation({
    mutationFn: ({ id, planned_departure, planned_arrival }: { id: string; planned_departure: string; planned_arrival: string }) => {
      setBusyTripId(id);
      return apiClient.updateTrip(id, { planned_departure, planned_arrival });
    },
    onSettled: () => setBusyTripId(null),
    onSuccess: () => { invalidateTrips(); setEditDatesTarget(null); toast({ variant: 'success', title: 'Schedule Updated', message: 'Departure and arrival times saved.' }); },
    onError: (e: any) => toast({ variant: 'error', title: 'Update Failed', message: e?.message }),
  });

  const runTripConfirm = () => {
    if (!tripConfirm) return;
    if (tripConfirm.action === 'cancel')   cancelTripMutation.mutate(tripConfirm.trip.id);
    if (tripConfirm.action === 'complete') completeTripMutation.mutate(tripConfirm.trip.id);
    if (tripConfirm.action === 'archive')  archiveTripMutation.mutate(tripConfirm.trip.id);
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<CreateTripFormValues>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      planned_departure: new Date().toISOString().slice(0, 16),
      planned_arrival: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16),
      corridor_name: 'Northern Corridor (Mombasa - Nairobi)',
    }
  });

  // Date picker state for create modal
  const [pickerDep, setPickerDep] = useState<Date | undefined>(new Date());
  const [pickerArr, setPickerArr] = useState<Date | undefined>(new Date(Date.now() + 8 * 60 * 60 * 1000));
  const [depTime, setDepTime] = useState('08:00');
  const [arrTime, setArrTime] = useState('16:00');

  const buildIso = (date?: Date, time?: string) => {
    if (!date) return '';
    const [h, m] = (time || '00:00').split(':');
    const d = new Date(date);
    d.setHours(parseInt(h), parseInt(m), 0, 0);
    return d.toISOString().slice(0, 16);
  };

  const watchedVehicleId = watch('vehicle_id');
  const watchedCorridorName = watch('corridor_name');
  const watchedOriginId = watch('origin_id');
  const watchedDestinationId = watch('destination_id');
  const selectedVehicleObj = (vehiclesData || []).find(v => v.id === watchedVehicleId);

  const onSubmitCreate = (values: CreateTripFormValues) => {
    const origin = (locationsData || []).find(l => l.id === values.origin_id);
    const dest = (locationsData || []).find(l => l.id === values.destination_id);
    const vehicle = selectedVehicleObj;

    const toIsoSafe = (val?: string, fallbackOffsetHours = 0) => {
      try {
        if (!val) return new Date(Date.now() + fallbackOffsetHours * 3600 * 1000).toISOString();
        const d = new Date(val);
        return isNaN(d.getTime()) ? new Date(Date.now() + fallbackOffsetHours * 3600 * 1000).toISOString() : d.toISOString();
      } catch {
        return new Date(Date.now() + fallbackOffsetHours * 3600 * 1000).toISOString();
      }
    };

    const payload: any = {
      ...values,
      planned_departure: toIsoSafe(values.planned_departure, 0),
      planned_arrival: toIsoSafe(values.planned_arrival, 8),
      vehicle_reg: vehicle?.registration_number || 'TRUCK',
      vehicle_type: vehicle?.vehicle_type,
      driver_name: vehicle?.driver_name || 'Fleet Operator',
      driver_phone: vehicle?.driver_phone,
      origin_name: origin?.name || 'Origin Terminal',
      destination_name: dest?.name || 'Destination Terminal',
      status: 'planned',
      risk_score: 18,
      checkpoints: [
        {
          id: `chk_${Date.now()}_1`,
          location_name: origin?.name || 'Origin Terminal',
          location_type: origin?.location_type || 'port',
          status: 'pending',
          expected_dwell_minutes: origin?.expected_dwell_minutes || 60
        },
        {
          id: `chk_${Date.now()}_2`,
          location_name: dest?.name || 'Destination Terminal',
          location_type: dest?.location_type || 'depot',
          status: 'pending',
          expected_dwell_minutes: dest?.expected_dwell_minutes || 60
        }
      ]
    };

    createTripMutation.mutate(payload);
  };

  const trips = tripsData || [];

  const TRIP_ARCHIVED = ['completed', 'cancelled', 'archived'];

  // Filter trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const isArch = TRIP_ARCHIVED.includes(t.status);
      if (showArchived && !isArch) return false;
      if (!showArchived && isArch) return false;
      if (!showArchived && statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (t.vehicle_reg || '').toLowerCase().includes(q) ||
        (t.driver_name || '').toLowerCase().includes(q) ||
        (t.container_number || '').toLowerCase().includes(q) ||
        (t.customs_seal_number || '').toLowerCase().includes(q) ||
        (t.origin_name || '').toLowerCase().includes(q) ||
        (t.destination_name || '').toLowerCase().includes(q) ||
        (t.cargo_type || '').toLowerCase().includes(q)
      );
    });
  }, [trips, statusFilter, searchQuery, showArchived]);

  // Derived Summary Metrics
  const activeTripsCount = trips.filter(t => t.status === 'in_transit' || t.status === 'delayed').length;
  const delayedTripsCount = trips.filter(t => t.status === 'delayed').length;
  const completedTripsCount = trips.filter(t => t.status === 'completed').length;
  const totalCargoTonnes = trips.reduce((acc, t) => acc + (t.cargo_weight_tonnes || 24), 0);
  const onTimePercentage = trips.length > 0
    ? Math.round(((trips.length - delayedTripsCount) / trips.length) * 100)
    : 100;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'in_transit':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-status-good/15 text-status-good border border-status-good/30"><span className="h-1.5 w-1.5 rounded-full bg-status-good animate-pulse" />In Transit</span>;
      case 'delayed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-red-500/15 text-red-500 border border-red-500/30"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />Delayed</span>;
      case 'overdue':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />Overdue</span>;
      case 'planned':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#250C77]/15 text-[#250C77] border border-[#250C77]/30">Scheduled</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30">Delivered</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-gray-500/15 text-gray-500 border border-gray-500/30">Cancelled</span>;
      case 'archived':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-gray-400/15 text-gray-400 border border-gray-400/30">Archived</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-bg-surface-raised text-text-tertiary">Unknown</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-[#250C77] text-white flex items-center justify-center shadow-md">
            <Route size={18} className="text-[#ED642B]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">Active Dispatches & Consignments</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              End-to-end corridor waypoint tracking, ETA predictions, and customs seal integrity.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-bg-surface-raised border border-border-default">
            <button onClick={() => setActiveTab('journeys')} title="Grid view"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'journeys' ? 'bg-bg-surface shadow-sm text-[#250C77]' : 'text-text-tertiary hover:text-text-primary'}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setActiveTab('table')} title="Table view"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'table' ? 'bg-bg-surface shadow-sm text-[#250C77]' : 'text-text-tertiary hover:text-text-primary'}`}>
              <List size={14} />
            </button>
          </div>
          {/* Archive toggle */}
          <button onClick={() => setShowArchived(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              showArchived ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' : 'bg-bg-surface text-text-tertiary border-border-default hover:text-text-primary'
            }`}>
            <Archive size={13} />
            {showArchived ? 'Archived' : 'Archive'}
          </button>
          {canMutate && (
            <Button variant="primary" size="small" icon={<Plus size={14} />}
              onClick={() => { reset(); setShowCreateModal(true); }}>
              Dispatch
            </Button>
          )}
        </div>
      </div>

      {/* ── TAB BAR + ARCHIVE BANNER ── */}
      {showArchived ? (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 font-semibold">
          <Archive size={13} />
          Archived dispatches ({filteredTrips.length}) — completed, cancelled &amp; archived
          <button onClick={() => setShowArchived(false)} className="ml-auto underline cursor-pointer font-semibold">
            Back to active
          </button>
        </div>
      ) : null}

      {/* ── KPI METRICS STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard isLoading={loadingTrips}>
          <MetricCardHeader href="/trips">
            <MetricCardLabel tooltip="Consignments actively moving along East African trade corridors" icon={<Truck size={13} className="text-[#250C77]" />}>
              Active Dispatches
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{activeTripsCount}</MetricCardValue>
            <MetricCardDifferential variant="positive">{trips.length} Total Booked</MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline data={[{ value: 2 }, { value: 4 }, { value: 3 }, { value: 6 }, { value: activeTripsCount }]} color="#250C77" />
        </MetricCard>

        <MetricCard isLoading={loadingTrips}>
          <MetricCardHeader href="/trips">
            <MetricCardLabel tooltip="Shipments currently exceeding turnaround target threshold" icon={<Clock size={13} className={delayedTripsCount > 0 ? 'text-red-500' : 'text-text-tertiary'} />}>
              Delayed En Route
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className={delayedTripsCount > 0 ? 'text-red-500' : ''}>
              {delayedTripsCount}
            </MetricCardValue>
            <MetricCardDifferential variant={delayedTripsCount > 0 ? 'negative' : 'positive'}>
              {delayedTripsCount > 0 ? 'Exceeding SLA' : 'Zero Delays'}
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline data={[{ value: 0 }, { value: 1 }, { value: 0 }, { value: delayedTripsCount }]} color="#EF4444" />
        </MetricCard>

        <MetricCard isLoading={loadingTrips}>
          <MetricCardHeader href="/trips">
            <MetricCardLabel tooltip="Percentage of corridor deliveries arriving within scheduled SLA" icon={<ShieldCheck size={13} className="text-status-good" />}>
              On-Time ETA Rating
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{onTimePercentage}%</MetricCardValue>
            <MetricCardDifferential variant="positive">SLA Compliance</MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline data={[{ value: 82 }, { value: 88 }, { value: 92 }, { value: onTimePercentage }]} color="#10B981" />
        </MetricCard>

        <MetricCard isLoading={loadingTrips}>
          <MetricCardHeader href="/trips">
            <MetricCardLabel tooltip="Total commercial cargo payload currently in transit" icon={<Package size={13} className="text-[#ED642B]" />}>
              Cargo In Motion
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{totalCargoTonnes.toFixed(0)} T</MetricCardValue>
            <MetricCardDifferential variant="positive">{completedTripsCount} Completed</MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline data={[{ value: 40 }, { value: 65 }, { value: 85 }, { value: totalCargoTonnes }]} color="#ED642B" />
        </MetricCard>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      {!showArchived && (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-bg-surface p-3.5 rounded-xl border border-border-default">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search plate, driver, seal, container..."
            className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {(['all', 'in_transit', 'delayed', 'planned'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer shrink-0 ${
                statusFilter === s
                  ? 'bg-[#250C77] text-white shadow-sm'
                  : 'bg-bg-surface-raised text-text-secondary hover:text-text-primary'
              }`}
            >
              {s === 'all' ? 'All Active' : s === 'in_transit' ? 'In Transit' : s}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* ── VIEW TAB 1: COMPACT JOURNEY GRID ── */}
      {(activeTab === 'journeys' && !showArchived) && (
        <div>
          {filteredTrips.length === 0 ? (
            <div className="rounded-2xl border border-border-default bg-bg-surface p-12 text-center text-xs text-text-tertiary">
              <Route size={28} className="mx-auto mb-2 opacity-30 text-[#250C77]" />
              <p className="font-semibold text-text-secondary">No active dispatches</p>
              <p className="text-[11px] mt-0.5">Adjust your search or dispatch a new corridor trip.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTrips.map((trip) => {
                const isDelayed = trip.status === 'delayed';
                const rs = resolveTripStatus(trip);
                return (
                  <div
                    key={trip.id}
                    onClick={() => navigate(`/trips/${trip.id}`)}
                    className={`rounded-xl border bg-bg-surface p-4 shadow-sm space-y-3 transition-all hover:shadow-md cursor-pointer ${
                      isDelayed || rs === 'overdue'
                        ? 'border-red-500/40'
                        : 'border-border-default hover:border-[#ED642B]/40'
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDelayed || rs === 'overdue' ? 'bg-red-500/10 text-red-500' : 'bg-[#250C77]/10 text-[#250C77]'
                        }`}>
                          <Truck size={15} />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/vehicles/${trip.vehicle_id}`}
                            className="font-mono text-xs font-bold text-text-primary hover:text-[#ED642B] transition-colors block truncate"
                          >
                            {tripVehicleReg(trip)}
                          </Link>
                          <p className="text-[10px] text-text-tertiary truncate">{tripDriver(trip)}</p>                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {getStatusBadge(rs)}
                        <TripActionMenu
                          trip={trip}
                          resolvedStatus={rs}
                          canMutate={canMutate}
                          canManage={role === 'admin' || role === 'fleet_manager'}
                          busyTripId={busyTripId}
                          onGatePass={() => generateGatePass(trip)}
                          onStart={() => updateTripMutation.mutate({ id: trip.id, data: { status: 'in_transit' } })}
                          onDeliver={() => setTripConfirm({ action: 'complete', trip })}
                          onReassign={() => setReassignTarget(trip)}
                          onEditDates={() => setEditDatesTarget(trip)}
                          onCancel={() => setTripConfirm({ action: 'cancel', trip })}
                          onArchive={() => setTripConfirm({ action: 'archive', trip })}
                        />
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <MapPin size={10} className="text-text-tertiary shrink-0" />
                      <span className="text-text-secondary truncate">{tripOrigin(trip)}</span>
                      <span className="text-text-tertiary shrink-0">→</span>
                      <MapPin size={10} className="text-[#ED642B] shrink-0" />
                      <span className="font-semibold text-text-primary truncate">{tripDest(trip)}</span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {trip.container_number && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/15">
                          <Container size={9} />{trip.container_number}
                        </span>
                      )}
                      {trip.cargo_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-surface-raised text-text-tertiary border border-border-default">
                          {trip.cargo_type}
                        </span>
                      )}
                      {trip.cargo_weight_tonnes && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-surface-raised text-text-tertiary border border-border-default font-numeric">
                          {trip.cargo_weight_tonnes}T
                        </span>
                      )}
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <p className="text-text-tertiary mb-0.5">Departure</p>
                        <p className="font-numeric font-semibold text-text-primary">{formatDateTime(trip.planned_departure)}</p>
                      </div>
                      <div>
                        <p className="text-text-tertiary mb-0.5">ETA</p>
                        <p className="font-numeric font-semibold text-text-primary">{formatDateTime(trip.planned_arrival)}</p>
                      </div>
                    </div>

                    {/* Actions row — primary CTA only; all other actions via ⋯ menu */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-border-default">
                      <Button
                        variant="outline"
                        size="small"
                        icon={<Ticket size={11} className="text-[#ED642B]" />}
                        onClick={() => generateGatePass(trip)}
                        loading={generatingPassForTrip === trip.id}
                      >
                        Gate Pass
                      </Button>
                      <Link
                        to={`/map?focus=${trip.vehicle_id}`}
                        className="ml-auto p-1.5 rounded-lg bg-bg-surface-raised hover:bg-[#250C77] hover:text-white border border-border-default text-text-tertiary transition-colors"
                        title="Track on map"
                      >
                        <Compass size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW TAB 2: FULL DISPATCH TABLE ── */}
      {(activeTab === 'table' && !showArchived) && (
        <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fleet Asset</TableHead>
                <TableHead>Driver & Contact</TableHead>
                <TableHead>Origin Terminal</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Container / Seal</TableHead>
                <TableHead>Planned Departure</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-text-tertiary">
                    No active dispatches found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-bg-surface-raised/40" onClick={() => navigate(`/trips/${t.id}`)}>
                    <TableCell className="font-mono text-xs font-bold text-text-primary">
                      <span className="hover:text-[#ED642B] transition-colors">{tripVehicleReg(t)}</span>
                    </TableCell>
                    <TableCell className="text-xs text-text-primary">
                      <div className="font-medium">{tripDriver(t)}</div>
                      <div className="text-[10px] text-text-tertiary font-mono">{tripDriverPhone(t)}</div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-text-primary">{tripOrigin(t)}</TableCell>
                    <TableCell className="text-xs font-medium text-text-primary">{tripDest(t)}</TableCell>
                    <TableCell className="text-xs">
                      {(t as any).container_number ? (
                        <span className="font-mono font-bold text-indigo-400 text-[11px] block">{(t as any).container_number}</span>
                      ) : <span className="text-text-tertiary">—</span>}
                      {(t as any).customs_seal_number && <span className="text-[9.5px] text-text-tertiary font-mono block">Seal: {(t as any).customs_seal_number}</span>}
                    </TableCell>
                    <TableCell className="font-numeric text-[11px] text-text-secondary">{formatDateTime(t.planned_departure)}</TableCell>
                    <TableCell>{getStatusBadge(resolveTripStatus(t))}</TableCell>
                    <TableCell className="text-right pr-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="small"
                          icon={<Ticket size={12} className="text-[#ED642B]" />}
                          onClick={() => generateGatePass(t)}
                          loading={generatingPassForTrip === t.id}
                        >
                          Pass
                        </Button>
                        <TripActionMenu
                          trip={t}
                          resolvedStatus={resolveTripStatus(t)}
                          canMutate={canMutate}
                          canManage={role === 'admin' || role === 'fleet_manager'}
                          busyTripId={busyTripId}
                          onGatePass={() => generateGatePass(t)}
                          onStart={() => updateTripMutation.mutate({ id: t.id, data: { status: 'in_transit' } })}
                          onDeliver={() => setTripConfirm({ action: 'complete', trip: t })}
                          onReassign={() => setReassignTarget(t)}
                          onEditDates={() => setEditDatesTarget(t)}
                          onCancel={() => setTripConfirm({ action: 'cancel', trip: t })}
                          onArchive={() => setTripConfirm({ action: 'archive', trip: t })}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── ARCHIVED TRIPS LIST ── */}
      {showArchived && (
        <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
          {filteredTrips.length === 0 ? (
            <div className="p-12 text-center">
              <Archive size={28} className="mx-auto mb-3 opacity-20 text-[#250C77]" />
              <p className="text-sm font-semibold text-text-secondary">No archived trips</p>
              <p className="text-xs text-text-tertiary mt-1">Completed, cancelled and archived trips appear here.</p>
            </div>
          ) : activeTab === 'journeys' ? (
            /* ── archive grid ── */
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTrips.map((t) => {
                const rs = resolveTripStatus(t);
                return (
                  <div key={t.id} onClick={() => navigate(`/trips/${t.id}`)}
                    className="rounded-xl border border-border-default bg-bg-surface-raised/40 p-3.5 space-y-2 hover:border-[#ED642B]/30 cursor-pointer transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-text-primary truncate">{tripVehicleReg(t)}</span>
                      {getStatusBadge(rs)}
                    </div>
                    <div className="flex items-center gap-1 text-[11px]">
                      <MapPin size={9} className="text-text-tertiary shrink-0" />
                      <span className="text-text-secondary truncate">{tripOrigin(t)}</span>
                      <span className="text-text-tertiary shrink-0 mx-0.5">→</span>
                      <MapPin size={9} className="text-[#ED642B] shrink-0" />
                      <span className="text-text-primary font-semibold truncate">{tripDest(t)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-text-tertiary">
                      <span>{tripDriver(t)}</span>
                      <span className="font-numeric">{formatDateTime((t as any).actual_arrival || t.planned_arrival)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── archive list ── */
            <>
              <div className="hidden md:grid grid-cols-[9rem_1fr_9rem_6rem_6rem_4rem] gap-3 items-center px-4 py-2 bg-bg-surface-raised/60 border-b border-border-default">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Vehicle</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Route</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Completed</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Status</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Cargo</p>
                <span />
              </div>
              {filteredTrips.map((t, idx) => (
                <div key={t.id} onClick={() => navigate(`/trips/${t.id}`)}
                  className={`flex md:grid md:grid-cols-[9rem_1fr_9rem_6rem_6rem_4rem] gap-3 items-center px-4 py-2.5 hover:bg-bg-surface-raised/50 transition-colors cursor-pointer ${idx !== 0 ? 'border-t border-border-default' : ''}`}>
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-black text-text-primary truncate">{tripVehicleReg(t)}</p>
                    <p className="text-[10px] text-text-tertiary truncate">{tripDriver(t)}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] min-w-0">
                    <span className="text-text-secondary truncate">{tripOrigin(t)}</span>
                    <span className="text-text-tertiary shrink-0 mx-0.5">→</span>
                    <span className="font-semibold text-text-primary truncate">{tripDest(t)}</span>
                  </div>
                  <p className="text-[10px] text-text-tertiary font-numeric">{formatDateTime((t as any).actual_arrival || t.planned_arrival)}</p>
                  {getStatusBadge(t.status)}
                  <p className="text-[10px] text-text-tertiary">{(t as any).cargo_weight_tonnes ? `${(t as any).cargo_weight_tonnes}T` : '—'}</p>
                  <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                    <TripActionMenu trip={t} resolvedStatus={t.status} canMutate={canMutate}
                      canManage={role === 'admin' || role === 'fleet_manager'} busyTripId={busyTripId}
                      onGatePass={() => generateGatePass(t)}
                      onStart={() => updateTripMutation.mutate({ id: t.id, data: { status: 'in_transit' } })}
                      onDeliver={() => setTripConfirm({ action: 'complete', trip: t })}
                      onReassign={() => setReassignTarget(t)} onEditDates={() => setEditDatesTarget(t)}
                      onCancel={() => setTripConfirm({ action: 'cancel', trip: t })}
                      onArchive={() => setTripConfirm({ action: 'archive', trip: t })} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── DISPATCH CONSIGNMENT MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-default rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-border-default flex items-center justify-between bg-bg-surface-raised/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#250C77] text-white flex items-center justify-center">
                  <Route size={15} className="text-[#ED642B]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Dispatch Commercial Consignment</h3>
                  <p className="text-[11px] text-text-tertiary">Initialize corridor voyage schedule and satellite SLA tracking.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmitCreate)} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Fleet Vehicle Unit *</label>
                  <Select
                    value={watchedVehicleId || ''}
                    onValueChange={(val) => setValue('vehicle_id', val, { shouldValidate: true })}
                  >
                    <SelectTrigger className="w-full h-9 text-xs font-medium bg-bg-surface-raised border-border-default">
                      <SelectValue placeholder="— Select Vehicle —" />
                    </SelectTrigger>
                    <SelectContent>
                      {(vehiclesData || []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.registration_number} ({v.vehicle_type}) {v.driver_name ? `• ${v.driver_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vehicle_id && <p className="text-[11px] text-red-500 mt-1">{errors.vehicle_id.message}</p>}
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">Trade Corridor</label>
                  <Select
                    value={watchedCorridorName || 'Northern Corridor (Mombasa - Nairobi)'}
                    onValueChange={(val) => setValue('corridor_name', val)}
                  >
                    <SelectTrigger className="w-full h-9 text-xs font-medium bg-bg-surface-raised border-border-default">
                      <SelectValue placeholder="Select Corridor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Northern Corridor (Mombasa - Nairobi)">Northern Corridor (Mombasa - Nairobi)</SelectItem>
                      <SelectItem value="Great Lakes Link (Nairobi - Malaba - Kampala)">Great Lakes Link (Nairobi - Malaba - Kampala)</SelectItem>
                      <SelectItem value="Tanzania Link (Nairobi - Namanga - Arusha)">Tanzania Link (Nairobi - Namanga - Arusha)</SelectItem>
                      <SelectItem value="Western Kenya Spur (Nakuru - Kisumu)">Western Kenya Spur (Nakuru - Kisumu)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Origin Facility / Loading Point *</label>
                  <Select
                    value={watchedOriginId || ''}
                    onValueChange={(val) => setValue('origin_id', val, { shouldValidate: true })}
                  >
                    <SelectTrigger className="w-full h-9 text-xs font-medium bg-bg-surface-raised border-border-default">
                      <SelectValue placeholder="— Select Origin —" />
                    </SelectTrigger>
                    <SelectContent>
                      {(locationsData || []).map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} ({loc.location_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.origin_id && <p className="text-[11px] text-red-500 mt-1">{errors.origin_id.message}</p>}
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">Destination Facility / Border *</label>
                  <Select
                    value={watchedDestinationId || ''}
                    onValueChange={(val) => setValue('destination_id', val, { shouldValidate: true })}
                  >
                    <SelectTrigger className="w-full h-9 text-xs font-medium bg-bg-surface-raised border-border-default">
                      <SelectValue placeholder="— Select Destination —" />
                    </SelectTrigger>
                    <SelectContent>
                      {(locationsData || []).map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} ({loc.location_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.destination_id && <p className="text-[11px] text-red-500 mt-1">{errors.destination_id.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Planned Departure Schedule *</label>
                  <DatePicker>
                    <DatePickerTrigger asChild>
                      <DatePickerButton variant="outline" className="w-full h-9 text-xs justify-start">
                        {pickerDep ? format(pickerDep, 'dd MMM yyyy') : 'Pick date'}
                      </DatePickerButton>
                    </DatePickerTrigger>
                    <DatePickerContent>
                      <Calendar mode="single" selected={pickerDep} onSelect={(d) => {
                        setPickerDep(d);
                        setValue('planned_departure', buildIso(d, depTime));
                      }} initialFocus />
                    </DatePickerContent>
                  </DatePicker>
                  <input type="time" value={depTime} onChange={e => { setDepTime(e.target.value); setValue('planned_departure', buildIso(pickerDep, e.target.value)); }}
                    className="mt-1.5 w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none font-numeric" />
                  {errors.planned_departure && <p className="text-[11px] text-red-500 mt-1">{errors.planned_departure.message}</p>}
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">Estimated Arrival (ETA) *</label>
                  <DatePicker>
                    <DatePickerTrigger asChild>
                      <DatePickerButton variant="outline" className="w-full h-9 text-xs justify-start">
                        {pickerArr ? format(pickerArr, 'dd MMM yyyy') : 'Pick date'}
                      </DatePickerButton>
                    </DatePickerTrigger>
                    <DatePickerContent>
                      <Calendar mode="single" selected={pickerArr} onSelect={(d) => {
                        setPickerArr(d);
                        setValue('planned_arrival', buildIso(d, arrTime));
                      }} initialFocus minDate={pickerDep} />
                    </DatePickerContent>
                  </DatePicker>
                  <input type="time" value={arrTime} onChange={e => { setArrTime(e.target.value); setValue('planned_arrival', buildIso(pickerArr, e.target.value)); }}
                    className="mt-1.5 w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none font-numeric" />
                  {errors.planned_arrival && <p className="text-[11px] text-red-500 mt-1">{errors.planned_arrival.message}</p>}
                </div>
              </div>

              {/* Cargo & Seals */}
              <div className="p-3.5 rounded-xl bg-bg-surface-raised/40 border border-border-default space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-text-tertiary">Manifest & Customs Compliance</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-text-secondary mb-1">ISO Container #</label>
                    <input
                      type="text"
                      {...register('container_number')}
                      placeholder="e.g. MSKU-8821901"
                      className="w-full bg-bg-surface border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-text-primary font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-text-secondary mb-1">Customs Seal #</label>
                    <input
                      type="text"
                      {...register('customs_seal_number')}
                      placeholder="e.g. KRA-SEAL-092"
                      className="w-full bg-bg-surface border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-text-primary font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-text-secondary mb-1">Payload Weight (T)</label>
                    <input
                      type="number"
                      step="0.1"
                      {...register('cargo_weight_tonnes', { valueAsNumber: true })}
                      placeholder="e.g. 26.5"
                      className="w-full bg-bg-surface border border-border-default rounded-lg px-2.5 py-1.5 text-xs text-text-primary font-numeric"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
                <Button variant="ghost" size="small" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  type="submit"
                  loading={isSubmitting || createTripMutation.isPending}
                  icon={<Truck size={13} />}
                >
                  Dispatch Consignment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TRIP CONFIRM DIALOG ── */}
      {tripConfirm && (
        <ConfirmDialog
          title={
            tripConfirm.action === 'cancel'   ? 'Cancel Trip' :
            tripConfirm.action === 'complete' ? 'Complete Trip' :
            'Archive Trip'
          }
          message={
            tripConfirm.action === 'cancel'
              ? `Cancel the trip for ${tripConfirm.trip.vehicle_reg}? This cannot be undone.`
              : tripConfirm.action === 'complete'
              ? `Mark ${tripConfirm.trip.vehicle_reg} as delivered to ${tripConfirm.trip.destination_name}?`
              : `Archive this completed/cancelled trip? It will be hidden from active lists.`
          }
          confirmLabel={
            tripConfirm.action === 'cancel' ? 'Cancel Trip' :
            tripConfirm.action === 'complete' ? 'Mark Delivered' :
            'Archive'
          }
          danger={tripConfirm.action === 'cancel'}
          onConfirm={runTripConfirm}
          onCancel={() => setTripConfirm(null)}
        />
      )}

      {/* ── REASSIGN MODAL ── */}
      {reassignTarget && (
        <ReassignModal
          trip={reassignTarget}
          vehicles={vehiclesData || []}
          isSaving={reassignTripMutation.isPending}
          onConfirm={(vehicleId) => reassignTripMutation.mutate({ id: reassignTarget.id, vehicle_id: vehicleId })}
          onCancel={() => setReassignTarget(null)}
        />
      )}

      {/* ── EDIT DATES MODAL ── */}
      {editDatesTarget && (
        <EditDatesModal
          trip={editDatesTarget}
          isSaving={editDatesMutation.isPending}
          onConfirm={(dep, arr) => editDatesMutation.mutate({
            id: editDatesTarget.id,
            planned_departure: dep,
            planned_arrival: arr,
          })}
          onCancel={() => setEditDatesTarget(null)}
        />
      )}
    </div>
  );
};
