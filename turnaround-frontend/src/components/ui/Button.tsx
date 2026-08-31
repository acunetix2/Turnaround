import React from 'react'
import { Loader2 } from 'lucide-react'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'default'
  | 'outline'
  | 'danger'
  | 'warning'
  | 'ghost'
  | 'link'
  | 'dashed'

export type ButtonSize = 'tiny' | 'small' | 'medium' | 'large' | 'xs' | 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  leftIcon?: React.ReactNode
  iconRight?: React.ReactNode
  rightIcon?: React.ReactNode
  block?: boolean
  asChild?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#ED642B] hover:bg-[#D4521D] text-white border border-[#ED642B]/90 shadow-sm shadow-[#ED642B]/20 active:bg-[#B83E10]',
  secondary:
    'bg-[#250C77] hover:bg-[#3D1BA8] text-white border border-[#250C77] shadow-sm shadow-[#250C77]/20 active:bg-[#16074A]',
  default:
    'bg-bg-surface-raised hover:bg-bg-surface-hover text-text-primary border border-border-default active:bg-bg-surface',
  outline:
    'bg-transparent hover:bg-bg-surface-raised text-text-primary border border-border-default active:bg-bg-surface-raised/80',
  dashed:
    'bg-transparent hover:bg-bg-surface-raised text-text-primary border border-dashed border-border-default active:bg-bg-surface-raised/80',
  danger:
    'bg-status-danger-bg hover:bg-red-500/20 text-status-danger border border-status-danger/30 active:bg-red-500/30',
  warning:
    'bg-status-warning-bg hover:bg-amber-500/20 text-status-warning border border-status-warning/30 active:bg-amber-500/30',
  ghost:
    'bg-transparent hover:bg-bg-surface-raised text-text-secondary hover:text-text-primary border border-transparent',
  link:
    'bg-transparent hover:underline text-[#ED642B] border-none p-0 h-auto font-medium',
}

const sizeStyles: Record<string, string> = {
  tiny: 'h-6 px-2 text-[11px] gap-1 rounded-md',
  xs: 'h-6 px-2 text-[11px] gap-1 rounded-md',
  small: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  medium: 'h-9 px-3.5 text-xs gap-2 rounded-lg',
  md: 'h-9 px-3.5 text-xs gap-2 rounded-lg',
  large: 'h-10 px-4 text-sm gap-2.5 rounded-lg',
  lg: 'h-10 px-4 text-sm gap-2.5 rounded-lg',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      loading = false,
      icon,
      leftIcon,
      iconRight,
      rightIcon,
      block = false,
      children,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const leadIcon = icon || leftIcon
    const trailIcon = iconRight || rightIcon

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150 ease-out cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED642B]/40 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          block ? 'w-full' : '',
          variantStyles[variant],
          sizeStyles[size] || sizeStyles.medium,
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin shrink-0" />
        ) : leadIcon ? (
          <span className="shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">{leadIcon}</span>
        ) : null}
        {children && <span className="truncate">{children}</span>}
        {!loading && trailIcon ? (
          <span className="shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">{trailIcon}</span>
        ) : null}
      </button>
    )
  }
)

Button.displayName = 'Button'
