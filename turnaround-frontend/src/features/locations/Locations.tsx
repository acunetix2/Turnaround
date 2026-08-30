import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes } from '../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Search, MapPin, Plus, Lock, Edit2, Trash2,
  Table as TableIcon, LayoutGrid, X,
  AlertTriangle, ArrowRight
} from 'lucide-react';
import type { Location } from '../../lib/api/types';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../components/ui/Toast';
import { LocationMapPicker, type LocationPreset } from './LocationMapPicker';

const locationSchema = zod.object({
  name: zod.string().min(2, 'Name must be at least 2 characters.').max(50, 'Name too long.'),
  location_type: zod.enum([
    'warehouse',
    'customer_facility',
    'depot',
    'port',
    'border_crossing',
    'loading_point',
    'unloading_point'
  ] as const),
  latitude: zod.number().min(-90).max(90),
  longitude: zod.number().min(-180).max(180),
  geofence_radius: zod.number().positive('Radius must be greater than 0.'),
  expected_dwell_minutes: zod.number().positive('Expected dwell must be positive.')
});

type LocationFormValues = zod.infer<typeof locationSchema>;

const LOCATION_TYPE_LABELS: Record<string, string> = {
  border_crossing: 'Border Crossing',
  port: 'Maritime Port',
  depot: 'Transit Depot',
  warehouse: 'Warehouse Hub',
  customer_facility: 'Customer Facility',
  loading_point: 'Loading Terminal',
  unloading_point: 'Unloading Terminal',
};

export const Locations: React.FC = () => {
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const { toast } = useToast();
  const canMutate = role === 'admin' || role === 'fleet_manager';

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [submitError, setSubmitError] = useState('');

  const { data: locations, isLoading: loadingLocs, isError: locsError, refetch } = useQuery({
    queryKey: ['locations'],
    queryFn: apiClient.getLocations
  });

  const { data: locationStats } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats
  });

  const createMutation = useMutation({
    mutationFn: apiClient.createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locationStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setShowAddModal(false);
      reset();
      toast({
        variant: 'success',
        title: 'Stop Added',
        message: 'New operating stop and target wait time configured.'
      });
    },
    onError: (err: any) => {
      setSubmitError(err?.message || 'Failed to register stop.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Location> }) => apiClient.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locationStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setEditingLocation(null);
      reset();
      toast({
        variant: 'success',
        title: 'Stop Updated',
        message: 'Stop details and target time updated.'
      });
    },
    onError: (err: any) => {
      setSubmitError(err?.message || 'Failed to update stop.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['locationStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast({
        variant: 'info',
        title: 'Stop Removed',
        message: 'Stop removed from active fleet monitoring.'
      });
    }
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      location_type: 'warehouse',
      geofence_radius: 500,
      expected_dwell_minutes: 60,
      latitude: -1.2921,
      longitude: 36.8219
    }
  });

  const formLat = watch('latitude') || -1.2921;
  const formLng = watch('longitude') || 36.8219;
  const formRadius = watch('geofence_radius') || 500;

  const handleSelectMapCoordinates = (lat: number, lng: number) => {
    setValue('latitude', lat, { shouldValidate: true, shouldDirty: true });
    setValue('longitude', lng, { shouldValidate: true, shouldDirty: true });
  };

  const handleSelectPreset = (preset: LocationPreset) => {
    setValue('name', preset.name, { shouldValidate: true, shouldDirty: true });
    setValue('location_type', preset.location_type as any, { shouldValidate: true, shouldDirty: true });
    setValue('latitude', preset.latitude, { shouldValidate: true, shouldDirty: true });
    setValue('longitude', preset.longitude, { shouldValidate: true, shouldDirty: true });
    setValue('geofence_radius', preset.geofence_radius, { shouldValidate: true, shouldDirty: true });
    setValue('expected_dwell_minutes', preset.expected_dwell_minutes, { shouldValidate: true, shouldDirty: true });
    toast({
      variant: 'info',
      title: 'Autofilled from Preset',
      message: `${preset.name} details applied.`
    });
  };

  const handleSelectSearchResult = (name: string, lat: number, lng: number) => {
    setValue('name', name, { shouldValidate: true, shouldDirty: true });
    setValue('latitude', lat, { shouldValidate: true, shouldDirty: true });
    setValue('longitude', lng, { shouldValidate: true, shouldDirty: true });
    toast({
      variant: 'info',
      title: 'Stop Autofilled',
      message: `${name} name and coordinates applied.`
    });
  };

  const handleOpenAdd = () => {
    setSubmitError('');
    reset({
      name: '',
      location_type: 'warehouse',
      geofence_radius: 500,
      expected_dwell_minutes: 60,
      latitude: -1.2921,
      longitude: 36.8219
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (loc: Location) => {
    setSubmitError('');
    setEditingLocation(loc);
    reset({
      name: loc.name,
      location_type: loc.location_type as any,
      geofence_radius: loc.geofence_radius,
      expected_dwell_minutes: loc.expected_dwell_minutes,
      latitude: loc.latitude,
      longitude: loc.longitude
    });
  };

  const onSubmitCreate = (data: LocationFormValues) => {
    setSubmitError('');
    createMutation.mutate(data);
  };

  const onSubmitEdit = (data: LocationFormValues) => {
    if (!editingLocation) return;
    setSubmitError('');
    updateMutation.mutate({ id: editingLocation.id, data });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete stop "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (loadingLocs) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-full bg-bg-surface-raised rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-bg-surface-raised rounded-xl" />
          ))}
        </div>
        <div className="h-96 w-full bg-bg-surface-raised rounded-xl" />
      </div>
    );
  }

  if (locsError || !locations) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-surface border border-border-default rounded-xl">
        <MapPin size={36} className="text-status-danger" />
        <h2 className="text-sm font-bold text-text-primary mt-3">Failed to load corridor locations</h2>
        <p className="text-xs text-text-secondary mt-1">Unable to connect to the geofence registry service.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-lg bg-brand-500 hover:bg-brand-400 px-4 py-2 text-xs font-semibold text-white shadow transition-colors cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const locationList = locations || [];
  const filteredLocations = locationList.filter((loc) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (loc?.name || '').toLowerCase().includes(term) || (loc?.location_type || '').toLowerCase().includes(term);
    const matchesType = typeFilter === 'all' || loc.location_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalLocs = locationList.length;
  const avgSla = Math.round(locationList.reduce((acc, l) => acc + (l.expected_dwell_minutes || 0), 0) / (totalLocs || 1));
  const totalFinancialLoss = (locationStats || []).reduce((acc, s) => acc + (s.financial_impact || 0), 0);
  const highDelayLocs = (locationStats || []).filter((s) => (s.avg_excess_delay_minutes || 0) > 45).length;

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">Corridor Geofences & Dwell SLAs</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure terminal geofence perimeters, monitor SLA benchmarks, and identify facility bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-bg-surface border border-border-default rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-brand-500 text-white' : 'text-text-tertiary hover:text-text-primary'
              }`}
              title="Table view"
            >
              <TableIcon size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-brand-500 text-white' : 'text-text-tertiary hover:text-text-primary'
              }`}
              title="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          {canMutate ? (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-400 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus size={14} />
              Register Geofence
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary bg-bg-surface-raised border border-border-default px-3 py-2 rounded-lg">
              <Lock size={12} />
              <span>Read-only</span>
            </div>
          )}
        </div>
      </div>

      {/* ── SUMMARY KPIS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-secondary">Monitored Facilities</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-numeric text-2xl font-bold text-text-primary">{totalLocs}</span>
            <span className="text-[11px] text-text-tertiary">geofenced hubs</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-text-secondary">Corridor SLA Average</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-numeric text-2xl font-bold text-text-primary">{formatMinutes(avgSla)}</span>
            <span className="text-[11px] text-text-tertiary">standard baseline</span>
          </div>
        </div>

        <div className={`rounded-xl border p-4 shadow-sm ${
          highDelayLocs > 0 ? 'bg-status-danger-bg/40 border-status-danger/40' : 'bg-bg-surface border-border-default'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">Critical Congestion Hubs</span>
            {highDelayLocs > 0 && <AlertTriangle size={13} className="text-status-danger" />}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-numeric text-2xl font-bold ${highDelayLocs > 0 ? 'text-status-danger' : 'text-text-primary'}`}>
              {highDelayLocs}
            </span>
            <span className="text-[11px] text-text-tertiary">excess &gt; 45m</span>
          </div>
        </div>

        <div className="rounded-xl border border-money-accent/25 bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-medium text-money-accent">Period Bottleneck Waste</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-numeric text-2xl font-bold text-money-accent">{formatCurrency(totalFinancialLoss)}</span>
          </div>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-bg-surface p-3.5 rounded-xl border border-border-default shadow-sm">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by facility name or corridor classification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-9 pr-3.5 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-500 focus:outline-none transition-colors font-numeric"
          />
        </div>

        <div className="w-full md:w-56">
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'All Facility Types' },
              { value: 'border_crossing', label: 'Border Crossings' },
              { value: 'port', label: 'Maritime Ports' },
              { value: 'depot', label: 'Transit Depots' },
              { value: 'warehouse', label: 'Warehouses' },
              { value: 'customer_facility', label: 'Customer Facilities' },
            ]}
          />
        </div>
      </div>

      {/* ── TABLE OR GRID ── */}
      {viewMode === 'table' ? (
        <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-dense">
              <thead>
                <tr className="bg-bg-surface-raised/50">
                  <th>Facility Hub</th>
                  <th>Classification</th>
                  <th>Geofence Radius</th>
                  <th>SLA Benchmark</th>
                  <th>Recorded Visits</th>
                  <th className="text-right">Avg Excess Delay</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-text-tertiary">
                      No locations found matching current filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((loc) => {
                    const stats = locationStats?.find((s) => s.location_id === loc.id);
                    const excess = stats?.avg_excess_delay_minutes || 0;
                    const visits = stats?.total_visits || 0;

                    return (
                      <tr key={loc.id} className="hover:bg-bg-surface-raised/30 transition-colors">
                        <td>
                          <Link
                            to={`/locations/${loc.id}`}
                            className="font-bold text-xs text-text-primary hover:text-brand-400 transition-colors flex items-center gap-2"
                          >
                            <MapPin size={13} className="text-brand-400 shrink-0" />
                            {loc.name}
                          </Link>
                        </td>
                        <td className="text-xs text-text-secondary">
                          {LOCATION_TYPE_LABELS[loc.location_type] || loc.location_type}
                        </td>
                        <td className="font-numeric text-xs text-text-primary">{loc.geofence_radius}m</td>
                        <td className="font-numeric text-xs font-semibold text-text-primary">
                          {formatMinutes(loc.expected_dwell_minutes)}
                        </td>
                        <td className="font-numeric text-xs text-text-secondary">{visits} visits</td>
                        <td className="text-right font-numeric text-xs font-bold">
                          {excess > 0 ? (
                            <span className={excess > 45 ? 'text-status-danger' : 'text-status-warning'}>
                              +{formatMinutes(excess)}
                            </span>
                          ) : (
                            <span className="text-status-good">On Time</span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/locations/${loc.id}`}
                              className="px-2.5 py-1 rounded bg-bg-surface-raised hover:bg-white/5 border border-border-default text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                            >
                              Inspect
                            </Link>
                            {canMutate && (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(loc)}
                                  className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised transition-colors cursor-pointer"
                                  title="Edit geofence"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDelete(loc.id, loc.name)}
                                  className="p-1 rounded text-text-tertiary hover:text-status-danger hover:bg-status-danger-bg transition-colors cursor-pointer"
                                  title="Delete geofence"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((loc) => {
            const stats = locationStats?.find((s) => s.location_id === loc.id);
            const excess = stats?.avg_excess_delay_minutes || 0;

            return (
              <div key={loc.id} className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
                      <MapPin size={14} />
                    </div>
                    <div>
                      <Link
                        to={`/locations/${loc.id}`}
                        className="text-xs font-bold text-text-primary hover:text-brand-400 transition-colors block"
                      >
                        {loc.name}
                      </Link>
                      <span className="text-[11px] text-text-tertiary">
                        {LOCATION_TYPE_LABELS[loc.location_type] || loc.location_type}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border font-numeric ${
                    excess > 45 ? 'bg-status-danger-bg text-status-danger border-status-danger/30' : 'bg-status-good-bg text-status-good border-status-good/30'
                  }`}>
                    {excess > 0 ? `+${formatMinutes(excess)}` : 'On Time'}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border-default text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">SLA Benchmark:</span>
                    <span className="font-numeric text-text-primary font-semibold">{formatMinutes(loc.expected_dwell_minutes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">Geofence Perimeter:</span>
                    <span className="font-numeric text-text-primary font-semibold">{loc.geofence_radius}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">GPS Coordinates:</span>
                    <span className="font-numeric text-text-secondary text-[11px]">
                      {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-default flex items-center justify-between">
                  <Link
                    to={`/locations/${loc.id}`}
                    className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
                  >
                    View Analytics <ArrowRight size={12} />
                  </Link>

                  {canMutate && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(loc)}
                        className="p-1 rounded text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(loc.id, loc.name)}
                        className="p-1 rounded text-text-tertiary hover:text-status-danger transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL REGISTER / EDIT WITH INTERACTIVE MAP PICKER ── */}
      {(showAddModal || editingLocation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-bg-surface border border-border-strong p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {editingLocation ? 'Edit Stop / Geofence' : 'Add New Stop / Geofence'}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Pick location on map, search by address, or choose a preset terminal
                </p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setEditingLocation(null); }}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-status-danger-bg border border-status-danger/30 text-xs text-status-danger">
                {submitError}
              </div>
            )}

            {/* Interactive Map Picker & Presets */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-text-secondary">
                Location on Map & Preset Hubs
              </label>
              <LocationMapPicker
                latitude={formLat}
                longitude={formLng}
                geofenceRadius={formRadius}
                onSelectCoordinates={handleSelectMapCoordinates}
                onSelectPreset={handleSelectPreset}
                onSelectSearchResult={handleSelectSearchResult}
              />
            </div>

            <form onSubmit={handleSubmit(editingLocation ? onSubmitEdit : onSubmitCreate)} className="space-y-3.5 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Stop / Facility Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Mombasa Port Terminal 2"
                    {...register('name')}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
                  />
                  {errors.name && <p className="text-[11px] text-status-danger mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Facility Type</label>
                  <select
                    {...register('location_type')}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:border-brand-500 focus:outline-none cursor-pointer"
                  >
                    <option value="warehouse">Warehouse Hub</option>
                    <option value="depot">Transit Depot</option>
                    <option value="port">Maritime Port</option>
                    <option value="border_crossing">Border Crossing</option>
                    <option value="loading_point">Loading Point</option>
                    <option value="unloading_point">Unloading Point</option>
                    <option value="customer_facility">Customer Facility</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.00001"
                    {...register('latitude', { valueAsNumber: true })}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                  />
                  {errors.latitude && <p className="text-[11px] text-status-danger mt-1">{errors.latitude.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.00001"
                    {...register('longitude', { valueAsNumber: true })}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                  />
                  {errors.longitude && <p className="text-[11px] text-status-danger mt-1">{errors.longitude.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Geofence (Meters)</label>
                  <input
                    type="number"
                    step="50"
                    min="50"
                    max="5000"
                    {...register('geofence_radius', { valueAsNumber: true })}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                  />
                  {errors.geofence_radius && <p className="text-[11px] text-status-danger mt-1">{errors.geofence_radius.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Target Wait (Mins)</label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    {...register('expected_dwell_minutes', { valueAsNumber: true })}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary font-numeric focus:border-brand-500 focus:outline-none"
                  />
                  {errors.expected_dwell_minutes && <p className="text-[11px] text-status-danger mt-1">{errors.expected_dwell_minutes.message}</p>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingLocation(null); }}
                  className="px-4 py-2 rounded-lg border border-border-default text-xs font-semibold text-text-secondary hover:bg-bg-surface-raised transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingLocation ? 'Update Stop' : 'Save Stop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
