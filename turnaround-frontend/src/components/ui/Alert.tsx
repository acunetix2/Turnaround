import React from 'react'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'info' | 'success'
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<string, string> = {
  default:
    'border-border-default bg-bg-surface text-text-primary [&>svg]:text-text-primary',
  destructive:
    'border-status-danger/30 bg-status-danger-bg text-status-danger [&>svg]:text-status-danger',
  warning:
    'border-status-warning/30 bg-status-warning-bg text-status-warning [&>svg]:text-status-warning',
  info:
    'border-[#250C77]/40 bg-[#250C77]/10 text-text-primary [&>svg]:text-[#250C77]',
  success:
    'border-status-good/30 bg-status-good-bg text-status-good [&>svg]:text-status-good',
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={`relative w-full rounded-xl border p-4 shadow-xs [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-text-primary ${
          variantStyles[variant] || variantStyles.default
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Alert.displayName = 'Alert'

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <h5
      ref={ref}
      className={`mb-1 font-semibold text-xs leading-none tracking-tight ${className}`}
      {...props}
    >
      {children}
    </h5>
  )
})
AlertTitle.displayName = 'AlertTitle'

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className = '', children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`text-xs text-text-secondary leading-relaxed [&_p]:leading-relaxed ${className}`}
      {...props}
    >
      {children}
    </div>
  )
})
AlertDescription.displayName = 'AlertDescription'
