import React, { createContext, useContext } from 'react'
import { Info, BarChart2 } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { useTheme } from '../../lib/ThemeContext'

interface ChartContextType {
  isLoading?: boolean
}

const ChartContext = createContext<ChartContextType>({})

export const Chart: React.FC<{
  isLoading?: boolean
  children: React.ReactNode
  className?: string
}> = ({ isLoading = false, children, className = '' }) => {
  return (
    <ChartContext.Provider value={{ isLoading }}>
      <div className={`flex flex-col gap-4 w-full ${className}`}>{children}</div>
    </ChartContext.Provider>
  )
}

export const ChartCard: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = '' }) => {
  return (
    <div
      className={`rounded-xl border border-border-default bg-bg-surface overflow-hidden shadow-sm transition-colors ${className}`}
    >
      {children}
    </div>
  )
}

export const ChartHeader: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = '' }) => {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 border-b border-border-default bg-bg-surface-raised/20 ${className}`}
    >
      {children}
    </div>
  )
}

export const ChartTitle: React.FC<{
  children: React.ReactNode
  tooltip?: string
  className?: string
}> = ({ children, tooltip, className = '' }) => {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold text-text-primary ${className}`}>
      <span>{children}</span>
      {tooltip && (
        <span title={tooltip} className="cursor-help text-text-tertiary hover:text-text-secondary transition-colors">
          <Info size={12} />
        </span>
      )}
    </div>
  )
}

export interface ChartActionItem {
  label: string
  onClick: () => void
  icon?: React.ReactNode
}

export const ChartActions: React.FC<{
  actions?: ChartActionItem[]
  children?: React.ReactNode
  className?: string
}> = ({ actions, children, className = '' }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {children}
      {actions?.map((action, i) => (
        <button
          key={i}
          type="button"
          onClick={action.onClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-bg-surface-raised hover:bg-bg-surface-hover border border-border-default transition-colors cursor-pointer"
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  )
}

export const ChartContent: React.FC<{
  children: React.ReactNode
  isEmpty?: boolean
  emptyState?: React.ReactNode
  loadingState?: React.ReactNode
  className?: string
}> = ({ children, isEmpty = false, emptyState, loadingState, className = '' }) => {
  const { isLoading } = useContext(ChartContext)

  if (isLoading && loadingState) {
    return <div className={`p-4 ${className}`}>{loadingState}</div>
  }

  if (isEmpty && emptyState) {
    return <div className={`p-4 ${className}`}>{emptyState}</div>
  }

  return <div className={`p-4 ${className}`}>{children}</div>
}

export const ChartEmptyState: React.FC<{
  icon?: React.ReactNode
  title?: string
  description?: string
  className?: string
}> = ({
  icon = <BarChart2 size={16} />,
  title = 'No data to show',
  description = 'It may take some time for telemetry to populate',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-10 text-center gap-2 ${className}`}>
      <div className="p-2 rounded-lg bg-bg-surface-raised text-text-tertiary">{icon}</div>
      <p className="text-xs font-semibold text-text-primary">{title}</p>
      <p className="text-[11px] text-text-tertiary max-w-xs">{description}</p>
    </div>
  )
}

export const ChartLoadingState: React.FC<{
  height?: number
  className?: string
}> = ({ height = 160, className = '' }) => {
  return (
    <div
      style={{ height }}
      className={`w-full flex items-end gap-2 animate-pulse p-2 rounded-lg bg-bg-surface-raised/30 ${className}`}
    >
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 bg-border-default rounded-t transition-all"
          style={{ height: `${20 + Math.sin(i) * 35 + 35}%` }}
        />
      ))}
    </div>
  )
}

export interface ChartBarProps {
  data: Array<Record<string, any>>
  dataKey: string
  xAxisKey?: string
  showGrid?: boolean
  showYAxis?: boolean
  YAxisProps?: {
    tickFormatter?: (value: any) => string
    width?: number
  }
  isFullHeight?: boolean
  height?: number | string
  color?: string
}

export const ChartBar: React.FC<ChartBarProps> = ({
  data,
  dataKey,
  xAxisKey = 'timestamp',
  showGrid = false,
  showYAxis = true,
  YAxisProps,
  isFullHeight = true,
  height = '100%',
  color = '#ED642B',
}) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const categories = data.map((item, idx) => {
    if (xAxisKey && item[xAxisKey]) {
      const val = item[xAxisKey]
      try {
        const d = new Date(val)
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      } catch {
        // fallback
      }
      return String(val)
    }
    return `#${idx + 1}`
  })

  const values = data.map((item) => item[dataKey] ?? 0)

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#180B4A' : '#FFFFFF',
      borderColor: color,
      borderWidth: 1,
      textStyle: {
        color: isDark ? '#FFFFFF' : '#111827',
        fontSize: 11,
        fontFamily: 'inherit',
      },
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
        },
      },
      formatter: (params: any) => {
        const item = params[0]
        const formatted = YAxisProps?.tickFormatter ? YAxisProps.tickFormatter(item.value) : item.value
        return `
          <div style="font-weight: 600; font-size: 11px; margin-bottom: 2px;">${item.name}</div>
          <div style="color: ${color}; font-size: 11px; font-weight: 500;">
            ${dataKey.replace('_', ' ')}: <strong>${formatted}</strong>
          </div>
        `
      },
    },
    grid: {
      top: 10,
      right: 10,
      bottom: 20,
      left: showYAxis ? (YAxisProps?.width ?? 36) : 10,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLabel: {
        color: isDark ? '#7D73A8' : '#8F84BE',
        fontSize: 10,
        interval: Math.max(1, Math.floor(data.length / 6)),
      },
    },
    yAxis: {
      type: 'value',
      show: showYAxis,
      splitLine: {
        show: showGrid,
        lineStyle: {
          color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          type: 'dashed',
        },
      },
      axisLabel: {
        color: isDark ? '#7D73A8' : '#8F84BE',
        fontSize: 10,
        formatter: (val: any) => (YAxisProps?.tickFormatter ? YAxisProps.tickFormatter(val) : val),
      },
    },
    series: [
      {
        name: dataKey,
        type: 'bar',
        barWidth: Math.max(2, Math.min(14, Math.floor(400 / Math.max(data.length, 1)))),
        itemStyle: {
          color: color,
          borderRadius: [3, 3, 0, 0],
        },
        data: values,
      },
    ],
  }

  return (
    <div style={{ height: isFullHeight ? '100%' : height, width: '100%' }}>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
    </div>
  )
}

export interface ChartLineConfig {
  [key: string]: {
    label: string
    color?: string
  }
}

export interface ChartLineProps {
  data: Array<Record<string, any>>
  dataKey?: string
  dataKeys?: string[]
  config?: ChartLineConfig
  xAxisKey?: string
  showGrid?: boolean
  showYAxis?: boolean
  YAxisProps?: {
    tickFormatter?: (value: any) => string
    width?: number
  }
  isFullHeight?: boolean
  height?: number | string
}

const DEFAULT_LINE_COLORS = ['#ED642B', '#250C77', '#10B981', '#6366F1', '#F59E0B']

export const ChartLine: React.FC<ChartLineProps> = ({
  data,
  dataKey,
  dataKeys = dataKey ? [dataKey] : [],
  config,
  xAxisKey = 'timestamp',
  showGrid = true,
  showYAxis = true,
  YAxisProps,
  isFullHeight = true,
  height = '100%',
}) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const categories = data.map((item, idx) => {
    if (xAxisKey && item[xAxisKey]) {
      const val = item[xAxisKey]
      try {
        const d = new Date(val)
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      } catch {
        // fallback
      }
      return String(val)
    }
    return `#${idx + 1}`
  })

  const series = dataKeys.map((key, idx) => {
    const itemConfig = config?.[key]
    const color = itemConfig?.color || DEFAULT_LINE_COLORS[idx % DEFAULT_LINE_COLORS.length]
    const label = itemConfig?.label || key.replace('_', ' ')

    return {
      name: label,
      type: 'line' as const,
      smooth: true,
      showSymbol: false,
      symbolSize: 4,
      lineStyle: { width: 2, color },
      itemStyle: { color },
      data: data.map((item) => item[key] ?? 0),
    }
  })

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: isDark ? '#180B4A' : '#FFFFFF',
      borderColor: '#ED642B',
      borderWidth: 1,
      textStyle: {
        color: isDark ? '#FFFFFF' : '#111827',
        fontSize: 11,
        fontFamily: 'inherit',
      },
      formatter: (params: any) => {
        if (!Array.isArray(params) || params.length === 0) return ''
        const header = `<div style="font-weight: 600; font-size: 11px; margin-bottom: 4px;">${params[0].name}</div>`
        const rows = params
          .map((item: any) => {
            const formatted = YAxisProps?.tickFormatter ? YAxisProps.tickFormatter(item.value) : item.value
            return `
              <div style="display: flex; items-center; justify-content: space-between; gap: 8px; font-size: 11px; color: ${item.color}">
                <span>${item.seriesName}:</span>
                <strong>${formatted}</strong>
              </div>
            `
          })
          .join('')
        return `${header}${rows}`
      },
    },
    grid: {
      top: 10,
      right: 10,
      bottom: 20,
      left: showYAxis ? (YAxisProps?.width ?? 36) : 10,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: false,
      axisLine: { lineStyle: { color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' } },
      axisTick: { show: false },
      axisLabel: {
        color: isDark ? '#7D73A8' : '#8F84BE',
        fontSize: 10,
        interval: Math.max(1, Math.floor(data.length / 6)),
      },
    },
    yAxis: {
      type: 'value',
      show: showYAxis,
      splitLine: {
        show: showGrid,
        lineStyle: {
          color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          type: 'dashed',
        },
      },
      axisLabel: {
        color: isDark ? '#7D73A8' : '#8F84BE',
        fontSize: 10,
        formatter: (val: any) => (YAxisProps?.tickFormatter ? YAxisProps.tickFormatter(val) : val),
      },
    },
    series,
  }

  return (
    <div style={{ height: isFullHeight ? '100%' : height, width: '100%' }}>
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} opts={{ renderer: 'svg' }} />
    </div>
  )
}

export const ChartFooter: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = '' }) => {
  return (
    <div className={`border-t border-border-default bg-bg-surface-raised/10 ${className}`}>
      {children}
    </div>
  )
}
