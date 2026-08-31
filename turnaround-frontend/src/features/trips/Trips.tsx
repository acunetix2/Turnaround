import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';
import { formatDateTime } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Route, Truck, MapPin, Plus, Search, Clock,
  CheckCircle2, ShieldCheck, Container, Package,
  Navigation, X, Compass, Ticket
} from 'lucide-react';
import type { Trip, GatePassData } from '../../lib/api/types';
import { GatePassModal } from '../gate-pass/GatePassModal';
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

export const Trips: React.FC = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { toast } = useToast();
  const canMutate = role === 'admin' || role === 'fleet_manager' || role === 'dispatcher';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_transit' | 'delayed' | 'planned' | 'completed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'journeys' | 'table'>('journeys');
  const [selectedPassData, setSelectedPassData] = useState<GatePassData | null>(null);

  const openGatePass = (trip: Trip) => {
    const passNumber = `GP-${(trip.destination_name || 'TERM').substring(0, 3).toUpperCase()}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const passObj: GatePassData = {
      pass_number: passNumber,
      vehicle_reg: trip.vehicle_reg || 'FLEET-UNIT',
      vehicle_type: trip.vehicle_type || 'Commercial Semi-Trailer',
      driver_name: trip.driver_name || 'Fleet Operator',
      driver_phone: trip.driver_phone,
      container_number: trip.container_number,
      customs_seal_number: trip.customs_seal_number,
      cargo_type: trip.cargo_type,
      cargo_weight_tonnes: trip.cargo_weight_tonnes,
      terminal_name: trip.destination_name || 'Inland Container Depot',
      terminal_gate: 'Express Commercial Gate 02',
      time_window_start: trip.planned_departure || new Date().toISOString(),
      time_window_end: trip.planned_arrival || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      status: trip.status === 'completed' ? 'cleared' : 'pre_approved',
      carrier_name: 'Siginon Global Logistics',
      digital_signature: `SIG-EAC-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    };
    setSelectedPassData(passObj);
  };

  // Real backend queries with mock fallbacks
  const { data: tripsData, isLoading: loadingTrips } = useQuery({
    queryKey: ['trips'],
    queryFn: () => apiClient.getTrips(),
    refetchInterval: 20000,
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

  // Filter trips
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
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
  }, [trips, statusFilter, searchQuery]);

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
      case 'planned':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#250C77]/15 text-[#250C77] border border-[#250C77]/30">Scheduled</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/15 text-blue-500 border border-blue-500/30">Delivered</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-bg-surface-raised text-text-tertiary">Unknown</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
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
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center p-0.5 rounded-lg bg-bg-surface-raised border border-border-default">
            <button
              onClick={() => setActiveTab('journeys')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'journeys' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              Journey Cards
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'table' ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              Dispatch Table
            </button>
          </div>

          {canMutate && (
            <Button
              variant="primary"
              size="small"
              icon={<Plus size={14} />}
              onClick={() => {
                reset();
                setShowCreateModal(true);
              }}
            >
              Dispatch Consignment
            </Button>
          )}
        </div>
      </div>

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
          {(['all', 'in_transit', 'delayed', 'planned', 'completed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer shrink-0 ${
                statusFilter === s
                  ? 'bg-[#250C77] text-white shadow-sm'
                  : 'bg-bg-surface-raised text-text-secondary hover:text-text-primary'
              }`}
            >
              {s === 'all' ? 'All Dispatches' : s === 'in_transit' ? 'In Transit' : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── VIEW TAB 1: VISUAL JOURNEY CARDS WITH WAYPOINT STEPPER ── */}
      {activeTab === 'journeys' && (
        <div className="space-y-4">
          {filteredTrips.length === 0 ? (
            <div className="rounded-2xl border border-border-default bg-bg-surface p-12 text-center text-xs text-text-tertiary">
              <Route size={32} className="mx-auto mb-2 opacity-30 text-[#250C77]" />
              <p className="font-semibold text-text-secondary">No consignments match the current filter</p>
              <p className="text-[11px] mt-0.5">Adjust your search parameters or dispatch a new corridor trip.</p>
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const checkpoints = trip.checkpoints || [];
              const isDelayed = trip.status === 'delayed';

              return (
                <div
                  key={trip.id}
                  className={`rounded-2xl border bg-bg-surface p-5 shadow-sm space-y-4 transition-all ${
                    isDelayed
                      ? 'border-red-500/40 bg-gradient-to-r from-red-500/5 via-bg-surface to-bg-surface'
                      : 'border-border-default hover:border-[#ED642B]/40'
                  }`}
                >
                  {/* Top Trip Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border-default">
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        isDelayed ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-[#250C77]/10 border-[#250C77]/20 text-[#250C77]'
                      }`}>
                        <Truck size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/vehicles/${trip.vehicle_id}`} className="font-mono text-sm font-bold text-text-primary hover:text-[#ED642B] transition-colors">
                            {trip.vehicle_reg || 'FLEET UNIT'}
                          </Link>
                          {getStatusBadge(trip.status)}
                          {trip.container_number && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10.5px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-bold">
                              <Container size={10} /> {trip.container_number}
                            </span>
                          )}
                          {trip.customs_seal_number && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium">
                              Seal: {trip.customs_seal_number}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{trip.corridor_name || 'Northern Trade Corridor'}</span>
                          <span>•</span>
                          <span>{trip.cargo_type || 'Commercial Freight'} ({trip.cargo_weight_tonnes || 24}T)</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto text-xs">
                      {trip.driver_name && (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-bg-surface-raised border border-border-default">
                          <div className="h-6 w-6 rounded-md bg-[#250C77] text-white font-bold text-xs flex items-center justify-center">
                            {trip.driver_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-text-primary text-[11px] leading-tight">{trip.driver_name}</p>
                            <p className="text-[9.5px] text-text-tertiary font-mono">{trip.driver_phone || 'Driver'}</p>
                          </div>
                        </div>
                      )}

                      {trip.risk_score != null && (
                        <div className="p-2 rounded-xl bg-bg-surface-raised border border-border-default text-right min-w-[90px]">
                          <span className="text-[9.5px] uppercase font-bold text-text-tertiary block">Delay Risk</span>
                          <span className={`font-numeric text-xs font-extrabold ${trip.risk_score > 50 ? 'text-red-500' : 'text-status-good'}`}>
                            {trip.risk_score}% {trip.risk_score > 50 ? 'High' : 'Low'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── INTERACTIVE WAYPOINT STEPPER ── */}
                  <div className="py-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-text-tertiary mb-3">
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-text-tertiary" /> Origin: <strong className="text-text-primary">{trip.origin_name}</strong></span>
                      <span className="flex items-center gap-1">Destination: <strong className="text-text-primary">{trip.destination_name}</strong> <MapPin size={12} className="text-[#ED642B]" /></span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                      {checkpoints.map((chk, idx) => {
                        const isDone = chk.status === 'completed';
                        const isCurrent = chk.status === 'current';
                        const hasExcess = (chk.excess_dwell_minutes || 0) > 0;

                        return (
                          <div
                            key={chk.id || idx}
                            className={`p-3 rounded-xl border relative transition-all ${
                              isCurrent
                                ? 'bg-[#ED642B]/10 border-[#ED642B] ring-1 ring-[#ED642B]/30'
                                : isDone
                                ? 'bg-bg-surface-raised/60 border-border-default'
                                : 'bg-bg-surface-raised/20 border-dashed border-border-default opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-bold uppercase text-text-tertiary">
                                Stop #{idx + 1}
                              </span>
                              {isDone ? (
                                <span className="inline-flex items-center text-status-good text-[10px] font-bold">
                                  <CheckCircle2 size={11} className="mr-0.5" /> Cleared
                                </span>
                              ) : isCurrent ? (
                                <span className="inline-flex items-center text-[#ED642B] text-[10px] font-bold">
                                  <Navigation size={11} className="mr-0.5 animate-pulse" /> In Bay
                                </span>
                              ) : (
                                <span className="text-text-tertiary text-[10px]">Pending</span>
                              )}
                            </div>

                            <p className="text-xs font-bold text-text-primary truncate">{chk.location_name}</p>

                            <div className="mt-2 pt-2 border-t border-border-default/50 text-[10.5px] flex items-center justify-between text-text-secondary">
                              <span>Target: {chk.expected_dwell_minutes}m</span>
                              {chk.actual_dwell_minutes != null && (
                                <span className={`font-numeric font-bold ${hasExcess ? 'text-red-500' : 'text-status-good'}`}>
                                  {chk.actual_dwell_minutes}m {hasExcess ? `(+${chk.excess_dwell_minutes}m)` : ''}
                                </span>
                              )}
                              {chk.eta && <span className="text-[#ED642B] font-bold">ETA: {chk.eta}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border-default text-xs text-text-tertiary flex-wrap gap-2">
                    <div className="flex items-center gap-4 text-[11px]">
                      <span>Dispatched: <strong className="text-text-primary font-numeric">{formatDateTime(trip.planned_departure)}</strong></span>
                      <span>Target Arrival: <strong className="text-text-primary font-numeric">{formatDateTime(trip.planned_arrival)}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="small"
                        icon={<Ticket size={12} className="text-[#ED642B]" />}
                        onClick={() => openGatePass(trip)}
                      >
                        Gate Pass
                      </Button>
                      {canMutate && trip.status !== 'completed' && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus = trip.status === 'planned' ? 'in_transit' : 'completed';
                            updateTripMutation.mutate({
                              id: trip.id,
                              data: {
                                status: nextStatus,
                                ...(nextStatus === 'completed' ? { actual_arrival: new Date().toISOString() } : {})
                              }
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-bg-surface-raised hover:bg-status-good/20 hover:text-status-good border border-border-default font-semibold text-[11px] text-text-primary transition-colors cursor-pointer"
                        >
                          {trip.status === 'planned' ? 'Start Transit' : 'Mark Delivered'}
                        </button>
                      )}
                      <Link
                        to={`/map?focus=${trip.vehicle_id}`}
                        className="px-3 py-1.5 rounded-lg bg-bg-surface-raised hover:bg-[#250C77] hover:text-white border border-border-default font-semibold text-[11px] text-text-primary transition-colors flex items-center gap-1.5"
                      >
                        <Compass size={12} className="text-[#ED642B]" /> Track on Live Map
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── VIEW TAB 2: FULL DISPATCH TABLE ── */}
      {activeTab === 'table' && (
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
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs font-bold text-text-primary">
                      <Link to={`/vehicles/${t.vehicle_id}`} className="hover:text-[#ED642B] transition-colors">
                        {t.vehicle_reg}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-text-primary">
                      <div className="font-medium">{t.driver_name || 'Unassigned'}</div>
                      <div className="text-[10px] text-text-tertiary font-mono">{t.driver_phone}</div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-text-primary">{t.origin_name}</TableCell>
                    <TableCell className="text-xs font-medium text-text-primary">{t.destination_name}</TableCell>
                    <TableCell className="text-xs">
                      {t.container_number ? (
                        <span className="font-mono font-bold text-indigo-400 text-[11px] block">{t.container_number}</span>
                      ) : <span className="text-text-tertiary">—</span>}
                      {t.customs_seal_number && <span className="text-[9.5px] text-text-tertiary font-mono block">Seal: {t.customs_seal_number}</span>}
                    </TableCell>
                    <TableCell className="font-numeric text-[11px] text-text-secondary">{formatDateTime(t.planned_departure)}</TableCell>
                    <TableCell>{getStatusBadge(t.status)}</TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="small"
                          icon={<Ticket size={12} className="text-[#ED642B]" />}
                          onClick={() => openGatePass(t)}
                        >
                          Pass
                        </Button>
                        <Link
                          to={`/vehicles/${t.vehicle_id}`}
                          className="text-xs font-bold text-[#ED642B] hover:underline"
                        >
                          Details
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
                  <input
                    type="datetime-local"
                    {...register('planned_departure')}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none font-numeric"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-text-primary mb-1">Estimated Arrival (ETA) *</label>
                  <input
                    type="datetime-local"
                    {...register('planned_arrival')}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none font-numeric"
                  />
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

      {/* ── DIGITAL QR GATE PASS MODAL ── */}
      {selectedPassData && (
        <GatePassModal
          pass={selectedPassData}
          onClose={() => setSelectedPassData(null)}
        />
      )}
    </div>
  );
};
