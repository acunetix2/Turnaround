import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface CalendarProps {
  mode?: 'single' | 'range'
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  initialFocus?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export const Calendar: React.FC<CalendarProps> = ({
  selected,
  onSelect,
  className = '',
  minDate,
  maxDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => selected || new Date())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    )
  }

  const isToday = (d: Date) => isSameDay(d, new Date())

  const isSelected = (d: Date) => {
    return selected ? isSameDay(d, selected) : false
  }

  const isDisabled = (d: Date) => {
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  // Construct calendar grid items
  const calendarDays: Array<{ date: Date; isCurrentMonth: boolean }> = []

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    })
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
    })
  }

  // Next month leading days (to fill 35 or 42 cells)
  const remaining = (7 - (calendarDays.length % 7)) % 7
  for (let day = 1; day <= remaining; day++) {
    calendarDays.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    })
  }

  return (
    <div className={`p-3 bg-bg-surface text-text-primary select-none w-[260px] ${className}`}>
      {/* Header Month / Year Navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-xs font-semibold text-text-primary">
          {MONTH_NAMES[month]} {year}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-surface-raised transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Weekday Names */}
      <div className="grid grid-cols-7 gap-1 mb-1 text-center">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-[10.5px] font-medium text-text-tertiary">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {calendarDays.map(({ date, isCurrentMonth }, idx) => {
          const selectedDay = isSelected(date)
          const today = isToday(date)
          const disabled = isDisabled(date)

          return (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => onSelect?.(date)}
              className={`h-7 w-7 mx-auto rounded-md text-xs font-numeric font-medium transition-all flex items-center justify-center cursor-pointer ${
                disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : selectedDay
                  ? 'bg-[#ED642B] text-white font-semibold shadow-xs'
                  : today
                  ? 'border border-[#ED642B]/60 text-text-primary bg-[#ED642B]/10 hover:bg-[#ED642B]/20'
                  : isCurrentMonth
                  ? 'text-text-primary hover:bg-bg-surface-raised'
                  : 'text-text-tertiary opacity-40 hover:bg-bg-surface-raised/50'
              }`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
