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
  Download, Search,
  BarChart3, TrendingUp, User, Container, Layers
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import {
  Chart,
  ChartCard,
  ChartHeader,
  ChartTitle,
  ChartContent,
  ChartLine,
  ChartEmptyState,
  ChartLoadingState,
  ChartActions,
  ChartFooter,
} from '../../components/ui/Chart';
import { format } from 'date-fns';
import {
  DatePicker,
  DatePickerTrigger,
  DatePickerButton,
  DatePickerContent,
} from '../../components/ui/DatePicker';
import { Calendar } from '../../components/ui/Calendar';
import { Button } from '../../components/ui/Button';
import {
  MetricCard,
  MetricCardHeader,
  MetricCardLabel,
  MetricCardContent,
  MetricCardValue,
  MetricCardDifferential,
  MetricCardSparkline,
} from '../../components/ui/MetricCard';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeframe, setTimeframe] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');
  const [chartRange, setChartRange] = useState<'3M' | '6M' | '12M'>('12M');
  const [actionSearch, setActionSearch] = useState('');

  // ── ROI CALCULATOR STATE ──
  const [roiTrucks, setRoiTrucks] = useState<number>(24);
  const [roiDelaySaved, setRoiDelaySaved] = useState<number>(25); // minutes saved per trip
  const [roiHourlyRate, setRoiHourlyRate] = useState<number>(3500); // KES per hour

  // ── LIVE FINANCIAL DEMURRAGE BURN TICKER ──
  const [liveBurnCounter, setLiveBurnCounter] = useState<number>(0);

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
    queryFn: () => apiClient.getTrendData(),
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

  // Live Demurrage Cost Burn Ticker Effect
  React.useEffect(() => {
    if (delayedTrucks === 0) return;
    const interval = setInterval(() => {
      // Each delayed truck burns hourly rate / 3600 per second
      const burnPerSec = (delayedTrucks * 3500) / 3600;
      setLiveBurnCounter((prev) => prev + burnPerSec);
    }, 1000);
    return () => clearInterval(interval);
  }, [delayedTrucks]);

  // Derived ROI Savings
  const monthlySavings = Math.round(roiTrucks * 22 * 2 * (roiDelaySaved / 60) * roiHourlyRate);
  const annualSavings = Math.round(monthlySavings * 12);
  const fuelSavedLiters = Math.round(roiTrucks * 250 * 2 * (roiDelaySaved / 60) * 4.2); // ~4.2L idle burn/hr
  const co2ReductionTonnes = ((fuelSavedLiters * 2.68) / 1000).toFixed(1);
  const roiMultiplier = ((annualSavings / 450000)).toFixed(1); // Baseline platform cost vs savings

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
        <div className="h-32 bg-bg-surface-raised rounded-2xl" />
        <div className="h-72 bg-bg-surface-raised rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="h-96 bg-bg-surface-raised rounded-2xl lg:col-span-8" />
          <div className="h-96 bg-bg-surface-raised rounded-2xl lg:col-span-4" />
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
          <DatePicker>
            <DatePickerTrigger asChild>
              <DatePickerButton variant="outline" className="w-auto min-w-[140px]">
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : <span>Pick date</span>}
              </DatePickerButton>
            </DatePickerTrigger>
            <DatePickerContent align="right">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
            </DatePickerContent>
          </DatePicker>

          <Button
            variant="secondary"
            size="small"
            icon={<Download size={13} className="text-[#ED642B]" />}
            onClick={() => apiClient.exportDwellEventsCSV(dwellEvents || [])}
          >
            Export
          </Button>
        </div>
      </div>

      {/* ── HERO KPI STRIP ── */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-default pb-4">
          <div>
            <h1 className="text-base font-semibold text-text-primary tracking-tight">Operations overview</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Active fleet velocity, stop pressure, and demurrage cost in real-time.
            </p>
          </div>
          <div className="flex items-center p-0.5 rounded-lg bg-bg-surface-raised border border-border-default self-start sm:self-auto">
            {(['Day', 'Week', 'Month', 'Year'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${timeframe === t ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Metric Cards (Supabase UI Pattern) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard isLoading={isLoading}>
            <MetricCardHeader href="/vehicles">
              <MetricCardLabel
                tooltip="Active units in transit across corridors"
                icon={<Truck size={13} className="text-[#250C77]" />}
              >
                Active Fleet
              </MetricCardLabel>
            </MetricCardHeader>
            <MetricCardContent>
              <MetricCardValue>{activeTrucks}</MetricCardValue>
              <MetricCardDifferential variant="positive">
                live
              </MetricCardDifferential>
            </MetricCardContent>
            <MetricCardSparkline
              data={Array.from({ length: 8 }, (_, i) => ({ value: 12 + i * 2 + Math.sin(i) * 3 }))}
              color="#10B981"
            />
          </MetricCard>

          <MetricCard isLoading={isLoading}>
            <MetricCardHeader href="/insights">
              <MetricCardLabel
                tooltip="Units currently exceeding dwell target threshold"
                icon={<Clock size={13} className="text-[#ED642B]" />}
              >
                Delayed Units
              </MetricCardLabel>
            </MetricCardHeader>
            <MetricCardContent>
              <MetricCardValue className={delayedTrucks > 0 ? 'text-[#ED642B]' : ''}>
                {delayedTrucks}
              </MetricCardValue>
              {delayedTrucks > 0 ? (
                <MetricCardDifferential variant="negative">
                  active
                </MetricCardDifferential>
              ) : (
                <MetricCardDifferential variant="positive">
                  0 delay
                </MetricCardDifferential>
              )}
            </MetricCardContent>
            <MetricCardSparkline
              data={Array.from({ length: 8 }, (_, i) => ({ value: delayedTrucks > 0 ? 5 + i * 3 : 1 }))}
              color="#ED642B"
            />
          </MetricCard>

          <MetricCard isLoading={isLoading}>
            <MetricCardHeader href="/analytics">
              <MetricCardLabel
                tooltip="Percentage of fleet on schedule according to planned turnaround SLA"
                icon={<CheckCircle2 size={13} className="text-[#250C77]" />}
              >
                On-Time Rate
              </MetricCardLabel>
            </MetricCardHeader>
            <MetricCardContent>
              <MetricCardValue>{onTimeRate}%</MetricCardValue>
              <MetricCardDifferential variant={Number(onTimeRate) >= 80 ? 'positive' : 'negative'}>
                {Number(onTimeRate) >= 80 ? 'Optimal' : 'Attention'}
              </MetricCardDifferential>
            </MetricCardContent>
            <MetricCardSparkline
              data={Array.from({ length: 8 }, (_, i) => ({ value: 75 + i * 3 + Math.sin(i) * 4 }))}
              color="#10B981"
            />
          </MetricCard>

          <MetricCard isLoading={isLoading}>
            <MetricCardHeader href="/analytics">
              <MetricCardLabel
                tooltip="Cumulative financial demurrage cost incurred today from excessive loading/clearing dwell"
                icon={<DollarSign size={13} className="text-[#ED642B]" />}
              >
                Demurrage Loss Today
              </MetricCardLabel>
            </MetricCardHeader>
            <MetricCardContent>
              <MetricCardValue className={idleLoss > 0 ? 'text-[#ED642B]' : ''}>
                {formatCurrency(idleLoss)}
              </MetricCardValue>
              <MetricCardDifferential variant={idleLoss > 0 ? 'negative' : 'positive'}>
                {idleLoss > 0 ? 'Cost' : 'Zero'}
              </MetricCardDifferential>
            </MetricCardContent>
            <MetricCardSparkline
              data={Array.from({ length: 8 }, (_, i) => ({ value: (idleLoss || 20000) * (0.6 + i * 0.06) }))}
              color="#EF4444"
            />
          </MetricCard>
        </div>

        {/* Top bottleneck ticker */}
        <div className="flex items-center justify-between pt-3 border-t border-border-default text-xs text-text-tertiary flex-wrap gap-2">
          <div className="flex items-center gap-2 font-normal">
            <MapPin size={13} className="text-text-tertiary" />
            {stats.top_bottleneck
              ? <span>Worst bottleneck: <strong className="text-text-primary font-medium">{stats.top_bottleneck.location_name}</strong> — {formatCurrency(stats.top_bottleneck.financial_impact)} idle cost.</span>
              : <span>All transit nodes operating within scheduled windows.</span>
            }
          </div>

          {/* Live Demurrage Cost Burn Ticker */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#ED642B]/10 border border-[#ED642B]/20 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ED642B] animate-ping" />
            <span className="text-text-secondary font-medium">Active Fleet Burn:</span>
            <span className="font-numeric font-bold text-[#ED642B]">
              +{formatCurrency(idleLoss + liveBurnCounter)}
            </span>
          </div>

          <Link to="/analytics" className="font-medium text-text-primary hover:text-[#ED642B] flex items-center gap-1 transition-colors">
            Full analytics <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── FLEET COMPOSITION OVERVIEW ── */}
      {vehiclesData && vehiclesData.length > 0 && (() => {
        // Compute derived fleet metrics here
        const totalVehicles    = vehiclesData.length;
        const driversOnDuty    = vehiclesData.filter(v => v.driver_name).length;
        const containersActive = vehiclesData.filter(v => v.container_number).length;
        const inTransitNow     = vehiclesData.filter(v => v.status === 'moving').length;
        const inService        = vehiclesData.filter(v => v.maintenance_status === 'in_service').length;

        // Vehicle type breakdown
        const typeMap: Record<string, number> = {};
        vehiclesData.forEach(v => {
          const cat = v.vehicle_type?.split('(')[0]?.trim() || 'Other';
          typeMap[cat] = (typeMap[cat] || 0) + 1;
        });
        const sortedTypes = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);
        const paletteColors = ['#250C77', '#ED642B', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

        return (
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                  <Layers size={15} className="text-[#ED642B]" />
                  Fleet Composition
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Live breakdown of assets, drivers, containers, and vehicle categories.
                </p>
              </div>
              <a href="/vehicles" className="text-xs font-bold text-[#ED642B] hover:underline flex items-center gap-1">
                Manage assets <ArrowRight size={12} />
              </a>
            </div>

            {/* 4 summary chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-surface-raised/60 border border-border-default">
                <div className="h-8 w-8 rounded-lg bg-[#250C77]/20 flex items-center justify-center shrink-0">
                  <Truck size={15} className="text-[#250C77]" />
                </div>
                <div>
                  <p className="font-numeric text-lg font-extrabold text-text-primary">{totalVehicles}</p>
                  <p className="text-[10px] text-text-tertiary font-semibold">Total Assets</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-surface-raised/60 border border-border-default">
                <div className="h-8 w-8 rounded-lg bg-[#ED642B]/10 flex items-center justify-center shrink-0">
                  <User size={15} className="text-[#ED642B]" />
                </div>
                <div>
                  <p className="font-numeric text-lg font-extrabold text-text-primary">{driversOnDuty}</p>
                  <p className="text-[10px] text-text-tertiary font-semibold">Drivers Assigned</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-surface-raised/60 border border-border-default">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Container size={15} className="text-indigo-500" />
                </div>
                <div>
                  <p className="font-numeric text-lg font-extrabold text-text-primary">{containersActive}</p>
                  <p className="text-[10px] text-text-tertiary font-semibold">Containers Tracked</p>
                </div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                inService > 0
                  ? 'bg-yellow-500/5 border-yellow-500/30'
                  : 'bg-bg-surface-raised/60 border-border-default'
              }`}>
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  inService > 0 ? 'bg-yellow-500/15' : 'bg-status-good/10'
                }`}>
                  <CheckCircle2 size={15} className={inService > 0 ? 'text-yellow-500' : 'text-status-good'} />
                </div>
                <div>
                  <p className={`font-numeric text-lg font-extrabold ${
                    inService > 0 ? 'text-yellow-500' : 'text-text-primary'
                  }`}>{inTransitNow}</p>
                  <p className="text-[10px] text-text-tertiary font-semibold">In Transit Now</p>
                </div>
              </div>
            </div>

            {/* Vehicle type bar */}
            {sortedTypes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">By Vehicle Category</p>
                <div className="flex flex-wrap gap-2">
                  {sortedTypes.map(([type, count], idx) => {
                    const pct = Math.round((count / totalVehicles) * 100);
                    const color = paletteColors[idx % paletteColors.length];
                    return (
                      <div
                        key={type}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border-default bg-bg-surface-raised/40 text-xs"
                      >
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="font-semibold text-text-primary">{type}</span>
                        <span className="font-numeric font-bold" style={{ color }}>{count}</span>
                        <span className="text-text-tertiary text-[10px]">({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
                {/* Stacked proportional bar */}
                <div className="h-2 w-full rounded-full overflow-hidden flex">
                  {sortedTypes.map(([type, count], idx) => {
                    const pct = (count / totalVehicles) * 100;
                    const color = paletteColors[idx % paletteColors.length];
                    return <div key={type} title={`${type}: ${count}`} style={{ width: `${pct}%`, backgroundColor: color }} />;
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── FULL-WIDTH TELEMETRY ACTIVITY TREND ── */}
      <Chart isLoading={!trendData}>
        <ChartCard>
          <ChartHeader>
            <ChartTitle tooltip="Fleet velocity, stop visit volume and financial impact over time across corridors.">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-[#ED642B]" />
                Telemetry Activity Trend
              </div>
            </ChartTitle>
            <ChartActions>
              <div className="flex items-center p-0.5 rounded-md bg-bg-surface-raised border border-border-default">
                {(['3M', '6M', '12M'] as const).map((r) => (
                  <button key={r} onClick={() => setChartRange(r)}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      chartRange === r ? 'bg-[#250C77] text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary'
                    }`}>{r}</button>
                ))}
              </div>
              <Link to="/analytics" className="text-xs font-medium text-[#ED642B] hover:underline flex items-center gap-1">
                Full analytics <ArrowRight size={12} />
              </Link>
            </ChartActions>
          </ChartHeader>

          {/* Headline numbers */}
          <div className="flex items-center gap-6 px-4 pt-4 pb-0">
            <div>
              <p className="font-numeric text-2xl font-semibold text-text-primary">{activeTrucks} Active Units</p>
              <p className="text-[11px] text-status-good font-medium mt-0.5">Live telemetry synchronized</p>
            </div>
            {idleLoss > 0 && (
              <div className="ml-6 pl-6 border-l border-border-default">
                <p className="font-numeric text-2xl font-semibold text-[#ED642B]">{formatCurrency(idleLoss)}</p>
                <p className="text-[11px] text-text-tertiary font-medium mt-0.5">Today's idle cost</p>
              </div>
            )}
          </div>

          <ChartContent
            isEmpty={!trendData || (Array.isArray(trendData) && trendData.length === 0)}
            emptyState={<ChartEmptyState title="No telemetry data yet" description="Stop visits will appear here as vehicles move through monitored corridors." />}
            loadingState={<ChartLoadingState height={288} />}
            className="h-72"
          >
            <ChartLine
              data={(Array.isArray(trendData) ? trendData : []).map(p => ({
                date: p.date ? new Date(p.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : '',
                visits: p.visit_count ?? 0,
                excess: Math.round(p.excess_dwell_minutes ?? 0),
                cost: Math.round((p.financial_impact_kes ?? 0) / 1000),
              }))}
              xAxisKey="date"
              dataKeys={['visits', 'excess', 'cost']}
              config={{
                visits: { label: 'Stop Visits',       color: '#250C77' },
                excess: { label: 'Excess Delay (min)', color: '#ED642B' },
                cost:   { label: 'Loss (KES ×1000)',   color: '#EF4444' },
              }}
              showGrid
              showYAxis
              isFullHeight
            />
          </ChartContent>

          <ChartFooter className="flex items-center gap-5 px-4 py-2.5">
            {[
              { label: 'Stop Visits',        color: '#250C77' },
              { label: 'Excess Delay (min)', color: '#ED642B' },
              { label: 'Loss (KES ×1000)',   color: '#EF4444' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </ChartFooter>
        </ChartCard>
      </Chart>

      {/* ── 2-COLUMN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN: ECharts Dwell Pressure + Awaiting Action Queue ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Apache ECharts: Stop Turnaround Delay Distribution (Supabase Studio Chart Pattern) */}
          <Chart>
            <ChartCard>
              <ChartHeader>
                <ChartTitle tooltip="Target duration vs excess delay in minutes across primary transit stops">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-[#ED642B]" />
                    <span>Corridor Stop Dwell vs Target</span>
                  </div>
                </ChartTitle>
                <Link to="/locations" className="text-xs font-medium text-[#ED642B] hover:underline flex items-center gap-1">
                  <span>View stops</span> <ArrowRight size={12} />
                </Link>
              </ChartHeader>

              <ChartContent>
                <div className="h-60 w-full">
                  <ReactECharts
                    option={stopDelayChartOption}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'svg' }}
                  />
                </div>
              </ChartContent>
            </ChartCard>
          </Chart>

          {/* Awaiting Dispatch Action Queue (live dwell events) */}
          <div className="rounded-xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Awaiting dispatch action</h2>
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
                  className="px-3.5 py-1.5 rounded-lg bg-[#250C77] hover:bg-[#3D1BA8] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
                >
                  {analysisMutation.isPending ? 'Scanning...' : 'Refresh Scan'}
                </button>
                <Link to="/insights" className="px-3.5 py-1.5 rounded-lg border border-border-default text-xs font-medium text-text-secondary hover:text-text-primary transition-colors self-start sm:self-auto">
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

        {/* ── ROI & TURNAROUND SAVINGS CALCULATOR ── */}
        <div className="lg:col-span-12">
          <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <DollarSign size={13} className="text-[#ED642B]" />
                  ROI &amp; Turnaround Savings Calculator
                </h3>
                <p className="text-[11px] text-text-secondary mt-0.5">Projected capital recaptured by eliminating excess stop dwell.</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-status-good/15 text-status-good border border-status-good/30">
                {roiMultiplier}x Value Multiplier
              </span>
            </div>

            {/* Slider Controls — horizontal on wide screens */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-text-secondary mb-1">
                  <span>Fleet Size: <strong className="text-text-primary">{roiTrucks} Trucks</strong></span>
                  <span>Max 150</span>
                </div>
                <input type="range" min="5" max="150" value={roiTrucks}
                  onChange={(e) => setRoiTrucks(Number(e.target.value))}
                  className="w-full accent-[#250C77] h-1.5 bg-bg-surface-raised rounded-lg cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-text-secondary mb-1">
                  <span>Dwell Saved / Stop: <strong className="text-text-primary">{roiDelaySaved} Minutes</strong></span>
                  <span>Target 60m</span>
                </div>
                <input type="range" min="5" max="90" step="5" value={roiDelaySaved}
                  onChange={(e) => setRoiDelaySaved(Number(e.target.value))}
                  className="w-full accent-[#ED642B] h-1.5 bg-bg-surface-raised rounded-lg cursor-pointer" />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-text-secondary mb-1">
                  <span>Operating Rate: <strong className="text-text-primary">{formatCurrency(roiHourlyRate)}/hr</strong></span>
                  <span>KES 8k/h</span>
                </div>
                <input type="range" min="1500" max="8000" step="500" value={roiHourlyRate}
                  onChange={(e) => setRoiHourlyRate(Number(e.target.value))}
                  className="w-full accent-[#250C77] h-1.5 bg-bg-surface-raised rounded-lg cursor-pointer" />
              </div>
            </div>

            {/* Financial & Environmental Yield */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border-default">
              <div className="p-3 rounded-xl bg-bg-surface-raised border border-border-default">
                <span className="text-[10px] font-semibold uppercase text-text-tertiary block">Monthly Recaptured</span>
                <span className="font-numeric text-lg font-bold text-status-good block mt-0.5">{formatCurrency(monthlySavings)}</span>
                <span className="text-[9.5px] text-text-tertiary">{formatCurrency(annualSavings)} / yr</span>
              </div>
              <div className="p-3 rounded-xl bg-bg-surface-raised border border-border-default">
                <span className="text-[10px] font-semibold uppercase text-text-tertiary block">CO₂ Averted</span>
                <span className="font-numeric text-lg font-bold text-text-primary block mt-0.5">{co2ReductionTonnes} T</span>
                <span className="text-[9.5px] text-text-tertiary">{fuelSavedLiters.toLocaleString()} L idle diesel</span>
              </div>
              <div className="p-3 rounded-xl bg-bg-surface-raised border border-border-default">
                <span className="text-[10px] font-semibold uppercase text-text-tertiary block">Value Multiplier</span>
                <span className="font-numeric text-lg font-bold text-[#250C77] block mt-0.5">{roiMultiplier}x</span>
                <span className="text-[9.5px] text-text-tertiary">vs platform cost</span>
              </div>
              <div className="p-3 rounded-xl bg-bg-surface-raised border border-border-default">
                <span className="text-[10px] font-semibold uppercase text-text-tertiary block">Fleet Coverage</span>
                <span className="font-numeric text-lg font-bold text-text-primary block mt-0.5">{roiTrucks} units</span>
                <span className="text-[9.5px] text-text-tertiary">{Math.round(roiTrucks * 22 * 2)} stop events/mo</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT RAIL ── empty, kept for future use */}
        <div className="lg:col-span-4 hidden" />
      </div>

      {/* ── THREE-COLUMN STATS STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

        {/* Turnaround Cycle */}
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
                <div className="h-full rounded-full bg-status-good transition-all duration-700"
                  style={{ width: `${totalFleet > 0 ? (onScheduleCount / totalFleet) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { val: onScheduleCount, label: 'On Time',   color: 'text-status-good' },
              { val: delayedTrucks,   label: 'Delayed',   color: 'text-[#ED642B]' },
              { val: activeTrucks,    label: 'In Transit', color: 'text-[#250C77]' },
            ].map(({ val, label, color }) => (
              <div key={label} className="p-3 rounded-xl bg-bg-surface-raised/70 border border-border-default/60 text-center space-y-1">
                <p className={`font-numeric text-xl font-extrabold ${color}`}>{val}</p>
                <p className="text-[10px] font-bold text-text-tertiary uppercase">{label}</p>
              </div>
            ))}
          </div>

          {stats.average_excess_delay_minutes > 0 && (
            <p className="text-[11px] text-text-tertiary text-center font-semibold pt-1 border-t border-border-default">
              Avg excess dwell: <span className="text-text-primary font-bold">{formatMinutes(stats.average_excess_delay_minutes)}</span>
            </p>
          )}
        </div>

        {/* Top Stop Bottlenecks */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <MapPin size={13} className="text-[#ED642B]" />
                Top Stop Bottlenecks
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5">Highest-impact dwell locations today.</p>
            </div>
            <Link to="/locations" className="text-xs font-medium text-[#ED642B] hover:underline flex items-center gap-1">
              All stops <ArrowRight size={12} />
            </Link>
          </div>
          {(locationStats || []).length === 0 ? (
            <p className="text-xs text-text-tertiary text-center py-4">No stop data available.</p>
          ) : (
            <div className="space-y-2">
              {(locationStats || []).slice(0, 5).map((loc: any, idx: number) => {
                const excess = loc.avg_excess_delay_minutes || 0;
                const impact = loc.financial_impact || loc.total_excess_cost || 0;
                const visits = loc.total_visits || 0;
                const maxExcess = Math.max(...(locationStats || []).map((l: any) => l.avg_excess_delay_minutes || 0), 1);
                return (
                  <div key={loc.location_id || idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-text-primary truncate max-w-[130px]">{loc.location_name || '—'}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-numeric font-bold text-[11px] ${excess > 30 ? 'text-[#ED642B]' : 'text-text-secondary'}`}>+{Math.round(excess)}m</span>
                        <span className="font-numeric font-bold text-[11px] text-money-accent">{formatCurrency(impact)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-bg-surface-raised overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${excess > 30 ? 'bg-[#ED642B]' : 'bg-[#250C77]'}`}
                          style={{ width: `${Math.min((excess / maxExcess) * 100, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-text-tertiary shrink-0">{visits}v</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dispatch Pipeline */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Dispatch Pipeline</h3>
              <p className="text-[11px] text-text-secondary mt-0.5">Trips by operational stage.</p>
            </div>
            <Link to="/trips" className="text-xs font-medium text-[#ED642B] hover:underline flex items-center gap-1">
              All trips <ArrowRight size={12} />
            </Link>
          </div>
          {totalTrips > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-numeric text-2xl font-extrabold text-text-primary">{totalTrips}</span>
                <span className="font-numeric text-xs font-bold text-status-good">dispatched this period</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-bg-surface-raised">
                {cleared > 0   && <div className="h-full bg-status-good" style={{ width: `${(cleared / totalTrips) * 100}%` }} />}
                {inTransit > 0 && <div className="h-full bg-[#ED642B]" style={{ width: `${(inTransit / totalTrips) * 100}%` }} />}
                {planned > 0   && <div className="h-full bg-[#250C77]" style={{ width: `${(planned / totalTrips) * 100}%` }} />}
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10.5px] font-bold text-text-secondary pt-1">
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-status-good" />Cleared ({cleared})</div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ED642B]" />En Route ({inTransit})</div>
                <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#250C77]" />Planned ({planned})</div>
              </div>
            </>
          ) : (
            <div className="py-6 text-center text-xs text-text-tertiary">No trips dispatched yet.</div>
          )}
        </div>

      </div>

      {/* ── BOTTOM SECTIONS: RECENT TRIPS + ACTIVE INSIGHTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Trips */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">Recent Dispatches</h3>
              <p className="text-[11px] text-text-secondary mt-0.5">Latest trips across all corridors.</p>
            </div>
            <Link to="/trips" className="text-xs font-medium text-[#ED642B] hover:underline flex items-center gap-1">
              All trips <ArrowRight size={12} />
            </Link>
          </div>
          {(tripsData || []).length === 0 ? (
            <p className="text-xs text-text-tertiary text-center py-4">No trips dispatched yet.</p>
          ) : (
            <div className="space-y-0">
              {(tripsData as any[]).slice(0, 6).map((t: any, idx: number) => {
                const origin = t.origin_name || t.origin?.name || '—';
                const dest   = t.destination_name || t.destination?.name || '—';
                const reg    = t.vehicle_reg || t.vehicle?.registration_number || '—';
                const statusColors: Record<string, string> = {
                  in_transit: 'bg-emerald-500',
                  delayed:    'bg-red-500',
                  planned:    'bg-[#250C77]',
                  completed:  'bg-blue-500',
                  cancelled:  'bg-gray-400',
                };
                const dot = statusColors[t.status] || 'bg-gray-400';
                return (
                  <Link to={`/trips/${t.id}`} key={t.id}
                    className={`flex items-center gap-3 py-2.5 hover:bg-bg-surface-raised/50 transition-colors cursor-pointer ${idx !== 0 ? 'border-t border-border-default' : ''}`}>
                    <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                    <span className="font-mono text-xs font-bold text-text-primary w-24 shrink-0 truncate">{reg}</span>
                    <div className="flex items-center gap-1 text-[11px] min-w-0 flex-1">
                      <span className="text-text-secondary truncate">{origin}</span>
                      <span className="text-text-tertiary shrink-0">→</span>
                      <span className="font-semibold text-text-primary truncate">{dest}</span>
                    </div>
                    <span className="text-[10px] text-text-tertiary font-numeric shrink-0 capitalize">{t.status?.replace('_', ' ')}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Insights / Alerts */}
        <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-[#ED642B]" />
                Active Alerts & Insights
              </h3>
              <p className="text-[11px] text-text-secondary mt-0.5">Detected anomalies and system recommendations.</p>
            </div>
            <Link to="/insights" className="text-xs font-medium text-[#ED642B] hover:underline flex items-center gap-1">
              All insights <ArrowRight size={12} />
            </Link>
          </div>
          {/* Delayed trucks alert */}
          {delayedTrucks > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
              <div className="h-6 w-6 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Truck size={12} className="text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary">{delayedTrucks} Unit{delayedTrucks > 1 ? 's' : ''} Exceeding SLA</p>
                <p className="text-[11px] text-text-secondary mt-0.5">Fleet units currently past their expected stop duration. Estimated loss: {formatCurrency(idleLoss)}.</p>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 border border-red-500/25 shrink-0">HIGH</span>
            </div>
          )}
          {/* Top bottleneck alert */}
          {stats?.top_bottleneck && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <div className="h-6 w-6 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={12} className="text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary">Bottleneck: {stats.top_bottleneck.location_name}</p>
                <p className="text-[11px] text-text-secondary mt-0.5">Highest financial impact location. {formatCurrency(stats.top_bottleneck.financial_impact)} idle cost.</p>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 border border-amber-500/25 shrink-0">MED</span>
            </div>
          )}
          {/* On time positive */}
          {Number(onTimeRate) >= 90 && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 size={12} className="text-emerald-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary">Excellent On-Time Rate: {onTimeRate}%</p>
                <p className="text-[11px] text-text-secondary mt-0.5">Fleet operating at peak turnaround efficiency. All monitored corridors within SLA.</p>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 shrink-0">GOOD</span>
            </div>
          )}
          {/* Trips pipeline */}
          {totalTrips > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#250C77]/8 border border-[#250C77]/20">
              <div className="h-6 w-6 rounded-lg bg-[#250C77]/15 flex items-center justify-center shrink-0 mt-0.5">
                <BarChart3 size={12} className="text-[#250C77]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-primary">{inTransit} Active Dispatches, {planned} Planned</p>
                <p className="text-[11px] text-text-secondary mt-0.5">{cleared} trips delivered this period. {planned} awaiting departure on scheduled corridors.</p>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#250C77]/15 text-[#250C77] border border-[#250C77]/25 shrink-0">INFO</span>
            </div>
          )}
          {delayedTrucks === 0 && !stats?.top_bottleneck && Number(onTimeRate) < 90 && totalTrips === 0 && (
            <div className="py-6 text-center text-xs text-text-tertiary">
              <CheckCircle2 size={20} className="mx-auto mb-2 text-status-good" />
              No active alerts. All systems nominal.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
