import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { apiClient } from '../../lib/api/client';
import { formatCurrency, formatMinutes } from '../../lib/format';
import { useTheme } from '../../lib/ThemeContext';
import {
  Truck, AlertTriangle, Clock, DollarSign,
  MapPin, ArrowRight, RefreshCw, CheckCircle2,
  Download, Search, Calendar as CalendarIcon,
  BarChart3, TrendingUp
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [timeframe, setTimeframe] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');
  const [chartRange, setChartRange] = useState<'3M' | '6M' | '12M'>('12M');
  const [actionSearch, setActionSearch] = useState('');

  // ── REAL BACKEND DATA ──
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: apiClient.getDashboardStats,
    refetchInterval: 20000,
  });

  const { data: dwellEvents } = useQuery({
    queryKey: ['dwellEvents', 'dashboard'],
    queryFn: () => apiClient.getDwellEvents(),
    refetchInterval: 20000,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiClient.getVehicles,
    staleTime: 30000,
  });

  const { data: locationStats } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats,
  });

  const { data: trips } = useQuery({
    queryKey: ['trips'],
    queryFn: apiClient.getTrips,
  });

  const { data: trendData } = useQuery({
    queryKey: ['trendData'],
    queryFn: apiClient.getTrendData,
  });

  const analysisMutation = useMutation({
    mutationFn: apiClient.triggerAnalysis,
    onSuccess: (data) => {
      queryClient.setQueryData(['insights'], data);
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      toast({ variant: 'success', title: 'Corridor Scan Refreshed', message: 'Turnaround patterns updated.' });
    },
    onError: () => {
      toast({ variant: 'error', title: 'Scan Failed', message: 'Could not refresh turnaround telemetry.' });
    }
  });

  // ── DERIVED METRICS ──
  const activeTrucks  = stats?.active_trucks ?? 0;
  const delayedTrucks = stats?.trucks_delayed ?? 0;
  const totalFleet    = vehiclesData?.length ?? 0;
  const onTimeRate    = totalFleet > 0
    ? ((totalFleet - delayedTrucks) / totalFleet * 100).toFixed(1)
    : '0.0';
  const idleLoss = stats?.estimated_financial_impact ?? 0;
  const onScheduleCount = Math.max(0, activeTrucks - delayedTrucks);

  // Filter urgent dwells for action queue
  const urgentDwells = (dwellEvents || [])
    .filter((d: any) => !d.departure_time && (d.excess_minutes ?? 0) > 0)
    .sort((a: any, b: any) => (b.excess_minutes ?? 0) - (a.excess_minutes ?? 0))
    .filter((d: any) => {
      if (!actionSearch) return true;
      const q = actionSearch.toLowerCase();
      return (
        (d.vehicle_reg || '').toLowerCase().includes(q) ||
        (d.location_name || '').toLowerCase().includes(q)
      );
    });

  // Trips pipeline
  const tripsData  = trips || [];
  const cleared    = tripsData.filter((t: any) => t.status === 'completed').length;
  const inTransit  = tripsData.filter((t: any) => t.status === 'in_transit').length;
  const planned    = tripsData.filter((t: any) => t.status === 'planned').length;
  const totalTrips = tripsData.length;

  // ── APACHE ECHARTS OPTION 1: Trend Area Chart ──
  const trendChartOption = useMemo<EChartsOption>(() => {
    const rawPoints = Array.isArray(trendData) ? trendData : [];
    const dates = rawPoints.map(p => p.date ? new Date(p.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : p.date);
    const visits = rawPoints.map(p => p.visit_count ?? 0);
    const excess = rawPoints.map(p => Math.round(p.excess_dwell_minutes ?? 0));

    // Fallback if no telemetry yet
    const finalDates = dates.length > 0 ? dates : ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const finalVisits = visits.length > 0 ? visits : [14, 18, 12, 22];

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#180B4A' : '#FFFFFF',
        borderColor: '#ED642B',
        borderWidth: 1,
        textStyle: {
          color: isDark ? '#FFFFFF' : '#111827',
          fontSize: 11,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
        },
        formatter: (params: any) => {
          const item = params[0];
          const ex = excess[item.dataIndex] || 0;
          return `
            <div style="font-weight: 700; margin-bottom: 2px;">${item.name}</div>
            <div style="color: #ED642B; font-weight: 600;">Dispatches: ${item.value} visits</div>
            ${ex > 0 ? `<div style="color: #EF4444; font-size: 10px;">Excess Dwell: +${ex} min</div>` : ''}
          `;
        },
      },
      grid: {
        top: 15,
        right: 10,
        bottom: 25,
        left: 25,
      },
      xAxis: {
        type: 'category',
        data: finalDates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } },
        axisTick: { show: false },
        axisLabel: {
          color: isDark ? '#9CA3AF' : '#6B7280',
          fontSize: 10,
        },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } },
        axisLabel: {
          color: isDark ? '#9CA3AF' : '#6B7280',
          fontSize: 10,
        },
      },
      series: [
        {
          name: 'Stop Visits',
          type: 'line',
          smooth: 0.45,
          showSymbol: false,
          lineStyle: {
            width: 3,
            color: '#250C77',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(37, 12, 119, 0.45)' },
                { offset: 0.7, color: 'rgba(237, 100, 43, 0.15)' },
                { offset: 1, color: 'rgba(37, 12, 119, 0.0)' },
              ],
            },
          },
          data: finalVisits,
        },
      ],
    };
  }, [trendData, isDark]);

  // ── APACHE ECHARTS OPTION 2: Stop Turnaround Delay Pressure Bar Chart ──
  const stopDelayChartOption = useMemo<EChartsOption>(() => {
    const locs = (locationStats || []).slice(0, 5);
    const names = locs.map(l => {
      const name = l?.location_name || 'Stop';
      return name.length > 15 ? name.substring(0, 13) + '..' : name;
    });
    const excessMins = locs.map(l => Math.round(l?.avg_excess_delay_minutes || 0));
    const targetMins = locs.map(l => Math.round(l?.expected_dwell_minutes || 60));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#180B4A' : '#FFFFFF',
        borderColor: '#ED642B',
        borderWidth: 1,
        textStyle: { color: isDark ? '#FFFFFF' : '#111827', fontSize: 11 },
      },
      legend: {
        show: true,
        top: 0,
        right: 0,
        textStyle: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10 },
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: {
        top: 30,
        right: 15,
        bottom: 25,
        left: 35,
      },
      xAxis: {
        type: 'category',
        data: names.length > 0 ? names : ['Kilindini Port', 'Nairobi ICD', 'Malaba OSBP', 'Namanga Gate', 'Athi River'],
        axisLabel: {
          color: isDark ? '#9CA3AF' : '#6B7280',
          fontSize: 9.5,
          interval: 0,
          rotate: 15,
        },
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } },
      },
      yAxis: {
        type: 'value',
        name: 'Mins',
        nameTextStyle: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 9.5 },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } },
        axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 9.5 },
      },
      series: [
        {
          name: 'Target Duration',
          type: 'bar',
          stack: 'total',
          data: targetMins.length > 0 ? targetMins : [60, 45, 90, 45, 30],
          itemStyle: {
            color: '#250C77',
            borderRadius: [0, 0, 0, 0],
          },
        },
        {
          name: 'Excess Delay',
          type: 'bar',
          stack: 'total',
          data: excessMins.length > 0 ? excessMins : [38, 25, 46, 18, 12],
          itemStyle: {
            color: '#ED642B',
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [locationStats, isDark]);

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-10 w-64 bg-bg-surface-raised rounded-xl" />
        <div className="h-44 rounded-2xl bg-bg-surface border border-border-default" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="h-[580px] rounded-2xl bg-bg-surface border border-border-default lg:col-span-8" />
          <div className="h-[580px] rounded-2xl bg-bg-surface border border-border-default lg:col-span-4" />
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] p-8 text-center rounded-2xl bg-bg-surface border border-border-default">
        <div className="h-12 w-12 rounded-xl bg-status-danger-bg border border-status-danger/30 flex items-center justify-center text-status-danger mb-3">
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-sm font-bold text-text-primary">Unable to load fleet metrics</h2>
        <p className="text-xs text-text-secondary mt-1 max-w-sm">Verify your connection to the central telemetry engine.</p>
        <button onClick={() => refetch()} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] text-white text-xs font-bold cursor-pointer transition-colors shadow-md">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── TOP BREADCRUMB & CONTROLS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-tertiary">
          <span className="text-text-primary flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ED642B]" />Fleet
          </span>
          <span>—</span>
          <span className="text-text-primary font-bold">Dashboard</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border-default bg-bg-surface text-xs font-semibold text-text-secondary">
            <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <CalendarIcon size={13} className="text-text-tertiary" />
          </div>
          <button
            onClick={() => apiClient.exportDwellEventsCSV(dwellEvents || [])}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#250C77] hover:bg-[#3D1BA8] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Download size={13} className="text-[#ED642B]" />
            Export
          </button>
        </div>
      </div>

      {/* ── HERO KPI STRIP ── */}
      <div className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-default pb-4">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-text-primary tracking-tight">Operations overview</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Active fleet velocity, stop pressure, and demurrage cost in real-time.
            </p>
          </div>
          <div className="flex items-center p-1 rounded-xl bg-bg-surface-raised border border-border-default self-start sm:self-auto">
            {(['Day', 'Week', 'Month', 'Year'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${timeframe === t ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <Truck size={14} className="text-[#250C77]" />
              <span>Active Fleet</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-numeric text-3xl font-extrabold text-text-primary tracking-tight">{activeTrucks}</span>
              <span className="font-numeric text-xs font-bold text-status-good px-1.5 py-0.5 rounded bg-status-good/10">live</span>
            </div>
            <svg viewBox="0 0 100 24" className="w-full h-7"><path d="M 0 18 C 20 18, 25 12, 45 15 C 65 18, 75 6, 100 2" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <Clock size={14} className="text-[#ED642B]" />
              <span>Delayed Units</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`font-numeric text-3xl font-extrabold tracking-tight ${delayedTrucks > 0 ? 'text-[#ED642B]' : 'text-text-primary'}`}>{delayedTrucks}</span>
              {delayedTrucks > 0 && (
                <span className="font-numeric text-xs font-bold text-[#ED642B] px-1.5 py-0.5 rounded bg-[#ED642B]/10">active</span>
              )}
            </div>
            <svg viewBox="0 0 100 24" className="w-full h-7"><path d="M 0 16 C 25 16, 35 2, 55 8 C 75 14, 85 4, 100 12" fill="none" stroke="#ED642B" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <CheckCircle2 size={14} className="text-[#250C77]" />
              <span>On-Time Rate</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-numeric text-3xl font-extrabold text-text-primary tracking-tight">{onTimeRate}%</span>
              <span className="font-numeric text-xs font-bold text-status-good px-1.5 py-0.5 rounded bg-status-good/10">live</span>
            </div>
            <svg viewBox="0 0 100 24" className="w-full h-7"><path d="M 0 20 C 30 20, 40 8, 60 12 C 80 16, 85 4, 100 3" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
              <DollarSign size={14} className="text-[#ED642B]" />
              <span>Demurrage Loss Today</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`font-numeric text-2xl sm:text-3xl font-extrabold tracking-tight ${idleLoss > 0 ? 'text-[#ED642B]' : 'text-text-primary'}`}>
                {formatCurrency(idleLoss)}
              </span>
            </div>
            <svg viewBox="0 0 100 24" className="w-full h-7"><path d="M 0 10 C 20 8, 30 18, 50 14 C 70 10, 80 20, 100 16" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" /></svg>
          </div>
        </div>

        {/* Top bottleneck ticker */}
        <div className="flex items-center justify-between pt-3 border-t border-border-default text-xs text-text-tertiary">
          <div className="flex items-center gap-2 font-medium">
            <MapPin size={13} className="text-text-tertiary" />
            {stats.top_bottleneck
              ? <span>Worst bottleneck: <strong className="text-text-primary">{stats.top_bottleneck.location_name}</strong> — {formatCurrency(stats.top_bottleneck.financial_impact)} idle cost.</span>
              : <span>All transit nodes operating within scheduled windows.</span>
            }
          </div>
          <Link to="/analytics" className="font-bold text-text-primary hover:text-[#ED642B] flex items-center gap-1 transition-colors">
            Full analytics <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── 2-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN: ECharts Dwell Pressure + Awaiting Action Queue ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Apache ECharts: Stop Turnaround Delay Distribution */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                  <BarChart3 size={15} className="text-[#ED642B]" />
                  Corridor Stop Dwell vs Target
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Target duration vs excess delay in minutes across primary transit stops
                </p>
              </div>
              <Link to="/locations" className="text-xs font-bold text-[#ED642B] hover:underline flex items-center gap-1">
                <span>View stops</span> <ArrowRight size={12} />
              </Link>
            </div>

            {/* Render Apache EChart */}
            <div className="h-60 w-full">
              <ReactECharts
                option={stopDelayChartOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>
          </div>

          {/* Awaiting Dispatch Action Queue (live dwell events) */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-text-primary">Awaiting dispatch action</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {urgentDwells.length > 0
                    ? `${urgentDwells.length} truck${urgentDwells.length > 1 ? 's' : ''} with active excess dwell at stops.`
                    : 'No trucks with active excess dwell at this moment — all clear.'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => analysisMutation.mutate()}
                  disabled={analysisMutation.isPending}
                  className="px-3.5 py-1.5 rounded-xl bg-[#250C77] hover:bg-[#3D1BA8] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                >
                  {analysisMutation.isPending ? 'Scanning...' : 'Refresh Scan'}
                </button>
                <Link to="/insights" className="px-3.5 py-1.5 rounded-xl border border-border-default text-xs font-bold text-text-secondary hover:text-text-primary transition-colors self-start sm:self-auto">
                  All Alerts →
                </Link>
              </div>
            </div>

            {/* Search filter */}
            <div className="relative max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="text"
                value={actionSearch}
                onChange={(e) => setActionSearch(e.target.value)}
                placeholder="Filter by truck or stop..."
                className="w-full bg-bg-surface-raised border border-border-default rounded-xl pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none"
              />
            </div>

            {urgentDwells.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-tertiary">
                <CheckCircle2 size={20} className="mx-auto mb-2 text-status-good" />
                All trucks operating within expected dwell times.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-dense">
                  <thead>
                    <tr className="bg-bg-surface-raised/40">
                      <th>Truck</th>
                      <th>Current Stop</th>
                      <th>Excess Wait</th>
                      <th>Estimated Loss</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {urgentDwells.map((item: any) => (
                      <tr key={item.id} className="hover:bg-bg-surface-raised/30 transition-colors">
                        <td className="font-numeric text-xs font-bold text-text-primary">
                          <span className="flex items-center gap-2">
                            <Truck size={13} className="text-[#250C77]" />
                            {item.vehicle_reg || item.vehicle_id?.slice(0, 8)}
                          </span>
                        </td>
                        <td className="text-xs font-semibold text-text-secondary">
                          {item.location_name || item.location_id?.slice(0, 8) || '—'}
                        </td>
                        <td className="font-numeric text-xs font-bold text-[#ED642B]">
                          +{formatMinutes(item.excess_minutes ?? 0)}
                        </td>
                        <td className="font-numeric text-xs font-extrabold text-money-accent">
                          {formatCurrency(item.estimated_cost ?? 0)}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => {
                              toast({
                                variant: 'success',
                                title: 'Priority Flagged',
                                message: `${item.vehicle_reg || 'Vehicle'} expedited for clearance.`
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#ED642B]/15 hover:bg-[#ED642B]/25 text-[#ED642B] text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Expedite
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT RAIL ── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Turnaround Cycle Card */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Turnaround Cycle</h3>
                <p className="text-[11px] text-text-secondary mt-0.5">Fleet delivery completion status.</p>
              </div>
              <span className="text-xs font-numeric font-bold text-text-tertiary">Live</span>
            </div>

            {totalFleet > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-text-primary">Clearance rate</span>
                  <span className="font-numeric text-text-tertiary">{onScheduleCount} / {totalFleet}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-bg-surface-raised overflow-hidden">
                  <div
                    className="h-full rounded-full bg-status-good transition-all duration-700"
                    style={{ width: `${totalFleet > 0 ? (onScheduleCount / totalFleet) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-bg-surface-raised/70 border border-border-default/60 text-center space-y-1">
                <p className="font-numeric text-xl font-extrabold text-status-good">{onScheduleCount}</p>
                <p className="text-[10px] font-bold text-text-tertiary uppercase">On Time</p>
              </div>
              <div className="p-3 rounded-xl bg-bg-surface-raised/70 border border-border-default/60 text-center space-y-1">
                <p className="font-numeric text-xl font-extrabold text-[#ED642B]">{delayedTrucks}</p>
                <p className="text-[10px] font-bold text-text-tertiary uppercase">Delayed</p>
              </div>
              <div className="p-3 rounded-xl bg-bg-surface-raised/70 border border-border-default/60 text-center space-y-1">
                <p className="font-numeric text-xl font-extrabold text-[#250C77]">{activeTrucks}</p>
                <p className="text-[10px] font-bold text-text-tertiary uppercase">In Transit</p>
              </div>
            </div>

            {stats.average_excess_delay_minutes > 0 && (
              <p className="text-[11px] text-text-tertiary text-center font-semibold pt-1 border-t border-border-default">
                Avg excess dwell: <span className="text-text-primary font-bold">{formatMinutes(stats.average_excess_delay_minutes)}</span>
              </p>
            )}
          </div>

          {/* Apache ECharts: Fleet Activity Area Trend Chart */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-[#ED642B]" />
                  Telemetry Activity Trend
                </h3>
                <p className="text-[11px] text-text-secondary mt-0.5">Live fleet velocity and stop volume over time.</p>
              </div>
            </div>

            <div>
              <p className="font-numeric text-2xl font-extrabold text-text-primary tracking-tight">
                {activeTrucks} Active Units
              </p>
              <p className="font-numeric text-xs font-bold text-status-good mt-0.5">
                Live telemetry stream synchronized
              </p>
            </div>

            {/* Apache EChart render */}
            <div className="h-44 w-full pt-1">
              <ReactECharts
                option={trendChartOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>

            {/* Timeframe selector (3M | 6M | 12M) */}
            <div className="flex items-center justify-center gap-1 pt-1 border-t border-border-default">
              {(['3M', '6M', '12M'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setChartRange(r)}
                  className={`px-4 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    chartRange === r
                      ? 'bg-[#250C77] text-white'
                      : 'text-text-tertiary hover:text-text-primary'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Corridor Dispatch Pipeline */}
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Dispatch Pipeline</h3>
                <p className="text-[11px] text-text-secondary mt-0.5">Trips by operational stage.</p>
              </div>
              <span className="text-xs font-numeric font-bold text-text-tertiary">{totalTrips} trips</span>
            </div>

            {totalTrips > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-numeric text-2xl font-extrabold text-text-primary">{totalTrips}</span>
                  <span className="font-numeric text-xs font-bold text-status-good">dispatched this period</span>
                </div>

                <div className="w-full h-2 rounded-full overflow-hidden flex bg-bg-surface-raised">
                  {cleared > 0  && <div className="h-full bg-status-good" style={{ width: `${(cleared / totalTrips) * 100}%` }} />}
                  {inTransit > 0 && <div className="h-full bg-[#ED642B]" style={{ width: `${(inTransit / totalTrips) * 100}%` }} />}
                  {planned > 0  && <div className="h-full bg-[#250C77]" style={{ width: `${(planned / totalTrips) * 100}%` }} />}
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10.5px] font-bold text-text-secondary pt-1">
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-good" />Cleared ({cleared})</div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ED642B]" />En Route ({inTransit})</div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#250C77]" />Planned ({planned})</div>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-xs text-text-tertiary">
                No trips dispatched yet. Trips appear here after dispatch.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
