import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Clock } from 'lucide-react'

const toDisplayTime = (value?: string) => {
  if (!value) return ''

  const normalized = value.trim()
  const match = normalized.match(/^([0-9]{1,2}):([0-9]{2})\s*(AM|PM)?$/i)
  if (!match) return normalized

  let hours = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = (match[3] || (hours >= 12 ? 'PM' : 'AM')).toUpperCase()

  if (meridiem === 'AM' && hours === 12) hours = 0
  if (meridiem === 'PM' && hours !== 12) hours += 12

  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${meridiem}`
}

const to24HourValue = (displayValue?: string) => {
  if (!displayValue) return ''

  const normalized = displayValue.trim()
  const match = normalized.match(/^([0-9]{1,2}):([0-9]{2})\s*(AM|PM)$/i)
  if (!match) {
    return normalized
  }

  let hours = Number(match[1])
  const minutes = Number(match[2])
  const meridiem = match[3].toUpperCase()

  if (meridiem === 'AM' && hours === 12) hours = 0
  if (meridiem === 'PM' && hours !== 12) hours += 12

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const buildTimeSlots = (stepMinutes: number, meridiem: 'AM' | 'PM' = 'AM') => {
  const slots: string[] = []
  const minutesInDay = 24 * 60

  for (let minutes = 0; minutes < minutesInDay; minutes += stepMinutes) {
    const totalHours = Math.floor(minutes / 60)
    const hour12 = totalHours % 12 === 0 ? 12 : totalHours % 12
    const minute = minutes % 60
    const suffix = totalHours >= 12 ? 'PM' : 'AM'

    if (suffix !== meridiem) continue

    slots.push(`${String(hour12)}:${String(minute).padStart(2, '0')} ${suffix}`)
  }

  return slots
}

export interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  stepMinutes?: number
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select time',
  className = '',
  disabled = false,
  stepMinutes = 15,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMeridiem, setSelectedMeridiem] = useState<'AM' | 'PM'>(() => {
    const currentHour = value ? Number(value.split(':')[0]) : new Date().getHours()
    return currentHour >= 12 ? 'PM' : 'AM'
  })
  const containerRef = useRef<HTMLDivElement>(null)

  const slots = useMemo(() => buildTimeSlots(stepMinutes, selectedMeridiem), [selectedMeridiem, stepMinutes])

  useEffect(() => {
    const currentHour = value ? Number(value.split(':')[0]) : new Date().getHours()
    setSelectedMeridiem(currentHour >= 12 ? 'PM' : 'AM')
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-border-default bg-bg-surface-raised px-3 py-2 text-left text-xs text-text-primary transition-colors hover:border-[#ED642B]/40 focus:outline-none focus:ring-2 focus:ring-[#ED642B]/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex items-center gap-2 truncate">
          <Clock size={13} className="text-text-tertiary shrink-0" />
          <span className={value ? 'text-text-primary' : 'text-text-tertiary'}>
            {value ? toDisplayTime(value) : placeholder}
          </span>
        </span>
        <ChevronDown
          size={13}
          className={`text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-border-default bg-bg-surface shadow-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="border-b border-border-default bg-bg-surface-raised px-2 py-2">
            <div className="grid grid-cols-2 gap-1.5">
              {(['AM', 'PM'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setSelectedMeridiem(period)}
                  className={[
                    'rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors',
                    selectedMeridiem === period
                      ? 'bg-[#ED642B] text-white'
                      : 'bg-bg-surface text-text-secondary hover:text-text-primary',
                  ].join(' ')}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto p-2">
            <div className="grid grid-cols-3 gap-1.5">
              {slots.map((slot) => {
                const normalizedValue = to24HourValue(slot)
                const isSelected = normalizedValue === value

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      onChange?.(normalizedValue)
                      setIsOpen(false)
                    }}
                    className={[
                      'rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors',
                      isSelected
                        ? 'bg-[#ED642B] text-white shadow-sm'
                        : 'bg-bg-surface-raised text-text-secondary hover:bg-bg-surface-hover hover:text-text-primary',
                    ].join(' ')}
                  >
                    {slot}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
