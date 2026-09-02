import React, { createContext, useContext, useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { Button, type ButtonVariant } from './Button'

interface DatePickerContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggle: () => void
  close: () => void
}

const DatePickerContext = createContext<DatePickerContextType>({
  isOpen: false,
  setIsOpen: () => {},
  toggle: () => {},
  close: () => {},
})

export const DatePicker: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggle = () => setIsOpen((prev) => !prev)
  const close = () => setIsOpen(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <DatePickerContext.Provider value={{ isOpen, setIsOpen, toggle, close }}>
      <div ref={containerRef} className={`relative inline-block ${className}`}>
        {children}
      </div>
    </DatePickerContext.Provider>
  )
}

export const DatePickerTrigger: React.FC<{
  children: React.ReactNode
  asChild?: boolean
  className?: string
}> = ({ children, asChild = false, className = '' }) => {
  const { toggle } = useContext(DatePickerContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as any).props?.onClick?.(e)
        toggle()
      },
    })
  }

  return (
    <div onClick={toggle} className={`cursor-pointer ${className}`}>
      {children}
    </div>
  )
}

export interface DatePickerButtonProps {
  children?: React.ReactNode
  variant?: ButtonVariant
  className?: string
  icon?: React.ReactNode
  onClear?: () => void
}

export const DatePickerButton = React.forwardRef<HTMLButtonElement, DatePickerButtonProps>(
  ({ children, variant = 'outline', className = '', icon = <CalendarIcon size={13} />, onClear, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        size="small"
        icon={icon}
        className={`justify-start font-normal text-xs ${className}`}
        {...props}
      >
        <span className="flex-1 text-left truncate">{children}</span>
        {onClear && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
            className="p-0.5 hover:text-text-primary text-text-tertiary transition-colors cursor-pointer"
          >
            <X size={12} />
          </span>
        )}
      </Button>
    )
  }
)

DatePickerButton.displayName = 'DatePickerButton'

export const DatePickerContent: React.FC<{
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}> = ({ children, align = 'left', className = '' }) => {
  const { isOpen, close } = useContext(DatePickerContext)

  if (!isOpen) return null

  const alignStyles = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }

  // Intercept child's onSelect to auto-close
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        onSelect: (date: any) => {
          (child as any).props?.onSelect?.(date)
          close()
        },
      })
    }
    return child
  })

  return (
    <div
      className={`absolute z-50 mt-1.5 rounded-xl border border-border-default bg-bg-surface shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${alignStyles[align]} ${className}`}
    >
      {enhancedChildren}
    </div>
  )
}
