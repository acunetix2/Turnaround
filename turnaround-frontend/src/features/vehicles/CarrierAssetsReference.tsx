import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronLeft, ChevronRight, Edit2, Globe2, MoreVertical, Plus, Search, Settings, Trash2, Truck, Wrench } from 'lucide-react'
import type { Vehicle } from '../../lib/api/types'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'

type GPS = { latitude?: number; longitude?: number; speed?: number; active_dwell_location_id?: string }

const statusMeta: Record<string, { label: string; color: string; dot: string }> = {
  active: { label: 'Active', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' },
  in_transit: { label: 'In Transit', color: 'text-violet-500 bg-violet-500/10 border-violet-500/20', dot: 'bg-violet-500' },
  idle: { label: 'Available', color: 'text-sky-500 bg-sky-500/10 border-sky-500/20', dot: 'bg-sky-500' },
  maintenance: { label: 'Maintenance', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-500' },
  delayed: { label: 'Delayed', color: 'text-red-500 bg-red-500/10 border-red-500/20', dot: 'bg-red-500' },
}

const palette = ['#6d3fd8', '#ed642b', '#1687c7', '#f2b51d', '#10b981']
const category = (vehicle: Vehicle) => /ship|vessel/i.test(vehicle.vehicle_type) ? 'Sea Vessels' : /trailer|chassis/i.test(vehicle.vehicle_type) ? 'Trailers' : /container/i.test(vehicle.vehicle_type) ? 'Containers' : /equipment|tanker/i.test(vehicle.vehicle_type) ? 'Equipment' : 'Land Vehicles'
const status = (vehicle: Vehicle) => statusMeta[vehicle.status] || statusMeta.idle
const utilization = (vehicle: Vehicle, gps?: GPS) => Math.min(100, Math.max(0, Math.round(gps?.speed ? gps.speed / 1.2 : vehicle.driver_name ? vehicle.status === 'in_transit' ? 78 : 62 : 0)))
const plateNumber = (vehicle: Vehicle) => vehicle.registration_number?.trim() || 'Plate not assigned'
const locationLabel = (vehicle: Vehicle, gps?: GPS) => gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)
  ? `${gps.latitude?.toFixed(2)}, ${gps.longitude?.toFixed(2)}`
  : vehicle.current_location_name?.trim() || 'Location not reported'

const Donut: React.FC<{ values: number[]; total: number }> = ({ values, total }) => {
  const sum = values.reduce((a, b) => a + b, 0) || 1
  const stops = values.map((value, index) => {
    const start = values.slice(0, index).reduce((total, previous) => total + previous / sum * 360, 0)
    const end = start + value / sum * 360
    return `${palette[index % palette.length]} ${start}deg ${end}deg`
  }).join(', ')
  return <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}><div className="absolute inset-[25%] flex flex-col items-center justify-center rounded-full bg-bg-surface"><strong className="font-numeric text-xl text-text-primary">{total}</strong><span className="text-[9px] text-text-tertiary">Total</span></div></div>
}

interface Props {
  vehicles: Vehicle[]
  gpsData?: Record<string, GPS>
  canMutate: boolean
  onAdd: () => void
  onEdit: (vehicle: Vehicle) => void
  onDelete: (id: string, registration: string) => void
}

export const CarrierAssetsReference: React.FC<Props> = ({ vehicles, gpsData, canMutate, onAdd, onEdit, onDelete }) => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 8
  const groups = Object.entries(vehicles.reduce<Record<string, number>>((acc, vehicle) => { const key = category(vehicle); acc[key] = (acc[key] || 0) + 1; return acc }, {})).sort((a, b) => b[1] - a[1])
  const filtered = vehicles.filter((vehicle) => {
    const query = search.toLowerCase()
    return (!query || plateNumber(vehicle).toLowerCase().includes(query) || vehicle.vehicle_type.toLowerCase().includes(query) || (vehicle.driver_name || '').toLowerCase().includes(query)) && (statusFilter === 'all' || vehicle.status === statusFilter) && (typeFilter === 'all' || category(vehicle) === typeFilter)
  })
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const active = vehicles.filter((vehicle) => ['active', 'in_transit'].includes(vehicle.status)).length
  const maintenance = vehicles.filter((vehicle) => vehicle.maintenance_status === 'due_soon' || vehicle.maintenance_status === 'in_service').length
  const transit = vehicles.filter((vehicle) => vehicle.status === 'in_transit').length
  const utilizationRate = vehicles.length ? Math.round(vehicles.reduce((sum, vehicle) => sum + utilization(vehicle, gpsData?.[vehicle.id]), 0) / vehicles.length) : 0
  const maintenanceDue = vehicles.filter((vehicle) => vehicle.next_inspection_date || vehicle.maintenance_status !== 'good').sort((a, b) => (a.next_inspection_date || '9999').localeCompare(b.next_inspection_date || '9999')).slice(0, 3)
  const typeValues = groups.map(([, count]) => count)

  return <div className="mx-auto max-w-[1400px] space-y-3">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-xl font-bold tracking-tight text-text-primary">Carrier Assets</h1><p className="text-[10px] text-text-secondary">Manage and monitor your fleet, vessels, and equipment in real-time.</p></div>{canMutate && <Button variant="primary" size="small" icon={<Plus size={13} />} onClick={onAdd}>Add Asset</Button>}</div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{[{ label: 'Total Assets', value: vehicles.length, note: `${vehicles.length ? 'Live registry' : 'No assets yet'}`, icon: Truck, color: 'violet' }, { label: 'Active Assets', value: active, note: 'Currently in use', icon: CheckCircle2, color: 'green' }, { label: 'Utilization Rate', value: `${utilizationRate}%`, note: 'Average utilization', icon: Globe2, color: 'violet' }, { label: 'Maintenance Due', value: maintenance, note: 'Due within 7 days', icon: Wrench, color: 'orange' }, { label: 'Assets in Transit', value: transit, note: 'On the move', icon: Globe2, color: 'violet' }].map((metric) => <div key={metric.label} className="flex min-h-[88px] items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-${metric.color === 'orange' ? 'orange' : metric.color === 'green' ? 'emerald' : 'violet'}-500/15 text-${metric.color === 'orange' ? 'orange' : metric.color === 'green' ? 'emerald' : 'violet'}-500`}><metric.icon size={18} /></div><div><p className="text-[10px] text-text-secondary">{metric.label}</p><p className="font-numeric text-xl font-bold text-text-primary">{metric.value}</p><p className="text-[9px] text-text-tertiary">{metric.note}</p></div></div>)}</div>

    <div className="grid grid-cols-1 gap-3 xl:grid-cols-12"><div className="min-w-0 xl:col-span-9"><div className="flex items-center gap-1 overflow-x-auto border-b border-border-default">{['all', ...groups.map(([name]) => name)].map((name) => <button key={name} type="button" onClick={() => { setTypeFilter(name); setPage(1) }} className={`shrink-0 border-b-2 px-3 py-2 text-[11px] font-semibold ${typeFilter === name ? 'border-[#ED642B] text-[#ED642B]' : 'border-transparent text-text-secondary'}`}>{name === 'all' ? 'All Assets' : name}</button>)}</div><div className="mt-2 flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search assets, vehicles, vessels..." className="w-full rounded-lg border border-border-default bg-bg-surface px-8 py-2 text-[11px] text-text-primary outline-none focus:border-[#ED642B]" /></div><Select value={statusFilter} onChange={(value) => { setStatusFilter(value); setPage(1) }} options={[{ value: 'all', label: 'All Status' }, ...Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))]} /><Select value={typeFilter} onChange={setTypeFilter} options={[{ value: 'all', label: 'All Types' }, ...groups.map(([value]) => ({ value, label: value }))]} /></div><div className="mt-2 overflow-x-auto rounded-xl border border-border-default bg-bg-surface shadow-sm"><table className="w-full min-w-[760px] text-left"><thead className="bg-bg-surface-raised text-[9px] uppercase tracking-wide text-text-tertiary"><tr>{['Asset', 'Type', 'Plate Number', 'Status', 'Logistics Location', 'Utilization', 'Next Maintenance', ''].map((heading) => <th key={heading} className="px-3 py-2 font-bold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border-default">{visible.map((vehicle) => { const meta = status(vehicle); const gps = gpsData?.[vehicle.id]; const usage = utilization(vehicle, gps); return <tr key={vehicle.id} className="text-[10px] hover:bg-bg-surface-raised/50"><td className="px-3 py-2"><div className="flex items-center gap-2"><div className="flex h-8 w-10 items-center justify-center overflow-hidden rounded border border-border-default bg-bg-surface-raised">{vehicle.image_url ? <img src={vehicle.image_url} alt="" className="h-full w-full object-cover" /> : <Truck size={15} className="text-[#8b5cf6]" />}</div><div><Link to={`/vehicles/${vehicle.id}`} className="block max-w-32 truncate font-semibold text-text-primary hover:text-[#ED642B]">{plateNumber(vehicle)}</Link><span className="text-[9px] text-text-tertiary">{vehicle.driver_name || 'No driver assigned'}</span></div></div></td><td className="px-3 py-2 text-text-secondary">{category(vehicle)}</td><td className="px-3 py-2 font-mono font-semibold text-text-primary">{plateNumber(vehicle)}</td><td className="px-3 py-2"><span className={`inline-flex items-center gap-1 rounded border px-1.5 py-1 font-semibold ${meta.color}`}><i className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span></td><td className="px-3 py-2 text-text-secondary">{locationLabel(vehicle, gps)}</td><td className="px-3 py-2"><span className="font-numeric font-bold text-text-primary">{usage}%</span><div className="mt-1 h-1 w-16 rounded bg-bg-surface-raised"><div className="h-full rounded bg-[#8b5cf6]" style={{ width: `${usage}%` }} /></div></td><td className="px-3 py-2 text-text-secondary">{vehicle.next_inspection_date ? new Date(vehicle.next_inspection_date).toLocaleDateString() : 'Not scheduled'}</td><td className="px-3 py-2"><div className="flex items-center gap-1"><button type="button" title="Edit asset" onClick={() => onEdit(vehicle)} className="rounded p-1 text-text-tertiary hover:text-text-primary"><Edit2 size={12} /></button>{canMutate && <button type="button" title="Remove asset" onClick={() => onDelete(vehicle.id, vehicle.registration_number)} className="rounded p-1 text-text-tertiary hover:text-red-500"><Trash2 size={12} /></button>}<MoreVertical size={13} className="text-text-tertiary" /></div></td></tr> })}</tbody></table>{!visible.length && <div className="p-8 text-center text-xs text-text-tertiary">No assets match the current filters.</div>}<div className="flex items-center justify-between border-t border-border-default px-3 py-2 text-[10px] text-text-tertiary"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} assets</span><div className="flex items-center gap-1"><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded border border-border-default p-1 disabled:opacity-40"><ChevronLeft size={13} /></button><span className="px-2 font-numeric">{page} / {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded border border-border-default p-1 disabled:opacity-40"><ChevronRight size={13} /></button></div></div></div></div>
      <div className="space-y-3 xl:col-span-3"><CardPanel title="Assets by Type" action="View details"><div className="flex items-center gap-2"><Donut values={typeValues} total={vehicles.length} /><div className="space-y-2 text-[9px]">{groups.map(([name, count], index) => <p key={name}><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />{name} <strong className="text-text-primary">{count}</strong></p>)}</div></div></CardPanel><CardPanel title="Asset Status Overview" action="View details"><div className="space-y-2">{Object.entries(statusMeta).map(([key, meta]) => { const count = vehicles.filter((vehicle) => vehicle.status === key).length; return <div key={key}><div className="flex justify-between text-[9px]"><span className="text-text-secondary">{meta.label}</span><span className="font-numeric text-text-primary">{count} ({vehicles.length ? Math.round(count / vehicles.length * 100) : 0}%)</span></div><div className="mt-1 h-1.5 rounded-full bg-bg-surface-raised"><div className={`h-full rounded-full ${meta.dot}`} style={{ width: `${vehicles.length ? count / vehicles.length * 100 : 0}%` }} /></div></div> })}</div></CardPanel><CardPanel title="Maintenance Due Soon" action="View all"><div className="space-y-2">{maintenanceDue.map((vehicle) => <div key={vehicle.id} className="flex gap-2"><div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-500"><Settings size={12} /></div><div className="min-w-0"><p className="truncate text-[9px] font-semibold text-text-primary">{vehicle.registration_number}</p><p className="text-[8px] text-text-tertiary">{vehicle.next_inspection_date ? new Date(vehicle.next_inspection_date).toLocaleDateString() : 'Maintenance status flagged'}</p></div></div>)}{!maintenanceDue.length && <p className="text-[10px] text-text-tertiary">No maintenance dates recorded.</p>}</div></CardPanel></div></div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{groups.slice(0, 4).map(([name, count], index) => <div key={name} className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${palette[index % palette.length]}20`, color: palette[index % palette.length] }}><Truck size={18} /></div><div><p className="text-[10px] text-text-secondary">{name}</p><p className="font-numeric text-lg font-bold text-text-primary">{count} <span className="text-[9px] font-normal text-text-tertiary">assets</span></p></div><span className="ml-auto text-[9px] text-text-tertiary">{vehicles.length ? Math.round(count / vehicles.length * 100) : 0}% of total</span></div>)}</div>
  </div>
}

const CardPanel: React.FC<React.PropsWithChildren<{ title: string; action: string }>> = ({ title, action, children }) => <section className="rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm"><div className="mb-3 flex items-center justify-between border-b border-border-default pb-2"><h2 className="text-xs font-bold text-text-primary">{title}</h2><span className="text-[9px] font-semibold text-[#8b5cf6]">{action}</span></div>{children}</section>
