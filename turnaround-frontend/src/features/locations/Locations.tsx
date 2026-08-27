import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes } from '../../lib/format';
import { Link } from 'react-router-dom';
import { Search, MapPin, TrendingDown, ArrowRight } from 'lucide-react';

export const Locations: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Locations
  const { data: locations, isLoading: loadingLocs } = useQuery({
    queryKey: ['locations'],
    queryFn: apiClient.getLocations
  });

  // Fetch Location Stats for analytical rollups (costs, visits, etc.)
  const { data: locationStats, isLoading: loadingStats } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats
  });

  if (loadingLocs || loadingStats) {
    return <div className="p-12 text-center text-text-secondary">Loading operational facilities...</div>;
  }

  // Merge general location coordinates with calculated statistics
  const mergedLocations = locations?.map((loc) => {
    const stats = locationStats?.find((s) => s.location_id === loc.id) || {
      total_visits: 0,
      avg_dwell_minutes: 0,
      avg_excess_delay_minutes: 0,
      financial_impact: 0
    };
    return {
      ...loc,
      ...stats
    };
  }) || [];

  // Sort locations by financial impact descending (Section 8: "where is money leaking")
  const sortedLocations = [...mergedLocations].sort((a, b) => b.financial_impact - a.financial_impact);

  // Filter based on search
  const filteredLocations = sortedLocations.filter((loc) => {
    return (
      loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.location_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header HUD */}
      <div>
        <h1 className="font-ui text-xl font-bold text-text-primary">Operational Terminals</h1>
        <p className="text-xs text-text-secondary mt-1">
          Monitor loading bays, depots, ports, and border crossings, ranked descending by overhead leakage costs.
        </p>
      </div>

      {/* Filter HUD */}
      <div className="relative bg-bg-surface p-4 rounded-xl border border-border-default">
        <Search size={14} className="absolute left-7 top-7 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search locations by name or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-bg-surface-raised border border-border-default rounded px-3 py-2 pl-9 text-xs text-text-primary placeholder:text-text-tertiary focus:border-brand-500 focus:outline-none"
        />
      </div>

      {/* Locations Table */}
      <div className="panel-elevated bg-bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-default text-[10px] font-bold uppercase text-text-secondary tracking-wider bg-bg-surface-raised">
                <th className="py-3 px-4">Location Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Total Visits</th>
                <th className="py-3 px-4">Avg Turnaround</th>
                <th className="py-3 px-4">Allowed Dwell</th>
                <th className="py-3 px-4">Avg Excess Delay</th>
                <th className="py-3 px-4 text-right">Financial Overhead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default font-ui">
              {filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-tertiary">
                    No registered facilities match the query.
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-bg-surface-raised/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-text-primary">
                      <Link to={`/locations/${loc.id}`} className="hover:text-brand-400">
                        {loc.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-text-secondary capitalize">
                      {loc.location_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-numeric text-text-secondary">
                      {loc.total_visits}
                    </td>
                    <td className="py-3 px-4 font-numeric text-text-secondary">
                      {formatMinutes(loc.avg_dwell_minutes)}
                    </td>
                    <td className="py-3 px-4 font-numeric text-text-secondary">
                      {formatMinutes(loc.expected_dwell_minutes)}
                    </td>
                    <td className="py-3 px-4">
                      {loc.avg_excess_delay_minutes > 0 ? (
                        <span className="font-numeric font-bold text-status-warning">
                          +{formatMinutes(loc.avg_excess_delay_minutes)}
                        </span>
                      ) : (
                        <span className="font-numeric text-status-good">0m</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="font-numeric font-bold text-money-accent">
                          {formatCurrency(loc.financial_impact)}
                        </span>
                        <Link
                          to={`/locations/${loc.id}`}
                          className="p-1 rounded hover:bg-bg-surface text-text-secondary hover:text-text-primary"
                        >
                          <ArrowRight size={14} />
                        </Link>
                      </div>
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



