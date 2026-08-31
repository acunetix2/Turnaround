import React from 'react'

export interface EmptyStatePresentationalProps {
  icon?: React.ReactNode | React.ComponentType<{ size?: number; className?: string }>
  title: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export const EmptyStatePresentational: React.FC<EmptyStatePresentationalProps> = ({
  icon: IconProp,
  title,
  description,
  children,
  className = '',
}) => {
  const renderIcon = () => {
    if (!IconProp) return null
    if (React.isValidElement(IconProp)) {
      return IconProp
    }
    if (typeof IconProp === 'function' || typeof IconProp === 'object') {
      const IconComponent = IconProp as React.ComponentType<{ size?: number; className?: string }>
      return <IconComponent size={20} className="text-text-secondary" />
    }
    return null
  }

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-border-default bg-bg-surface-raised/20 max-w-lg mx-auto ${className}`}
    >
      {IconProp && (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border-default bg-bg-surface text-text-secondary shadow-xs mb-3.5">
          {renderIcon()}
        </div>
      )}
      <h3 className="text-xs sm:text-sm font-semibold text-text-primary tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-text-secondary mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {children && <div className="mt-4 flex items-center gap-2">{children}</div>}
    </div>
  )
}
