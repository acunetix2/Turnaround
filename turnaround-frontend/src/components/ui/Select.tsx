import React, { createContext, useContext, useState, useRef, useEffect, useId, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'

// ── CONTEXT ──
interface SelectContextType {
  value?: string
  onValueChange?: (val: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggle: () => void
  close: () => void
  selectedLabel: string | null
  setSelectedLabel: (label: string | null) => void
  disabled?: boolean
}

const SelectContext = createContext<SelectContextType>({
  isOpen: false,
  setIsOpen: () => {},
  toggle: () => {},
  close: () => {},
  selectedLabel: null,
  setSelectedLabel: () => {},
})

const getNodeText = (node: React.ReactNode): string => React.Children.toArray(node)
  .map((child) => {
    if (typeof child === 'string' || typeof child === 'number') return String(child)
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) return getNodeText(child.props.children)
    return ''
  })
  .join(' ')
  .replace(/\s+/g, ' ')
  .trim()

// ── COMPOUND OR COMPACT SELECT ──
export interface SelectOption {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onChange?: (value: string) => void
  disabled?: boolean
  children?: React.ReactNode
  className?: string
  // Backward compatibility with props-based API
  options?: SelectOption[]
  placeholder?: string
  label?: string
  id?: string
  grid?: boolean
}

export const Select: React.FC<SelectProps> = ({
  value: controlledValue,
  defaultValue,
  onValueChange,
  onChange,
  disabled = false,
  children,
  className = '',
  options,
  placeholder = 'Select...',
  label,
  id: externalId,
}) => {
  const autoId = useId()
  const id = externalId ?? autoId
  const [internalValue, setInternalValue] = useState<string | undefined>(defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : internalValue

  const handleValueChange = useCallback(
    (newVal: string) => {
      if (!isControlled) {
        setInternalValue(newVal)
      }
      onValueChange?.(newVal)
      onChange?.(newVal)
      setIsOpen(false)
    },
    [isControlled, onValueChange, onChange]
  )

  const toggle = () => {
    if (!disabled) setIsOpen((prev) => !prev)
  }

  const close = () => setIsOpen(false)

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Backward compatibility: If options prop is provided, render compact compound structure automatically
  if (options) {
    const selectedOpt = options.find((o) => o.value === currentValue)
    return (
      <Select
        value={currentValue}
        onValueChange={handleValueChange}
        disabled={disabled}
        className={className}
      >
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-text-secondary mb-1">
            {label}
          </label>
        )}
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder}>
            {selectedOpt ? (
              <span className="flex items-center gap-2">
                {selectedOpt.icon}
                <span>{selectedOpt.label}</span>
              </span>
            ) : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
              <div className="flex items-center gap-2">
                {opt.icon}
                <div>
                  <p>{opt.label}</p>
                  {opt.description && (
                    <p className="text-[10px] text-text-tertiary">{opt.description}</p>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
        isOpen,
        setIsOpen,
        toggle,
        close,
        selectedLabel,
        setSelectedLabel,
        disabled,
      }}
    >
      <div ref={containerRef} className={`relative inline-block ${className}`}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

// ── TRIGGER ──
export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
  className?: string
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ children, className = '', id, ...props }, ref) => {
    const { isOpen, toggle, disabled } = useContext(SelectContext)

    return (
      <button
        ref={ref}
        type="button"
        id={id}
        disabled={disabled}
        onClick={toggle}
        aria-expanded={isOpen}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border-default bg-bg-surface-raised/80 px-3 py-2 text-xs font-medium text-text-primary shadow-xs transition-all hover:bg-bg-surface-raised hover:border-text-tertiary focus:outline-none focus:ring-2 focus:ring-[#ED642B]/40 focus:ring-offset-1 focus:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${className}`}
        {...props}
      >
        <div className="flex items-center gap-2 truncate flex-1 text-left">{children}</div>
        <ChevronDown
          size={14}
          className={`shrink-0 text-text-tertiary transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-text-primary' : ''
          }`}
        />
      </button>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

// ── VALUE ──
export interface SelectValueProps {
  placeholder?: string
  children?: React.ReactNode
  className?: string
}

export const SelectValue: React.FC<SelectValueProps> = ({
  placeholder = 'Select an option...',
  children,
  className = '',
}) => {
  const { value, selectedLabel } = useContext(SelectContext)

  if (children) {
    return <span className={`truncate text-xs ${className}`}>{children}</span>
  }

  const display = selectedLabel || value

  if (!display) {
    return <span className={`truncate text-text-tertiary text-xs ${className}`}>{placeholder}</span>
  }

  return <span className={`truncate text-text-primary text-xs ${className}`}>{display}</span>
}

// ── CONTENT ──
export interface SelectContentProps {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}

export const SelectContent: React.FC<SelectContentProps> = ({
  children,
  align = 'left',
  className = '',
}) => {
  const { isOpen } = useContext(SelectContext)

  if (!isOpen) return null

  const alignStyles = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }

  return (
    <div
      className={`absolute z-[100] mt-1 min-w-[140px] max-h-60 w-full overflow-y-auto rounded-lg border border-border-default bg-bg-surface p-1 shadow-lg animate-in fade-in zoom-in-95 duration-100 ${alignStyles[align]} ${className}`}
    >
      {children}
    </div>
  )
}

// ── GROUP ──
export const SelectGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <div className={`py-0.5 ${className}`}>{children}</div>
}

// ── LABEL ──
export const SelectLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-text-tertiary ${className}`}>
      {children}
    </div>
  )
}

// ── ITEM ──
export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ value, children, disabled = false, className = '', ...props }, ref) => {
    const { value: selectedValue, onValueChange, setSelectedLabel } = useContext(SelectContext)
    const isSelected = selectedValue === value
    const label = getNodeText(children)

    useEffect(() => {
      if (isSelected && label) {
        setSelectedLabel(label)
      }
    }, [isSelected, label, setSelectedLabel])

    const handleClick = () => {
      if (disabled) return
      if (label) {
        setSelectedLabel(label)
      }
      onValueChange?.(value)
    }

    return (
      <div
        ref={ref}
        onClick={handleClick}
        className={`relative flex w-full select-none items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-text-secondary transition-colors ${
          disabled
            ? 'pointer-events-none opacity-40 cursor-not-allowed'
            : 'cursor-pointer hover:bg-bg-surface-raised hover:text-text-primary'
        } ${isSelected ? 'bg-bg-surface-raised font-medium text-text-primary' : ''} ${className}`}
        {...props}
      >
        <div className="flex items-center gap-2 truncate flex-1">{children}</div>
        {isSelected && (
          <Check size={12} strokeWidth={2.5} className="shrink-0 text-[#ED642B] ml-2" />
        )}
      </div>
    )
  }
)
SelectItem.displayName = 'SelectItem'

// ── SEPARATOR ──
export const SelectSeparator: React.FC<{ className?: string }> = ({ className = '' }) => {
  return <div className={`my-1 h-px bg-border-default ${className}`} />
}
