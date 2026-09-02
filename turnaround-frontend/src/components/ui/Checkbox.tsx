import React from 'react'
import { Check, Minus } from 'lucide-react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean
  defaultChecked?: boolean
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  label?: React.ReactNode
  description?: React.ReactNode
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      id,
      checked,
      defaultChecked,
      indeterminate = false,
      onCheckedChange,
      onChange,
      disabled = false,
      className = '',
      label,
      description,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const combinedRef = (node: HTMLInputElement | null) => {
      (inputRef as any).current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as any).current = node
    }

    const isControlled = checked !== undefined
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false)
    const isChecked = isControlled ? checked : internalChecked

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return
      if (!isControlled) {
        setInternalChecked(e.target.checked)
      }
      onCheckedChange?.(e.target.checked)
      onChange?.(e)
    }

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate
      }
    }, [indeterminate])

    const checkboxControl = (
      <label
        htmlFor={id}
        className={`relative inline-flex items-center justify-center h-4 w-4 shrink-0 rounded-md border transition-all select-none ${
          disabled
            ? 'cursor-not-allowed opacity-50 border-border-default bg-bg-surface-raised/40'
            : 'cursor-pointer'
        } ${
          isChecked || indeterminate
            ? 'bg-[#ED642B] border-[#ED642B] text-white shadow-xs'
            : 'border-border-default bg-bg-surface-raised/60 hover:border-text-tertiary hover:bg-bg-surface-raised'
        } focus-within:ring-2 focus-within:ring-[#ED642B]/40 focus-within:ring-offset-1 focus-within:ring-offset-bg-surface ${className}`}
      >
        <input
          ref={combinedRef}
          type="checkbox"
          id={id}
          checked={isChecked}
          disabled={disabled}
          onChange={handleChange}
          className="peer sr-only"
          {...props}
        />
        {indeterminate ? (
          <Minus size={11} strokeWidth={3} className="text-white shrink-0" />
        ) : isChecked ? (
          <Check size={11} strokeWidth={3} className="text-white shrink-0 animate-in fade-in zoom-in-75 duration-100" />
        ) : null}
      </label>
    )

    if (!label && !description) {
      return checkboxControl
    }

    return (
      <div className="inline-flex items-start gap-2.5">
        <div className="pt-0.5">{checkboxControl}</div>
        <div className="flex flex-col gap-0.5 select-none">
          {label && (
            <label
              htmlFor={id}
              className={`text-xs font-medium leading-tight ${
                disabled ? 'cursor-not-allowed opacity-60 text-text-tertiary' : 'cursor-pointer text-text-primary'
              }`}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-[11px] text-text-tertiary leading-normal">{description}</p>
          )}
        </div>
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
