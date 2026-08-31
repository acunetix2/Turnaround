import { format } from 'date-fns'
import * as React from 'react'
import { Calendar } from './Calendar'
import {
  DatePicker,
  DatePickerButton,
  DatePickerContent,
  DatePickerTrigger,
} from './DatePicker'

export function DatePickerDemo() {
  const [date, setDate] = React.useState<Date>()

  return (
    <DatePicker>
      <DatePickerTrigger asChild>
        <DatePickerButton variant="outline" className="w-[280px]">
          {date ? format(date, 'PPP') : <span className="text-text-tertiary">Pick a date</span>}
        </DatePickerButton>
      </DatePickerTrigger>
      <DatePickerContent>
        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
      </DatePickerContent>
    </DatePicker>
  )
}
