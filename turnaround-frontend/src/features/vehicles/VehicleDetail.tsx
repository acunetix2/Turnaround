import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes, formatDateTime } from '../../lib/format';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { useAuth } from '../../auth/AuthProvider';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  TrendingUp,
  MapPin,
  Lock,
  Edit2,
  Check
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { Vehicle } from '../../lib/api/types';
import { Select } from '../../components/ui/Select';


const updateSchema = zod.object({
  registration_number: zod.string().min(3),
  vehicle_type: zod.string().min(2),
  capacity: zod.coerce.number().positive(),
  hourly_operating_cost: zod.coerce.number().positive(),
  status: zod.enum(['moving', 'stationary', 'delayed'] as const)
});

type UpdateFormValues = zod.infer<typeof updateSchema>;

export const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canMutate = role === 'admin' || role === 'fleet_manager';

  const [isEditing, setIsEditing] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Fetch Vehicle
  const { data: vehicle, isLoading: loadingVehicle, isError: vehicleError } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => apiClient.getVehicleById(id || ''),
    enabled: !!id
  });

  // Fetch Dwells for this vehicle
  const { data: dwells, isLoading: loadingDwells } = useQuery({
    queryKey: ['dwellEvents', 'vehicle', id],
    queryFn: () => apiClient.getDwellEvents(id),
    enabled: !!id
  });

  // Fetch Vehicle Stats
  const { data: fleetStats } = useQuery({
    queryKey: ['vehicleStats'],
    queryFn: apiClient.getVehicleStats
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => apiClient.updateVehicle(id || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setIsEditing(false);
    },
    onError: (err: any) => {
      setUpdateError(err?.message || 'Failed to update vehicle details.');
    }
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
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
    return <div className="p-12 text-center text-text-secondary">Retrieving vehicle profile...</div>;
  }

  if (vehicleError || !vehicle) {
    return (
      <div className="p-12 text-center">
        <p className="text-status-danger font-semibold">Vehicle profile not found.</p>
        <Link to="/vehicles" className="mt-4 inline-flex items-center gap-1 text-xs text-brand-400">
          <ArrowLeft size={12} /> Back to list
        </Link>
      </div>
    );
  }

  // Get specific stats for this vehicle
  const stats = fleetStats?.find((s) => s.vehicle_id === vehicle.id) || {
    total_trips: dwells?.length || 0,
    total_dwell_events: dwells?.length || 0,
    total_excess_dwell_minutes: dwells?.reduce((acc, d) => acc + d.excess_minutes, 0) || 0,
    total_financial_loss: dwells?.reduce((acc, d) => acc + d.estimated_cost, 0) || 0,
    avg_dwell_minutes: dwells?.length ? Math.round(dwells.reduce((acc, d) => acc + d.dwell_minutes, 0) / dwells.length) : 0
  };

  // Format trend data for the small chart
  const chartData = dwells
    ? [...dwells]
        .reverse()
        .slice(-10) // last 10 visits
        .map((d, index) => ({
          name: `Visit ${index + 1}`,
          cost: d.estimated_cost,
          delay: d.excess_minutes
        }))
    : [];

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/vehicles"
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Vehicles
        </Link>

        {canMutate ? (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center justify-center gap-1.5 rounded border border-border-default bg-bg-surface hover:bg-bg-surface-raised px-3 py-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
          >
            <Edit2 size={12} />
            {isEditing ? 'Cancel Edit' : 'Edit Asset'}
          </button>
        ) : (
          <div className="flex items-center gap-1 text-xs text-text-tertiary">
            <Lock size={12} />
            <span>Config Locked</span>
          </div>
        )}
      </div>

      {/* Main Info Blocks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Card: Vehicle Specs / Edit Form */}
        <div className="panel-elevated bg-bg-surface p-5 lg:col-span-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4">
            Asset Specifications
          </h2>

          {updateError && (
            <div className="mb-4 rounded bg-status-danger-bg border border-status-danger/20 p-2 text-xs text-status-danger">
              {updateError}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Registration
                </label>
                <input
                  type="text"
                  {...register('registration_number')}
                  className="mt-1 w-full rounded border border-border-default bg-bg-surface-raised px-3 py-2 text-xs text-text-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Type / Class
                </label>
                <input
                  type="text"
                  {...register('vehicle_type')}
                  className="mt-1 w-full rounded border border-border-default bg-bg-surface-raised px-3 py-2 text-xs text-text-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Capacity (T)
                  </label>
                  <input
                    type="number"
                    step="any"
                    {...register('capacity')}
                    className="mt-1 w-full rounded border border-border-default bg-bg-surface-raised px-3 py-2 text-xs text-text-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Hourly Cost (KES)
                  </label>
                  <input
                    type="number"
                    {...register('hourly_operating_cost')}
                    className="mt-1 w-full rounded border border-border-default bg-bg-surface-raised px-3 py-2 text-xs text-text-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <Select
                  label="Current Status"
                  value={watch('status') || 'stationary'}
                  onChange={(val) => setValue('status', val as any, { shouldValidate: true })}
                  options={[
                    { value: 'stationary', label: 'Stationary' },
                    { value: 'moving', label: 'Moving' },
                    { value: 'delayed', label: 'Delayed' },
                  ]}
                />
              </div>

              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full flex items-center justify-center gap-1.5 rounded bg-brand-500 hover:bg-brand-400 py-2 text-xs font-bold text-white shadow transition-colors cursor-pointer"
              >
                <Check size={14} />
                Save Changes
              </button>
            </form>
          ) : (
            <div className="space-y-4 font-ui">
              <div className="flex items-center justify-between">
                <span className="font-numeric text-xl font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                  {vehicle.registration_number}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                  vehicle.status === 'delayed'
                    ? 'bg-status-danger-bg text-status-danger'
                    : vehicle.status === 'stationary'
                    ? 'bg-status-warning-bg text-status-warning'
                    : 'bg-status-good-bg text-status-good'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    vehicle.status === 'delayed' ? 'bg-status-danger' : vehicle.status === 'stationary' ? 'bg-status-warning' : 'bg-status-good'
                  }`} />
                  {vehicle.status}
                </span>
              </div>

              <div className="border-t border-border-default pt-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Asset Classification:</span>
                  <span className="font-semibold text-text-primary">{vehicle.vehicle_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Load Limit:</span>
                  <span className="font-semibold text-text-primary font-numeric">{vehicle.capacity} Tonnes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Hourly Rate:</span>
                  <span className="font-semibold text-text-primary font-numeric">{formatCurrency(vehicle.hourly_operating_cost)}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Registered On:</span>
                  <span className="font-semibold text-text-primary font-numeric">{formatDateTime(vehicle.created_at).split(',')[0]}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Cards: Lifetime Metrics + Small Trend Graph */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lifetime Operational Summary HUD */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="panel-elevated bg-bg-surface p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Trips Logged</span>
              <span className="font-numeric text-2xl font-bold mt-2 text-text-primary">{stats.total_trips}</span>
            </div>

            <div className="panel-elevated bg-bg-surface p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Avg Turnaround</span>
              <span className="font-numeric text-2xl font-bold mt-2 text-text-primary">{formatMinutes(stats.avg_dwell_minutes)}</span>
            </div>

            <div className="panel-elevated bg-bg-surface p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Excess Delay</span>
              <span className="font-numeric text-2xl font-bold mt-2 text-text-primary">{formatMinutes(stats.total_excess_dwell_minutes)}</span>
            </div>

            {/* Lifetime Financial Loss (Saturated Money Accent) */}
            <div className="panel-elevated border-money-accent/10 bg-bg-surface p-4 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-money-accent">Loss Overhead</span>
              <span className="font-numeric text-xl font-bold mt-2 text-money-accent">{formatCurrency(stats.total_financial_loss)}</span>
            </div>
          </div>

          {/* Mini-Chart: Dwell Cost Trend (Section 8) */}
          <div className="panel-elevated bg-bg-surface p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-brand-400" />
              Excess Dwell Overhead Trend (Last 10 Visits)
            </h2>
            <div className="h-44 w-full">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-text-tertiary">
                  No historical visits recorded.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" stroke="#6B7280" fontSize={9} />
                    <YAxis stroke="#6B7280" fontSize={9} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1A1C21',
                        borderColor: 'rgba(255, 255, 255, 0.14)',
                        color: '#F4F5F7',
                        fontSize: 11
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      name="Excess Cost (KES)"
                      stroke="#FFB020"
                      fill="rgba(255, 176, 32, 0.15)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dwell Events Table */}
      <div className="panel-elevated bg-bg-surface p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4">
          Terminal Dwell History
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-default text-[10px] font-bold uppercase text-text-secondary tracking-wider">
                <th className="py-2.5">Arrival Date</th>
                <th className="py-2.5">Terminal / Facility</th>
                <th className="py-2.5">Location Type</th>
                <th className="py-2.5">Dwell Duration</th>
                <th className="py-2.5">Allowed Dwell</th>
                <th className="py-2.5">Excess Delay</th>
                <th className="py-2.5 text-right">Estimated Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default font-ui">
              {!dwells || dwells.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-tertiary">
                    No terminal log data available.
                  </td>
                </tr>
              ) : (
                dwells.map((d) => (
                  <tr key={d.id} className="hover:bg-bg-surface-raised/40 transition-colors">
                    <td className="py-3 font-numeric text-text-secondary">
                      {formatDateTime(d.arrival_time)}
                    </td>
                    <td className="py-3 font-semibold text-text-primary">
                      {d.location_name || 'In Transit'}
                    </td>
                    <td className="py-3 text-text-secondary capitalize">
                      {d.location_type?.replace('_', ' ') || 'N/A'}
                    </td>
                    <td className="py-3 font-numeric text-text-secondary">
                      {formatMinutes(d.dwell_minutes)}
                    </td>
                    <td className="py-3 font-numeric text-text-secondary">
                      {formatMinutes(d.expected_minutes)}
                    </td>
                    <td className="py-3">
                      {d.excess_minutes > 0 ? (
                        <span className="font-numeric font-bold text-status-danger">
                          +{formatMinutes(d.excess_minutes)}
                        </span>
                      ) : (
                        <span className="font-numeric text-status-good">0m</span>
                      )}
                    </td>
                    <td className="py-3 text-right font-numeric font-bold text-money-accent">
                      {d.estimated_cost > 0 ? formatCurrency(d.estimated_cost) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};



