import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { TrendDataPoint } from '../../lib/api/types';
import { useTheme } from '../../lib/ThemeContext';
import { formatCurrency } from '../../lib/format';

interface DwellTrendChartProps {
  data: TrendDataPoint[];
  height?: number;
}

export const DwellTrendChart: React.FC<DwellTrendChartProps> = ({
  data,
  height = 260,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const option = useMemo<EChartsOption>(() => {
    const dates = data.map((d) => d.date);
    const avgDwells = data.map((d) => Math.round(d.average_dwell_minutes ?? 0));
    const excessDwells = data.map((d) => Math.round(d.excess_dwell_minutes ?? 0));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#180B4A' : '#FFFFFF',
        borderColor: '#ED642B',
        borderWidth: 1,
        textStyle: { color: isDark ? '#FFFFFF' : '#111827', fontSize: 11 },
      },
      legend: {
        show: true,
        top: 0,
        right: 0,
        textStyle: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 11 },
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
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } },
        axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        name: 'Mins',
        nameTextStyle: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10 },
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } },
        axisLabel: { color: isDark ? '#9CA3AF' : '#6B7280', fontSize: 10 },
      },
      series: [
        {
          name: 'Avg Dwell (min)',
          type: 'line',
          smooth: true,
          data: avgDwells,
          lineStyle: { width: 2.5, color: '#250C77' },
          itemStyle: { color: '#250C77' },
        },
        {
          name: 'Excess Dwell (min)',
          type: 'line',
          smooth: true,
          data: excessDwells,
          lineStyle: { width: 2.5, color: '#ED642B' },
          itemStyle: { color: '#ED642B' },
        },
      ],
    };
  }, [data, isDark]);

  return (
    <div style={{ width: '100%', height }}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
    </div>
  );
};

interface FinancialImpactChartProps {
  data: TrendDataPoint[];
  height?: number;
}

export const FinancialImpactChart: React.FC<FinancialImpactChartProps> = ({
  data,
  height = 260,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const option = useMemo<EChartsOption>(() => {
    const dates = data.map((d) => d.date);
    const costs = data.map((d) => d.estimated_cost ?? 0);

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
          return `<div style="font-weight:700">${item.name}</div><div style="color:#ED642B">Cost: ${formatCurrency(item.value)}</div>`;
        },
      },
      grid: {
        top: 15,
        right: 15,
        bottom: 25,
        left: 45,
      },
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
        axisLabel: {
          color: isDark ? '#9CA3AF' : '#6B7280',
          fontSize: 10,
          formatter: (v: number) => `${(v / 1000).toFixed(0)}K`,
        },
      },
      series: [
        {
          name: 'Financial Loss (KES)',
          type: 'line',
          smooth: true,
          data: costs,
          lineStyle: { width: 2.5, color: '#ED642B' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(237, 100, 43, 0.4)' },
                { offset: 1, color: 'rgba(237, 100, 43, 0.0)' },
              ],
            },
          },
        },
      ],
    };
  }, [data, isDark]);

  return (
    <div style={{ width: '100%', height }}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
    </div>
  );
};
