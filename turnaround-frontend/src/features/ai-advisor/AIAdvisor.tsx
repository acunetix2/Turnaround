import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Send, BarChart3, TrendingUp, DollarSign, Clock, ArrowRight,
  Lightbulb, ExternalLink,
  Package, AlertTriangle, CheckCircle2, MessageCircle, Route as RouteIcon,
  MapPin, Radio, Truck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api/client';
import { useCorridorAnalysis, useCopilotQuery } from '../../hooks/useAIAdvisor';
import { formatCurrency, formatMinutes } from '../../lib/format';
import { getOnTimeDeliveryMetrics } from '../../lib/onTimeDelivery';
import { Spinner } from '../../components/common/Loader';
import type { AICopilotMessage, ChartData } from '../../lib/api/types';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../../lib/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '../../components/ui/Alert';
import { useAuth } from '../../auth/AuthProvider';

const advisorModules = [
  {
    id: 'predictions',
    title: 'Predictions',
    description: 'Live fleet ETAs, dwell forecasts, and what-if stop scenarios.',
    path: '/ai-advisor/predictions',
    icon: TrendingUp,
  },
  {
    id: 'insights',
    title: 'Insights',
    description: 'Key findings, shipment trends, and route performance.',
    path: '/ai-advisor/insights',
    icon: Lightbulb,
  },
  {
    id: 'recommendations',
    title: 'Recommendations',
    description: 'Operational actions and dwell performance analysis.',
    path: '/ai-advisor/recommendations',
    icon: CheckCircle2,
  },
  {
    id: 'assistant',
    title: 'AI Analyst',
    description: 'Ask questions about your fleet and operational data.',
    path: '/ai-advisor/assistant',
    icon: MessageCircle,
  },
] as const;

/**
 * Rich Markdown parser and renderer tailored for Turnaround AI operations output.
 * Formats Markdown tables, headers, bold tags, bullet lists, and currency badges.
 */
const FormattedMarkdownMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <p className="whitespace-pre-wrap font-medium">{content || ''}</p>;
  }

  // Guard against undefined/null content
  if (!content) {
    return <p className="text-xs text-text-tertiary italic">No response content</p>;
  }

  // Parse lines and detect tables, headers, lists
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = (keyPrefix: number) => {
    if (tableBuffer.length === 0) return null;
    const headerRow = tableBuffer[0];
    const dataRows = tableBuffer.slice(2); // skip separator line |---|---|

    const parseRow = (rowStr: string) =>
      rowStr
        .split('|')
        .map(cell => cell.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    const headers = parseRow(headerRow);
    const rows = dataRows.map(parseRow);

    const node = (
      <div key={`table-${keyPrefix}`} className="my-3 overflow-x-auto rounded-xl border border-border-default bg-bg-surface">
        <table className="w-full text-xs text-left border-collapse min-w-[480px]">
          <thead className="bg-[#250C77]/10 dark:bg-[#250C77]/30 text-[#250C77] dark:text-[#ED642B] font-extrabold border-b border-border-default">
            <tr>
              {headers.map((h, hIdx) => (
                <th key={hIdx} className="px-3 py-2 text-[11px] uppercase tracking-wider">
                  {renderInlineMarkdown(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-bg-surface-raised/60 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-xs text-text-primary font-medium">
                    {renderInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
    inTable = false;
    return node;
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;

    // Bold text regex
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        const isKES = inner.includes('KES') || inner.includes('min') || inner.includes('%');
        return (
          <strong key={idx} className={isKES ? 'font-extrabold text-[#ED642B] dark:text-orange-400 font-numeric' : 'font-extrabold text-text-primary'}>
            {inner}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx} className="italic text-text-secondary">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="px-1 py-0.5 rounded bg-bg-surface border border-border-default font-mono text-[11px] text-[#ED642B]">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check table line
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableBuffer.push(trimmed);
      return;
    } else if (inTable) {
      const tableNode = flushTable(idx);
      if (tableNode) elements.push(tableNode);
    }

    if (!trimmed) {
      elements.push(<div key={`spacer-${idx}`} className="h-1.5" />);
      return;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={idx} className="font-extrabold text-sm text-text-primary mt-3 mb-1.5 flex items-center gap-1.5 border-b border-border-default pb-1">
          <Lightbulb size={13} className="text-[#ED642B]" />
          <span>{renderInlineMarkdown(trimmed.replace('### ', ''))}</span>
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={idx} className="font-extrabold text-base text-text-primary mt-3 mb-1.5">
          {renderInlineMarkdown(trimmed.replace('## ', ''))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={idx} className="font-extrabold text-lg text-text-primary mt-4 mb-2">
          {renderInlineMarkdown(trimmed.replace('# ', ''))}
        </h2>
      );
      return;
    }

    // Bullet point
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletContent = trimmed.replace(/^[•\-\*]\s+/, '');
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1 text-xs sm:text-sm text-text-primary leading-relaxed">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ED642B] mt-2 shrink-0" />
          <div className="flex-1">{renderInlineMarkdown(bulletContent)}</div>
        </div>
      );
      return;
    }

    // Numbered list (e.g. 1. , 2. )
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      elements.push(
        <div key={idx} className="flex items-start gap-2 my-1.5 text-xs sm:text-sm text-text-primary leading-relaxed">
          <span className="font-numeric font-bold text-[11px] px-1.5 py-0.5 rounded bg-[#250C77]/10 dark:bg-[#250C77]/30 text-[#250C77] dark:text-[#ED642B] shrink-0">
            {numberedMatch[1]}
          </span>
          <div className="flex-1">{renderInlineMarkdown(numberedMatch[2])}</div>
        </div>
      );
      return;
    }

    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      elements.push(<hr key={idx} className="my-3 border-border-default" />);
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={idx} className="text-xs sm:text-sm text-text-primary leading-relaxed my-0.5">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  if (inTable) {
    const tableNode = flushTable(lines.length);
    if (tableNode) elements.push(tableNode);
  }

  return <div className="space-y-1">{elements}</div>;
};

export const AIAdvisor: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const activeModule = advisorModules.find((module) => module.path === location.pathname);
  const { data: analysis, isLoading: loadingAnalysis, refetch } = useCorridorAnalysis();
  const { data: locationStats } = useQuery({
    queryKey: ['locationStats'],
    queryFn: apiClient.getLocationStats,
  });
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: apiClient.getDashboardStats,
  });
  const { data: trendData = [] } = useQuery({
    queryKey: ['analytics', 'trends', 30],
    queryFn: () => apiClient.getTrendData(30),
  });
  const { data: insights = [] } = useQuery({
    queryKey: ['insights'],
    queryFn: apiClient.getInsights,
  });
  const { data: trips = [] } = useQuery({
    queryKey: ['trips'],
    queryFn: apiClient.getTrips,
  });
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: apiClient.getLocations,
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: apiClient.getVehicles,
  });
  const { data: liveGps = {}, isError: liveGpsError } = useQuery({
    queryKey: ['ai', 'live-gps'],
    queryFn: apiClient.getLiveGPSEvents,
    refetchInterval: 30_000,
  });
  const { data: fleetForecast, isError: fleetForecastError, isLoading: loadingFleetForecast, refetch: refetchFleetForecast } = useQuery({
    queryKey: ['predictions', 'fleet'],
    queryFn: apiClient.getFleetPredictions,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const copilotMutation = useCopilotQuery();
  const navigate = useNavigate();

  const [input, setInput] = useState('');
  const [predictionLocationId, setPredictionLocationId] = useState('');
  const [predictionVehicleId, setPredictionVehicleId] = useState('');
  const [predictionArrival, setPredictionArrival] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [messages, setMessages] = useState<(AICopilotMessage & { chart_data?: ChartData | null })[]>([
    {
      role: 'assistant',
      content: 'Fleet Performance Analyst online. I have analyzed your real-time vehicle telemetry, stop turnaround cycles, and idle cost metrics. Ask for specific stop bottlenecks, financial recovery models, or route efficiency audits.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (customPrompt?: string) => {
    const q = (customPrompt || input).trim();
    if (!q) return;

    const userMsg: AICopilotMessage = { role: 'user', content: q, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput('');

    try {
      const res = await copilotMutation.mutateAsync({ query: q });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.response,
        chart_data: res.chart_data,
        timestamp: new Date().toISOString(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Analyst query temporarily unavailable. Please retry in a moment.',
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    'Which stops are leaking the most revenue this week?',
    'What dispatch changes will recover the most idle cost?',
    'Analyze our on-time delivery rate vs target turnaround',
    'Compare port clearance times vs border crossing dwell',
  ];

  // Chart data from actual locationStats
  const chartData = (locationStats || [])
    .slice(0, 6)
    .map(loc => {
      const locName = loc?.location_name || 'Stop';
      return {
        name: locName.length > 14 ? locName.substring(0, 12) + '..' : locName,
        fullName: locName,
        averageMinutes: loc?.avg_dwell_minutes || 0,
        expectedMinutes: loc?.expected_dwell_minutes || 60,
        excessMinutes: loc?.avg_excess_delay_minutes || 0,
        lossKes: loc?.financial_impact || 0,
        totalVisits: loc?.total_visits || 0
      };
    });

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const analystChartOption = React.useMemo<EChartsOption>(() => {
    const names = chartData.map(d => d.fullName);
    const avgDwells = chartData.map(d => Math.round(d.averageMinutes));
    const targetDwells = chartData.map(d => Math.round(d.expectedMinutes));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#180B4A' : '#FFFFFF',
        borderColor: '#ED642B',
        borderWidth: 1,
        textStyle: { color: isDark ? '#FFFFFF' : '#111827', fontSize: 11 },
        formatter: (params: any) => {
          const idx = params[0]?.dataIndex ?? 0;
          const d = chartData[idx];
          if (!d) return '';
          return `
            <div style="font-weight: 700; margin-bottom: 3px;">${d.fullName}</div>
            <div style="color: #250C77; font-weight: 600;">Average Dwell: ${formatMinutes(d.averageMinutes)}</div>
            <div style="color: #ED642B; font-weight: 600;">Target SLA: ${formatMinutes(d.expectedMinutes)}</div>
            <div style="color: #EF4444; font-weight: 600;">Excess Delay: +${formatMinutes(d.excessMinutes)}</div>
            <div style="color: #10B981; font-weight: 700;">Loss: ${formatCurrency(d.lossKes)}</div>
          `;
        },
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
        top: 28,
        right: 15,
        bottom: 40,
        left: 40,
      },
      xAxis: {
        type: 'category',
        data: names,
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
        name: 'Minutes',
        nameTextStyle: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 9.5 },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } },
        axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 9.5 },
      },
      series: [
        {
          name: 'Target SLA',
          type: 'bar',
          data: targetDwells,
          itemStyle: {
            color: '#250C77',
            borderRadius: [4, 4, 0, 0],
          },
        },
        {
          name: 'Actual Dwell',
          type: 'bar',
          data: avgDwells,
          itemStyle: {
            color: (params: any) => {
              const d = chartData[params.dataIndex];
              return (d && d.excessMinutes > 30) ? '#ED642B' : '#6366F1';
            },
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }, [chartData, isDark]);

  const totalCostToday = dashboardStats?.estimated_financial_impact ?? 0;
  const totalShipments = trips.length || locationStats?.reduce((sum, location) => sum + (location.total_visits || 0), 0) || 0;
  const onTimeDelivery = getOnTimeDeliveryMetrics(trips);
  const recentInsights = insights.slice(0, 4);
  const fleetAssets = fleetForecast?.assets ?? [];
  const movingAssets = fleetAssets.filter((asset) => asset.tracking_state === 'on_trip').length;
  const idleAssets = fleetAssets.filter((asset) => ['idling_at_stop', 'at_geofence', 'idle'].includes(asset.tracking_state)).length;
  const forecastableAssets = fleetAssets.filter((asset) => asset.estimated_cost != null);
  const etaForecastAssets = fleetAssets.filter((asset) => asset.predicted_arrival != null);
  const lateEtaForecastAssets = etaForecastAssets.filter((asset) => (asset.predicted_delay_minutes ?? 0) > 0);
  const tripsById = new Map(trips.map((trip) => [trip.id, trip]));
  const fleetForecastCost = forecastableAssets.reduce((total, asset) => total + (asset.estimated_cost ?? 0), 0);
  const liveIdleCost = fleetAssets.reduce((total, asset) => total + asset.current_idle_cost, 0);
  const selectedLocationId = predictionLocationId || locations[0]?.id || '';
  const selectedVehicleId = predictionVehicleId || vehicles[0]?.id || '';
  const arrivalTimestamp = Date.parse(predictionArrival);
  const plannedArrival = Number.isFinite(arrivalTimestamp)
    ? new Date(arrivalTimestamp).toISOString()
    : '';
  const predictionQuery = useQuery({
    queryKey: ['predictions', 'dwell', selectedLocationId, selectedVehicleId, plannedArrival],
    queryFn: () => apiClient.getPredictionsDwell(selectedLocationId, plannedArrival, selectedVehicleId),
    enabled: Boolean(selectedLocationId && plannedArrival),
    staleTime: 60_000,
  });
  const selectedGps = selectedVehicleId ? liveGps[selectedVehicleId] : undefined;
  const gpsIsFresh = selectedGps?.recorded_at
    ? Date.now() - Date.parse(selectedGps.recorded_at) < 5 * 60_000
    : false;
  const forecastChartOption = React.useMemo<EChartsOption>(() => {
    const prediction = predictionQuery.data;
    const history = prediction?.history ?? [];
    const labels = history.map((point) => new Date(point.arrival_time).toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    }));
    const plannedLabel = `Plan · ${new Date(predictionArrival).toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
    })}`;
    const categories = [...labels, plannedLabel];
    const chartText = isDark ? '#9CA3AF' : '#6B7280';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#180B4A' : '#FFFFFF',
        borderColor: '#ED642B',
        textStyle: { color: isDark ? '#FFFFFF' : '#111827', fontSize: 11 },
        formatter: (items: any) => {
          const pointIndex = items[0]?.dataIndex ?? 0;
          const actual = history[pointIndex];
          const summary = actual
            ? `Actual dwell: ${formatMinutes(actual.actual_dwell_minutes)}`
            : `Forecast dwell: ${formatMinutes(prediction?.predicted_dwell_minutes ?? 0)}`;
          return `${categories[pointIndex]}<br/>${summary}<br/>Expected: ${formatMinutes(prediction?.expected_dwell_minutes ?? 0)}`;
        },
      },
      legend: {
        top: 0,
        textStyle: { color: chartText, fontSize: 10 },
        itemWidth: 12,
        itemHeight: 8,
      },
      grid: { top: 30, right: 12, bottom: 42, left: 48 },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: chartText, fontSize: 9, rotate: 20 },
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } },
      },
      yAxis: {
        type: 'value',
        name: 'Minutes',
        nameTextStyle: { color: chartText, fontSize: 9 },
        axisLabel: { color: chartText, fontSize: 9 },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } },
      },
      series: [
        {
          name: 'Actual GPS dwell',
          type: 'line',
          data: [...history.map((point) => point.actual_dwell_minutes), null],
          connectNulls: false,
          symbolSize: 6,
          lineStyle: { color: '#250C77', width: 2 },
          itemStyle: { color: '#250C77' },
        },
        {
          name: 'Expected SLA',
          type: 'line',
          data: [...history.map((point) => point.expected_dwell_minutes), prediction?.expected_dwell_minutes ?? null],
          symbol: 'none',
          lineStyle: { color: '#10B981', width: 1.5, type: 'dashed' },
        },
        {
          name: 'Model forecast',
          type: 'line',
          data: [...history.map(() => null), prediction?.predicted_dwell_minutes ?? null],
          connectNulls: false,
          symbol: 'diamond',
          symbolSize: 11,
          lineStyle: { color: '#ED642B', width: 2 },
          itemStyle: { color: '#ED642B' },
          markArea: prediction ? {
            silent: true,
            itemStyle: { color: 'rgba(237, 100, 43, 0.12)' },
            data: [[
              { xAxis: plannedLabel, yAxis: prediction.confidence_interval_low },
              { xAxis: plannedLabel, yAxis: prediction.confidence_interval_high },
            ]],
          } : undefined,
        },
      ],
    };
  }, [predictionQuery.data, predictionArrival, isDark]);
  const fleetDwellChartOption = React.useMemo<EChartsOption>(() => {
    const chartAssets = forecastableAssets.slice(0, 12);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, textStyle: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10 } },
      grid: { top: 30, right: 12, bottom: 56, left: 44 },
      xAxis: {
        type: 'category',
        data: chartAssets.map((asset) => asset.registration_number),
        axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 9, rotate: 24 },
      },
      yAxis: { type: 'value', name: 'Minutes', axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 9 } },
      series: [
        { name: 'Expected', type: 'bar', data: chartAssets.map((asset) => asset.expected_dwell_minutes), itemStyle: { color: '#250C77', borderRadius: [3, 3, 0, 0] } },
        { name: 'Forecast', type: 'bar', data: chartAssets.map((asset) => asset.predicted_dwell_minutes), itemStyle: { color: '#ED642B', borderRadius: [3, 3, 0, 0] } },
      ],
    };
  }, [forecastableAssets, isDark]);
  const fleetCostChartOption = React.useMemo<EChartsOption>(() => {
    const chartAssets = [...forecastableAssets]
      .sort((left, right) => (right.estimated_cost ?? 0) - (left.estimated_cost ?? 0))
      .slice(0, 10)
      .reverse();
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 18, bottom: 18, left: 92 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (value) => formatCurrency(Number(value ?? 0)) },
      xAxis: { type: 'value', axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 9 } },
      yAxis: { type: 'category', data: chartAssets.map((asset) => asset.registration_number), axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 9 } },
      series: [{
        name: 'Predicted idle cost',
        type: 'bar',
        data: chartAssets.map((asset) => asset.estimated_cost),
        itemStyle: { color: '#ED642B', borderRadius: [0, 4, 4, 0] },
      }],
    };
  }, [forecastableAssets, isDark]);
  const trackingStateChartOption = React.useMemo<EChartsOption>(() => {
    const states = [
      { name: 'On trip', value: fleetAssets.filter((asset) => asset.tracking_state === 'on_trip').length, color: '#250C77' },
      { name: 'Planned', value: fleetAssets.filter((asset) => asset.tracking_state === 'trip_planned').length, color: '#6366F1' },
      { name: 'Idling at stop', value: fleetAssets.filter((asset) => asset.tracking_state === 'idling_at_stop').length, color: '#ED642B' },
      { name: 'Other / idle', value: fleetAssets.filter((asset) => ['idle', 'at_geofence'].includes(asset.tracking_state)).length, color: '#9CA3AF' },
    ].filter((state) => state.value > 0);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 9 } },
      series: [{
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '42%'],
        label: { color: isDark ? '#E5E7EB' : '#374151', fontSize: 9 },
        data: states.map((state) => ({ name: state.name, value: state.value, itemStyle: { color: state.color } })),
      }],
    };
  }, [fleetAssets, isDark]);

  // Live prescriptive actions from AI analysis or real location stats
  const liveInterventions = analysis?.primary_bottlenecks && analysis.primary_bottlenecks.length > 0
    ? analysis.primary_bottlenecks.map(b => ({
        title: `Mitigate ${b.location} Delay`,
        desc: b.recommendation || b.issue,
        severity: b.severity,
        tag: b.severity.toUpperCase()
      }))
    : (analysis?.immediate_actions || []).map((act, idx) => ({
        title: `Dispatch Protocol #${idx + 1}`,
        desc: act,
        severity: 'high',
        tag: 'IMMEDIATE'
      }));

  if (!activeModule) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Analytics and Prediction</h1>
          <p className="mt-1 text-sm text-text-secondary">Choose a module to get started.</p>
        </header>

        <nav aria-label="Analytics and Prediction modules" className="grid gap-3 sm:grid-cols-2">
          {advisorModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.id}
                to={module.path}
                className="group flex items-center gap-4 rounded-xl border border-border-default bg-bg-surface p-4 transition-colors hover:border-[#ED642B]/50 hover:bg-bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED642B]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#250C77]/10 text-[#250C77] dark:text-[#ED642B]">
                  <Icon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-text-primary">{module.title}</span>
                    <ArrowRight size={15} className="shrink-0 text-text-tertiary transition group-hover:translate-x-1 group-hover:text-[#ED642B]" />
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-text-secondary">{module.description}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <Link to="/ai-advisor" className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary transition-colors hover:text-[#ED642B]">
          <ArrowRight size={13} className="rotate-180" />
          All Analytics and Prediction modules
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">{activeModule.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{activeModule.description}</p>
        </div>
        <nav aria-label="Analytics and Prediction modules" className="flex flex-wrap gap-2">
          {advisorModules.map((module) => (
            <Link
              key={module.id}
              to={module.path}
              aria-current={module.id === activeModule.id ? 'page' : undefined}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                module.id === activeModule.id
                  ? 'border-[#250C77] bg-[#250C77] text-white'
                  : 'border-border-default bg-bg-surface text-text-secondary hover:border-[#ED642B]/50 hover:text-text-primary'
              }`}
            >
              {module.title}
            </Link>
          ))}
        </nav>
      </header>

      {activeModule.id === 'predictions' && (
        <>
      {/* ── ANALYST WELCOME ── */}
      <section className="relative overflow-hidden rounded-xl border border-[#250C77]/40 bg-[#07092a] px-5 py-5 text-white shadow-sm sm:px-6">
        <div className="relative z-10 max-w-md">
          <p className="text-lg font-bold tracking-tight sm:text-xl">Fleet Intelligence</p>
          <p className="mt-2 text-xs leading-relaxed text-indigo-100/75">
            Automatic prediction and live cost tracking for {user?.company_name || 'your fleet'} — assets, trips, and trucks idling at stops.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="small"
              icon={<BarChart3 size={13} />}
              loading={loadingAnalysis}
              onClick={() => { refetch(); void refetchFleetForecast(); }}
            >
              Refresh Fleet Intelligence
            </Button>
            <button type="button" onClick={() => document.getElementById('analyst-assistant')?.scrollIntoView({ behavior: 'smooth' })} className="flex items-center gap-1.5 rounded-lg border border-indigo-300/30 px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-white/10">
              <MessageCircle size={13} /> Ask a Question
            </button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border border-violet-400/30 bg-violet-500/10 blur-[1px]" />
        <div className="pointer-events-none absolute right-12 top-8 h-32 w-56 rotate-12 rounded-[50%] border border-violet-400/30 opacity-70" />
        <div className="pointer-events-none absolute right-24 top-20 h-20 w-32 rounded-[50%] border border-violet-300/30 opacity-60" />
      </section>

      {/* ── EXECUTIVE KPI STRIP ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#ED642B]/30 bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Total Shipments</span>
            <Package size={14} className="text-[#250C77]" />
          </div>
          <p className="font-numeric text-2xl font-extrabold text-text-primary mt-2">
            {totalShipments.toLocaleString()}
          </p>
          <p className="text-[11px] text-text-tertiary mt-0.5">Across monitored operations</p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>On-Time Delivery</span>
            <Clock size={14} className="text-[#250C77]" />
          </div>
          <p className="font-numeric text-2xl font-extrabold text-text-primary mt-2">
            {onTimeDelivery.rate === null ? '—' : `${onTimeDelivery.rate}%`}
          </p>
          <p className="text-[11px] text-text-tertiary mt-0.5">
            {onTimeDelivery.rate === null
              ? 'Completed trips with schedule data required'
              : `${onTimeDelivery.onTimeTrips} of ${onTimeDelivery.completedTrips} completed trips on time`}
          </p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Logistics Cost</span>
            <DollarSign size={14} className="text-[#ED642B]" />
          </div>
          <p className="font-numeric text-2xl font-extrabold text-text-primary mt-2">
            {formatCurrency(totalCostToday)}
          </p>
          <p className="text-[11px] text-text-tertiary mt-0.5">Estimated idle cost today</p>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
            <span>Live ETA forecasts</span>
            <Radio size={14} className="text-[#ED642B]" />
          </div>
          <p className="font-numeric text-2xl font-extrabold text-text-primary mt-2">
            {fleetForecast ? etaForecastAssets.length.toLocaleString() : '—'}
          </p>
          <p className="text-[11px] text-text-tertiary mt-0.5">
            {fleetForecast ? `${lateEtaForecastAssets.length} at risk · route history required` : 'Waiting for fleet forecasts'}
          </p>
        </div>
      </div>

      {/* ── AUTOMATIC WHOLE-FLEET INTELLIGENCE ── */}
      <section className="space-y-4 rounded-2xl border border-[#250C77]/15 bg-bg-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-border-default pb-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <Radio size={15} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">Automatic · refreshes every minute</span>
            </div>
            <h2 className="mt-1 text-lg font-extrabold tracking-tight text-text-primary">Live corridor predictions</h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-text-secondary">
              Fresh GPS and completed trips on the same corridor power estimated arrival times. Facility history estimates dwell; excess minutes are priced using each vehicle's hourly operating rate. An ETA is shown only when route history supports a model.
            </p>
          </div>
          <div className="text-[10px] text-text-tertiary">
            {fleetForecast?.generated_at ? `Updated ${new Date(fleetForecast.generated_at).toLocaleTimeString()}` : 'Waiting for first fleet update'}
          </div>
        </div>

        {fleetForecastError && (
          <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-status-danger">
            Fleet predictions are temporarily unavailable. The page will retry automatically.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Assets monitored', value: fleetForecast ? fleetAssets.length.toLocaleString() : '—', note: `${movingAssets} currently on trips`, icon: Truck },
            { label: 'At stops / idle', value: fleetForecast ? idleAssets.toLocaleString() : '—', note: 'GPS and open dwell state', icon: Clock },
            { label: 'Late ETA forecasts', value: fleetForecast ? lateEtaForecastAssets.length.toLocaleString() : '—', note: `${etaForecastAssets.length} evidence-backed route ETAs`, icon: MapPin },
            { label: 'Forecast excess cost', value: fleetForecast ? formatCurrency(fleetForecastCost) : '—', note: `${forecastableAssets.length} assets with a stop forecast`, icon: DollarSign },
            { label: 'Live idle cost', value: fleetForecast ? formatCurrency(liveIdleCost) : '—', note: 'Accumulated from open GPS dwell', icon: Radio },
          ].map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border-default bg-bg-surface-raised/60 p-3">
              <div className="flex items-center justify-between text-[10px] font-semibold text-text-secondary">
                <span>{metric.label}</span>
                <metric.icon size={14} className="text-[#ED642B]" />
              </div>
              <p className="mt-1.5 font-numeric text-2xl font-extrabold text-text-primary">{metric.value}</p>
              <p className="mt-0.5 text-[10px] text-text-tertiary">{metric.note}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-12">
          <article className="rounded-xl border border-border-default p-3 xl:col-span-5">
            <h3 className="text-xs font-bold text-text-primary">Expected vs predicted dwell</h3>
            <p className="mt-0.5 text-[10px] text-text-tertiary">Per asset with an assigned trip or detected stop</p>
            {loadingFleetForecast ? <div className="flex h-64 items-center justify-center"><Spinner /></div>
              : forecastableAssets.length ? <ReactECharts option={fleetDwellChartOption} style={{ height: 260 }} opts={{ renderer: 'svg' }} />
                : <div className="flex h-64 items-center justify-center text-center text-xs text-text-tertiary">No active trips or stop forecasts yet. GPS ingestion and trip assignment will populate this chart.</div>}
          </article>
          <article className="rounded-xl border border-border-default p-3 xl:col-span-4">
            <h3 className="text-xs font-bold text-text-primary">Predicted excess cost by asset</h3>
            <p className="mt-0.5 text-[10px] text-text-tertiary">Highest forecast idle costs across the fleet</p>
            {forecastableAssets.length ? <ReactECharts option={fleetCostChartOption} style={{ height: 260 }} opts={{ renderer: 'svg' }} />
              : <div className="flex h-64 items-center justify-center text-xs text-text-tertiary">Cost forecasts appear when assets have a trip destination or active geofence stop.</div>}
          </article>
          <article className="rounded-xl border border-border-default p-3 xl:col-span-3">
            <h3 className="text-xs font-bold text-text-primary">Live fleet state</h3>
            <p className="mt-0.5 text-[10px] text-text-tertiary">Automatic trip, dwell, and idle classification</p>
            {fleetAssets.length ? <ReactECharts option={trackingStateChartOption} style={{ height: 260 }} opts={{ renderer: 'svg' }} />
              : <div className="flex h-64 items-center justify-center text-xs text-text-tertiary">Fleet state will appear when vehicles are added.</div>}
          </article>
        </div>

        <div className="overflow-hidden rounded-xl border border-border-default">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border-default px-3 py-3">
            <div>
              <h3 className="text-xs font-bold text-text-primary">Asset & trip prediction ledger</h3>
              <p className="mt-0.5 text-[10px] text-text-tertiary">
                {fleetForecast?.model_type ?? 'Fleet model'} · {fleetForecast?.training_samples ?? 0} completed dwell samples
                {fleetForecast?.validation_mae_minutes != null ? ` · holdout MAE ${formatMinutes(fleetForecast.validation_mae_minutes)}` : ''}
                {fleetForecast?.model_features?.length ? ` · dwell inputs: ${fleetForecast.model_features.join(', ')}` : ' · dwell forecast uses historical/configured baseline when model history is limited'}
              </p>
            </div>
            <span className="text-[10px] text-text-tertiary">Each vehicle is tracked automatically</span>
          </div>
          {loadingFleetForecast && !fleetAssets.length ? <div className="flex h-28 items-center justify-center"><Spinner /></div>
            : fleetAssets.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-[11px]">
                  <thead className="bg-bg-surface-raised text-[9px] uppercase tracking-wider text-text-tertiary">
                    <tr>
                      <th className="px-3 py-2.5">Asset / trip</th>
                      <th className="px-3 py-2.5">Tracking state</th>
                      <th className="px-3 py-2.5">Stop</th>
                      <th className="px-3 py-2.5 text-right">Live dwell</th>
                      <th className="px-3 py-2.5 text-right">Predicted dwell / SLA</th>
                      <th className="px-3 py-2.5 text-right">ETA</th>
                      <th className="px-3 py-2.5 text-right">Delay risk</th>
                      <th className="px-3 py-2.5 text-right">Idle cost</th>
                      <th className="px-3 py-2.5 text-right">GPS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {fleetAssets.map((asset) => (
                      <tr key={asset.vehicle_id} className="hover:bg-bg-surface-raised/50">
                        <td className="px-3 py-2.5">
                          <span className="font-bold text-text-primary">
                            {asset.registration_number}
                          </span>
                          <p className="mt-0.5 text-[9px] text-text-tertiary">{asset.trip_id ? `Trip ${asset.trip_id.slice(0, 8)}` : asset.vehicle_type}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${asset.tracking_state === 'idling_at_stop' ? 'bg-orange-500/10 text-orange-600' : asset.tracking_state === 'on_trip' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-bg-surface-raised text-text-secondary'}`}>
                            {asset.tracking_state.replaceAll('_', ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-text-secondary">{asset.location_name || 'No trip / geofence'}</td>
                        <td className="px-3 py-2.5 text-right font-numeric text-text-secondary">{asset.current_dwell_minutes != null ? formatMinutes(asset.current_dwell_minutes) : '—'}</td>
                        <td className="px-3 py-2.5 text-right font-numeric text-text-primary">{asset.predicted_dwell_minutes != null ? `${formatMinutes(asset.predicted_dwell_minutes)}${asset.expected_dwell_minutes != null ? ` / ${formatMinutes(asset.expected_dwell_minutes)}` : ''}` : '—'}</td>
                        <td className="px-3 py-2.5 text-right font-numeric text-text-primary">
                          {asset.predicted_arrival ? (
                            <>
                              {new Date(asset.predicted_arrival).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              <p className="text-[9px] text-emerald-600">Route model · ±{formatMinutes(asset.travel_time_validation_mae_minutes ?? 0)} MAE</p>
                            </>
                          ) : tripsById.get(asset.trip_id ?? '')?.planned_arrival ? (
                            <>
                              {new Date(tripsById.get(asset.trip_id ?? '')!.planned_arrival).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              <p className="text-[9px] text-text-tertiary">Scheduled · no route model</p>
                            </>
                          ) : '—'}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-numeric ${asset.predicted_delay_minutes != null && asset.predicted_delay_minutes > 0 ? 'font-bold text-[#ED642B]' : 'text-text-secondary'}`}>
                          {asset.predicted_delay_minutes == null
                            ? '—'
                            : asset.predicted_delay_minutes > 0
                              ? `+${formatMinutes(asset.predicted_delay_minutes)}`
                              : 'On time'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-numeric font-bold text-[#ED642B]">{asset.estimated_cost != null ? formatCurrency(asset.estimated_cost) : formatCurrency(asset.current_idle_cost)}</td>
                        <td className="px-3 py-2.5 text-right font-numeric text-text-secondary">{asset.speed_kmh != null ? `${asset.speed_kmh.toFixed(0)} km/h` : 'No fix'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="px-3 py-8 text-center text-xs text-text-tertiary">No fleet assets are available yet.</p>}
        </div>
      </section>

      {/* ── OPTIONAL SINGLE-STOP SCENARIO PLANNER ── */}
      <section className="grid gap-4 rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm lg:grid-cols-[1fr_1.2fr]">
        <div>
          <div className="mb-3 flex items-start gap-2">
            <MapPin size={16} className="mt-0.5 text-[#250C77] dark:text-[#ED642B]" />
            <div>
              <h2 className="text-xs font-bold text-text-primary">What-if: model a planned stop</h2>
              <p className="mt-1 text-[10px] leading-relaxed text-text-secondary">Optional scenario controls. Fleet forecasts above run automatically for all assets and trips.</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[10px] font-semibold text-text-secondary">
              Destination
              <select
                value={selectedLocationId}
                onChange={(event) => setPredictionLocationId(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-2.5 py-2 text-xs text-text-primary"
                disabled={!locations.length}
              >
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
            <label className="text-[10px] font-semibold text-text-secondary">
              Vehicle
              <select
                value={selectedVehicleId}
                onChange={(event) => setPredictionVehicleId(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-2.5 py-2 text-xs text-text-primary"
                disabled={!vehicles.length}
              >
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.registration_number} · {formatCurrency(vehicle.hourly_operating_cost)}/hr
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-semibold text-text-secondary sm:col-span-2">
              Planned arrival
              <input
                type="datetime-local"
                value={predictionArrival}
                onChange={(event) => setPredictionArrival(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-border-default bg-bg-surface px-2.5 py-2 text-xs text-text-primary"
              />
            </label>
          </div>
          {(!locations.length || !vehicles.length) && (
            <p className="mt-2 text-[10px] text-text-tertiary">
              Add at least one vehicle and destination to generate a forecast.
            </p>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-lg bg-bg-surface-raised p-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Estimated excess idle cost</p>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-text-secondary">
                <Radio size={12} className={gpsIsFresh ? 'text-emerald-500' : 'text-text-tertiary'} />
                {liveGpsError ? 'GPS feed unavailable' : gpsIsFresh ? 'GPS live' : 'GPS signal stale'}
              </span>
            </div>
            {predictionQuery.isLoading ? (
              <div className="mt-4"><Spinner /></div>
            ) : predictionQuery.isError ? (
              <p role="alert" className="mt-3 text-xs text-status-danger">
                {predictionQuery.error instanceof Error ? predictionQuery.error.message : 'Unable to calculate prediction.'}
              </p>
            ) : predictionQuery.data ? (
              <>
                <p className="mt-2 font-numeric text-3xl font-extrabold text-[#ED642B]">
                  {formatCurrency(predictionQuery.data.estimated_cost)}
                </p>
                <p className="mt-1 text-[11px] text-text-secondary">
                  {formatMinutes(predictionQuery.data.predicted_dwell_minutes)} predicted vs. {formatMinutes(predictionQuery.data.expected_dwell_minutes)} expected
                  {' · '}{formatMinutes(predictionQuery.data.predicted_excess_minutes)} excess
                </p>
                <p className="mt-1 text-[10px] text-text-tertiary">
                  Cost range {formatCurrency(predictionQuery.data.cost_interval_low)}–{formatCurrency(predictionQuery.data.cost_interval_high)}
                  {' · '}{formatCurrency(predictionQuery.data.hourly_operating_cost)}/vehicle-hour
                </p>
              </>
            ) : (
              <p className="mt-3 text-xs text-text-tertiary">Select a stop and arrival time to calculate the forecast.</p>
            )}
          </div>
          <p className="mt-3 border-t border-border-default pt-2 text-[10px] text-text-tertiary">
            {selectedGps
              ? `Latest GPS: ${selectedGps.speed == null ? 'Speed unavailable' : `${selectedGps.speed.toFixed(1)} km/h`} · ${selectedGps.recorded_at ? new Date(selectedGps.recorded_at).toLocaleString() : 'Time unavailable'}`
              : liveGpsError
                ? 'Could not load the latest vehicle GPS fix.'
                : 'No GPS fix received for this vehicle yet.'}
            {predictionQuery.data && (
              <> · {predictionQuery.data.sample_size} stop-history records · {predictionQuery.data.model_version}</>
            )}
          </p>
          {predictionQuery.data && (
            <div className="mt-4 border-t border-border-default pt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[11px] font-bold text-text-primary">Actuals vs prediction</h3>
                  <p className="text-[10px] text-text-tertiary">
                    {predictionQuery.data.model_type} · {predictionQuery.data.training_samples
                      ? 'Completed GPS geofence dwell history'
                      : 'Awaiting completed GPS dwell history'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="rounded bg-bg-surface px-2 py-1 text-text-secondary">
                    {predictionQuery.data.training_samples} training visits
                  </span>
                  {predictionQuery.data.validation_mae_minutes != null && (
                    <span className="rounded bg-bg-surface px-2 py-1 text-text-secondary">
                      Holdout MAE {formatMinutes(predictionQuery.data.validation_mae_minutes)}
                    </span>
                  )}
                </div>
              </div>
              <ReactECharts
                option={forecastChartOption}
                style={{ height: 220, width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
              <p className="mt-1 text-[10px] text-text-tertiary">
                The holdout MAE measures error on the latest unseen visits; the shaded band shows the forecast residual range.
                If training history is limited, the estimate falls back to the stop's historical average or configured baseline.
              </p>
            </div>
          )}
        </div>
      </section>

        </>
      )}

      {activeModule.id === 'insights' && (
        <>
      {/* ── LIVE CORRIDOR INTELLIGENCE REPORT ALERT BANNER ── */}
      {analysis?.executive_summary && (
        <Alert variant="info" className="border-[#250C77]/30 bg-[#250C77]/10">
          <Lightbulb size={16} className="text-[#ED642B]" />
          <AlertTitle className="text-[#250C77] dark:text-[#ED642B] font-bold uppercase tracking-wider text-[11px]">
            Executive Intelligence Summary
          </AlertTitle>
          <AlertDescription className="mt-1 space-y-1">
            <p className="text-xs sm:text-sm text-text-primary leading-relaxed font-medium">
              {analysis.executive_summary}
            </p>
            {analysis.financial_impact_analysis && (
              <p className="text-xs text-text-secondary leading-relaxed">
                {analysis.financial_impact_analysis}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* ── INSIGHT SUMMARY / VOLUME / ROUTES ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm xl:col-span-4">
          <div className="mb-3 flex items-start gap-2 border-b border-border-default pb-3">
            <Lightbulb size={16} className="mt-0.5 text-[#250C77]" />
            <div>
              <h2 className="text-xs font-bold text-text-primary">AI Insight Summary</h2>
              <p className="text-[10px] text-text-secondary">Key findings from your logistics data</p>
            </div>
          </div>
          <div className="space-y-3">
            {(recentInsights.length ? recentInsights : analysis?.primary_bottlenecks?.slice(0, 4) || []).map((item: any, index) => {
              const severity = item.severity || (index === 0 ? 'high' : 'medium');
              return (
                <div key={item.id || item.location || index} className="flex gap-2.5">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${severity === 'high' || severity === 'danger' ? 'bg-orange-500/15 text-orange-500' : severity === 'low' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-violet-500/15 text-violet-500'}`}>
                    {severity === 'high' || severity === 'danger' ? <AlertTriangle size={13} /> : severity === 'low' ? <CheckCircle2 size={13} /> : <TrendingUp size={13} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-text-primary">{item.title || `${item.location} bottleneck`}</p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-text-secondary">{item.description || item.issue || item.recommendation}</p>
                  </div>
                </div>
              );
            })}
            {!recentInsights.length && !analysis?.primary_bottlenecks?.length && <p className="text-xs text-text-tertiary">No new insights have been generated yet.</p>}
          </div>
          <Link to="/insights" className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-[#250C77] dark:text-[#ED642B]">View Full Analysis <ArrowRight size={12} /></Link>
        </section>

        <section className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm xl:col-span-5">
          <div className="mb-3 flex items-start justify-between border-b border-border-default pb-3">
            <div>
              <h2 className="text-xs font-bold text-text-primary">Shipment Volume Trend</h2>
              <p className="text-[10px] text-text-secondary">Daily activity from the last 30 days</p>
            </div>
            <span className="rounded-md border border-border-default px-2 py-1 text-[10px] text-text-secondary">30 Days</span>
          </div>
          {trendData.length ? (
            <div className="flex h-48 items-end gap-1 border-b border-border-default px-1 pb-2">
              {trendData.map((point, index) => {
                const maxVisits = Math.max(...trendData.map((row) => row.visit_count || 0), 1);
                const height = Math.max(4, ((point.visit_count || 0) / maxVisits) * 100);
                return <div key={`${point.date}-${index}`} title={`${point.date}: ${point.visit_count} visits`} className="flex-1 rounded-t-sm bg-[#250C77] transition-all hover:bg-[#ED642B]" style={{ height: `${height}%` }} />;
              })}
            </div>
          ) : <div className="flex h-48 items-center justify-center text-xs text-text-tertiary">No shipment trend data available.</div>}
          <div className="mt-3 flex items-center gap-4 text-[10px] text-text-secondary"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#250C77]" /> Actual shipments</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#ED642B]" /> AI monitored</span></div>
        </section>

        <section className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm xl:col-span-3">
          <div className="mb-3 flex items-center justify-between border-b border-border-default pb-3">
            <div><h2 className="text-xs font-bold text-text-primary">Top Routes Performance</h2><p className="text-[10px] text-text-secondary">By on-time delivery rate</p></div>
            <RouteIcon size={15} className="text-[#250C77]" />
          </div>
          <div className="space-y-3">
            {(locationStats || []).slice(0, 5).map((route, index) => {
              const rate = Math.max(0, Math.min(100, 100 - ((route.avg_excess_delay_minutes || 0) / Math.max(route.expected_dwell_minutes || 1, 1) * 100)));
              return <div key={route.location_id || index}><div className="mb-1 flex justify-between text-[10px]"><span className="truncate text-text-primary">{route.location_name}</span><span className="font-numeric text-text-secondary">{rate.toFixed(1)}%</span></div><div className="h-1.5 rounded-full bg-bg-surface-raised"><div className="h-full rounded-full bg-status-good" style={{ width: `${rate}%` }} /></div></div>;
            })}
            {!locationStats?.length && <p className="text-xs text-text-tertiary">No route performance data available.</p>}
          </div>
          <Link to="/analytics" className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-[#250C77] dark:text-[#ED642B]">View all routes <ArrowRight size={12} /></Link>
          <div className="mt-4 border-t border-border-default pt-3">
            <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-bold text-text-primary">Recent Analyses</h3><Link to="/insights" className="text-[10px] font-semibold text-[#250C77] dark:text-[#ED642B]">View all</Link></div>
            <div className="space-y-2">
              {recentInsights.slice(0, 3).map((insight) => <Link key={insight.id} to="/insights" className="flex items-start gap-2 rounded-md p-1.5 transition-colors hover:bg-bg-surface-raised"><BarChart3 size={12} className="mt-0.5 shrink-0 text-[#250C77]" /><span className="min-w-0"><span className="block truncate text-[10px] font-semibold text-text-primary">{insight.title}</span><span className="block text-[9px] text-text-tertiary">{new Date(insight.created_at).toLocaleDateString()}</span></span></Link>)}
              {!recentInsights.length && <p className="text-[10px] text-text-tertiary">No previous analyses yet.</p>}
            </div>
          </div>
        </section>
      </div>

        </>
      )}

      {activeModule.id === 'recommendations' && (
        <>
      {/* ── VISUAL ANALYTICS SECTION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Chart: Stop Dwell vs Target (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
                <BarChart3 size={14} className="text-[#ED642B]" />
                Stop Dwell vs Target Duration (Minutes)
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Comparing actual average turnaround against target operating SLAs
              </p>
            </div>
            <span className="text-[10px] font-numeric px-2 py-0.5 rounded bg-[#ED642B]/10 text-[#ED642B] font-bold">
              Monitored Corridors
            </span>
          </div>

          <div className="h-64 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-text-tertiary">
                No stop dwell telemetry records available.
              </div>
            ) : (
              <ReactECharts
                option={analystChartOption}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-2 border-t border-border-default">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-[#ED642B]" />
              Excess Dwell &gt; 30 mins
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-[#250C77]" />
              Standard Target
            </span>
          </div>
        </div>

        {/* Right: Prescriptive Interventions (5 cols - Real Data) */}
        <div className="lg:col-span-5 rounded-2xl border border-border-default bg-bg-surface p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border-default pb-3 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Lightbulb size={14} className="text-[#ED642B]" />
                Prescriptive Interventions
              </h2>
              <span className="text-[10px] text-text-tertiary font-numeric">Live Formulated</span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {liveInterventions.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-tertiary">
                  No critical dwell interventions currently flagged.
                </div>
              ) : (
                liveInterventions.slice(0, 3).map((item, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-bg-surface-raised border border-border-default space-y-1 hover:border-[#ED642B]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-text-primary leading-snug">{item.title}</p>
                      <span className={`text-[9.5px] font-numeric font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        item.severity === 'high'
                          ? 'bg-status-danger-bg text-status-danger border border-status-danger/30'
                          : 'bg-[#ED642B]/15 text-[#ED642B] border border-[#ED642B]/30'
                      }`}>
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            to="/analytics"
            className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-bg-surface-raised hover:bg-white/5 border border-border-default text-xs font-bold text-text-primary transition-colors cursor-pointer mt-2"
          >
            <span>View Full Financial Analytics</span>
            <ArrowRight size={13} className="text-[#ED642B]" />
          </Link>
        </div>
      </div>

        </>
      )}

      {activeModule.id === 'assistant' && (
        <>
      {/* ── LIVE INTERACTIVE ANALYST TERMINAL (WITH RICH MARKDOWN RENDERING) ── */}
      <div id="analyst-assistant" className="rounded-2xl border border-border-strong bg-bg-surface shadow-xl flex flex-col h-[580px] overflow-hidden">
        {/* Terminal Header */}
        <div className="px-4 py-3 border-b border-border-default bg-bg-surface-raised flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#250C77] text-white flex items-center justify-center font-bold text-xs">
              AI
            </div>
            <div>
              <span className="text-xs font-bold text-text-primary">Fleet Operations Analyst Terminal</span>
              <span className="hidden sm:inline text-[10px] text-text-tertiary ml-2">• Live Telemetry & Corridor Diagnostics Active</span>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] text-status-good font-numeric font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-status-good animate-pulse" />
            Live Context Ready
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#ED642B] text-white rounded-br-sm shadow-md font-semibold'
                      : 'bg-bg-surface-raised text-text-primary rounded-bl-sm border border-border-default shadow-sm'
                  }`}
                >
                  <FormattedMarkdownMessage content={msg.content} isUser={isUser} />
                  {/* View in Visuals button — only on assistant messages with chart_data */}
                  {!isUser && msg.chart_data && (
                    <button
                      onClick={() => navigate('/analytics', {
                        state: { injectChart: msg.chart_data }
                      })}
                      className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#250C77]/10 hover:bg-[#250C77]/20 border border-[#250C77]/30 text-[11px] font-bold text-[#250C77] dark:text-[#ED642B] transition-colors cursor-pointer"
                    >
                      <BarChart3 size={12} />
                      View in Visuals
                      <ExternalLink size={11} className="opacity-60" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {copilotMutation.isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 bg-bg-surface-raised border border-border-default rounded-2xl rounded-bl-sm px-4 py-3">
                <Spinner size="xs" color="brand" />
                <span className="text-xs text-text-secondary font-medium">Analyst querying telemetry & computing cost recovery...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto border-t border-border-default bg-bg-surface-raised/40 scrollbar-none">
          {quickPrompts.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              disabled={copilotMutation.isPending}
              className="shrink-0 px-3 py-1.5 rounded-lg border border-border-default text-[11px] text-text-secondary hover:text-text-primary hover:border-[#ED642B]/50 hover:bg-[#ED642B]/10 transition-colors cursor-pointer font-semibold disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-bg-surface)' }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border-default bg-bg-surface-raised">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the Analyst about stop turnaround, demurrage loss, or driver metrics..."
              disabled={copilotMutation.isPending}
              className="flex-1 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none transition-colors border border-border-default focus:border-[#ED642B] font-medium"
              style={{ backgroundColor: 'var(--color-bg-surface)' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || copilotMutation.isPending}
              className="p-2.5 sm:px-4 rounded-xl bg-[#ED642B] hover:bg-[#D4521D] text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-[#ED642B]/20"
            >
              <Send size={13} />
              <span className="hidden sm:inline">Ask Analyst</span>
            </button>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
