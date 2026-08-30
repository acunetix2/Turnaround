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
  ArrowLeft, Clock, Edit2, Truck, MapPin, X
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import type { Vehicle } from '../../lib/api/types';
import { useToast } from '../../components/ui/Toast';

const updateSchema = zod.object({
  registration_number: zod.string().min(3),
  vehicle_type: zod.string().min(2),
  capacity: zod.number().positive(),
  hourly_operating_cost: zod.number().positive(),
  status: zod.enum(['moving', 'stationary', 'delayed'] as const)
});

type UpdateFormValues = zod.infer<typeof updateSchema>;

export const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { toast } = useToast();
  const canMutate = role === 'admin' || role === 'fleet_manager';

  const [isEditing, setIsEditing] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const { data: vehicle, isLoading: loadingVehicle, isError: vehicleError } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => apiClient.getVehicleById(id || ''),
    enabled: !!id
  });

  const { data: dwells, isLoading: loadingDwells } = useQuery({
    queryKey: ['dwellEvents', 'vehicle', id],
    queryFn: () => apiClient.getDwellEvents(id),
    enabled: !!id
  });

  const { data: gpsPositions } = useQuery({
    queryKey: ['liveGpsEvents'],
    queryFn: () => apiClient.getLiveGPSEvents(),
    refetchInterval: 15000
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => apiClient.updateVehicle(id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsEditing(false);
      toast({
        variant: 'success',
        title: 'Vehicle Updated',
        message: 'Fleet asset specifications saved.'
      });
    },
    onError: (err: any) => {
      setUpdateError(err?.message || 'Failed to update vehicle details.');
    }
  });

  const {
    register,
    handleSubmit,
    formState: { isSubmitting }
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    values: vehicle ? {
      registration_number: vehicle.registration_number,
      vehicle_type: vehicle.vehicle_type,
      capacity: vehicle.capacity,
      hourly_operating_cost: vehicle.hourly_operating_cost,
      status: vehicle.status
    } : undefined
  });

  const onSubmit = (data: UpdateFormValues) => {
    setUpdateError('');
    updateMutation.mutate(data);
  };

  if (loadingVehicle || loadingDwells) {
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

  if (vehicleError || !vehicle) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-surface border border-border-default rounded-xl">
        <Truck size={36} className="text-status-danger" />
        <h2 className="text-sm font-bold text-text-primary mt-3">Vehicle Not Found</h2>
        <p className="text-xs text-text-secondary mt-1">The requested asset telemetry record does not exist.</p>
        <Link
          to="/vehicles"
          className="mt-4 rounded-lg bg-brand-500 hover:bg-brand-400 px-4 py-2 text-xs font-semibold text-white shadow transition-colors"
        >
          Back to Fleet Registry
        </Link>
      </div>
    );
  }

  const gps = gpsPositions ? gpsPositions[vehicle.id] : null;
  const dwellList = dwells || [];

  const totalDwellMinutes = dwellList.reduce((acc, d) => acc + (d.dwell_minutes || 0), 0);
  const totalExcessMinutes = dwellList.reduce((acc, d) => acc + (d.excess_minutes || 0), 0);
  const totalDelayCost = (totalExcessMinutes / 60) * vehicle.hourly_operating_cost;

  const chartData = dwellList.slice(0, 10).reverse().map((d, i) => ({
    visit: d.location_name ? d.location_name.substring(0, 10) : `Stop #${i + 1}`,
    dwell: d.dwell_minutes,
    expected: d.expected_minutes,
    excess: d.excess_minutes
  }));

  const isDelayed = vehicle.status === 'delayed';
  const isMoving = vehicle.status === 'moving';

  return (
    <div className="space-y-5">
      {/* ── BREADCRUMB & BACK ── */}
      <div className="flex items-center justify-between">
        <Link
          to="/vehicles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back to Commercial Fleet
        </Link>

        {canMutate && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-bg-surface hover:bg-bg-surface-raised text-xs font-semibold text-text-primary transition-colors cursor-pointer"
          >
            <Edit2 size={13} />
            Edit Asset
          </button>
        )}
      </div>

      {/* ── ASSET HERO HEADER ── */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`h-12 w-12 rounded-xl border flex items-center justify-center shrink-0 ${
              isDelayed ? 'bg-status-danger-bg border-status-danger/30 text-status-danger' : 'bg-brand-500/10 border-brand-500/20 text-brand-400'
            }`}>
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-numeric text-xl font-bold text-text-primary">
                  {vehicle.registration_number}
                </h1>
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border font-numeric uppercase ${
                  isDelayed
                    ? 'bg-status-danger-bg text-status-danger border-status-danger/30'
                    : isMoving
                    ? 'bg-status-good-bg text-status-good border-status-good/30'
                    : 'bg-bg-surface-raised text-text-tertiary border-border-default'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isDelayed ? 'bg-status-danger animate-pulse' : isMoving ? 'bg-status-good' : 'bg-text-tertiary'}`} />
                  {vehicle.status}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                {vehicle.vehicle_type} • {vehicle.capacity} Tonnes Payload Capacity
              </p>
            </div>
          </div>

          {/* Location & GPS Info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
            <div className="p-2.5 rounded-lg bg-bg-surface-raised border border-border-default">
              <span className="text-[10px] font-semibold uppercase text-text-tertiary block">Current Geofence</span>
              <span className="text-xs font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                <MapPin size={12} className="text-brand-400" />
                {vehicle.current_location_name || 'En Route (GPS)'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-bg-surface-raised border border-border-default">
              <span className="text-[10px] font-semibold uppercase text-text-tertiary block">Operating Rate</span>
              <span className="font-numeric text-xs font-semibold text-text-primary block mt-0.5">
                {formatCurrency(vehicle.hourly_operating_cost)} / hr
              </span>
            </div>

            {gps && (
              <div className="p-2.5 rounded-lg bg-bg-surface-raised border border-border-default font-numeric">
                <span className="text-[10px] font-semibold uppercase text-text-tertiary block">GPS Telemetry</span>
                <span className="text-xs text-text-secondary block mt-0.5">
                  {gps.latitude.toFixed(4)}, {gps.longitude.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── EDIT FORM INLINE (When Active) ── */}
      {isEditing && (
        <div className="rounded-xl border border-brand-500/40 bg-bg-surface p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-400">
              Edit Vehicle Specifications
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
                <label className="block text-xs font-medium text-text-secondary mb-1">Registration Number</label>
                <input
                  type="text"
                  {...register('registration_number')}
                  className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary uppercase font-numeric focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Classification</label>
                <input
                  type="text"
                  {...register('vehicle_type')}
                  className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Payload (Tonnes)</label>
                <input
                  type="number"
                  step="0.1"
                  {...register('capacity', { valueAsNumber: true })}
                  className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Rate (KES/hr)</label>
                <input
                  type="number"
                  step="100"
                  {...register('hourly_operating_cost', { valueAsNumber: true })}
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
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── KPI METRICS STRIP ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-secondary">Total Dwell Logged</span>
          <p className="font-numeric text-2xl font-bold text-text-primary mt-2">
            {formatMinutes(totalDwellMinutes)}
          </p>
          <span className="text-[11px] text-text-tertiary">Across {dwellList.length} terminal stops</span>
        </div>

        <div className={`rounded-xl border p-4 shadow-sm ${
          totalExcessMinutes > 0 ? 'bg-status-danger-bg/30 border-status-danger/30' : 'bg-bg-surface border-border-default'
        }`}>
          <span className="text-xs font-medium text-text-secondary">Cumulative Excess Delay</span>
          <p className={`font-numeric text-2xl font-bold mt-2 ${totalExcessMinutes > 0 ? 'text-status-danger' : 'text-text-primary'}`}>
            +{formatMinutes(totalExcessMinutes)}
          </p>
          <span className="text-[11px] text-text-tertiary">Over SLA allowance</span>
        </div>

        <div className="rounded-xl border border-money-accent/25 bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-money-accent">Estimated Demurrage Loss</span>
          <p className="font-numeric text-2xl font-bold text-money-accent mt-2">
            {formatCurrency(totalDelayCost)}
          </p>
          <span className="text-[11px] text-text-tertiary">Based on {formatCurrency(vehicle.hourly_operating_cost)}/hr</span>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-secondary">Efficiency Rating</span>
          <p className="font-numeric text-2xl font-bold text-brand-400 mt-2">
            {totalDwellMinutes > 0 ? `${Math.max(0, Math.round(100 - (totalExcessMinutes / totalDwellMinutes) * 100))}%` : '100%'}
          </p>
          <span className="text-[11px] text-text-tertiary">On-time ratio</span>
        </div>
      </div>

      {/* ── CHARTS & AUDIT LOG ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Dwell Audit Trail Table */}
        <div className="lg:col-span-2 rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
          <div className="px-4 py-3.5 border-b border-border-default bg-bg-surface-raised/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-brand-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Geofence Dwell Audit Trail
              </h2>
            </div>
            <span className="font-numeric text-[11px] text-text-tertiary">
              {dwellList.length} Recorded Cycles
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-dense">
              <thead>
                <tr className="bg-bg-surface-raised/50">
                  <th>Location Geofence</th>
                  <th>Arrival Time</th>
                  <th>Departure</th>
                  <th>Elapsed Dwell</th>
                  <th>SLA Baseline</th>
                  <th className="text-right">Excess Delay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {dwellList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-text-tertiary">
                      No geofence dwell events recorded for this vehicle.
                    </td>
                  </tr>
                ) : (
                  dwellList.map((d) => {
                    const isExcess = d.excess_minutes > 0;
                    return (
                      <tr key={d.id} className="hover:bg-bg-surface-raised/30 transition-colors">
                        <td className="text-xs font-semibold text-text-primary">
                          {d.location_name || 'Terminal Geofence'}
                        </td>
                        <td className="font-numeric text-[11px] text-text-secondary">
                          {formatDateTime(d.arrival_time)}
                        </td>
                        <td className="font-numeric text-[11px] text-text-secondary">
                          {d.departure_time ? formatDateTime(d.departure_time) : (
                            <span className="text-status-warning font-semibold">Active Dwell</span>
                          )}
                        </td>
                        <td className="font-numeric text-xs font-bold text-text-primary">
                          {formatMinutes(d.dwell_minutes)}
                        </td>
                        <td className="font-numeric text-xs text-text-tertiary">
                          {formatMinutes(d.expected_minutes)}
                        </td>
                        <td className="text-right font-numeric text-xs font-bold">
                          {isExcess ? (
                            <span className="text-status-danger">+{formatMinutes(d.excess_minutes)}</span>
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

        {/* Right Col: Historical Dwell Chart */}
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-1">
              Turnaround vs SLA (Recent Stops)
            </h2>
            <p className="text-[11px] text-text-tertiary mb-4">
              Visualizing dwell duration (mins) relative to geofence SLA threshold.
            </p>

            <div className="h-64 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-text-tertiary">
                  Insufficient stop history
                </div>
              ) : (
                <ReactECharts
                  option={{
                    backgroundColor: 'transparent',
                    tooltip: {
                      trigger: 'axis',
                      backgroundColor: '#180B4A',
                      borderColor: '#ED642B',
                      borderWidth: 1,
                      textStyle: { color: '#FFFFFF', fontSize: 11 },
                    },
                    grid: { top: 15, right: 15, bottom: 25, left: 35 },
                    xAxis: {
                      type: 'category',
                      data: chartData.map(d => d.visit),
                      axisLabel: { color: '#9CA3AF', fontSize: 10 },
                    },
                    yAxis: {
                      type: 'value',
                      name: 'Mins',
                      nameTextStyle: { color: '#9CA3AF', fontSize: 10 },
                      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
                      axisLabel: { color: '#9CA3AF', fontSize: 10 },
                    },
                    series: [
                      {
                        name: 'Actual Dwell (m)',
                        type: 'line',
                        smooth: true,
                        data: chartData.map(d => d.dwell),
                        lineStyle: { width: 2.5, color: '#250C77' },
                        areaStyle: {
                          color: {
                            type: 'linear',
                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,
                            colorStops: [
                              { offset: 0, color: 'rgba(37, 12, 119, 0.4)' },
                              { offset: 1, color: 'rgba(37, 12, 119, 0.0)' },
                            ],
                          },
                        },
                      },
                      {
                        name: 'SLA Target (m)',
                        type: 'line',
                        smooth: true,
                        data: chartData.map(d => d.expected),
                        lineStyle: { width: 2, color: '#10B981', type: 'dashed' },
                      },
                    ],
                  }}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border-default flex items-center justify-between text-xs text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#250C77]" /> Actual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-status-good" /> SLA Baseline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
