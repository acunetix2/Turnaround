import React from 'react'
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
    <div className={`text-2xl font-semibold tracking-tight text-text-primary ${className}`}>
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
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${variantStyles[variant]} ${className}`}
    >
      {icons[variant]}
      {children}
    </span>
  )
}

export interface MetricCardSparklineProps {
  data?: Array<{ value: number; timestamp?: string; [key: string]: any }>
  dataKey?: string
  height?: number
  color?: string
  className?: string
  showGrid?: boolean
  showTooltip?: boolean
}

export const MetricCardSparkline: React.FC<MetricCardSparklineProps> = () => {
  // Lines removed from metric cards per user request
  return null
}
