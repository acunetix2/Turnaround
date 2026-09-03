import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api/client'
import { formatCurrency, formatMinutes } from '../../lib/format'
import { useAuth } from '../../auth/AuthProvider'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import {
  Search,
  MapPin,
  Plus,
  Lock,
  Edit2,
  Trash2,
  Table as TableIcon,
  LayoutGrid,
  X,
  AlertTriangle,
  ArrowRight,
  Clock,
  Building2,
  DollarSign,
  AlertCircle,
} from 'lucide-react'
import type { Location } from '../../lib/api/types'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../components/ui/Toast'
import { LoadingStatus } from '../../components/common/Loader'
import { Button } from '../../components/ui/Button'
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert'
import { EmptyStatePresentational } from '../../components/ui/EmptyStatePresentational'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table'
import {
  MetricCard,
  MetricCardHeader,
  MetricCardLabel,
  MetricCardContent,
  MetricCardValue,
  MetricCardDifferential,
  MetricCardSparkline,
} from '../../components/ui/MetricCard'
import { LocationMapPicker, type LocationPreset } from './LocationMapPicker'

const locationSchema = zod.object({
  name: zod.string().min(2, 'Name must be at least 2 characters.').max(50, 'Name too long.'),
  location_type: zod.enum([
    'warehouse',
    'customer_facility',
    'depot',
    'port',
    'border_crossing',
    'loading_point',
    'unloading_point',
  ] as const),
  latitude: zod.number().min(-90).max(90),
  longitude: zod.number().min(-180).max(180),
  geofence_radius: zod.number().positive('Radius must be greater than 0.'),
  expected_dwell_minutes: zod.number().positive('Expected dwell must be positive.'),
})

type LocationFormValues = zod.infer<typeof locationSchema>

const LOCATION_TYPE_LABELS: Record<string, string> = {
  border_crossing: 'Border Crossing',
  port: 'Maritime Port',
  depot: 'Transit Depot',
  warehouse: 'Warehouse Hub',
  customer_facility: 'Customer Facility',
  loading_point: 'Loading Terminal',
  unloading_point: 'Unloading Terminal',
}

const LOCATION_TYPE_BADGES: Record<string, string> = {
  border_crossing: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  port: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  depot: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warehouse: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  customer_facility: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  loading_point: 'bg-[#ED642B]/10 text-[#ED642B] border-[#ED642B]/20',
  unloading_point: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

export const Locations: React.FC = () => {
  const queryClient = useQueryClient()
  const { role } = useAuth()
  const { toast } = useToast()
  const canMutate = role === 'admin' || role === 'fleet_manager'

  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [stationDetailTab, setStationDetailTab] = useState<'overview' | 'capacity' | 'operations' | 'performance' | 'contacts'>('overview')
  const [submitError, setSubmitError] = useState('')

  const { data: locations, isLoading: loadingLocs, isError: locsError, refetch } = useQuery({
    queryKey: ['locations'],
    queryFn: apiClient.getLocations,
  })

  const { data: locationStats } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats,
  })

  const createMutation = useMutation({
    mutationFn: apiClient.createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['locationStats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      setShowAddModal(false)
      reset()
      toast({
        variant: 'success',
        title: 'Stop Added',
        message: 'New operating stop and target wait time configured.',
      })
    },
    onError: (err: any) => {
      setSubmitError(err?.message || 'Failed to register stop.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Location> }) =>
      apiClient.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['locationStats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      setEditingLocation(null)
      reset()
      toast({
        variant: 'success',
        title: 'Stop Updated',
        message: 'Geofence boundaries and expected dwell updated.',
      })
    },
    onError: (err: any) => {
      setSubmitError(err?.message || 'Failed to update stop.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: apiClient.deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['locationStats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      toast({
        variant: 'info',
        title: 'Stop Deleted',
        message: 'Geofence removed from corridor monitoring.',
      })
    },
    onError: (err: any) => {
      toast({
        variant: 'error',
        title: 'Delete Failed',
        message: err?.message || 'Cannot delete stop with recorded dwell histories.',
      })
    },
  })

  const {
    register: regAdd,
    handleSubmit: handleAddSubmit,
    reset,
    setValue: setAddValue,
    watch: watchAdd,
    formState: { errors: errorsAdd, isSubmitting: isAdding },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      location_type: 'warehouse',
      geofence_radius: 500,
      expected_dwell_minutes: 60,
      latitude: -1.2921,
      longitude: 36.8219,
    },
  })

  const latAdd = watchAdd('latitude')
  const lngAdd = watchAdd('longitude')
  const radAdd = watchAdd('geofence_radius')

  const handleApplyPreset = (p: LocationPreset) => {
    setAddValue('name', p.name, { shouldValidate: true })
    setAddValue('location_type', p.location_type, { shouldValidate: true })
    setAddValue('latitude', p.latitude, { shouldValidate: true })
    setAddValue('longitude', p.longitude, { shouldValidate: true })
    setAddValue('geofence_radius', p.geofence_radius, { shouldValidate: true })
    setAddValue('expected_dwell_minutes', p.expected_dwell_minutes, { shouldValidate: true })
    toast({
      variant: 'info',
      title: 'Preset Applied',
      message: `${p.name} coordinates and benchmark applied.`,
    })
  }

  const handleOpenAdd = () => {
    setSubmitError('')
    reset({
      name: '',
      location_type: 'warehouse',
      geofence_radius: 500,
      expected_dwell_minutes: 60,
      latitude: -1.2921,
      longitude: 36.8219,
    })
    setShowAddModal(true)
  }

  const handleOpenEdit = (loc: Location) => {
    setSubmitError('')
    setEditingLocation(loc)
    reset({
      name: loc.name,
      location_type: loc.location_type as any,
      geofence_radius: loc.geofence_radius,
      expected_dwell_minutes: loc.expected_dwell_minutes,
      latitude: loc.latitude,
      longitude: loc.longitude,
    })
  }

  const onSubmitCreate = (data: LocationFormValues) => {
    setSubmitError('')
    createMutation.mutate(data)
  }

  const onSubmitEdit = (data: LocationFormValues) => {
    if (!editingLocation) return
    setSubmitError('')
    updateMutation.mutate({ id: editingLocation.id, data })
  }

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete stop "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  if (loadingLocs) {
    return (
      <div className="space-y-4">
        <LoadingStatus messages={['Please wait while we load your facilities', 'Checking geofence coverage', 'Almost there', 'Preparing location overview']} centered />
        <div className="space-y-4 animate-pulse">
        <div className="h-10 w-full bg-bg-surface-raised rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-bg-surface-raised rounded-2xl" />
          ))}
        </div>
        <div className="h-96 w-full bg-bg-surface-raised rounded-2xl" />
        </div>
      </div>
    )
  }

  if (locsError || !locations) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-bg-surface border border-border-default rounded-2xl">
        <MapPin size={36} className="text-status-danger" />
        <h2 className="text-sm font-bold text-text-primary mt-3">Failed to load corridor locations</h2>
        <p className="text-xs text-text-secondary mt-1">Unable to connect to the geofence registry service.</p>
        <Button variant="primary" size="small" className="mt-4" onClick={() => refetch()}>
          Retry Connection
        </Button>
      </div>
    )
  }

  const locationList = locations || []
  const filteredLocations = locationList.filter((loc) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      (loc?.name || '').toLowerCase().includes(term) ||
      (loc?.location_type || '').toLowerCase().includes(term)
    const matchesType = typeFilter === 'all' || loc.location_type === typeFilter
    return matchesSearch && matchesType
  })

  const totalLocs = locationList.length
  const avgSla = Math.round(
    locationList.reduce((acc, l) => acc + (l.expected_dwell_minutes || 0), 0) / (totalLocs || 1)
  )
  const highDelayLocs = (locationStats || []).filter(
    (s) => (s.avg_excess_delay_minutes || 0) > 45
  ).length
  const selectedLocation = filteredLocations.find(location => location.id === selectedLocationId) || filteredLocations[0]

  return (
    <div className="space-y-5 max-w-7xl">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Freight Stations</h1>
          <p className="text-sm text-text-secondary mt-1">Manage freight stations, terminals and transfer hubs across your network</p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-bg-surface border border-border-default rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#ED642B] text-white shadow-xs'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
              title="Table view"
            >
              <TableIcon size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#ED642B] text-white shadow-xs'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
              title="Grid view"
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          {canMutate ? (
            <Button
              variant="primary"
              size="small"
              icon={<Plus size={14} />}
              onClick={handleOpenAdd}
            >
              Add Freight Station
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-text-tertiary bg-bg-surface-raised border border-border-default px-3 py-1.5 rounded-xl">
              <Lock size={12} />
              <span>Read-only</span>
            </div>
          )}
        </div>
      </div>

      {/* ── SUMMARY KPIS (SUPABASE METRIC CARDS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard>
          <MetricCardHeader href="/locations">
            <MetricCardLabel
              tooltip="Total geofenced terminals, border points, and client facilities"
              icon={<Building2 size={13} className="text-[#250C77]" />}
            >
              Total Stations
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{totalLocs}</MetricCardValue>
            <MetricCardDifferential variant="positive">
              {totalLocs} monitored
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={Array.from({ length: 8 }, (_, i) => ({ value: 12 + i * 2 }))}
            color="#250C77"
          />
        </MetricCard>

        <MetricCard>
          <MetricCardHeader href="/locations">
            <MetricCardLabel
              tooltip="Standard target turnaround duration across corridor network"
              icon={<Clock size={13} className="text-[#ED642B]" />}
            >
              Active Stations
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{formatMinutes(avgSla)}</MetricCardValue>
            <MetricCardDifferential variant="positive">
              {totalLocs} operational
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={Array.from({ length: 8 }, (_, i) => ({ value: 90 - i * 3 }))}
            color="#ED642B"
          />
        </MetricCard>

        <MetricCard>
          <MetricCardHeader href="/insights">
            <MetricCardLabel
              tooltip="Hubs where historical vehicle dwell exceeds SLA by >45 minutes"
              icon={<AlertTriangle size={13} className={highDelayLocs > 0 ? 'text-red-500' : 'text-emerald-500'} />}
            >
              Total Capacity
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className={highDelayLocs > 0 ? 'text-red-500' : ''}>
              —
            </MetricCardValue>
            <MetricCardDifferential variant={highDelayLocs > 0 ? 'negative' : 'positive'}>
              Not configured
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={Array.from({ length: 8 }, (_, i) => ({ value: highDelayLocs > 0 ? 4 + i * 2 : 0 }))}
            color="#EF4444"
          />
        </MetricCard>

        <MetricCard>
          <MetricCardHeader href="/analytics">
            <MetricCardLabel
              tooltip="Cumulative financial capital leaked due to excess turnaround delays at stops"
              icon={<DollarSign size={13} className="text-amber-500" />}
            >
              Utilization Rate
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className="text-amber-500">
              {totalLocs ? `${Math.max(0, Math.round((1 - highDelayLocs / totalLocs) * 1000) / 10)}%` : '—'}
            </MetricCardValue>
            <MetricCardDifferential variant="negative">
              SLA performance
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={Array.from({ length: 8 }, (_, i) => ({ value: 100000 + i * 25000 }))}
            color="#F59E0B"
          />
        </MetricCard>
        <MetricCard><MetricCardHeader><MetricCardLabel icon={<Clock size={13} className="text-status-good" />}>Avg Dwell Time</MetricCardLabel></MetricCardHeader><MetricCardContent><MetricCardValue>{formatMinutes(avgSla)}</MetricCardValue><MetricCardDifferential variant="positive">station benchmark</MetricCardDifferential></MetricCardContent></MetricCard>
        <MetricCard><MetricCardHeader><MetricCardLabel icon={<DollarSign size={13} className="text-[#ED642B]" />}>Monthly Revenue</MetricCardLabel></MetricCardHeader><MetricCardContent><MetricCardValue>—</MetricCardValue><MetricCardDifferential variant="neutral">Not tracked</MetricCardDifferential></MetricCardContent></MetricCard>
      </div>

      {/* ── DIAGNOSTIC ALERT ── */}
      {highDelayLocs > 0 && (
        <Alert variant="warning" className="border-amber-500/30 bg-amber-500/5">
          <AlertCircle size={16} className="text-amber-500 shrink-0" />
          <div>
            <AlertTitle className="text-amber-500 font-semibold">
              {highDelayLocs} Facility Hotspots Exceeding Turnaround Benchmarks
            </AlertTitle>
            <AlertDescription className="text-text-secondary text-xs">
              Border crossings and maritime terminals in the Northern Corridor are generating excess dwell times.
              Review SLA target thresholds or dispatch gate priority authorizations.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* ── FILTERS & SEARCH ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search facility name or classification..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-bg-surface border border-border-default rounded-xl pl-9 pr-3.5 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none transition-colors"
          />
        </div>

        <div className="w-full sm:w-60">
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'All Facility Types' },
              { value: 'border_crossing', label: 'Border Crossings' },
              { value: 'port', label: 'Maritime Ports' },
              { value: 'depot', label: 'Transit Depots' },
              { value: 'warehouse', label: 'Warehouse Hubs' },
              { value: 'customer_facility', label: 'Customer Facilities' },
            ]}
          />
        </div>
      </div>

      {/* ── TABLE OR GRID VIEW ── */}
      {viewMode === 'table' ? (
        <div className="grid grid-cols-1 gap-4 items-start">
        <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Facility Hub</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Geofence Radius</TableHead>
                <TableHead>SLA Benchmark</TableHead>
                <TableHead>Recorded Visits</TableHead>
                <TableHead className="text-right">Avg Excess Dwell</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <EmptyStatePresentational
                      icon={MapPin}
                      title="No geofence stops match your filter"
                      description="Try changing your search query or reset facility classification filters."
                    >
                      {canMutate && (
                        <Button
                          size="tiny"
                          variant="primary"
                          icon={<Plus size={13} />}
                          onClick={handleOpenAdd}
                        >
                          Register Geofence
                        </Button>
                      )}
                    </EmptyStatePresentational>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLocations.map((loc) => {
                  const stats = locationStats?.find((s) => s.location_id === loc.id)
                  const excess = stats?.avg_excess_delay_minutes || 0
                  const visits = stats?.total_visits || 0

                  return (
                    <TableRow key={loc.id} onClick={() => setSelectedLocationId(loc.id)} className={`hover:bg-bg-surface-raised/40 transition-colors cursor-pointer ${selectedLocation?.id === loc.id ? 'bg-[#250C77]/10' : ''}`}>
                      <TableCell className="pl-4 font-semibold text-text-primary">
                        <Link
                          to={`/locations/${loc.id}`}
                          className="hover:text-[#ED642B] transition-colors flex items-center gap-2"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#250C77]/10 text-[#250C77] shrink-0">
                            <MapPin size={13} />
                          </div>
                          <span>{loc.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                            LOCATION_TYPE_BADGES[loc.location_type] ||
                            'bg-bg-surface-raised text-text-secondary border-border-default'
                          }`}
                        >
                          {LOCATION_TYPE_LABELS[loc.location_type] || loc.location_type}
                        </span>
                      </TableCell>
                      <TableCell className="font-numeric text-xs text-text-secondary">
                        {loc.geofence_radius}m
                      </TableCell>
                      <TableCell className="font-numeric text-xs font-semibold text-text-primary">
                        {formatMinutes(loc.expected_dwell_minutes)}
                      </TableCell>
                      <TableCell className="font-numeric text-xs text-text-secondary">
                        {visits.toLocaleString()} visits
                      </TableCell>
                      <TableCell className="text-right font-numeric text-xs font-bold">
                        {excess > 0 ? (
                          <span className={excess > 45 ? 'text-status-danger' : 'text-status-warning'}>
                            +{formatMinutes(excess)}
                          </span>
                        ) : (
                          <span className="text-status-good">Within SLA</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link to={`/locations/${loc.id}`}>
                            <Button size="tiny" variant="outline">
                              Inspect
                            </Button>
                          </Link>
                          {canMutate && (
                            <>
                              <Button
                                size="tiny"
                                variant="ghost"
                                onClick={() => handleOpenEdit(loc)}
                                title="Edit geofence"
                              >
                                <Edit2 size={12} />
                              </Button>
                              <Button
                                size="tiny"
                                variant="ghost"
                                onClick={() => handleDelete(loc.id, loc.name)}
                                title="Delete geofence"
                                className="text-text-tertiary hover:text-red-500"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
        {selectedLocation && <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
          <div className="px-4 py-4 border-b border-border-default flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-sm font-bold text-text-primary">{selectedLocation.name}</h2><span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">Monitored</span></div><p className="text-[11px] text-text-secondary mt-1">{LOCATION_TYPE_LABELS[selectedLocation.location_type] || selectedLocation.location_type} · {selectedLocation.id.slice(0, 8).toUpperCase()}</p></div><Link to={`/locations/${selectedLocation.id}`}><Button size="tiny" variant="outline" icon={<Edit2 size={11} />}>Edit Station</Button></Link></div>
          <div className="flex items-center gap-5 border-b border-border-default px-4 py-3 text-[11px] text-text-secondary">{(['overview', 'capacity', 'operations', 'performance', 'contacts'] as const).map(tab => <button key={tab} onClick={() => setStationDetailTab(tab)} className={`relative pb-1 capitalize cursor-pointer ${stationDetailTab === tab ? 'font-semibold text-[#ED642B]' : 'hover:text-text-primary'}`}>{tab}{stationDetailTab === tab && <span className="absolute inset-x-0 -bottom-3 h-0.5 bg-[#ED642B]" />}</button>)}</div>
          {stationDetailTab !== 'overview' && <div className="p-4"><div className="rounded-xl border border-border-default bg-bg-surface-raised/40 p-4"><h3 className="text-xs font-bold capitalize text-text-primary">{stationDetailTab}</h3>{stationDetailTab === 'capacity' && <div className="grid grid-cols-2 gap-3 mt-3 text-[11px]"><div><p className="text-text-tertiary">Configured capacity</p><p className="mt-1 font-semibold text-text-primary">Not configured</p></div><div><p className="text-text-tertiary">Geofence coverage</p><p className="mt-1 font-semibold text-text-primary">{selectedLocation.geofence_radius} metres</p></div></div>}{stationDetailTab === 'operations' && <div className="grid grid-cols-2 gap-3 mt-3 text-[11px]"><div><p className="text-text-tertiary">Expected dwell</p><p className="mt-1 font-semibold text-text-primary">{formatMinutes(selectedLocation.expected_dwell_minutes)}</p></div><div><p className="text-text-tertiary">Operating status</p><p className="mt-1 font-semibold text-status-good">Monitored</p></div></div>}{stationDetailTab === 'performance' && <div className="grid grid-cols-2 gap-3 mt-3 text-[11px]"><div><p className="text-text-tertiary">Recorded visits</p><p className="mt-1 font-semibold text-text-primary">{locationStats?.find(stat => stat.location_id === selectedLocation.id)?.total_visits || 0}</p></div><div><p className="text-text-tertiary">Financial impact</p><p className="mt-1 font-semibold text-[#ED642B]">{formatCurrency(locationStats?.find(stat => stat.location_id === selectedLocation.id)?.financial_impact || 0)}</p></div></div>}{stationDetailTab === 'contacts' && <div className="mt-3 text-[11px]"><p className="text-text-tertiary">Station contact</p><p className="mt-1 font-semibold text-text-primary">Contact details are not configured for this station.</p></div>}</div></div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4"><div className="space-y-3 text-[11px]"><div><p className="text-text-tertiary">Address</p><p className="font-medium text-text-primary mt-0.5">{selectedLocation.name}</p><p className="text-text-secondary">{selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}</p></div><div><p className="text-text-tertiary">Station Type</p><p className="font-medium text-text-primary mt-0.5">{LOCATION_TYPE_LABELS[selectedLocation.location_type] || selectedLocation.location_type}</p></div><div><p className="text-text-tertiary">Total Capacity</p><p className="font-medium text-text-primary mt-0.5">Not configured</p></div><div><p className="text-text-tertiary">Utilization Rate</p><p className="font-medium text-status-good mt-0.5">{Math.max(0, Math.round((1 - ((locationStats?.find(stat => stat.location_id === selectedLocation.id)?.avg_excess_delay_minutes || 0) / Math.max(selectedLocation.expected_dwell_minutes, 1))) * 100))}% SLA utilization</p></div><div><p className="text-text-tertiary">Avg Dwell Time</p><p className="font-medium text-text-primary mt-0.5">{formatMinutes(locationStats?.find(stat => stat.location_id === selectedLocation.id)?.avg_dwell_minutes || selectedLocation.expected_dwell_minutes)}</p></div><div><p className="text-text-tertiary">Geofence Radius</p><p className="font-medium text-text-primary mt-0.5">{selectedLocation.geofence_radius} metres</p></div></div><div className="rounded-xl border border-border-default bg-bg-surface-raised/50 p-2 overflow-hidden"><LocationMapPicker latitude={selectedLocation.latitude} longitude={selectedLocation.longitude} geofenceRadius={selectedLocation.geofence_radius} onSelectCoordinates={() => {}} /></div></div>
          <div className="border-t border-border-default px-4 py-3"><h3 className="text-[11px] font-bold text-text-primary mb-2">Recent Activity</h3><div className="space-y-2 text-[10px] text-text-secondary"><div className="flex justify-between"><span>{locationStats?.find(stat => stat.location_id === selectedLocation.id)?.total_visits || 0} recorded visits</span><span className="text-text-tertiary">Live analytics</span></div><div className="flex justify-between"><span>Financial impact</span><span className="font-semibold text-[#ED642B]">{formatCurrency(locationStats?.find(stat => stat.location_id === selectedLocation.id)?.financial_impact || 0)}</span></div></div></div>
        </div>}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.length === 0 ? (
            <div className="col-span-full py-12">
              <EmptyStatePresentational
                icon={MapPin}
                title="No geofence stops found"
                description="Try modifying search criteria or register a new terminal."
              />
            </div>
          ) : (
            filteredLocations.map((loc) => {
              const stats = locationStats?.find((s) => s.location_id === loc.id)
              const excess = stats?.avg_excess_delay_minutes || 0

              return (
                <Link
                  key={loc.id}
                  to={`/locations/${loc.id}`}
                  className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm hover:border-[#ED642B]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4 cursor-pointer block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#250C77]/10 text-[#250C77] shrink-0">
                        <MapPin size={18} />
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/locations/${loc.id}`}
                          className="text-xs font-bold text-text-primary hover:text-[#ED642B] transition-colors truncate block"
                        >
                          {loc.name}
                        </Link>
                        <span className="text-[11px] text-text-tertiary">
                          {LOCATION_TYPE_LABELS[loc.location_type] || loc.location_type}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`font-numeric text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        excess > 0
                          ? excess > 45
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-amber-500/15 text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      {excess > 0 ? `+${formatMinutes(excess)}` : 'On Time'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-default text-xs font-numeric">
                    <div>
                      <p className="text-[10.5px] text-text-tertiary">Target SLA</p>
                      <p className="font-bold text-text-primary">
                        {formatMinutes(loc.expected_dwell_minutes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10.5px] text-text-tertiary">Geofence Radius</p>
                      <p className="font-bold text-text-primary">{loc.geofence_radius}m</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Link
                      to={`/locations/${loc.id}`}
                      className="text-xs font-bold text-[#ED642B] hover:text-[#D4521D] flex items-center gap-1"
                    >
                      Inspect Profile <ArrowRight size={11} />
                    </Link>
                    {canMutate && (
                      <div className="flex items-center gap-1" onClick={e => e.preventDefault()}>
                        <Button size="tiny" variant="ghost" onClick={(e) => { e.preventDefault(); handleOpenEdit(loc); }}>
                          <Edit2 size={12} />
                        </Button>
                        <Button
                          size="tiny"
                          variant="ghost"
                          onClick={(e) => { e.preventDefault(); handleDelete(loc.id, loc.name); }}
                          className="hover:text-red-500"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })
          )}
        </div>
      )}

      {/* ── REGISTER / EDIT MODAL ── */}
      {(showAddModal || editingLocation) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-border-default bg-bg-surface p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border-default pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#250C77] text-white">
                  <MapPin size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    {editingLocation ? `Edit Geofence: ${editingLocation.name}` : 'Register Corridor Operating Stop'}
                  </h3>
                  <p className="text-[11px] text-text-tertiary">
                    Set precise GPS geofence coordinates and SLA baseline for turnaround monitoring.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  setEditingLocation(null)
                }}
                className="p-1 rounded-lg text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {submitError && (
              <Alert variant="destructive">
                <AlertCircle size={15} />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <form
              onSubmit={editingLocation ? handleAddSubmit(onSubmitEdit) : handleAddSubmit(onSubmitCreate)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Facility Name *</label>
                  <input
                    type="text"
                    {...regAdd('name')}
                    placeholder="e.g. Mombasa Port Berth 1"
                    className="w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary focus:border-[#ED642B] focus:outline-none"
                  />
                  {errorsAdd.name && <p className="text-[11px] text-red-500 mt-1">{errorsAdd.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Facility Classification *</label>
                  <Select
                    value={watchAdd('location_type') ?? 'warehouse'}
                    onValueChange={(value) => setAddValue('location_type', value as LocationFormValues['location_type'], { shouldValidate: true })}
                    options={[
                      { value: 'warehouse', label: 'Warehouse Hub' },
                      { value: 'customer_facility', label: 'Customer Facility' },
                      { value: 'depot', label: 'Transit Depot' },
                      { value: 'port', label: 'Maritime Port' },
                      { value: 'border_crossing', label: 'Border Crossing' },
                      { value: 'loading_point', label: 'Loading Point' },
                      { value: 'unloading_point', label: 'Unloading Point' },
                    ]}
                    placeholder="Select facility type"
                  />
                </div>
              </div>

              {/* Map Interactive Coordinate Picker */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Pinpoint Geofence Coordinates & Boundary
                </label>
                <LocationMapPicker
                  latitude={latAdd || -1.2921}
                  longitude={lngAdd || 36.8219}
                  geofenceRadius={radAdd || 500}
                  onSelectCoordinates={(lat: number, lng: number) => {
                    setAddValue('latitude', lat, { shouldValidate: true })
                    setAddValue('longitude', lng, { shouldValidate: true })
                  }}
                  onSelectPreset={handleApplyPreset}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    {...regAdd('latitude', { valueAsNumber: true })}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none"
                  />
                  {errorsAdd.latitude && <p className="text-[11px] text-red-500 mt-1">{errorsAdd.latitude.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    {...regAdd('longitude', { valueAsNumber: true })}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none"
                  />
                  {errorsAdd.longitude && <p className="text-[11px] text-red-500 mt-1">{errorsAdd.longitude.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Target Dwell (mins) *</label>
                  <input
                    type="number"
                    {...regAdd('expected_dwell_minutes', { valueAsNumber: true })}
                    className="w-full bg-bg-surface-raised border border-border-default rounded-xl px-3 py-2 text-xs text-text-primary font-numeric focus:border-[#ED642B] focus:outline-none"
                  />
                  {errorsAdd.expected_dwell_minutes && (
                    <p className="text-[11px] text-red-500 mt-1">{errorsAdd.expected_dwell_minutes.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingLocation(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="small"
                  loading={isAdding || createMutation.isPending || updateMutation.isPending}
                >
                  {editingLocation ? 'Update Geofence' : 'Register Geofence'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
