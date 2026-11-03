import * as Popover from '@radix-ui/react-popover'
import * as Select from '@radix-ui/react-select'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { formatDateTimeLocalValue } from '@/shared/utils/date-time'
import { APP_LOCALE } from '@/shared/utils/locale'

type DateTimePickerProps = {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
}

const hourOptions = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const minuteOptions = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0'))

function parseLocalDateTime(value: string) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function formatDate(date: Date | undefined) {
  return date
    ? new Intl.DateTimeFormat(APP_LOCALE, {
        dateStyle: 'medium',
      }).format(date)
    : 'Choose date'
}

export function DateTimePicker({ label, value, onChange, disabled = false, required = false }: DateTimePickerProps) {
  const [open, setOpen] = useState(false)
  const controlLabel = label.replace(/ date and time$/i, '')
  const selectedDate = parseLocalDateTime(value)
  const hourValue = selectedDate ? String(selectedDate.getHours()).padStart(2, '0') : ''
  const minuteValue = selectedDate ? String(selectedDate.getMinutes()).padStart(2, '0') : ''

  function updateDate(date: Date | undefined) {
    if (!date) return

    const nextDate = new Date(date)
    if (selectedDate) nextDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0)
    else nextDate.setHours(0, 0, 0, 0)
    onChange(formatDateTimeLocalValue(nextDate))
    setOpen(false)
  }

  function updateTime(part: 'hour' | 'minute', nextValue: string) {
    if (!nextValue) return
    const nextDate = selectedDate ? new Date(selectedDate) : new Date()
    if (!selectedDate) nextDate.setHours(0, 0, 0, 0)
    if (part === 'hour') nextDate.setHours(Number(nextValue))
    else nextDate.setMinutes(Number(nextValue))
    onChange(formatDateTimeLocalValue(nextDate))
  }

  return (
    <div className="block text-sm">
      <span className="mb-1 block">{label}</span>
      <div className="grid grid-cols-[minmax(0,1fr)_9rem] gap-2">
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label={`Choose ${controlLabel.toLowerCase()} date`}
              aria-haspopup="dialog"
              className="input flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60">
              <span className={selectedDate ? 'text-text' : 'text-muted'}>{formatDate(selectedDate)}</span>
              <CalendarDays className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              role="dialog"
              aria-label={`${label} calendar`}
              align="start"
              sideOffset={6}
              collisionPadding={16}
              className="ui-surface z-50 max-w-[calc(100vw-2rem)] p-3">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={updateDate}
                defaultMonth={selectedDate}
                navLayout="around"
                weekStartsOn={1}
                showOutsideDays
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <div role="group" aria-label={`${controlLabel} time`} className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-1">
          <TimeSelect
            label={`${controlLabel} hour`}
            value={hourValue}
            values={hourOptions}
            placeholder="HH"
            disabled={disabled}
            required={required}
            onChange={(nextValue) => updateTime('hour', nextValue)}
          />
          <span aria-hidden="true" className="text-muted">
            :
          </span>
          <TimeSelect
            label={`${controlLabel} minute`}
            value={minuteValue}
            values={minuteOptions}
            placeholder="MM"
            disabled={disabled}
            required={required}
            onChange={(nextValue) => updateTime('minute', nextValue)}
          />
        </div>
      </div>
    </div>
  )
}

function TimeSelect({
  label,
  value,
  values,
  placeholder,
  disabled,
  required,
  onChange,
}: {
  label: string
  value: string
  values: string[]
  placeholder: string
  disabled: boolean
  required: boolean
  onChange: (value: string) => void
}) {
  return (
    <Select.Root value={value} onValueChange={onChange} disabled={disabled} required={required}>
      <Select.Trigger
        aria-label={label}
        className="input flex min-w-0 cursor-pointer items-center justify-between gap-1 px-2 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60">
        <Select.Value placeholder={placeholder} />
        <Select.Icon asChild>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          align="start"
          className="z-70 max-h-56 min-w-(--radix-select-trigger-width) overflow-hidden rounded-lg border border-outline bg-surface p-1 text-text">
          <Select.Viewport className="max-h-52 overflow-y-auto">
            {values.map((option) => (
              <Select.Item
                key={option}
                value={option}
                className="relative flex cursor-pointer items-center rounded-md py-1.5 pr-8 pl-3 text-sm outline-none select-none data-highlighted:bg-surface-raised data-highlighted:text-text">
                <Select.ItemText>{option}</Select.ItemText>
                <Select.ItemIndicator className="absolute right-2 inline-flex items-center text-accent">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
