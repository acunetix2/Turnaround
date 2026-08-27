import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { TrendDataPoint } from '../../lib/api/types';

const CHART_COLORS = {
  dwell: '#4F7CFF',
  excess: '#F5A524',
  cost: '#F0464C',
  grid: 'rgba(255,255,255,0.06)',
  axis: '#6B7280',
};

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const DarkTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1C21] border border-white/[0.14] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-[#9CA3AF] mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

interface DwellTrendChartProps {
  data: TrendDataPoint[];
  height?: number;
}

export const DwellTrendChart: React.FC<DwellTrendChartProps> = ({
  data,
  height = 260,
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
      <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="4 4" vertical={false} />
      <XAxis
        dataKey="date"
        tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <Tooltip content={<DarkTooltip />} />
      <Legend
        wrapperStyle={{ color: CHART_COLORS.axis, fontSize: 12 }}
      />
      <Line
        type="monotone"
        dataKey="avg_dwell_minutes"
        name="Avg Dwell (min)"
        stroke={CHART_COLORS.dwell}
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4 }}
      />
      <Line
        type="monotone"
        dataKey="excess_dwell_minutes"
        name="Excess Dwell (min)"
        stroke={CHART_COLORS.excess}
        strokeWidth={2}
        dot={false}
        activeDot={{ r: 4 }}
      />
    </LineChart>
  </ResponsiveContainer>
);

interface FinancialImpactChartProps {
  data: TrendDataPoint[];
  height?: number;
}

export const FinancialImpactChart: React.FC<FinancialImpactChartProps> = ({
  data,
  height = 260,
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
      <defs>
        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={CHART_COLORS.cost} stopOpacity={0.25} />
          <stop offset="95%" stopColor={CHART_COLORS.cost} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="4 4" vertical={false} />
      <XAxis
        dataKey="date"
        tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
      />
      <Tooltip content={<DarkTooltip />} />
      <Area
        type="monotone"
        dataKey="financial_loss"
        name="Financial Loss (KES)"
        stroke={CHART_COLORS.cost}
        strokeWidth={2}
        fill="url(#costGrad)"
        dot={false}
      />
    </AreaChart>
  </ResponsiveContainer>
);
