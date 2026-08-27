import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { LocationStats } from '../../lib/api/types';
import { formatCurrency } from '../../lib/format';

interface LocationComparisonChartProps {
  data: LocationStats[];
  /** What to rank by — default: financial_impact */
  metric?: 'financial_impact' | 'avg_excess_dwell_minutes';
  height?: number;
}

const AXIS_COLOR = '#6B7280';
const GRID_COLOR = 'rgba(255,255,255,0.06)';

const BAR_COLORS = ['#F0464C', '#F5A524', '#FFB020', '#4F7CFF', '#22C55E', '#9C6ADE'];

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
}

const DarkTooltip: React.FC<TooltipPayload> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1C21] border border-white/[0.14] rounded-xl p-3 shadow-xl text-xs">
      <p className="text-[#9CA3AF] font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-[#F4F5F7]">
          {p.name === 'Financial Impact'
            ? formatCurrency(p.value)
            : `${p.value.toFixed(0)} min`}
        </p>
      ))}
    </div>
  );
};

export const LocationComparisonChart: React.FC<LocationComparisonChartProps> = ({
  data,
  metric = 'financial_impact',
  height = 280,
}) => {
  const sorted = [...data].sort((a, b) => b[metric] - a[metric]).slice(0, 8);
  const dataKey = metric;
  const label = metric === 'financial_impact' ? 'Financial Impact' : 'Excess Dwell (min)';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="4 4" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={
            metric === 'financial_impact'
              ? (v) => `${(v / 1000).toFixed(0)}K`
              : undefined
          }
        />
        <YAxis
          type="category"
          dataKey="location_name"
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey={dataKey} name={label} radius={[0, 6, 6, 0]}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
