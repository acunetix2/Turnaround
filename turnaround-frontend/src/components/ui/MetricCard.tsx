import React, { useState, useRef } from 'react'
import { Info, ArrowUpRight, ArrowDownRight, Minus, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface MetricCardProps {
  isLoading?: boolean
  children: React.ReactNode
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  isLoading = false,
  children,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div
        className={`rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm space-y-3 animate-pulse ${className}`}
      >
        <div className="h-4 w-24 bg-bg-surface-raised rounded" />
        <div className="h-7 w-32 bg-bg-surface-raised rounded" />
        <div className="h-12 w-full bg-bg-surface-raised/40 rounded-lg" />
      </div>
    )
  }

  return (
    <div
      className={`rounded-2xl border border-border-default bg-bg-surface p-4 shadow-sm space-y-3 transition-all hover:border-[#ED642B]/30 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  )
}

export interface MetricCardHeaderProps {
  children: React.ReactNode
  href?: string
  className?: string
}

export const MetricCardHeader: React.FC<MetricCardHeaderProps> = ({
  children,
  href,
  className = '',
}) => {
  if (href) {
    const isExternal = href.startsWith('http://') || href.startsWith('https://')
    return (
      <div className={`flex items-center justify-between group ${className}`}>
        <div className="flex-1 min-w-0">{children}</div>
        {isExternal ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-tertiary group-hover:text-text-primary transition-colors p-1 shrink-0"
          >
            <ExternalLink size={12} />
          </a>
        ) : (
          <Link
            to={href}
            className="text-text-tertiary group-hover:text-text-primary transition-colors p-1 shrink-0"
          >
            <ExternalLink size={12} />
          </Link>
        )}
      </div>
    )
  }

  return <div className={`flex items-center justify-between ${className}`}>{children}</div>
}

export interface MetricCardLabelProps {
  children: React.ReactNode
  tooltip?: string
  icon?: React.ReactNode
  className?: string
}

export const MetricCardLabel: React.FC<MetricCardLabelProps> = ({
  children,
  tooltip,
  icon,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium text-text-secondary ${className}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
      {tooltip && (
        <span
          title={tooltip}
          className="cursor-help text-text-tertiary hover:text-text-secondary transition-colors shrink-0"
        >
          <Info size={12} />
        </span>
      )}
    </div>
  )
}

export interface MetricCardContentProps {
  children: React.ReactNode
  className?: string
}

export const MetricCardContent: React.FC<MetricCardContentProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`flex items-baseline justify-between gap-2 flex-wrap ${className}`}>
      {children}
    </div>
  )
}

export interface MetricCardValueProps {
  children: React.ReactNode
  className?: string
}

export const MetricCardValue: React.FC<MetricCardValueProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`font-numeric text-2xl font-bold tracking-tight text-text-primary ${className}`}>
      {children}
    </div>
  )
}

export interface MetricCardDifferentialProps {
  children: React.ReactNode
  variant?: 'positive' | 'negative' | 'neutral'
  className?: string
}

export const MetricCardDifferential: React.FC<MetricCardDifferentialProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const variantStyles = {
    positive: 'text-status-good bg-status-good/10',
    negative: 'text-status-danger bg-status-danger/10',
    neutral: 'text-text-tertiary bg-bg-surface-raised',
  }

  const icons = {
    positive: <ArrowUpRight size={11} className="shrink-0" />,
    negative: <ArrowDownRight size={11} className="shrink-0" />,
    neutral: <Minus size={11} className="shrink-0" />,
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-numeric font-semibold ${variantStyles[variant]} ${className}`}
    >
      {icons[variant]}
      {children}
    </span>
  )
}

// ── SMOOTH SPLINE BEZIER CURVE GENERATOR ──
function getSmoothSplinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`

  let path = `M ${points[0].x},${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]
    const prev = points[i - 1] || current
    const afterNext = points[i + 2] || next

    const tension = 0.25

    const cp1x = current.x + (next.x - prev.x) * tension
    const cp1y = current.y + (next.y - prev.y) * tension

    const cp2x = next.x - (afterNext.x - current.x) * tension
    const cp2y = next.y - (afterNext.y - current.y) * tension

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`
  }

  return path
}

export interface MetricCardSparklineProps {
  data: Array<{ value: number; timestamp?: string; [key: string]: any }>
  dataKey?: string
  height?: number
  color?: string
  className?: string
  showGrid?: boolean
  showTooltip?: boolean
}

export const MetricCardSparkline: React.FC<MetricCardSparklineProps> = ({
  data,
  dataKey = 'value',
  height = 46,
  color = '#ED642B',
  className = '',
  showGrid = true,
  showTooltip = true,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  if (!data || data.length < 2) return null

  const values = data.map((d) => Number(d[dataKey]) || 0)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal || 1

  const width = 240
  const paddingTop = 4
  const paddingBottom = 6
  const usableHeight = height - paddingTop - paddingBottom

  const points = values.map((val, idx) => {
    const x = (idx / (values.length - 1)) * width
    const y = paddingTop + usableHeight - ((val - minVal) / range) * usableHeight
    return { x, y, val, original: data[idx] }
  })

  const linePath = getSmoothSplinePath(points)
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`
  const gradId = `spark-grad-${color.replace('#', '')}-${Math.random().toString(36).substr(2, 5)}`

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !showTooltip) return
    const rect = containerRef.current.getBoundingClientRect()
    const relativeX = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, relativeX / rect.width))
    const nearestIndex = Math.round(percent * (points.length - 1))
    setHoverIndex(nearestIndex)
  }

  const handleMouseLeave = () => {
    setHoverIndex(null)
  }

  const activePoint = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full overflow-hidden select-none cursor-crosshair group ${className}`}
      style={{ height }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="85%" stopColor={color} stopOpacity="0.04" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Subtle Horizontal Gridlines */}
        {showGrid && (
          <g className="opacity-20 stroke-current text-border-default">
            <line x1="0" y1={paddingTop + usableHeight * 0.25} x2={width} y2={paddingTop + usableHeight * 0.25} strokeDasharray="3 3" strokeWidth="0.8" />
            <line x1="0" y1={paddingTop + usableHeight * 0.75} x2={width} y2={paddingTop + usableHeight * 0.75} strokeDasharray="3 3" strokeWidth="0.8" />
          </g>
        )}

        {/* Gradient Area Fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Real Smooth Curved Line Graph */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Scrub Line & Highlight Dot */}
        {activePoint && (
          <g>
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={height}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.6"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r="4.5"
              fill={color}
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {/* Interactive Tooltip Callout */}
      {activePoint && (
        <div
          className="absolute z-20 pointer-events-none -top-2 bg-bg-surface-raised border border-border-default px-2 py-0.5 rounded shadow-lg text-[10px] font-numeric font-bold text-text-primary whitespace-nowrap transform -translate-x-1/2 -translate-y-full transition-all duration-75"
          style={{
            left: `${(activePoint.x / width) * 100}%`,
          }}
        >
          <span>{activePoint.val.toLocaleString()}</span>
          {activePoint.original?.timestamp && (
            <span className="text-[8.5px] font-normal text-text-tertiary ml-1">
              {new Date(activePoint.original.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
