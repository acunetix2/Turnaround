import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInCalendarDays, isPast } from 'date-fns';
import {
  AlertTriangle, ArrowRight, CalendarCheck, ChevronRight,
  Droplets, FileText, Fuel, Info, MoreVertical, RefreshCw,
  Settings2, Truck, Wrench, Zap,
} from 'lucide-react';
import { apiClient } from '../../lib/api/client';
import { Button } from '../../components/ui/Button';
import type { Vehicle } from '../../lib/api/types';

type View = 'maintenance' | 'fuel';

type MaintenanceRow = Vehicle & { queueStatus: 'In Service' | 'Due Soon' | 'Scheduled' };

const statusStyles: Record<MaintenanceRow['queueStatus'], string> = {
  'In Service': 'bg-red-500/10 text-red-500',
  'Due Soon': 'bg-orange-500/10 text-orange-500',
  Scheduled: 'bg-emerald-500/10 text-emerald-600',
};

const vehicleName = (vehicle: Vehicle) => vehicle.vehicle_type || 'Fleet vehicle';
const formatInspection = (date?: string) => date ? format(new Date(date), 'dd MMM yyyy') : 'Not scheduled';
const daysUntil = (date?: string) => date ? differenceInCalendarDays(new Date(date), new Date()) : null;

export const MaintenanceFuel: React.FC = () => {
  const [view, setView] = useState<View>('maintenance');
  const { data: vehicles = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiClient.getVehicles,
    refetchInterval: 60_000,
  });

  const maintenanceRows = useMemo<MaintenanceRow[]>(() => vehicles
    .filter((vehicle) => vehicle.maintenance_status !== 'good' || vehicle.next_inspection_date)
    .sort((left, right) => (left.next_inspection_date || '9999').localeCompare(right.next_inspection_date || '9999'))
    .map((vehicle) => ({
      ...vehicle,
      queueStatus: vehicle.maintenance_status === 'in_service'
        ? 'In Service'
        : vehicle.maintenance_status === 'due_soon'
          ? 'Due Soon'
          : 'Scheduled',
    })), [vehicles]);

  const lowFuelVehicles = useMemo(() => vehicles
    .filter((vehicle) => (vehicle.fuel_level ?? 100) < 25)
    .sort((left, right) => (left.fuel_level ?? 100) - (right.fuel_level ?? 100)), [vehicles]);

  const averageFuel = vehicles.length
    ? Math.round(vehicles.reduce((sum, vehicle) => sum + (vehicle.fuel_level ?? 0), 0) / vehicles.length)
    : 0;
  const inServiceCount = vehicles.filter((vehicle) => vehicle.maintenance_status === 'in_service').length;
  const dueSoonCount = vehicles.filter((vehicle) => vehicle.maintenance_status === 'due_soon').length;
  const scheduledCount = Math.max(vehicles.length - inServiceCount - dueSoonCount, 0);
  const inspectionVehicles = maintenanceRows.filter((vehicle) => vehicle.next_inspection_date).slice(0, 3);

  if (isLoading) return <MaintenanceSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="maintenance-page w-full max-w-[1180px] min-w-0 space-y-3.5 pb-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.04em] text-text-primary">Maintenance &amp; Fuel</h1>
          <p className="mt-0.5 text-[11px] text-text-secondary">Monitor service readiness, inspection dates, fuel levels, and vehicle operating range.</p>
        </div>
        <Button variant="outline" size="small" icon={<RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />} onClick={() => refetch()}>
          Refresh Data
        </Button>
      </header>

      <div className="flex w-full max-w-[312px] rounded-md border border-border-default bg-bg-surface p-0.5">
        <TabButton active={view === 'maintenance'} icon={<Wrench size={13} />} onClick={() => setView('maintenance')}>Maintenance</TabButton>
        <TabButton active={view === 'fuel'} icon={<Fuel size={13} />} onClick={() => setView('fuel')}>Fuel</TabButton>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Fleet Assets" value={vehicles.length} detail="Total vehicles" icon={<Truck size={19} />} tone="purple" />
        <KpiCard label="Service Attention" value={maintenanceRows.length} detail="Require attention" icon={<Wrench size={19} />} tone="orange" />
        <KpiCard label="Low Fuel" value={lowFuelVehicles.length} detail="Below 25%" icon={<Fuel size={19} />} tone="red" />
        <KpiCard label="Average Fuel" value={`${averageFuel}%`} detail="Fleet average" icon={<Droplets size={19} />} tone="green" />
      </div>

      {view === 'maintenance' ? (
        <MaintenanceDashboard
          vehicles={vehicles}
          rows={maintenanceRows}
          inspectionVehicles={inspectionVehicles}
          inServiceCount={inServiceCount}
          dueSoonCount={dueSoonCount}
          scheduledCount={scheduledCount}
        />
      ) : (
        <FuelDashboard vehicles={vehicles} lowFuelVehicles={lowFuelVehicles} />
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-[#5B2BD8]/15 bg-[#5B2BD8]/[0.04] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5"><Info size={16} className="mt-0.5 shrink-0 text-[#5B2BD8]" /><div><p className="text-[10px] font-bold text-[#5B2BD8]">Maintenance Policy Reminder</p><p className="mt-0.5 text-[10px] text-text-secondary">Ensure all vehicles are serviced as per manufacturer recommendations to maintain optimal performance and safety.</p></div></div>
        <Link to="/settings" className="inline-flex shrink-0 items-center justify-center rounded-md border border-[#5B2BD8]/40 px-3 py-1.5 text-[10px] font-semibold text-[#5B2BD8] hover:bg-[#5B2BD8]/10">View Policy</Link>
      </div>
    </div>
  );
};

const MaintenanceDashboard: React.FC<{
  vehicles: Vehicle[];
  rows: MaintenanceRow[];
  inspectionVehicles: MaintenanceRow[];
  inServiceCount: number;
  dueSoonCount: number;
  scheduledCount: number;
}> = ({ vehicles, rows, inspectionVehicles, inServiceCount, dueSoonCount, scheduledCount }) => (
  <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[1.04fr_1fr]">
    <section className="min-w-0 overflow-hidden rounded-lg border border-border-default bg-bg-surface lg:min-h-[438px]">
      <div className="p-3 pb-2"><PanelHeader icon={<Wrench size={15} />} title="Maintenance Queue" subtitle="Assets with service status or inspection dates requiring review." /></div>
      <div className="px-3 pb-3">
        <div className="overflow-hidden rounded-lg border border-border-default">
          <div className="hidden grid-cols-[1.35fr_.78fr_1fr_.72fr_20px] gap-2 border-b border-border-default bg-bg-surface-raised/35 px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-text-secondary sm:grid"><span>Vehicle</span><span>Status</span><span>Next Inspection</span><span>Odometer</span><span /></div>
          {rows.slice(0, 6).map((vehicle) => <MaintenanceRowItem key={vehicle.id} vehicle={vehicle} />)}
          {!rows.length && <EmptyState text="No maintenance items need attention." />}
        </div>
        <Link to="/vehicles" className="mx-auto mt-3 flex w-fit items-center gap-1 rounded-md border border-[#5B2BD8]/40 px-3 py-1.5 text-[10px] font-semibold text-[#5B2BD8] hover:bg-[#5B2BD8]/10">View All Maintenance <ArrowRight size={11} /></Link>
      </div>
    </section>

    <div className="min-w-0 space-y-3">
      <section className="min-w-0 rounded-lg border border-border-default bg-bg-surface p-3">
        <PanelHeader icon={<Zap size={15} />} title="Maintenance Insights" subtitle="Overview of service readiness across the fleet." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.05fr_.95fr]">
          <div className="min-w-0 rounded-lg border border-border-default p-3"><p className="text-[10px] font-bold text-text-primary">Service Status Distribution</p><div className="mt-3 flex min-w-0 items-center justify-center gap-3"><StatusDonut total={vehicles.length} inService={inServiceCount} dueSoon={dueSoonCount} scheduled={scheduledCount} /><div className="min-w-0 space-y-2 text-[9px] text-text-secondary"><Legend color="#EF4444" label="In Service" value={inServiceCount} total={vehicles.length} /><Legend color="#F97316" label="Due Soon" value={dueSoonCount} total={vehicles.length} /><Legend color="#49B675" label="Scheduled" value={scheduledCount} total={vehicles.length} /></div></div></div>
          <div className="min-w-0 rounded-lg border border-border-default p-3"><p className="text-[10px] font-bold text-text-primary">Upcoming Inspections</p><div className="mt-2 space-y-2">{inspectionVehicles.map((vehicle) => <InspectionItem key={vehicle.id} vehicle={vehicle} />)}{!inspectionVehicles.length && <EmptyState text="No inspections scheduled." />}</div></div>
        </div>
      </section>
      <section className="rounded-lg border border-border-default bg-bg-surface p-3"><PanelHeader icon={<Zap size={15} />} title="Quick Actions" subtitle="Common maintenance operations." /><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><QuickAction tone="purple" icon={<CalendarCheck size={17} />} label="Schedule Service" to="/vehicles" /><QuickAction tone="orange" icon={<Settings2 size={17} />} label="Log Maintenance" to="/vehicles" /><QuickAction tone="red" icon={<Fuel size={17} />} label="Log Fuel Entry" to="/admin/maintenance" /><QuickAction tone="green" icon={<FileText size={17} />} label="View Service History" to="/vehicles" /></div></section>
    </div>
  </div>
);

const FuelDashboard: React.FC<{ vehicles: Vehicle[]; lowFuelVehicles: Vehicle[] }> = ({ vehicles, lowFuelVehicles }) => (
  <section className="rounded-lg border border-border-default bg-bg-surface p-3"><PanelHeader icon={<Fuel size={15} />} title="Fuel Readiness" subtitle="Fuel level, tank capacity, consumption rate, and estimated operating range." /><div className="divide-y divide-border-default rounded-lg border border-border-default">{vehicles.map((vehicle) => { const range = vehicle.fuel_tank_capacity_liters && vehicle.fuel_consumption_liters_per_100km ? Math.round(((vehicle.fuel_tank_capacity_liters * (vehicle.fuel_level ?? 0)) / 100 / vehicle.fuel_consumption_liters_per_100km) * 100) : null; return <div key={vehicle.id} className="grid grid-cols-1 gap-3 px-3 py-3 sm:grid-cols-[1.2fr_.8fr_1fr_1fr] sm:items-center"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#5B2BD8]/10 text-[#5B2BD8]"><Truck size={15} /></div><div><p className="text-[11px] font-bold text-text-primary">{vehicle.registration_number}</p><p className="text-[9px] text-text-secondary">{vehicleName(vehicle)}</p></div></div><div className="text-[10px] text-text-secondary">{vehicle.fuel_level ?? 0}% fuel</div><div className="text-[10px] text-text-secondary">{vehicle.fuel_tank_capacity_liters ? `${vehicle.fuel_tank_capacity_liters} L tank` : 'Tank size missing'}<br />{vehicle.fuel_consumption_liters_per_100km ? `${vehicle.fuel_consumption_liters_per_100km} L/100km` : 'Consumption missing'}</div><div className={`text-[10px] font-semibold ${lowFuelVehicles.some((item) => item.id === vehicle.id) ? 'text-red-500' : 'text-text-secondary'}`}>{range ? `${range.toLocaleString()} km estimated range` : 'Range data missing'}</div></div>; })}{!vehicles.length && <EmptyState text="No assets registered yet." />}</div></section>
);

const MaintenanceRowItem: React.FC<{ vehicle: MaintenanceRow }> = ({ vehicle }) => <div className="grid grid-cols-1 gap-2 border-b border-border-default px-3 py-2.5 last:border-0 sm:grid-cols-[1.35fr_.78fr_1fr_.72fr_20px] sm:items-center sm:gap-2"><div className="flex min-w-0 items-center gap-2"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#5B2BD8]/8 text-[#5B2BD8]"><Truck size={14} /></div><div className="min-w-0"><p className="truncate text-[10px] font-bold text-text-primary">{vehicle.registration_number}</p><p className="truncate text-[9px] text-text-secondary">{vehicleName(vehicle)}</p></div></div><span className={`w-fit rounded-full px-2 py-1 text-[9px] font-semibold ${statusStyles[vehicle.queueStatus]}`}>{vehicle.queueStatus}</span><div className="text-[9px] text-text-secondary"><p className={vehicle.next_inspection_date && isPast(new Date(vehicle.next_inspection_date)) ? 'font-semibold text-red-500' : 'text-text-primary'}>{formatInspection(vehicle.next_inspection_date)}</p><p>{vehicle.next_inspection_date && isPast(new Date(vehicle.next_inspection_date)) ? `Overdue by ${Math.abs(daysUntil(vehicle.next_inspection_date) || 0)} days` : vehicle.next_inspection_date ? `In ${daysUntil(vehicle.next_inspection_date)} days` : 'Date required'}</p></div><span className="text-[9px] text-text-secondary">{vehicle.odometer_km ? `${vehicle.odometer_km.toLocaleString()} km` : 'Not recorded'}</span><ChevronRight size={13} className="text-text-tertiary" />
</div>;

const InspectionItem: React.FC<{ vehicle: MaintenanceRow }> = ({ vehicle }) => { const overdue = vehicle.next_inspection_date && isPast(new Date(vehicle.next_inspection_date)); return <div className="flex items-center gap-2"><div className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-md ${overdue ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}><span className="text-[9px] font-bold">{vehicle.next_inspection_date ? format(new Date(vehicle.next_inspection_date), 'dd') : '--'}</span><span className="text-[7px] font-bold uppercase">{vehicle.next_inspection_date ? format(new Date(vehicle.next_inspection_date), 'MMM') : 'N/A'}</span></div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-text-primary">{vehicle.registration_number}</p><p className="truncate text-[9px] text-text-secondary">{vehicleName(vehicle)}</p></div><span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${overdue ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>{overdue ? 'Overdue' : `In ${daysUntil(vehicle.next_inspection_date)} days`}</span></div>; };

const TabButton: React.FC<{ active: boolean; icon: React.ReactNode; onClick: () => void; children: React.ReactNode }> = ({ active, icon, onClick, children }) => <button type="button" onClick={onClick} className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-1.5 text-[11px] font-semibold transition-colors ${active ? 'bg-[#4B18B9] text-white shadow-sm' : 'text-text-secondary hover:bg-bg-surface-raised'}`}>{icon}{children}</button>;
const KpiCard: React.FC<{ label: string; value: string | number; detail: string; icon: React.ReactNode; tone: 'purple' | 'orange' | 'red' | 'green' }> = ({ label, value, detail, icon, tone }) => { const styles = { purple: 'bg-[#5B2BD8]/10 text-[#5B2BD8]', orange: 'bg-orange-500/10 text-orange-500', red: 'bg-red-500/10 text-red-500', green: 'bg-emerald-500/10 text-emerald-600' }; return <div className="relative rounded-lg border border-border-default bg-bg-surface p-4"><MoreVertical size={15} className="absolute right-3 top-4 text-text-tertiary" /><div className="flex items-center gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles[tone]}`}>{icon}</div><div><p className="text-[10px] font-semibold text-text-secondary">{label}</p><p className={`mt-0.5 text-[21px] font-bold leading-none ${tone === 'purple' ? 'text-[#4B18B9]' : tone === 'orange' ? 'text-orange-500' : tone === 'red' ? 'text-red-500' : 'text-emerald-600'}`}>{value}</p><p className="mt-1 text-[9px] text-text-tertiary">{detail}</p></div></div></div>; };
const PanelHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => <div className="mb-3 flex items-start gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4B18B9] text-white">{icon}</div><div><h2 className="text-sm font-bold text-text-primary">{title}</h2><p className="mt-0.5 text-[10px] text-text-secondary">{subtitle}</p></div></div>;
const Legend: React.FC<{ color: string; label: string; value: number; total: number }> = ({ color, label, value, total }) => <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><span>{label}</span><span className="font-semibold text-text-primary">{value} ({total ? Math.round((value / total) * 100) : 0}%)</span></div>;
const StatusDonut: React.FC<{ total: number; inService: number; dueSoon: number; scheduled: number }> = ({ total, inService, dueSoon, scheduled }) => {
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { value: inService, color: '#EF4444' },
    { value: dueSoon, color: '#F97316' },
    { value: scheduled, color: '#49B675' },
  ];
  let offset = 0;
  return <div className="relative h-[126px] w-[126px] shrink-0"><svg viewBox="0 0 110 110" className="h-full w-full -rotate-90" aria-label="Service status distribution"><circle cx="55" cy="55" r={radius} fill="none" stroke="var(--color-bg-surface-raised)" strokeWidth="13" />{segments.map((segment) => { const length = total ? (segment.value / total) * circumference : 0; const dash = Math.max(length - 2, 0); const circle = <circle key={segment.color} cx="55" cy="55" r={radius} fill="none" stroke={segment.color} strokeWidth="13" strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} strokeLinecap="butt" />; offset += length; return circle; })}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-bold text-text-primary">{total}</span><span className="text-[9px] text-text-secondary">Total</span></div></div>;
};
const QuickAction: React.FC<{ icon: React.ReactNode; label: string; to: string; tone: 'purple' | 'orange' | 'red' | 'green' }> = ({ icon, label, to, tone }) => { const tones = { purple: 'bg-[#5B2BD8]/10 text-[#5B2BD8]', orange: 'bg-orange-500/10 text-orange-500', red: 'bg-red-500/10 text-red-500', green: 'bg-emerald-500/10 text-emerald-600' }; return <Link to={to} className="group flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-md border border-border-default px-2 text-center text-[9px] font-semibold text-text-primary transition-all hover:-translate-y-0.5 hover:border-[#5B2BD8]/30 hover:shadow-sm"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]} transition-transform group-hover:scale-105`}>{icon}</span>{label}</Link>; };
const EmptyState: React.FC<{ text: string }> = ({ text }) => <div className="px-4 py-10 text-center text-[10px] text-text-tertiary">{text}</div>;
const MaintenanceSkeleton: React.FC = () => <div className="space-y-4"><div className="h-12 animate-pulse rounded-lg bg-bg-surface-raised" /><div className="grid grid-cols-4 gap-3">{[1, 2, 3, 4].map((item) => <div key={item} className="h-24 animate-pulse rounded-lg bg-bg-surface-raised" />)}</div><div className="h-[430px] animate-pulse rounded-lg bg-bg-surface-raised" /></div>;
const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => <div className="rounded-lg border border-border-default bg-bg-surface p-10 text-center"><AlertTriangle className="mx-auto mb-2 text-red-500" /><p className="text-sm font-semibold text-text-primary">Operations data unavailable</p><Button className="mt-4" size="small" variant="outline" onClick={onRetry}>Retry</Button></div>;
