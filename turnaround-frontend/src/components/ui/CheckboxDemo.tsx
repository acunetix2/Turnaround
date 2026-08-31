import { Checkbox } from './Checkbox'

export function CheckboxDemo() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center space-x-2">
        <Checkbox id="terms" />
        <label
          htmlFor="terms"
          className="text-xs font-medium leading-none text-text-primary cursor-pointer select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Accept terms and conditions
        </label>
      </div>

      <Checkbox
        id="notifications"
        defaultChecked
        label="Dwell alert notifications"
        description="Receive instant alerts when a vehicle exceeds corridor dwell SLA"
      />
    </div>
  )
}
