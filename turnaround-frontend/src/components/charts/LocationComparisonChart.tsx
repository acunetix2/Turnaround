import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { LocationStats } from '../../lib/api/types';
import { formatCurrency } from '../../lib/format';
import { useTheme } from '../../lib/ThemeContext';

interface LocationComparisonChartProps {
  data: LocationStats[];
  metric?: 'financial_impact' | 'avg_excess_delay_minutes';
  height?: number;
}

export const LocationComparisonChart: React.FC<LocationComparisonChartProps> = ({
  data,
  metric = 'financial_impact',
  height = 280,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const option = useMemo<EChartsOption>(() => {
    const sorted = [...data].sort((a, b) => b[metric] - a[metric]).slice(0, 8);
    const names = sorted.map((d) => d.location_name);
    const values = sorted.map((d) => d[metric]);

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
          const item = params[0];
          const val = metric === 'financial_impact' ? formatCurrency(item.value) : `${item.value.toFixed(0)} min`;
          return `<div style="font-weight:700">${item.name}</div><div style="color:#ED642B">${metric === 'financial_impact' ? 'Loss' : 'Excess'}: ${val}</div>`;
        },
      },
      grid: {
        top: 10,
        right: 20,
        bottom: 20,
        left: 120,
      },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', type: 'dashed' } },
        axisLabel: {
          color: isDark ? '#9CA3AF' : '#6B7280',
          fontSize: 10,
          formatter: metric === 'financial_impact' ? (v: number) => `${(v / 1000).toFixed(0)}K` : undefined,
        },
      },
      yAxis: {
        type: 'category',
        data: names,
        inverse: true,
        axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' } },
        axisLabel: {
          color: isDark ? '#9CA3AF' : '#6B7280',
          fontSize: 10,
          formatter: (name: string) => (name.length > 16 ? name.substring(0, 14) + '..' : name),
        },
      },
      series: [
        {
          name: metric === 'financial_impact' ? 'Financial Impact' : 'Excess Dwell',
          type: 'bar',
          data: values,
          itemStyle: {
            color: (params: any) => {
              const colors = ['#ED642B', '#250C77', '#F59E0B', '#10B981', '#6366F1'];
              return colors[params.dataIndex % colors.length];
            },
            borderRadius: [0, 4, 4, 0],
          },
        },
      ],
    };
  }, [data, metric, isDark]);

  return (
    <div style={{ width: '100%', height }}>
      <ReactECharts option={option} style={{ width: '100%', height: '100%' }} opts={{ renderer: 'svg' }} />
    </div>
  );
};
