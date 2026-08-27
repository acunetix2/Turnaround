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
  Search,
  Filter,
  Plus,
  ArrowRight,
  Lock,
  Truck,
  Trash2
} from 'lucide-react';
import type { Vehicle } from '../../lib/api/types';
import { Select } from '../../components/ui/Select';

// Zod Validation Schema for creating a vehicle
const vehicleSchema = zod.object({
  registration_number: zod.string().min(3, 'Registration must be at least 3 characters.').max(10, 'Registration too long.'),
  vehicle_type: zod.string().min(2, 'Enter a valid vehicle classification.'),
  capacity: zod.coerce.number().positive('Capacity must be greater than 0.'),
  hourly_operating_cost: zod.coerce.number().positive('Cost must be positive.'),
  status: zod.enum(['moving', 'stationary', 'delayed'] as const)
});

type VehicleFormValues = zod.infer<typeof vehicleSchema>;

export const Vehicles: React.FC = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  
  // Gated action: only admin and fleet_manager can mutate
  const canMutate = role === 'admin' || role === 'fleet_manager';

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch vehicles
  const { data: vehicles, isLoading, isError, refetch } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiClient.getVehicles
  });

  // Mutate create vehicle
  const createMutation = useMutation({
    mutationFn: apiClient.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowAddModal(false);
      reset();
    },
    onError: (err: any) => {
      setSubmitError(err?.message || 'Failed to register asset.');
    }
  });

  // Mutate delete vehicle
  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    }
  });

  // Form Setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      status: 'stationary'
    }
  });

  const onSubmit = (data: VehicleFormValues) => {
    setSubmitError('');
    createMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to decommission this vehicle?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-full bg-bg-surface-raised rounded-lg"></div>
        <div className="h-64 w-full bg-bg-surface-raised rounded-lg"></div>
      </div>
    );
  }

  if (isError || !vehicles) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-surface border border-border-default rounded-xl">
        <Truck size={36} className="text-status-danger" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary mt-2">Failed to load fleet assets</h2>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded bg-brand-500 hover:bg-brand-400 px-4 py-2 text-xs font-semibold text-white shadow"
        >
          Retry
        </button>
      </div>
    );
  }

  // Filter logic
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch = v.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.current_location_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* HUD Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-ui text-xl font-bold text-text-primary">Fleet Vehicles</h1>
          <p className="text-xs text-text-secondary mt-1">
            Register and monitor active transport assets and their operating hourly rates.
          </p>
        </div>
        
        {canMutate ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-1.5 rounded bg-brand-500 hover:bg-brand-400 px-3.5 py-2 text-xs font-bold text-white shadow transition-colors cursor-pointer"
          >
            <Plus size={14} />
            Register Asset
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-text-tertiary bg-bg-surface-raised border border-border-default px-3 py-2 rounded">
            <Lock size={12} />
            <span>Read-Only Privileges</span>
          </div>
        )}
      </div>

      {/* Filters HUD */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-bg-surface p-4 rounded-xl border border-border-default">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-3.5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by registration number, type, or terminal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-surface-raised border border-border-default rounded px-3 py-2 pl-9 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Status Dropdown */}
        <div className="w-56">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'moving', label: 'On Transit (Moving)' },
              { value: 'stationary', label: 'Stationary' },
              { value: 'delayed', label: 'Delayed (Excess Dwell)' },
            ]}
          />
        </div>
      </div>

      {/* Vehicles Table (High Row Density, Samsara Style) */}
      <div className="panel-elevated bg-bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-default text-[10px] font-bold uppercase text-text-secondary tracking-wider bg-bg-surface-raised">
                <th className="py-3 px-4">Registration</th>
                <th className="py-3 px-4">Vehicle Type</th>
                <th className="py-3 px-4">Capacity (Tonnes)</th>
                <th className="py-3 px-4">Hourly Cost</th>
                <th className="py-3 px-4">Current Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-xs font-ui">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-tertiary">
                    No active assets match the filter requirements.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vh) => (
                  <tr key={vh.id} className="hover:bg-bg-surface-raised/40 transition-colors">
                    <td className="py-2.5 px-4 font-numeric font-bold text-brand-400">
                      <Link to={`/vehicles/${vh.id}`} className="hover:underline">
                        {vh.registration_number}
                      </Link>
                    </td>
                    <td className="py-2.5 px-4 text-text-primary">{vh.vehicle_type}</td>
                    <td className="py-2.5 px-4 font-numeric text-text-secondary">{vh.capacity}T</td>
                    <td className="py-2.5 px-4 font-numeric text-text-secondary">{formatCurrency(vh.hourly_operating_cost)}/hr</td>
                    <td className="py-2.5 px-4 text-text-secondary">{vh.current_location_name || 'N/A'}</td>
                    <td className="py-2.5 px-4">
                      {/* Badge styling following Samsara dot labels Section 7 */}
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        vh.status === 'delayed'
                          ? 'bg-status-danger-bg text-status-danger'
                          : vh.status === 'stationary'
                          ? 'bg-status-warning-bg text-status-warning'
                          : 'bg-status-good-bg text-status-good'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          vh.status === 'delayed' ? 'bg-status-danger' : vh.status === 'stationary' ? 'bg-status-warning' : 'bg-status-good'
                        }`} />
                        {vh.status === 'delayed' ? 'Delayed' : vh.status === 'stationary' ? 'Stationary' : 'Moving'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to={`/vehicles/${vh.id}`}
                          className="p-1 rounded hover:bg-bg-surface text-text-secondary hover:text-text-primary"
                        >
                          <ArrowRight size={14} />
                        </Link>
                        {canMutate && (
                          <button
                            onClick={() => handleDelete(vh.id)}
                            className="p-1 rounded hover:bg-bg-surface text-text-secondary hover:text-status-danger transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vehicle Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 px-4">
          <div className="panel-elevated w-full max-w-md bg-bg-surface-raised p-6">
            <h2 className="text-base font-bold uppercase tracking-wider text-text-primary mb-4 flex items-center gap-2">
              <Truck size={16} className="text-brand-400" />
              Register New Fleet Asset
            </h2>

            {submitError && (
              <div className="mb-4 rounded bg-status-danger-bg border border-status-danger/20 p-3 text-xs text-status-danger">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Registration Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. KDA 123X"
                  {...register('registration_number')}
                  className="mt-1.5 w-full rounded border border-border-default bg-bg-surface px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
                {errors.registration_number && (
                  <p className="text-[10px] text-status-danger mt-1">{errors.registration_number.message}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  Vehicle Type / Classification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Semi-Trailer (28T)"
                  {...register('vehicle_type')}
                  className="mt-1.5 w-full rounded border border-border-default bg-bg-surface px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                />
                {errors.vehicle_type && (
                  <p className="text-[10px] text-status-danger mt-1">{errors.vehicle_type.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Capacity (Tonnes)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="28"
                    {...register('capacity')}
                    className="mt-1.5 w-full rounded border border-border-default bg-bg-surface px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                  {errors.capacity && (
                    <p className="text-[10px] text-status-danger mt-1">{errors.capacity.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Hourly Rate (KES)
                  </label>
                  <input
                    type="number"
                    placeholder="7500"
                    {...register('hourly_operating_cost')}
                    className="mt-1.5 w-full rounded border border-border-default bg-bg-surface px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                  {errors.hourly_operating_cost && (
                    <p className="text-[10px] text-status-danger mt-1">{errors.hourly_operating_cost.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Select
                  label="Initial Status"
                  value={watch('status') || 'stationary'}
                  onChange={(val) => setValue('status', val as any, { shouldValidate: true })}
                  options={[
                    { value: 'stationary', label: 'Stationary' },
                    { value: 'moving', label: 'Moving' },
                    { value: 'delayed', label: 'Delayed' },
                  ]}
                />
                {errors.status && (
                  <p className="text-[10px] text-status-danger mt-1">{errors.status.message}</p>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-border-default pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-canvas transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded bg-brand-500 px-4.5 py-1.5 text-xs font-bold text-white shadow hover:bg-brand-400 transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Registering...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};



