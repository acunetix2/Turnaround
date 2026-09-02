import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes, formatDateTime } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  ArrowLeft, MapPin, Clock, Edit2, X, Brain
} from 'lucide-react';
import type { Location } from '../../lib/api/types';
import { useToast } from '../../components/ui/Toast';

const updateLocSchema = zod.object({
  name: zod.string().min(2),
  location_type: zod.enum([
    'warehouse',
    'customer_facility',
    'depot',
    'port',
    'border_crossing',
    'loading_point',
    'unloading_point'
  ] as const),
  latitude: zod.number(),
  longitude: zod.number(),
  geofence_radius: zod.number().positive(),
  expected_dwell_minutes: zod.number().positive()
});

type UpdateLocFormValues = zod.infer<typeof updateLocSchema>;

const LOCATION_TYPE_LABELS: Record<string, string> = {
  border_crossing: 'Border Crossing',
  port: 'Maritime Port',
  depot: 'Transit Depot',
  warehouse: 'Warehouse Hub',
  customer_facility: 'Customer Facility',
  loading_point: 'Loading Terminal',
  unloading_point: 'Unloading Terminal',
};

export const LocationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { toast } = useToast();
  const canMutate = role === 'admin' || role === 'fleet_manager';

  const [isEditing, setIsEditing] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const { data: location, isLoading: loadingLoc, isError: locError } = useQuery({
    queryKey: ['location', id],
    queryFn: () => apiClient.getLocationById(id || ''),
    enabled: !!id
  });

  const { data: locationStats } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats
  });

  const { data: dwells } = useQuery({
    queryKey: ['dwellEvents'],
    queryFn: () => apiClient.getDwellEvents()
  });

  const { data: rawInsights } = useQuery({
    queryKey: ['insights'],
    queryFn: apiClient.getInsights
  });
  const insights = Array.isArray(rawInsights) ? rawInsights : (rawInsights as any)?.items ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Location>) => apiClient.updateLocation(id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location', id] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locationStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsEditing(false);
      toast({
        variant: 'success',
        title: 'Geofence Updated',
        message: 'Facility coordinates and SLA benchmarks saved.'
      });
    },
    onError: (err: any) => {
      setUpdateError(err?.message || 'Failed to update location parameters.');
    }
  });

  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<UpdateLocFormValues>({
    resolver: zodResolver(updateLocSchema),
    values: location ? {
      name: location.name,
      location_type: location.location_type,
      latitude: location.latitude,
      longitude: location.longitude,
      geofence_radius: location.geofence_radius,
      expected_dwell_minutes: location.expected_dwell_minutes
    } : undefined
  });

  const onSubmit = (data: UpdateLocFormValues) => {
    setUpdateError('');
    updateMutation.mutate(data);
  };

  if (loadingLoc) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-6 w-32 bg-bg-surface-raised rounded" />
        <div className="h-32 rounded-xl bg-bg-surface border border-border-default" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-bg-surface border border-border-default" />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-bg-surface border border-border-default" />
      </div>
    );
  }

  if (locError || !location) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-surface border border-border-default rounded-xl">
        <MapPin size={36} className="text-status-danger" />
        <h2 className="text-sm font-bold text-text-primary mt-3">Geofence Facility Not Found</h2>
        <p className="text-xs text-text-secondary mt-1">The requested terminal record does not exist in registry.</p>
        <Link
          to="/locations"
          className="mt-4 rounded-lg bg-brand-500 hover:bg-brand-400 px-4 py-2 text-xs font-semibold text-white shadow transition-colors"
        >
          Back to Locations
        </Link>
      </div>
    );
  }

  const stat = locationStats?.find((s) => s.location_id === location.id);
  const locationDwells = (dwells || []).filter((d) => d.location_id === location.id);
  const activeDwellsAtLoc = locationDwells.filter((d) => !d.departure_time);
  const locInsights = (insights || []).filter((i) => i.location_id === location.id);

  const visits = stat?.total_visits || locationDwells.length || 0;
  const avgDwell = stat?.avg_dwell_minutes || location.expected_dwell_minutes;
  const avgExcess = stat?.avg_excess_delay_minutes || 0;
  const financialLoss = stat?.financial_impact || 0;

  return (
    <div className="space-y-5">
      {/* ── BREADCRUMB ── */}
      <div className="flex items-center justify-between">
        <Link
          to="/locations"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back to Geofences
        </Link>

        {canMutate && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-bg-surface hover:bg-bg-surface-raised text-xs font-semibold text-text-primary transition-colors cursor-pointer"
          >
            <Edit2 size={13} />
            Edit Geofence
          </button>
        )}
      </div>

      {/* ── FACILITY HERO HEADER ── */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
              <MapPin size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-text-primary tracking-tight">
                  {location.name}
                </h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-bg-surface-raised text-brand-400 border-brand-500/20">
                  {LOCATION_TYPE_LABELS[location.location_type] || location.location_type}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Geofence Radius: <span className="font-numeric font-semibold text-text-primary">{location.geofence_radius}m</span> • GPS: <span className="font-numeric">{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-bg-surface-raised border border-border-default">
              <span className="text-[10px] font-semibold uppercase text-text-tertiary block">SLA Expected Dwell</span>
              <span className="font-numeric text-xs font-bold text-text-primary block mt-0.5">
                {formatMinutes(location.expected_dwell_minutes)}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-bg-surface-raised border border-border-default">
              <span className="text-[10px] font-semibold uppercase text-text-tertiary block">Live Vehicles On-Site</span>
              <span className={`font-numeric text-xs font-bold block mt-0.5 ${
                activeDwellsAtLoc.length > 0 ? 'text-status-warning' : 'text-status-good'
              }`}>
                {activeDwellsAtLoc.length} units
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── EDIT FORM INLINE (When Active) ── */}
      {isEditing && (
        <div className="rounded-xl border border-brand-500/40 bg-bg-surface p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400">
              Edit Geofence Parameters
            </h3>
            <button
              onClick={() => setIsEditing(false)}
              className="p-1 text-text-tertiary hover:text-text-primary cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {updateError && (
            <div className="p-3 rounded-lg bg-status-danger-bg border border-status-danger/30 text-xs text-status-danger">
              {updateError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Facility Name</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Classification</label>
                <select
                  {...register('location_type')}
                  className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none cursor-pointer"
                >
                  <option value="warehouse">Warehouse Hub</option>
                  <option value="depot">Transit Depot</option>
                  <option value="port">Maritime Port</option>
                  <option value="border_crossing">Border Crossing</option>
                  <option value="customer_facility">Customer Facility</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Radius (Meters)</label>
                <input
                  type="number"
                  step="10"
                  {...register('geofence_radius', { valueAsNumber: true })}
                  className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">SLA Dwell (Minutes)</label>
                <input
                  type="number"
                  step="5"
                  {...register('expected_dwell_minutes', { valueAsNumber: true })}
                  className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 rounded-lg border border-border-default text-xs font-semibold text-text-secondary hover:bg-bg-surface-raised transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Geofence'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SUMMARY KPIS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-secondary">Fleet Visits Logged</span>
          <p className="font-numeric text-2xl font-bold text-text-primary mt-2">
            {visits}
          </p>
          <span className="text-[11px] text-text-tertiary">Terminal arrival events</span>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-secondary">Average Turnaround</span>
          <p className="font-numeric text-2xl font-bold text-text-primary mt-2">
            {formatMinutes(avgDwell)}
          </p>
          <span className="text-[11px] text-text-tertiary">SLA Benchmark: {formatMinutes(location.expected_dwell_minutes)}</span>
        </div>

        <div className={`rounded-xl border p-4 shadow-sm ${
          avgExcess > 0 ? 'bg-status-danger-bg/30 border-status-danger/30' : 'bg-bg-surface border-border-default'
        }`}>
          <span className="text-xs font-medium text-text-secondary">Avg Excess Delay</span>
          <p className={`font-numeric text-2xl font-bold mt-2 ${avgExcess > 0 ? 'text-status-danger' : 'text-text-primary'}`}>
            +{formatMinutes(avgExcess)}
          </p>
          <span className="text-[11px] text-text-tertiary">Past SLA benchmark</span>
        </div>

        <div className="rounded-xl border border-money-accent/25 bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-money-accent">Period Financial Loss</span>
          <p className="font-numeric text-2xl font-bold text-money-accent mt-2">
            {formatCurrency(financialLoss)}
          </p>
          <span className="text-[11px] text-text-tertiary">Idle fleet overhead</span>
        </div>
      </div>

      {/* ── ACTIVE TRUCKS ON SITE & VISIT LOG ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Visit History */}
        <div className="lg:col-span-2 rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
          <div className="px-4 py-3.5 border-b border-border-default bg-bg-surface-raised/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-brand-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Recent Facility Visits
              </h2>
            </div>
            <span className="font-numeric text-[11px] text-text-tertiary">
              {locationDwells.length} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-dense">
              <thead>
                <tr className="bg-bg-surface-raised/50">
                  <th>Vehicle Registration</th>
                  <th>Arrival Time</th>
                  <th>Departure</th>
                  <th>Dwell Duration</th>
                  <th className="text-right">Excess Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {locationDwells.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-text-tertiary">
                      No visits recorded at this facility yet.
                    </td>
                  </tr>
                ) : (
                  locationDwells.slice(0, 10).map((d) => {
                    const isExcess = d.excess_minutes > 0;
                    return (
                      <tr key={d.id} className="hover:bg-bg-surface-raised/30 transition-colors">
                        <td className="font-numeric text-xs font-bold text-text-primary">
                          <Link to={`/vehicles/${d.vehicle_id}`} className="hover:text-brand-400 transition-colors">
                            {d.vehicle_reg || d.vehicle_id}
                          </Link>
                        </td>
                        <td className="font-numeric text-[11px] text-text-secondary">
                          {formatDateTime(d.arrival_time)}
                        </td>
                        <td className="font-numeric text-[11px] text-text-secondary">
                          {d.departure_time ? formatDateTime(d.departure_time) : (
                            <span className="text-status-warning font-semibold">Active In-Geofence</span>
                          )}
                        </td>
                        <td className="font-numeric text-xs font-bold text-text-primary">
                          {formatMinutes(d.dwell_minutes)}
                        </td>
                        <td className="text-right font-numeric text-xs font-bold">
                          {isExcess ? (
                            <span className="text-status-danger">+{formatMinutes(d.excess_minutes)} Over SLA</span>
                          ) : (
                            <span className="text-status-good">Within SLA</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Associated Bottleneck Insights */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={15} className="text-purple-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Algorithmic Insights ({locInsights.length})
              </h2>
            </div>

            {locInsights.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-tertiary">
                No active bottleneck anomalies detected for this facility.
              </div>
            ) : (
              <div className="space-y-3">
                {locInsights.map((ins) => (
                  <div key={ins.id} className="p-3 rounded-lg bg-bg-surface-raised border border-border-default space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary">{ins.title}</span>
                      <span className="font-numeric text-[10px] font-bold text-status-danger px-1.5 py-0.5 rounded bg-status-danger-bg border border-status-danger/30 uppercase">
                        {ins.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">{ins.description}</p>
                    {ins.financial_impact && (
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-text-tertiary">Financial Impact:</span>
                        <span className="font-numeric font-bold text-money-accent">
                          {formatCurrency(ins.financial_impact)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
