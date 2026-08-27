import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes, formatDateTime, formatCoordinates } from '../../lib/format';
import {
  ArrowLeft,
  Calendar,
  Clock,
  AlertTriangle,
  MapPin,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const locationPhotos: Record<string, string> = {
  warehouse: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800',
  port: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=800',
  depot: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?q=80&w=800',
  border_crossing: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=800',
  customer_facility: 'https://images.unsplash.com/photo-1574122817606-2c186e0c69d8?q=80&w=800'
};

export const LocationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // Fetch single location profile
  const { data: location, isLoading: loadingLoc, isError: locError } = useQuery({
    queryKey: ['location', id],
    queryFn: () => apiClient.getLocationById(id || ''),
    enabled: !!id
  });

  // Fetch Location Stats list
  const { data: locationStats, isLoading: loadingStats } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats
  });

  // Fetch Dwells at this location
  const { data: dwells, isLoading: loadingDwells } = useQuery({
    queryKey: ['dwellEvents'],
    queryFn: () => apiClient.getDwellEvents(),
    enabled: !!id
  });

  if (loadingLoc || loadingStats || loadingDwells) {
    return <div className="p-12 text-center text-text-secondary">Retrieving facility details...</div>;
  }

  if (locError || !location) {
    return (
      <div className="p-12 text-center">
        <p className="text-status-danger font-semibold">Location not found.</p>
        <Link to="/locations" className="mt-4 inline-flex items-center gap-1 text-xs text-brand-400">
          <ArrowLeft size={12} /> Back to list
        </Link>
      </div>
    );
  }

  // Find stats for this location
  const stats = locationStats?.find((s) => s.location_id === location.id) || {
    total_visits: 0,
    avg_dwell_minutes: 0,
    expected_dwell_minutes: location.expected_dwell_minutes,
    avg_excess_delay_minutes: 0,
    financial_impact: 0,
    highest_risk_days: ['N/A'],
    highest_risk_period: 'N/A'
  };

  // Filter historical visits specifically to this location
  const localDwells = dwells?.filter((d) => d.location_id === location.id) || [];

  // Match photo banner
  const bannerPhoto = locationPhotos[location.location_type] || locationPhotos.customer_facility;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        to="/locations"
        className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Locations
      </Link>

      {/* Full-bleed photography banner with text scrim (Section 6 & 8) */}
      <div
        className="relative h-44 w-full overflow-hidden rounded-2xl bg-cover bg-center shadow-lg"
        style={{ backgroundImage: `url('${bannerPhoto}')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B0D] via-black/40 to-transparent"></div>
        <div className="absolute bottom-4 left-6 z-10">
          <div className="flex items-center gap-2">
            <span className="font-numeric text-xs font-bold tracking-widest text-brand-400 bg-brand-500/15 border border-brand-500/25 px-2 py-0.5 rounded capitalize">
              {location.location_type.replace('_', ' ')}
            </span>
            <span className="font-numeric text-xs text-text-secondary">
              {formatCoordinates(location.latitude, location.longitude)}
            </span>
          </div>
          <h1 className="mt-1 font-ui text-2xl font-extrabold text-white">
            {location.name}
          </h1>
        </div>
      </div>

      {/* Location Intelligence Readout Dashboard (Section 10 Spec) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Visits */}
        <div className="panel-elevated bg-bg-surface p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Total Visits (Lifetime)
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-numeric text-2xl font-bold text-text-primary">
              {stats.total_visits}
            </span>
            <span className="text-[10px] text-text-tertiary">Completed Logs</span>
          </div>
        </div>

        {/* Expected vs Actual Dwell */}
        <div className="panel-elevated bg-bg-surface p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Dwell baselines
          </span>
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Expected Dwell:</span>
              <span className="font-numeric font-semibold text-text-primary">
                {formatMinutes(stats.expected_dwell_minutes)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-secondary">Average Dwell:</span>
              <span className="font-numeric font-semibold text-brand-400">
                {formatMinutes(stats.avg_dwell_minutes)}
              </span>
            </div>
          </div>
        </div>

        {/* Average Excess Delay */}
        <div className="panel-elevated bg-bg-surface p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
            Avg Excess Delay
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`font-numeric text-2xl font-bold ${
              stats.avg_excess_delay_minutes > 0 ? 'text-status-warning' : 'text-status-good'
            }`}>
              {stats.avg_excess_delay_minutes > 0 ? `+${formatMinutes(stats.avg_excess_delay_minutes)}` : '0m'}
            </span>
          </div>
        </div>

        {/* Leakage Cost Overhead (Emphasis money accent) */}
        <div className="panel-elevated border-money-accent/10 bg-bg-surface p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-money-accent">
            Leaked Capital
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-numeric text-2xl font-bold text-money-accent">
              {formatCurrency(stats.financial_impact)}
            </span>
          </div>
        </div>
      </div>

      {/* Highest Risk analysis cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="panel-elevated bg-bg-surface p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded bg-status-warning-bg flex items-center justify-center text-status-warning shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Highest-Risk Operating Days
            </span>
            <p className="text-sm font-semibold text-text-primary mt-1">
              {stats.highest_risk_days.join(', ')}
            </p>
            <p className="text-xs text-text-secondary mt-1.5">
              Delay frequency and queue wait times spike significantly on these days.
            </p>
          </div>
        </div>

        <div className="panel-elevated bg-bg-surface p-5 flex items-start gap-4">
          <div className="h-10 w-10 rounded bg-status-danger-bg flex items-center justify-center text-status-danger shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Highest-Risk Operating Period
            </span>
            <p className="text-sm font-semibold text-text-primary mt-1">
              {stats.highest_risk_period}
            </p>
            <p className="text-xs text-text-secondary mt-1.5">
              Congestion is highest during these hours due to loading dock bottlenecks.
            </p>
          </div>
        </div>
      </div>

      {/* Visit log table */}
      <div className="panel-elevated bg-bg-surface p-5">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4">
          Recent Facility Dwells
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-default text-[10px] font-bold uppercase text-text-secondary tracking-wider">
                <th className="py-2.5">Date</th>
                <th className="py-2.5">Vehicle</th>
                <th className="py-2.5">Dwell Time</th>
                <th className="py-2.5">Allowed Dwell</th>
                <th className="py-2.5">Excess Delay</th>
                <th className="py-2.5 text-right">Leakage Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default font-ui">
              {localDwells.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-tertiary">
                    No recorded fleet dwells at this facility.
                  </td>
                </tr>
              ) : (
                localDwells.map((d) => (
                  <tr key={d.id} className="hover:bg-bg-surface-raised/40 transition-colors">
                    <td className="py-3 font-numeric text-text-secondary">
                      {formatDateTime(d.arrival_time)}
                    </td>
                    <td className="py-3 font-semibold text-brand-400">
                      <Link to={`/vehicles/${d.vehicle_id}`} className="hover:underline">
                        {d.vehicle_reg || 'Unknown Asset'}
                      </Link>
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



