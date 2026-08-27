import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes, formatDateShort } from '../../lib/format';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { BarChart3, Calendar, Clock, DollarSign, TrendingUp } from 'lucide-react';
import { Select } from '../../components/ui/Select';

export const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('14'); // default last 14 days

  // Fetch Trend Data
  const { data: trendData, isLoading: loadingTrends } = useQuery({
    queryKey: ['trendData'],
    queryFn: apiClient.getTrendData
  });

  // Fetch Location Stats for ranking comparison
  const { data: locationStats, isLoading: loadingLocations } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats
  });

  if (loadingTrends || loadingLocations) {
    return <div className="p-12 text-center text-text-secondary">Generating operational analysis...</div>;
  }

  // Filter trends based on selected day count
  const filteredTrends = trendData ? trendData.slice(-Number(dateRange)) : [];

  // Format date names on XAxis
  const formattedTrends = filteredTrends.map((d) => ({
    ...d,
    formattedDate: formatDateShort(d.date)
  }));

  // Sort locations by financial overhead for bar comparisons
  const sortedLocations = locationStats ? [...locationStats].sort((a, b) => b.financial_impact - a.financial_impact) : [];

  // Summary Metrics over the selected range
  const totalLoss = filteredTrends.reduce((acc, d) => acc + d.estimated_cost, 0);
  const totalVisits = filteredTrends.reduce((acc, d) => acc + d.visit_count, 0);
  const totalDelays = filteredTrends.reduce((acc, d) => acc + d.delayed_visit_count, 0);
  const avgDwell = filteredTrends.length
    ? Math.round(filteredTrends.reduce((acc, d) => acc + d.average_dwell_minutes, 0) / filteredTrends.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* HUD Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-ui text-xl font-bold text-text-primary">Fleet Analytics</h1>
          <p className="text-xs text-text-secondary mt-1">
            Aggregate historical data illustrating delay costs, terminal visit cycles, and cumulative waste.
          </p>
        </div>

        {/* Date Selector */}
        <div className="w-48">
          <Select
            value={dateRange}
            onChange={setDateRange}
            options={[
              { value: '7', label: 'Last 7 Days' },
              { value: '14', label: 'Last 14 Days' },
              { value: '30', label: 'Last 30 Days' },
            ]}
          />
        </div>
      </div>

      {/* Aggregate HUD stats for the period */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel-elevated bg-bg-surface p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Visits Analyzed</span>
          <span className="font-numeric text-2xl font-bold text-text-primary block mt-1">{totalVisits}</span>
        </div>

        <div className="panel-elevated bg-bg-surface p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Flagged Delays</span>
          <span className="font-numeric text-2xl font-bold text-status-danger block mt-1">{totalDelays}</span>
        </div>

        <div className="panel-elevated bg-bg-surface p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Mean Turnaround</span>
          <span className="font-numeric text-2xl font-bold text-text-primary block mt-1">{formatMinutes(avgDwell)}</span>
        </div>

        <div className="panel-elevated border-money-accent/15 bg-bg-surface p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-money-accent font-semibold">Leaked Capital (Period)</span>
          <span className="font-numeric text-xl font-bold text-money-accent block mt-1">{formatCurrency(totalLoss)}</span>
        </div>
      </div>

      {/* Chart Layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Dwell & Excess Dwell (Line Chart) */}
        <div className="panel-elevated bg-bg-surface p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
            <Clock size={14} className="text-brand-400" />
            Daily Dwell Trends (Minutes)
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedTrends} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="formattedDate" stroke="#6B7280" fontSize={10} />
                <YAxis stroke="#6B7280" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1C21',
                    borderColor: 'rgba(255, 255, 255, 0.14)',
                    color: '#F4F5F7',
                    fontSize: 12
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="average_dwell_minutes"
                  name="Mean Dwell"
                  stroke="#4F7CFF" // --chart-1
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="excess_dwell_minutes"
                  name="Excess Delay"
                  stroke="#F5A524" // --chart-3
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Loss Area Chart */}
        <div className="panel-elevated bg-bg-surface p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
            <DollarSign size={14} className="text-money-accent" />
            Daily Capital Leaked (KES)
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTrends} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="formattedDate" stroke="#6B7280" fontSize={10} />
                <YAxis stroke="#6B7280" fontSize={10} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Cost']}
                  contentStyle={{
                    backgroundColor: '#1A1C21',
                    borderColor: 'rgba(255, 255, 255, 0.14)',
                    color: '#F4F5F7',
                    fontSize: 12
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="estimated_cost"
                  name="Operating Loss"
                  stroke="#FFB020" // money-accent
                  fill="rgba(255, 176, 32, 0.15)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Location Leakage Cost Comparison (Bar Chart) */}
        <div className="panel-elevated bg-bg-surface p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-brand-400" />
            Overhead Leakage by Facility (KES)
          </h2>
          <div className="h-64 w-full">
            {sortedLocations.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-text-tertiary">
                No location details to compare.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedLocations} margin={{ top: 5, right: 5, left: 10, bottom: 5 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" stroke="#6B7280" fontSize={9} tickFormatter={(v) => `KES ${v / 1000}k`} />
                  <YAxis dataKey="location_name" type="category" stroke="#6B7280" fontSize={9} width={120} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Accumulated Cost']}
                    contentStyle={{
                      backgroundColor: '#1A1C21',
                      borderColor: 'rgba(255, 255, 255, 0.14)',
                      color: '#F4F5F7',
                      fontSize: 12
                    }}
                  />
                  <Bar
                    dataKey="financial_impact"
                    name="Leaked Capital"
                    fill="#F0464C" // --chart-4 (Danger)
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Terminal Visit backlogs (Stacked Bar) */}
        <div className="panel-elevated bg-bg-surface p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-400" />
            Daily Ingestion: Total Visits vs. Delayed Visits
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedTrends} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="formattedDate" stroke="#6B7280" fontSize={10} />
                <YAxis stroke="#6B7280" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1C21',
                    borderColor: 'rgba(255, 255, 255, 0.14)',
                    color: '#F4F5F7',
                    fontSize: 12
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="visit_count" name="Clear Runs" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delayed_visit_count" name="Delayed Runs" fill="#F0464C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};



