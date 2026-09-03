import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useAuth } from '../../auth/AuthProvider'
import { apiClient } from '../../lib/api/client'
import { formatCurrency } from '../../lib/format'
import { DatePicker, DatePickerButton, DatePickerContent, DatePickerTrigger } from '../../components/ui/DatePicker'
import { Calendar } from '../../components/ui/Calendar'
import {
  AlertTriangle, ArrowRight, BarChart3, CalendarDays, Clock,
  Container, DollarSign, Download, Leaf, Map, Package, Plus, Sparkles, Truck,
} from 'lucide-react'
import { format } from 'date-fns'
import type { Trip, Insight, LocationStats, TrendDataPoint } from '../../lib/api/types'

type Tone = 'violet' | 'orange' | 'green' | 'blue'

const toneStyles: Record<Tone, string> = {
  violet: 'bg-violet-500/15 text-violet-500', orange: 'bg-orange-500/15 text-orange-500',
  green: 'bg-emerald-500/15 text-emerald-500', blue: 'bg-sky-500/15 text-sky-500',
}

const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => (
  <section className={`rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm ${className}`}>{children}</section>
)

const SectionTitle: React.FC<{ title: string; action?: string; to?: string }> = ({ title, action, to = '/analytics' }) => (
  <div className="mb-3 flex items-center justify-between border-b border-border-default pb-2">
    <h2 className="text-xs font-bold text-text-primary">{title}</h2>
    {action && <Link to={to} className="text-[10px] font-semibold text-[#8b5cf6] hover:text-[#ED642B]">{action}</Link>}
  </div>
)

const Donut: React.FC<{ values: number[]; colors: string[]; total: string }> = ({ values, colors, total }) => {
  const sum = values.reduce((a, b) => a + b, 0) || 1
  const segments = values.map((value, index) => {
    const offset = values.slice(0, index).reduce((total, previous) => total + ((previous / sum) * 100), 0)
    const length = (value / sum) * 100
    const segment = <circle key={index} cx="50" cy="50" r="35" fill="none" stroke={colors[index]} strokeWidth="14" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-offset} pathLength="100" />
    return segment
  })
  return <div className="relative h-28 w-28 shrink-0"><svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">{segments}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="font-numeric text-lg text-text-primary">{total}</strong><span className="text-[9px] text-text-tertiary">Total</span></div></div>
}

const Sparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  const max = Math.max(...values, 1); const min = Math.min(...values, 0)
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${92 - ((value - min) / Math.max(max - min, 1)) * 70}`).join(' ')
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-24"><polyline fill="none" stroke={color} strokeWidth="3" points={points} vectorEffect="non-scaling-stroke" /></svg>
}

const statusLabel = (status?: string) => status === 'in_transit' ? 'In Transit' : status === 'completed' ? 'Delivered' : status === 'delayed' ? 'Delayed' : 'Pending'

const GlobalShipmentsMap: React.FC<{ locations: Array<{ id: string; latitude: number; longitude: number }> }> = ({ locations }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [35, 4], zoom: 2.2, minZoom: 1.5, maxZoom: 6,
      attributionControl: false,
      style: {
        version: 8,
        sources: { osm: { type: 'raster', tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const markers = locations.filter((location) => Number.isFinite(location.latitude) && Number.isFinite(location.longitude)).map((location, index) => {
      const element = document.createElement('div')
      element.className = 'h-3 w-3 rounded-full border-2 border-white shadow-lg'
      element.style.backgroundColor = index % 3 === 0 ? '#10B981' : index % 3 === 1 ? '#8B5CF6' : '#ED642B'
      return new maplibregl.Marker({ element }).setLngLat([location.longitude, location.latitude]).addTo(map)
    })
    return () => markers.forEach((marker) => marker.remove())
  }, [locations])

  return <div ref={containerRef} className="h-[190px] w-full overflow-hidden rounded-lg bg-[#07092a]" />
}

export const DashboardReference: React.FC = () => {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [range, setRange] = useState(30)
  const { data: stats } = useQuery({ queryKey: ['dashboardStats'], queryFn: apiClient.getDashboardStats })
  const { data: trips = [] } = useQuery({ queryKey: ['trips'], queryFn: apiClient.getTrips })
  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: apiClient.getLocations })
  const { data: locationStats = [] } = useQuery({ queryKey: ['locationStats'], queryFn: apiClient.getLocationStats })
  const { data: trends = [] } = useQuery({ queryKey: ['dashboardTrends', range], queryFn: () => apiClient.getTrendData(range) })
  const { data: insights = [] } = useQuery({ queryKey: ['insights'], queryFn: apiClient.getInsights })
  const { data: notifications } = useQuery({ queryKey: ['notifications', 'dashboard'], queryFn: () => apiClient.getNotifications({ limit: 5 }) })

  const tripList = trips as Trip[]
  const delivered = tripList.filter((trip) => trip.status === 'completed').length
  const inTransit = tripList.filter((trip) => ['in_transit', 'in_progress'].includes(trip.status || '')).length
  const pending = Math.max(0, tripList.length - delivered - inTransit)
  const delayed = stats?.trucks_delayed ?? tripList.filter((trip) => trip.status === 'delayed').length
  const onTime = tripList.length ? ((tripList.filter((trip) => !['delayed', 'cancelled'].includes(trip.status || '')).length / tripList.length) * 100) : 0
  const cost = stats?.estimated_financial_impact ?? 0
  const trendValues = (trends as TrendDataPoint[]).map((point) => point.visit_count || 0)
  const visibleTrendValues = trendValues.length ? trendValues : [2, 4, 3, 5]
  const maxTrend = Math.max(...visibleTrendValues, 1)
  const topLocations = (locationStats as LocationStats[]).slice().sort((a, b) => (b.total_visits || 0) - (a.total_visits || 0)).slice(0, 5)
  const routeRate = (location: LocationStats) => Math.max(0, Math.min(100, 100 - ((location.avg_excess_delay_minutes || 0) / Math.max(location.expected_dwell_minutes || 1, 1) * 100)))
  const modeCounts = useMemo(() => {
    const result: Record<string, number> = {}
    tripList.forEach((trip) => { const mode = trip.cargo_type || trip.vehicle_type || 'Road Transport'; result[mode] = (result[mode] || 0) + 1 })
    return Object.entries(result).sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [tripList])
  const recent = tripList.slice(0, 5)
  const alertItems = (insights as Insight[]).slice(0, 3)
  const notificationItems = ((notifications as { items?: Array<{ title?: string; message?: string; created_at?: string }> } | undefined)?.items || []).slice(0, 3)

  return (
    <div className="mx-auto max-w-[1400px] space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#250C77] text-white"><Sparkles size={17} className="text-[#ED642B]" /></div><div><h1 className="text-base font-bold text-text-primary">Welcome back, {user?.name?.split(' ')[0] || 'Operator'} <span aria-hidden="true">👋</span></h1><p className="text-[10px] text-text-secondary">Here's what's happening with your logistics operations today.</p></div></div>
        <div className="flex items-center gap-2"><DatePicker><DatePickerTrigger asChild><DatePickerButton variant="outline" className="min-w-[130px] text-[11px]"><CalendarDays size={13} className="mr-1.5" />{selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select date'}</DatePickerButton></DatePickerTrigger><DatePickerContent align="right"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus /></DatePickerContent></DatePicker><button type="button" onClick={() => window.print()} className="hidden items-center gap-1.5 rounded-lg border border-[#250C77] bg-[#250C77] px-3 py-2 text-[10px] font-bold text-white sm:flex"><Download size={12} /> Export Report</button></div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: 'Total Shipments', value: tripList.length.toLocaleString(), note: 'vs last 30 days', icon: Package, tone: 'violet' as Tone, values: trendValues.length ? trendValues : [2, 4, 3, 5] }, { label: 'On-Time Delivery', value: `${onTime.toFixed(1)}%`, note: 'vs last 30 days', icon: Clock, tone: 'violet' as Tone, values: [70, 75, 73, onTime] }, { label: 'Logistics Cost', value: formatCurrency(cost), note: 'estimated idle cost', icon: DollarSign, tone: 'orange' as Tone, values: [20, 25, 21, cost || 25] }, { label: 'CO₂ Emissions Saved', value: '—', note: 'not tracked in current data', icon: Leaf, tone: 'green' as Tone, values: [1, 1, 1, 1] }].map((metric) => <Card key={metric.label} className="flex min-h-[92px] items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneStyles[metric.tone]}`}><metric.icon size={18} /></div><div className="min-w-0 flex-1"><p className="text-[10px] text-text-secondary">{metric.label}</p><p className="font-numeric text-xl font-bold text-text-primary">{metric.value}</p><p className="text-[9px] text-text-tertiary">{metric.note}</p></div><Sparkline values={metric.values} color={metric.tone === 'orange' ? '#ED642B' : metric.tone === 'green' ? '#10B981' : '#8b5cf6'} /></Card>)}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Card className="xl:col-span-3"><SectionTitle title="Shipment Overview" action="View all shipments" to="/trips" /><div className="flex items-center gap-3"><Donut values={[delivered, inTransit, pending]} colors={['#10B981', '#8b5cf6', '#ED642B']} total={tripList.length.toLocaleString()} /><div className="space-y-2 text-[10px]">{[['Delivered', delivered, '#10B981'], ['In Transit', inTransit, '#8b5cf6'], ['Pending', pending, '#ED642B']].map(([label, value, color]) => <div key={String(label)} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: String(color) }} /><span className="text-text-secondary">{label}</span><strong className="ml-auto text-text-primary">{value}</strong></div>)}</div></div></Card>
        <Card className="xl:col-span-6"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-xs font-bold text-text-primary">Global Shipments</h2><p className="text-[10px] text-text-secondary">Live corridor activity</p></div><Link to="/map" className="text-[10px] font-semibold text-[#8b5cf6]">Live View <span className="text-emerald-500">*</span></Link></div><GlobalShipmentsMap locations={locations} /></Card>
        <Card className="xl:col-span-3"><SectionTitle title="Alerts & Notifications" action="View all" to="/notifications" /><div className="space-y-3">{(alertItems.length ? alertItems : notificationItems).map((item: Insight | { title?: string; message?: string }, index) => <div key={item.id || index} className="flex gap-2"><div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${toneStyles[index === 0 ? 'orange' : index === 1 ? 'violet' : 'green']}`}><AlertTriangle size={12} /></div><div className="min-w-0"><p className="truncate text-[10px] font-bold text-text-primary">{'title' in item ? item.title : 'System alert'}</p><p className="line-clamp-2 text-[9px] text-text-secondary">{'description' in item ? item.description : item.message || 'Operational update available.'}</p></div></div>)}{!alertItems.length && !notificationItems.length && <p className="text-[10px] text-text-tertiary">No active alerts.</p>}</div></Card>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
        <Card className="xl:col-span-3"><SectionTitle title="Recent Shipments" action="View all" to="/trips" /><div className="space-y-2.5">{recent.map((trip, index) => <Link to={`/trips/${trip.id}`} key={trip.id} className="flex items-center gap-2"><div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${toneStyles[index % 2 ? 'violet' : 'green']}`}><Container size={12} /></div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-text-primary">{trip.container_number || trip.id.slice(0, 14)}</p><p className="truncate text-[9px] text-text-secondary">{trip.origin_name || 'Origin'} → {trip.destination_name || 'Destination'}</p></div><span className="shrink-0 rounded px-1.5 py-1 text-[8px] font-bold text-white" style={{ backgroundColor: trip.status === 'completed' ? '#10B981' : trip.status === 'delayed' ? '#EF4444' : '#8b5cf6' }}>{statusLabel(trip.status)}</span></Link>)}{!recent.length && <p className="text-[10px] text-text-tertiary">No shipments found.</p>}</div></Card>
        <Card className="xl:col-span-3"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-xs font-bold text-text-primary">Shipment Volume Trend</h2><p className="text-[10px] text-text-secondary">Actual activity</p></div><select value={range} onChange={(event) => setRange(Number(event.target.value))} className="rounded-md border border-border-default bg-bg-surface-raised px-2 py-1 text-[10px] text-text-primary"><option value={30}>30 Days</option><option value={90}>90 Days</option></select></div><div className="flex h-32 items-end gap-1 border-b border-border-default px-1">{(trends as TrendDataPoint[]).map((point, index) => <div key={`${point.date}-${index}`} title={`${point.date}: ${point.visit_count}`} className="flex-1 rounded-t bg-[#8b5cf6] hover:bg-[#ED642B]" style={{ height: `${Math.max(4, ((point.visit_count || 0) / maxTrend) * 100)}%` }} />)}</div><div className="mt-2 flex justify-between text-[9px] text-text-tertiary"><span>{trends[0]?.date || 'No data'}</span><span>{trends[trends.length - 1]?.date || ''}</span></div></Card>
        <Card className="xl:col-span-3"><SectionTitle title="Top Trade Lanes" action="View all" /><div className="space-y-2">{topLocations.map((location, index) => <div key={location.location_id || index}><div className="flex justify-between text-[9px]"><span className="truncate text-text-primary">{location.location_name}</span><span className="font-numeric text-text-secondary">{routeRate(location).toFixed(1)}%</span></div><div className="mt-1 h-1.5 rounded-full bg-bg-surface-raised"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${routeRate(location)}%` }} /></div></div>)}{!topLocations.length && <p className="text-[10px] text-text-tertiary">No route data available.</p>}</div></Card>
        <Card className="xl:col-span-3"><SectionTitle title="Cost Overview" action="View full cost analysis" to="/demurrage" /><div className="flex items-center gap-3"><Donut values={[cost, delayed * 3500, Math.max(1, cost / 3)]} colors={['#8b5cf6', '#ED642B', '#F59E0B']} total={formatCurrency(cost)} /><div className="space-y-2 text-[9px] text-text-secondary"><p><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />Idle operations</p><p><i className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500" />Delay exposure</p><p><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-500" />Other tracked</p></div></div></Card>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card><SectionTitle title="Shipments by Mode" action="30 Days" /><div className="flex items-center gap-3"><Donut values={modeCounts.map(([, value]) => value)} colors={['#8b5cf6', '#ED642B', '#0ea5e9', '#F59E0B']} total={String(tripList.length)} /><div className="space-y-1.5 text-[9px]">{modeCounts.map(([mode, value], index) => <p key={mode}><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: ['#8b5cf6', '#ED642B', '#0ea5e9', '#F59E0B'][index] }} />{mode} <strong className="text-text-primary">{value}</strong></p>)}</div></div></Card>
        <Card><SectionTitle title="On-Time Delivery Performance" action="30 Days" /><p className="font-numeric text-2xl font-bold text-text-primary">{onTime.toFixed(1)}%</p><p className="text-[9px] text-status-good">{delayed ? `${delayed} delayed units` : 'No delayed units'} vs last 30 days</p><div className="mt-3 flex h-20 items-end gap-1 overflow-hidden">{(trends.length ? trends : Array.from({ length: 20 }, (_, index) => ({ visit_count: index + 1 } as TrendDataPoint))).slice(-20).map((point, index) => <div key={index} className="min-h-1 flex-1 rounded-t bg-emerald-500/80" style={{ height: `${Math.min(100, Math.max(8, ((point.visit_count || 0) / Math.max(...(trends.length ? trendValues : Array.from({ length: 20 }, (_, item) => item + 1)), 1)) * 100))}%` }} />)}</div></Card>
        <Card><SectionTitle title="Quick Actions" /><div className="grid grid-cols-2 gap-2">{[{ label: 'New Shipment', to: '/trips', icon: Plus }, { label: 'Track Shipment', to: '/map', icon: Map }, { label: 'Schedule Pickup', to: '/trips', icon: Truck }, { label: 'Create Report', to: '/analytics', icon: BarChart3 }].map((action) => <Link key={action.label} to={action.to} className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface-raised p-2 text-[9px] font-semibold text-text-primary hover:border-[#8b5cf6]"><action.icon size={13} className="text-[#8b5cf6]" />{action.label}</Link>)}<Link to="/ai-advisor" className="col-span-2 flex items-center gap-2 rounded-lg bg-[#250C77] p-2 text-[10px] font-bold text-white"><Sparkles size={13} className="text-[#ED642B]" />AI Analyst <ArrowRight size={12} className="ml-auto" /></Link></div></Card>
      </div>
    </div>
  )
}
