import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes, formatDateShort } from '../../lib/format';
import { useTheme } from '../../lib/ThemeContext';
import {
  BarChart3, Clock, DollarSign, Sparkles, ArrowRight, Download, BarChart2
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { useCorridorAnalysis } from '../../hooks/useAIAdvisor';
import {
  Chart,
  ChartCard,
  ChartHeader,
  ChartTitle,
  ChartActions,
  ChartContent,
  ChartLoadingState,
  ChartEmptyState,
} from '../../components/ui/Chart';
import {
  MetricCard,
  MetricCardHeader,
  MetricCardLabel,
  MetricCardContent,
  MetricCardValue,
  MetricCardDifferential,
  MetricCardSparkline,
} from '../../components/ui/MetricCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

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
        textStyle: { color: isDark ? '#FFFFFF' : '#111827', fontSize: 11, fontFamily: 'inherit' },
        formatter: (params: any) => {
          const item = params[0];
          return `<div style="font-weight:600">${item.name}</div><div style="color:#250C77">Avg Dwell: ${formatMinutes(item.value)}</div>`;
        },
      },
      grid: { top: 15, right: 15, bottom: 25, left: 35 },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' } },
        axisLabel: { color: isDark ? '#7D73A8' : '#8F84BE', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } },
        axisLabel: { color: isDark ? '#7D73A8' : '#8F84BE', fontSize: 10 },
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

  // ── APACHE ECHARTS: Financial Delay Loss Option ──
  const financialLossOption = useMemo<EChartsOption>(() => {
    const dates = filteredTrends.map((d) => formatDateShort(d.date));
    const costs = filteredTrends.map((d) => Math.round(d.estimated_cost));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#180B4A' : '#FFFFFF',
        borderColor: '#ED642B',
        borderWidth: 1,
        textStyle: { color: isDark ? '#FFFFFF' : '#111827', fontSize: 11, fontFamily: 'inherit' },
        formatter: (params: any) => {
          const item = params[0];
          return `<div style="font-weight:600">${item.name}</div><div style="color:#ED642B">Demurrage Loss: ${formatCurrency(item.value)}</div>`;
        },
      },
      grid: { top: 15, right: 15, bottom: 25, left: 45 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' } },
        axisLabel: { color: isDark ? '#7D73A8' : '#8F84BE', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } },
        axisLabel: {
          color: isDark ? '#7D73A8' : '#8F84BE',
          fontSize: 10,
          formatter: (val: number) => `${(val / 1000).toFixed(0)}k`,
        },
      },
      series: [
        {
          name: 'Cost (KES)',
          type: 'bar',
          barWidth: 10,
          data: costs,
          itemStyle: {
            color: '#ED642B',
            borderRadius: [3, 3, 0, 0],
          },
        },
      ],
    };
  }, [filteredTrends, isDark]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-text-primary tracking-tight">Turnaround Analytics</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Audit historical turnaround cycles, demurrage losses, and recurring stop congestion patterns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/ai-advisor"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ED642B]/15 border border-[#ED642B]/35 hover:bg-[#ED642B]/25 text-[#ED642B] text-xs font-medium transition-colors shrink-0"
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
        <div className="rounded-xl border border-[#ED642B]/30 bg-bg-surface p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#ED642B] text-white uppercase tracking-wider">
                Analyst Finding
              </span>
              <span className="text-xs text-text-tertiary">Live Diagnostic Model</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-text-primary leading-snug">
              {analystReport.executive_summary || (totalLoss > 0
                ? `Telemetry indicates recurring queue congestion across active locations with KES ${totalLoss.toLocaleString()} in demurrage losses.`
                : 'All fleet assets operating within expected SLA turnaround thresholds. Zero excess demurrage detected.')}
            </p>
            <p className="text-xs text-text-secondary">
              {totalLoss > 0 ? (
                <>
                  Estimated Monthly Opportunity: <span className="font-semibold text-[#ED642B]">+{formatCurrency(Math.round(totalLoss * 4 * 0.45))}</span> via queue staggering and pre-clearance SLA enforcement.
                </>
              ) : (
                <span className="text-status-good">
                  Fleet operating at optimal velocity · Zero excess delay losses recorded for this period.
                </span>
              )}
            </p>
          </div>

          <Link
            to="/ai-advisor"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#250C77] hover:bg-[#3D1BA8] text-white text-xs font-medium shadow-sm transition-colors shrink-0"
          >
            <span>View Full Report</span>
            <ArrowRight size={13} className="text-[#ED642B]" />
          </Link>
        </div>
      )}

      {/* ── AGGREGATE HUD STATS (SUPABASE METRIC CARD PATTERN) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard isLoading={loadingTrends}>
          <MetricCardHeader href="/insights">
            <MetricCardLabel
              tooltip="Cumulative financial demurrage costs incurred during selected date range"
              icon={<DollarSign size={13} className="text-[#ED642B]" />}
            >
              Idle Demurrage Loss
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className={totalLoss > 0 ? 'text-[#ED642B]' : ''}>
              {formatCurrency(totalLoss)}
            </MetricCardValue>
            <MetricCardDifferential variant={totalLoss > 0 ? 'negative' : 'positive'}>
              Period
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={filteredTrends.map(t => ({ value: t.estimated_cost }))}
            color="#ED642B"
          />
        </MetricCard>

        <MetricCard isLoading={loadingTrends}>
          <MetricCardHeader href="/locations">
            <MetricCardLabel
              tooltip="Total recorded terminal, bay, and border crossing visits"
              icon={<BarChart3 size={13} className="text-[#250C77]" />}
            >
              Total Stop Visits
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{totalVisits}</MetricCardValue>
            <MetricCardDifferential variant="positive">
              visits
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={filteredTrends.map(t => ({ value: t.visit_count }))}
            color="#10B981"
          />
        </MetricCard>

        <MetricCard isLoading={loadingTrends}>
          <MetricCardHeader href="/insights">
            <MetricCardLabel
              tooltip="Number of arrivals where dwell exceeded facility expected duration"
              icon={<Clock size={13} className="text-status-danger" />}
            >
              Flagged Delay Incidents
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue className={totalDelays > 0 ? 'text-status-danger' : ''}>
              {totalDelays}
            </MetricCardValue>
            <MetricCardDifferential variant={totalDelays > 0 ? 'negative' : 'positive'}>
              {totalDelays > 0 ? 'SLA Breaches' : 'Clean'}
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={filteredTrends.map(t => ({ value: t.delayed_visit_count }))}
            color="#EF4444"
          />
        </MetricCard>

        <MetricCard isLoading={loadingTrends}>
          <MetricCardHeader href="/locations">
            <MetricCardLabel
              tooltip="Average turnaround time per vehicle visit across the entire corridor network"
              icon={<Clock size={13} className="text-[#250C77]" />}
            >
              Average Turnaround
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent>
            <MetricCardValue>{formatMinutes(avgDwell)}</MetricCardValue>
            <MetricCardDifferential variant={avgDwell <= 90 ? 'positive' : 'negative'}>
              per cycle
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={filteredTrends.map(t => ({ value: t.average_dwell_minutes }))}
            color="#250C77"
          />
        </MetricCard>
      </div>

      {/* ── CHARTS GRID (SUPABASE UI PATTERN) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily Dwell & Excess Dwell (Supabase Studio Chart Pattern) */}
        <Chart isLoading={loadingTrends}>
          <ChartCard>
            <ChartHeader>
              <ChartTitle tooltip="Average stop dwell duration in minutes across all monitored logistics hubs">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-[#250C77]" />
                  <span>Daily Turnaround Trends (Minutes)</span>
                </div>
              </ChartTitle>
              <ChartActions
                actions={[
                  {
                    label: 'Export',
                    onClick: () => {
                      const csv = filteredTrends.map(t => `${t.date},${t.average_dwell_minutes}`).join('\n');
                      const blob = new Blob([`date,avg_dwell_minutes\n${csv}`], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `turnaround-trends-${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                    },
                    icon: <Download size={11} />,
                  },
                ]}
              />
            </ChartHeader>
            <ChartContent
              isEmpty={filteredTrends.length === 0}
              emptyState={<ChartEmptyState icon={<BarChart2 size={16} />} title="No trend data" description="Try selecting a wider date range" />}
              loadingState={<ChartLoadingState height={240} />}
            >
              <div className="h-60 w-full">
                <ReactECharts
                  option={dwellTrendOption}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              </div>
            </ChartContent>
          </ChartCard>
        </Chart>

        {/* Daily Financial Waste (Supabase Studio Chart Pattern) */}
        <Chart isLoading={loadingTrends}>
          <ChartCard>
            <ChartHeader>
              <ChartTitle tooltip="Quantified financial demurrage losses due to excess dwell at customer and port stops">
                <div className="flex items-center gap-1.5">
                  <DollarSign size={13} className="text-[#ED642B]" />
                  <span>Daily Financial Delay Losses (KES)</span>
                </div>
              </ChartTitle>
              <ChartActions
                actions={[
                  {
                    label: 'Summary',
                    onClick: () => alert(`Total period demurrage loss: ${formatCurrency(totalLoss)}`),
                    icon: <BarChart3 size={11} />,
                  },
                ]}
              />
            </ChartHeader>
            <ChartContent
              isEmpty={filteredTrends.length === 0}
              emptyState={<ChartEmptyState icon={<BarChart2 size={16} />} title="No loss records" description="No financial delay incidents in this timeframe" />}
              loadingState={<ChartLoadingState height={240} />}
            >
              <div className="h-60 w-full">
                <ReactECharts
                  option={financialLossOption}
                  style={{ height: '100%', width: '100%' }}
                  opts={{ renderer: 'svg' }}
                />
              </div>
            </ChartContent>
          </ChartCard>
        </Chart>
      </div>

      {/* ── FACILITY PERFORMANCE COMPARISON MATRIX (SUPABASE TABLE) ── */}
      <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border-default bg-bg-surface-raised/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-[#ED642B]" />
            <h2 className="text-xs font-semibold text-text-primary">
              Stop Congestion & Financial Loss Ranking
            </h2>
          </div>
          <span className="font-numeric text-[11px] text-text-tertiary font-medium">
            Ranked by Cost Impact
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Stop / Terminal</TableHead>
              <TableHead>Recorded Visits</TableHead>
              <TableHead>Average Dwell</TableHead>
              <TableHead>Average Excess</TableHead>
              <TableHead className="text-right">Period Financial Loss</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loadingLocations ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-text-tertiary">
                  Loading stop rankings...
                </td>
              </tr>
            ) : sortedLocations.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-text-tertiary">
                  No stop analytics available.
                </td>
              </tr>
            ) : (
              sortedLocations.map((loc, idx) => {
                const excess = loc.avg_excess_delay_minutes || 0;
                return (
                  <TableRow key={loc.location_id || idx}>
                    <TableCell className="font-numeric font-medium text-text-tertiary">
                      0{idx + 1}
                    </TableCell>
                    <TableCell className="font-medium text-text-primary">
                      {loc.location_name}
                    </TableCell>
                    <TableCell className="font-numeric text-text-secondary">
                      {loc.total_visits} visits
                    </TableCell>
                    <TableCell className="font-numeric text-text-primary">
                      {formatMinutes(loc.avg_dwell_minutes)}
                    </TableCell>
                    <TableCell className="font-numeric font-medium">
                      {excess > 0 ? (
                        <span className={excess > 45 ? 'text-status-danger' : 'text-status-warning'}>
                          +{formatMinutes(excess)}
                        </span>
                      ) : (
                        <span className="text-status-good">On Target</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-numeric font-semibold text-[#ED642B]">
                      {formatCurrency(loc.financial_impact)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
