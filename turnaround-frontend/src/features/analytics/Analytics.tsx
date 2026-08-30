import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes, formatDateShort } from '../../lib/format';
import { useTheme } from '../../lib/ThemeContext';
import {
  BarChart3, Clock, DollarSign, Sparkles, ArrowRight
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { useCorridorAnalysis } from '../../hooks/useAIAdvisor';

export const Analytics: React.FC = () => {
  const [dateRange, setDateRange] = useState<string>('14');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: trendData, isLoading: loadingTrends } = useQuery({
    queryKey: ['trendData'],
    queryFn: apiClient.getTrendData
  });

  const { data: locationStats, isLoading: loadingLocations } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats
  });

  const { data: analystReport } = useCorridorAnalysis();

  const filteredTrends = useMemo(() => {
    return trendData ? trendData.slice(-Number(dateRange)) : [];
  }, [trendData, dateRange]);

  const sortedLocations = useMemo(() => {
    return locationStats ? [...locationStats].sort((a, b) => b.financial_impact - a.financial_impact) : [];
  }, [locationStats]);

  const totalLoss = filteredTrends.reduce((acc, d) => acc + d.estimated_cost, 0);
  const totalVisits = filteredTrends.reduce((acc, d) => acc + d.visit_count, 0);
  const totalDelays = filteredTrends.reduce((acc, d) => acc + d.delayed_visit_count, 0);
  const avgDwell = filteredTrends.length
    ? Math.round(filteredTrends.reduce((acc, d) => acc + d.average_dwell_minutes, 0) / filteredTrends.length)
    : 0;

  // ── APACHE ECHARTS: Dwell Trend Option ──
  const dwellTrendOption = useMemo<EChartsOption>(() => {
    const dates = filteredTrends.map((d) => formatDateShort(d.date));
    const dwells = filteredTrends.map((d) => Math.round(d.average_dwell_minutes));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#180B4A' : '#FFFFFF',
        borderColor: '#250C77',
        borderWidth: 1,
        textStyle: { color: isDark ? '#FFFFFF' : '#111827', fontSize: 11 },
        formatter: (params: any) => {
          const item = params[0];
          return `<div style="font-weight:700">${item.name}</div><div style="color:#250C77">Avg Dwell: ${formatMinutes(item.value)}</div>`;
        },
      },
      grid: { top: 15, right: 15, bottom: 25, left: 35 },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } },
        axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } },
        axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10 },
      },
      series: [
        {
          name: 'Avg Dwell',
          type: 'line',
          smooth: true,
          data: dwells,
          lineStyle: { width: 2.5, color: '#250C77' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(37, 12, 119, 0.4)' },
                { offset: 1, color: 'rgba(37, 12, 119, 0.0)' },
              ],
            },
          },
        },
      ],
    };
  }, [filteredTrends, isDark]);

  // ── APACHE ECHARTS: Financial Loss Option ──
  const financialLossOption = useMemo<EChartsOption>(() => {
    const dates = filteredTrends.map((d) => formatDateShort(d.date));
    const losses = filteredTrends.map((d) => d.estimated_cost);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#180B4A' : '#FFFFFF',
        borderColor: '#ED642B',
        borderWidth: 1,
        textStyle: { color: isDark ? '#FFFFFF' : '#111827', fontSize: 11 },
        formatter: (params: any) => {
          const item = params[0];
          return `<div style="font-weight:700">${item.name}</div><div style="color:#ED642B">Loss: ${formatCurrency(item.value)}</div>`;
        },
      },
      grid: { top: 15, right: 15, bottom: 25, left: 50 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } },
        axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } },
        axisLabel: {
          color: isDark ? '#9CA3AF' : '#6B7280',
          fontSize: 10,
          formatter: (v: number) => `${(v / 1000).toFixed(0)}K`,
        },
      },
      series: [
        {
          name: 'Loss (KES)',
          type: 'bar',
          data: losses,
          itemStyle: {
            color: '#ED642B',
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [filteredTrends, isDark]);

  if (loadingTrends || loadingLocations) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-full bg-bg-surface-raised rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-bg-surface-raised rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-80 bg-bg-surface-raised rounded-xl" />
          <div className="h-80 bg-bg-surface-raised rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary tracking-tight">Fleet & Stop Turnaround Analytics</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Audit historical turnaround cycles, demurrage losses, and recurring stop congestion patterns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/ai-advisor"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#ED642B]/15 border border-[#ED642B]/35 hover:bg-[#ED642B]/25 text-[#ED642B] text-xs font-bold transition-colors shrink-0"
          >
            <Sparkles size={13} />
            <span>Open Performance Analyst</span>
          </Link>

          <div className="w-40 sm:w-48">
            <Select
              value={dateRange}
              onChange={setDateRange}
              options={[
                { value: '7', label: 'Last 7 Days' },
                { value: '14', label: 'Last 14 Days' },
                { value: '30', label: 'Last 30 Days' },
                { value: '90', label: 'Last 90 Days' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* ── ANALYST INTELLIGENCE SUMMARY BANNER ── */}
      {analystReport && (
        <div className="rounded-2xl border border-[#ED642B]/35 bg-gradient-to-r from-[#250C77]/20 via-[#180B4A]/30 to-[#ED642B]/10 p-4 sm:p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ED642B] text-white uppercase tracking-wider">
                Analyst Executive Finding
              </span>
              <span className="text-xs text-text-tertiary font-numeric">Live Diagnostic Model</span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-text-primary leading-snug">
              {analystReport.executive_summary || 'Telemetry indicates recurring queue congestion at primary border crossings and harbor terminals.'}
            </p>
            <p className="text-xs text-text-secondary">
              Estimated Monthly Recovery: <span className="font-numeric font-bold text-[#ED642B]">+{formatCurrency(analystReport.estimated_monthly_savings_kes || 580000)}</span> through gate window staggering.
            </p>
          </div>

          <Link
            to="/ai-advisor"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#250C77] hover:bg-[#3D1BA8] text-white text-xs font-bold shadow-md transition-colors shrink-0"
          >
            <span>View Full Analyst Report</span>
            <ArrowRight size={13} className="text-[#ED642B]" />
          </Link>
        </div>
      )}

      {/* ── AGGREGATE HUD STATS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-[#ED642B]/30 bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-semibold text-[#ED642B]">Idle Capital Loss (Period)</span>
          <p className="font-numeric text-2xl font-extrabold text-[#ED642B] mt-2">
            {formatCurrency(totalLoss)}
          </p>
          <span className="text-[11px] text-text-tertiary">Cumulative idle demurrage</span>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-semibold text-text-secondary">Total Stop Visits</span>
          <p className="font-numeric text-2xl font-extrabold text-text-primary mt-2">
            {totalVisits}
          </p>
          <span className="text-[11px] text-text-tertiary">Recorded terminal passage events</span>
        </div>

        <div className={`rounded-xl border p-4 shadow-sm ${
          totalDelays > 0 ? 'bg-status-danger-bg/40 border-status-danger/40' : 'bg-bg-surface border-border-default'
        }`}>
          <span className="text-xs font-semibold text-text-secondary">Flagged Delay Incidents</span>
          <p className={`font-numeric text-2xl font-extrabold mt-2 ${totalDelays > 0 ? 'text-status-danger' : 'text-text-primary'}`}>
            {totalDelays}
          </p>
          <span className="text-[11px] text-text-tertiary">Exceeded target stop duration</span>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <span className="text-xs font-semibold text-text-secondary">Average Turnaround Time</span>
          <p className="font-numeric text-2xl font-extrabold text-text-primary mt-2">
            {formatMinutes(avgDwell)}
          </p>
          <span className="text-[11px] text-text-tertiary">Mean dwell per trip cycle</span>
        </div>
      </div>

      {/* ── CHARTS GRID (APACHE ECHARTS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily Dwell & Excess Dwell (Apache ECharts Area) */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Clock size={14} className="text-[#250C77]" />
                Daily Turnaround Trends (Minutes)
              </h2>
              <p className="text-[11px] text-text-tertiary mt-0.5">Average stop dwell across all fleet stops</p>
            </div>
            <span className="text-[10px] font-numeric font-bold px-2 py-0.5 rounded bg-bg-surface-raised text-text-secondary">
              Daily Average
            </span>
          </div>

          <div className="h-64 w-full">
            <ReactECharts
              option={dwellTrendOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </div>

        {/* Daily Financial Waste (Apache ECharts Bar) */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <DollarSign size={14} className="text-[#ED642B]" />
                Daily Financial Delay Losses (KES)
              </h2>
              <p className="text-[11px] text-text-tertiary mt-0.5">Quantified idle fleet operating expenses</p>
            </div>
            <span className="text-[10px] font-numeric font-bold px-2 py-0.5 rounded bg-[#ED642B]/10 text-[#ED642B]">
              KES Bleed
            </span>
          </div>

          <div className="h-64 w-full">
            <ReactECharts
              option={financialLossOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'svg' }}
            />
          </div>
        </div>
      </div>

      {/* ── FACILITY PERFORMANCE COMPARISON MATRIX ── */}
      <div className="rounded-2xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border-default bg-bg-surface-raised/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-[#ED642B]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Stop Congestion & Financial Loss Ranking
            </h2>
          </div>
          <span className="font-numeric text-[11px] text-text-tertiary font-semibold">
            Ranked by Cost Impact
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-dense">
            <thead>
              <tr className="bg-bg-surface-raised/50">
                <th>Rank</th>
                <th>Stop / Terminal</th>
                <th>Recorded Visits</th>
                <th>Average Dwell</th>
                <th>Average Excess</th>
                <th className="text-right">Period Financial Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {sortedLocations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-text-tertiary">
                    No stop analytics available.
                  </td>
                </tr>
              ) : (
                sortedLocations.map((loc, idx) => {
                  const excess = loc.avg_excess_delay_minutes || 0;
                  return (
                    <tr key={loc.location_id || idx} className="hover:bg-bg-surface-raised/30 transition-colors">
                      <td className="font-numeric text-xs font-bold text-text-tertiary">
                        0{idx + 1}
                      </td>
                      <td className="text-xs font-bold text-text-primary">
                        {loc.location_name}
                      </td>
                      <td className="font-numeric text-xs text-text-secondary">
                        {loc.total_visits} visits
                      </td>
                      <td className="font-numeric text-xs text-text-primary">
                        {formatMinutes(loc.avg_dwell_minutes)}
                      </td>
                      <td className="font-numeric text-xs font-bold">
                        {excess > 0 ? (
                          <span className={excess > 45 ? 'text-status-danger' : 'text-status-warning'}>
                            +{formatMinutes(excess)}
                          </span>
                        ) : (
                          <span className="text-status-good">On Target</span>
                        )}
                      </td>
                      <td className="text-right font-numeric text-xs font-bold text-[#ED642B]">
                        {formatCurrency(loc.financial_impact)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
