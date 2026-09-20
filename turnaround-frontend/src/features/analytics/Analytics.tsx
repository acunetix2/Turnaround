import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes, formatDateShort } from '../../lib/format';
import { useTheme } from '../../lib/ThemeContext';
import { useFleetProductivity } from '../../hooks/useAnalytics';
import {
  BarChart3, Clock, DollarSign, Download, BarChart2, Gauge
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
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
    queryKey: ['trendData', dateRange],
    queryFn: () => apiClient.getTrendData(Number(dateRange))
  });

  const { data: locationStats, isLoading: loadingLocations } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats
  });

  // D-004: Fleet productivity from the backend endpoint
  const { data: productivity } = useFleetProductivity(Number(dateRange));

  const filteredTrends = trendData || [];

  const sortedLocations = useMemo(() => {
    return locationStats ? [...locationStats].sort((a, b) => b.financial_impact - a.financial_impact) : [];
  }, [locationStats]);

  const totalLoss = filteredTrends.reduce((acc, d) => acc + d.estimated_cost, 0);
  const totalVisits = filteredTrends.reduce((acc, d) => acc + d.visit_count, 0);
  const totalDelays = filteredTrends.reduce((acc, d) => acc + d.delayed_visit_count, 0);
  const avgDwell = filteredTrends.length
    ? Math.round(filteredTrends.reduce((acc, d) => acc + d.average_dwell_minutes, 0) / filteredTrends.length)
    : 0;
  const onTimeVisits = Math.max(0, totalVisits - totalDelays);
  const onTimeRate = totalVisits ? Math.round((onTimeVisits / totalVisits) * 1000) / 10 : 100;
  const costPerDelivery = totalVisits ? totalLoss / totalVisits : 0;

  // D-004: Use backend productivity score when available; fall back to client-side derivation
  // while the first fetch is in-flight so the UI never shows an empty slot.
  const productivityScore: number = (productivity as any)?.score ?? (
    filteredTrends.length > 0
      ? Math.min(
          Math.round(
            (filteredTrends.reduce((a, d) => a + (d.average_dwell_minutes ?? 0) * d.visit_count, 0) /
              Math.max(filteredTrends.reduce((a, d) => a + (d.average_dwell_minutes ?? 0) * d.visit_count, 0) +
                filteredTrends.reduce((a, d) => a + d.excess_dwell_minutes, 0), 1)) * 100,
          ),
          100,
        )
      : 100
  );

  // ── APACHE ECHARTS: Dwell Trend Option ──
  const dwellTrendOption = useMemo<EChartsOption>(() => {
    const dates = filteredTrends.map((d) => formatDateShort(d.date));
    const deliveries = filteredTrends.map((d) => d.visit_count);

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
          return `<div style="font-weight:600">${item.name}</div><div style="color:#8B5CF6">Deliveries: ${item.value}</div>`;
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
          name: 'Deliveries',
          type: 'line',
          smooth: true,
          data: deliveries,
          lineStyle: { width: 2.5, color: '#8B5CF6' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(139, 92, 246, 0.35)' },
                { offset: 1, color: 'rgba(139, 92, 246, 0.0)' },
              ],
            },
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
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Analytics</h1>
          <p className="text-sm text-text-secondary mt-1">Track performance, monitor KPIs and gain insights into your logistics operations.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-surface border border-border-default text-text-primary text-xs font-medium cursor-pointer">
            <Download size={13} /> Export Report
          </button>

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

      {/* ── DELIVERY KPI STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard isLoading={loadingTrends} className="min-w-0 h-[104px] p-3">
          <MetricCardHeader href="/insights">
            <MetricCardLabel tooltip="Completed delivery visits recorded in the selected period" icon={<BarChart3 size={13} className="text-[#250C77]" />}>
              Total Deliveries
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent className="block min-w-0">
            <MetricCardValue>
              {totalVisits.toLocaleString()}
            </MetricCardValue>
            <MetricCardDifferential variant="positive" className="mt-1 whitespace-nowrap">
              {totalVisits ? '+12.5% prior' : 'No data'}
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={filteredTrends.map(t => ({ value: t.visit_count }))}
            color="#8B5CF6"
          />
        </MetricCard>

        <MetricCard isLoading={loadingTrends} className="min-w-0 h-[104px] p-3">
          <MetricCardHeader href="/locations">
            <MetricCardLabel
              tooltip="Total recorded terminal, bay, and border crossing visits"
              icon={<BarChart3 size={13} className="text-[#250C77]" />}
            >
              On-Time Rate
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent className="block min-w-0">
            <MetricCardValue>{onTimeRate}%</MetricCardValue>
            <MetricCardDifferential variant={onTimeRate >= 80 ? 'positive' : 'negative'} className="mt-1 whitespace-nowrap">
              {onTimeVisits} on time
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={filteredTrends.map(t => ({ value: t.visit_count ? ((t.visit_count - t.delayed_visit_count) / t.visit_count) * 100 : 100 }))}
            color="#10B981"
          />
        </MetricCard>

        <MetricCard isLoading={loadingTrends} className="min-w-0 h-[104px] p-3">
          <MetricCardHeader href="/insights">
            <MetricCardLabel
              tooltip="Number of arrivals where dwell exceeded facility expected duration"
              icon={<Clock size={13} className="text-status-danger" />}
            >
              Total Delay Cost
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent className="block min-w-0">
            <MetricCardValue className={totalDelays > 0 ? 'text-status-danger' : ''}>
              {formatCurrency(totalLoss)}
            </MetricCardValue>
            <MetricCardDifferential variant={totalDelays > 0 ? 'negative' : 'positive'} className="mt-1 whitespace-nowrap">
              {totalDelays > 0 ? `${totalDelays} delayed` : 'No delays'}
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={filteredTrends.map(t => ({ value: t.delayed_visit_count }))}
            color="#EF4444"
          />
        </MetricCard>

        <MetricCard isLoading={loadingTrends} className="min-w-0 h-[104px] p-3">
          <MetricCardHeader href="/locations">
            <MetricCardLabel
              tooltip="Average turnaround time per vehicle visit across the entire corridor network"
              icon={<Clock size={13} className="text-[#250C77]" />}
            >
              Avg Delivery Time
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent className="block min-w-0">
            <MetricCardValue>{(avgDwell / 60).toFixed(1)} hrs</MetricCardValue>
            <MetricCardDifferential variant={avgDwell <= 90 ? 'positive' : 'negative'} className="mt-1 whitespace-nowrap">
              per delivery
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={filteredTrends.map(t => ({ value: t.average_dwell_minutes }))}
            color="#250C77"
          />
        </MetricCard>

        {/* D-004: Fleet Productivity Score — from GET /analytics/fleet-productivity */}
        <MetricCard isLoading={loadingTrends} className="min-w-0 h-[104px] p-3">
          <MetricCardHeader href="/analytics">
            <MetricCardLabel
              tooltip="Fleet productivity: ratio of expected dwell to actual dwell as a percentage. 100% = every vehicle finished exactly on SLA. Lower scores indicate excess delays across the fleet."
              icon={<Gauge size={13} className={productivityScore >= 80 ? 'text-status-good' : productivityScore >= 60 ? 'text-status-warning' : 'text-status-danger'} />}
            >
              Cost per Delivery
            </MetricCardLabel>
          </MetricCardHeader>
          <MetricCardContent className="block min-w-0">
            <MetricCardValue className={totalLoss > 0 ? 'text-[#ED642B]' : ''}>
              {formatCurrency(costPerDelivery)}
            </MetricCardValue>
            <MetricCardDifferential
              className="mt-1 whitespace-nowrap"
              variant={productivityScore >= 80 ? 'positive' : 'negative'}
            >
              {totalVisits} trips
            </MetricCardDifferential>
          </MetricCardContent>
          <MetricCardSparkline
            data={filteredTrends.map(t => ({ value: t.visit_count ? t.estimated_cost / t.visit_count : 0 }))}
            color="#8B5CF6"
          />
        </MetricCard>
      </div>

      {/* ── CHARTS GRID (SUPABASE UI PATTERN) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        {/* Deliveries over time */}
        <div className="lg:col-span-2"><Chart isLoading={loadingTrends}>
          <ChartCard>
            <ChartHeader>
              <ChartTitle tooltip="Completed delivery visits recorded for each day in the selected period">
                <div className="flex items-center gap-1.5">
                  <BarChart3 size={13} className="text-[#250C77]" />
                  <span>Deliveries Over Time</span>
                </div>
              </ChartTitle>
              <ChartActions
                actions={[
                  {
                    label: 'Export',
                    onClick: () => {
                      const csv = filteredTrends.map(t => `${t.date},${t.visit_count},${t.delayed_visit_count}`).join('\n');
                      const blob = new Blob([`date,deliveries,delayed\n${csv}`], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `delivery-trends-${new Date().toISOString().slice(0, 10)}.csv`;
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
        </Chart></div>

        {/* Delivery status */}
        <Chart isLoading={loadingTrends}>
          <ChartCard>
            <ChartHeader>
              <ChartTitle tooltip="Delivery status breakdown from the selected analytics period">
                <div className="flex items-center gap-1.5">
                  <Gauge size={13} className="text-[#ED642B]" />
                  <span>Deliveries by Status</span>
                </div>
              </ChartTitle>
            </ChartHeader>
            <ChartContent
              isEmpty={filteredTrends.length === 0}
              emptyState={<ChartEmptyState icon={<BarChart2 size={16} />} title="No delivery data" description="No delivery statuses recorded" />}
              loadingState={<ChartLoadingState height={240} />}
            >
              <div className="h-60 w-full"><ReactECharts option={{ tooltip: { trigger: 'item' }, legend: { orient: 'vertical', right: 0, top: 'middle', textStyle: { color: isDark ? '#BDB6DE' : '#55488A', fontSize: 10 } }, series: [{ type: 'pie', radius: ['48%', '72%'], center: ['31%', '50%'], avoidLabelOverlap: true, label: { show: true, position: 'center', formatter: `${totalVisits}\nTotal`, color: isDark ? '#FFFFFF' : '#250C77', fontSize: 16, fontWeight: 700 }, data: [{ value: onTimeVisits, name: 'Delivered', itemStyle: { color: '#10B981' } }, { value: totalDelays, name: 'Delayed', itemStyle: { color: '#ED642B' } }] }] }} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} /></div>
            </ChartContent>
          </ChartCard>
        </Chart>

        <Chart isLoading={loadingLocations}>
          <ChartCard>
            <ChartHeader>
              <ChartTitle tooltip="Recorded delivery visits by monitored logistics location"><span>Deliveries by Region</span></ChartTitle>
            </ChartHeader>
            <ChartContent isEmpty={sortedLocations.length === 0} emptyState={<ChartEmptyState icon={<BarChart2 size={16} />} title="No region data" description="No location visits recorded" />} loadingState={<ChartLoadingState height={240} />}>
              <div className="h-[clamp(13rem,22vw,15rem)] min-h-[13rem] w-full"><ReactECharts option={{ backgroundColor: 'transparent', grid: { top: 10, right: 28, bottom: 20, left: 78, containLabel: true }, xAxis: { type: 'value', axisLabel: { color: isDark ? '#7D73A8' : '#8F84BE', fontSize: 10 }, splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' } } }, yAxis: { type: 'category', inverse: true, data: sortedLocations.slice(0, 5).map(location => location.location_name.split(/\s+\(|\s+-\s+|\s+Gate\s+/)[0].trim()), axisLabel: { color: isDark ? '#BDB6DE' : '#55488A', fontSize: 10, width: 70, overflow: 'truncate' } }, series: [{ type: 'bar', data: sortedLocations.slice(0, 5).map(location => location.total_visits), barWidth: 14, itemStyle: { color: '#8B5CF6', borderRadius: [0, 3, 3, 0] }, label: { show: true, position: 'right', color: isDark ? '#FFFFFF' : '#250C77', fontSize: 10 } }] }} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} /></div>
            </ChartContent>
          </ChartCard>
        </Chart>
      </div>

      {/* ── FACILITY PERFORMANCE COMPARISON MATRIX (SUPABASE TABLE) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <div className="rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border-default bg-bg-surface-raised/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-[#ED642B]" />
            <h2 className="text-xs font-semibold text-text-primary">
              Top Delivery Corridors
            </h2>
          </div>
          <span className="font-numeric text-[11px] text-text-tertiary font-medium">
            Ranked by delivery volume
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
      <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><DollarSign size={14} className="text-[#ED642B]" /><h2 className="text-xs font-semibold text-text-primary">Cost Breakdown</h2></div><span className="text-[10px] text-text-tertiary">{formatCurrency(totalLoss)} total</span></div>
        <div className="h-36"><ReactECharts option={{ tooltip: { trigger: 'item' }, legend: { orient: 'vertical', right: 0, top: 'middle', textStyle: { color: isDark ? '#BDB6DE' : '#55488A', fontSize: 10 } }, series: [{ type: 'pie', radius: ['45%', '68%'], center: ['28%', '50%'], label: { show: true, position: 'center', formatter: formatCurrency(totalLoss), color: isDark ? '#FFFFFF' : '#250C77', fontSize: 14, fontWeight: 700 }, data: sortedLocations.slice(0, 4).map((location, index) => ({ value: location.financial_impact, name: location.location_name, itemStyle: { color: ['#8B5CF6', '#ED642B', '#3B82F6', '#10B981'][index] } })) }] }} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} /></div>
        <div className="flex items-center justify-between mt-4 mb-3"><h2 className="text-xs font-semibold text-text-primary">Performance Insights</h2><Gauge size={14} className="text-[#ED642B]" /></div>
        <div className="space-y-2">
          <div className="rounded-lg border border-border-default bg-bg-surface-raised/40 p-3"><p className="text-[11px] text-text-primary">On-time delivery rate is <span className="font-bold text-status-good">{onTimeRate}%</span></p><p className="text-[10px] text-text-secondary mt-1">Based on {totalVisits.toLocaleString()} recorded deliveries in this period.</p></div>
          <div className="rounded-lg border border-border-default bg-bg-surface-raised/40 p-3"><p className="text-[11px] text-text-primary">{totalDelays ? `${totalDelays} delayed visits need attention` : 'No delayed visits recorded'}</p><p className="text-[10px] text-text-secondary mt-1">Average delivery time is {(avgDwell / 60).toFixed(1)} hours.</p></div>
          <div className="rounded-lg border border-border-default bg-bg-surface-raised/40 p-3"><p className="text-[11px] text-text-primary">Average cost per delivery is <span className="font-bold text-[#ED642B]">{formatCurrency(costPerDelivery)}</span></p><p className="text-[10px] text-text-secondary mt-1">Calculated from recorded excess dwell costs.</p></div>
        </div>
      </div>
      </div>
    </div>
  );
};
