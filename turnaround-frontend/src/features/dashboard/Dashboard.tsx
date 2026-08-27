import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes } from '../../lib/format';
import {
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Clock,
  Navigation,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  // TanStack Query with 30 seconds polling interval
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: apiClient.getDashboardStats,
    refetchInterval: 30000 // Poll every 30s
  });

  const { data: locations } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats
  });

  const { data: activeDwells } = useQuery({
    queryKey: ['dwellEvents', 'active'],
    queryFn: () => apiClient.getDwellEvents()
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Banner Skeleton */}
        <div className="h-44 w-full animate-pulse rounded-2xl bg-bg-surface-raised"></div>
        {/* KPI Grid Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-bg-surface-raised"></div>
          ))}
        </div>
        {/* Main Body Skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-xl bg-bg-surface-raised lg:col-span-2"></div>
          <div className="h-80 animate-pulse rounded-xl bg-bg-surface-raised"></div>
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[400px]">
        <div className="panel-elevated p-8 max-w-md w-full flex flex-col items-center gap-4 bg-bg-surface-raised">
          <AlertTriangle size={32} className="text-status-danger" />
          <h2 className="text-lg font-semibold text-text-primary">Failed to Load Dashboard Stats</h2>
          <p className="text-sm text-text-secondary">
            The system encountered an error connecting to the operational database.
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 rounded bg-brand-500 hover:bg-brand-400 px-4 py-2 text-xs font-semibold text-white shadow focus:outline-none transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Filter out completed dwells to display only live/active delays on dashboard
  const liveDelays = activeDwells?.filter((d) => !d.departure_time && d.excess_minutes > 0) || [];

  // Sort locations by financial impact descending to show bottleneck rankings
  const rankedBottlenecks = locations ? [...locations].sort((a, b) => b.financial_impact - a.financial_impact) : [];

  return (
    <div className="space-y-6">
      {/* 1. Full-bleed photo banner with dark scrim (Section 6 & 8) */}
      <div
        className="relative h-44 w-full overflow-hidden rounded-2xl bg-cover bg-center shadow-lg"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200&auto=format&fit=crop')` // Unsplash high quality warehouse yard at dusk
        }}
      >
        {/* Gradient scrim overlay keeping text fully contrast-safe */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0D] via-black/40 to-transparent"></div>
        
        <div className="absolute bottom-4 left-6 z-10">
          <span className="font-numeric text-xs font-bold tracking-widest text-brand-400 uppercase">
            Platform Intelligence
          </span>
          <h1 className="mt-1 font-ui text-2xl font-extrabold text-white">
            Operational Excess Dashboard
          </h1>
          <p className="mt-1.5 text-xs text-text-secondary max-w-xl">
            Real-time GPS geofence analysis identifying fleet bottlenecks, active delay times, and immediate overhead costs.
          </p>
        </div>
      </div>

      {/* 2. KPI Strip (Section 5 & 8) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {/* Active Trucks */}
        <div className="panel-elevated bg-bg-surface-raised p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Active Trucks
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-numeric text-2xl font-bold text-text-primary">
              {stats.active_trucks}
            </span>
            <span className="text-[10px] text-text-tertiary">Fleet In Service</span>
          </div>
        </div>

        {/* Trucks Delayed (warning indicator if > 0) */}
        <div className={`panel-elevated p-4 flex flex-col justify-between ${
          stats.trucks_delayed > 0 ? 'border-status-danger/30 bg-status-danger-bg' : 'bg-bg-surface-raised'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Trucks Delayed
            </span>
            {stats.trucks_delayed > 0 && <AlertTriangle size={12} className="text-status-danger" />}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-numeric text-2xl font-bold ${
              stats.trucks_delayed > 0 ? 'text-status-danger' : 'text-text-primary'
            }`}>
              {stats.trucks_delayed}
            </span>
            <span className="text-[10px] text-text-secondary">In Geofence</span>
          </div>
        </div>

        {/* Excess Dwell Today */}
        <div className="panel-elevated bg-bg-surface-raised p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Excess Dwell Today
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-numeric text-2xl font-bold text-text-primary">
              {formatMinutes(stats.excess_dwell_today_minutes)}
            </span>
          </div>
        </div>

        {/* Estimated Financial Impact (Largest emphasis, money accent) */}
        <div className="panel-elevated border-money-accent/20 bg-bg-surface-raised p-4 flex flex-col justify-between md:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-money-accent">
              Est. Financial Impact
            </span>
            <DollarSign size={14} className="text-money-accent animate-pulse" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-numeric text-3xl font-bold text-money-accent">
              {formatCurrency(stats.estimated_financial_impact)}
            </span>
          </div>
          <span className="text-[10px] text-text-secondary mt-1">Today's Accumulated Waste</span>
        </div>

        {/* Average Excess Delay */}
        <div className="panel-elevated bg-bg-surface-raised p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Avg Excess Delay
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-numeric text-2xl font-bold text-text-primary">
              {formatMinutes(stats.average_excess_delay_minutes)}
            </span>
            <span className="text-[10px] text-text-tertiary">per visit</span>
          </div>
        </div>
      </div>

      {/* 3. Top Bottleneck Ribbon */}
      {stats.top_bottleneck && (
        <div className="panel-elevated bg-bg-surface-raised border-status-warning/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-status-warning-bg flex items-center justify-center text-status-warning">
              <TrendingUp size={16} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-status-warning">
                Top Fleet Bottleneck
              </span>
              <p className="text-sm font-semibold text-text-primary">
                {stats.top_bottleneck.location_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] text-text-secondary block">Impact Cost</span>
              <span className="font-numeric text-sm font-bold text-money-accent">
                {formatCurrency(stats.top_bottleneck.financial_impact)}
              </span>
            </div>
            <Link
              to={`/locations/${stats.top_bottleneck.location_id}`}
              className="rounded bg-bg-surface border border-border-default hover:bg-bg-canvas hover:border-brand-500 px-3 py-1.5 text-xs font-semibold text-brand-400 flex items-center gap-1.5 transition-colors"
            >
              Analyze Location
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}

      {/* 4. Below the fold analytics tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bottleneck Rankings Table */}
        <div className="panel-elevated bg-bg-surface p-5 lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
            <TrendingDown size={14} className="text-brand-400" />
            Location Turnaround Leakage
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default text-[10px] font-bold uppercase text-text-secondary tracking-wider">
                  <th className="py-2.5">Location</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Total Visits</th>
                  <th className="py-2.5">Avg Excess Delay</th>
                  <th className="py-2.5 text-right">Leakage Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default text-xs font-ui">
                {rankedBottlenecks.slice(0, 5).map((loc) => (
                  <tr key={loc.location_id} className="hover:bg-bg-surface-raised transition-colors">
                    <td className="py-3 font-semibold">
                      <Link to={`/locations/${loc.location_id}`} className="text-text-primary hover:text-brand-400">
                        {loc.location_name}
                      </Link>
                    </td>
                    <td className="py-3 text-text-secondary capitalize">
                      {loc.location_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 font-numeric text-text-secondary">
                      {loc.total_visits}
                    </td>
                    <td className="py-3 font-numeric text-text-secondary">
                      {formatMinutes(loc.avg_excess_delay_minutes)}
                    </td>
                    <td className="py-3 text-right font-numeric font-bold text-money-accent">
                      {formatCurrency(loc.financial_impact)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Delay Alert Ticker */}
        <div className="panel-elevated bg-bg-surface p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
            <Clock size={14} className="text-status-danger animate-pulse" />
            Active Terminal Delays
          </h2>
          
          {liveDelays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center h-48 border border-dashed border-border-default rounded-lg">
              <span className="text-xs text-text-tertiary">No active delays reported.</span>
              <span className="text-[10px] text-text-tertiary mt-1">All in-transit vehicles are clear.</span>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {liveDelays.map((delay) => (
                <div key={delay.id} className="rounded-lg bg-bg-surface-raised border border-status-danger/20 p-3 hover:border-status-danger/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-numeric text-xs font-bold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                        {delay.vehicle_reg}
                      </span>
                      <p className="text-xs font-semibold text-text-primary mt-1.5">
                        {delay.location_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-numeric text-xs font-semibold text-status-danger block">
                        +{formatMinutes(delay.excess_minutes)}
                      </span>
                      <span className="font-numeric text-[10px] text-money-accent font-semibold block mt-0.5">
                        {formatCurrency(delay.estimated_cost)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-text-secondary">
                    <Navigation size={10} />
                    <span>Dwell Elapsed: {formatMinutes(delay.dwell_minutes)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

