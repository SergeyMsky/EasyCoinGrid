import { useEffect, useRef, useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { DayPicker, type DateRange } from 'react-day-picker'

type AssetHistoryDateRangePickerProps = {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}

function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getFullYear()}`
}

function formatRange(range: DateRange | undefined) {
  if (!range?.from) return ''
  return `${formatDate(range.from)} - ${range.to ? formatDate(range.to) : ''}`
}

function parseDate(day: string, month: string, year: string) {
  const date = new Date(0)
  date.setFullYear(Number(year), Number(month) - 1, Number(day))
  date.setHours(0, 0, 0, 0)
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null
  return date
}

function parseRange(value: string): DateRange | null {
  const match = value.match(/^\s*(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2})\.(\d{2})\.(\d{4})\s*$/)
  if (!match) return null

  const from = parseDate(match[1], match[2], match[3])
  const to = parseDate(match[4], match[5], match[6])
  if (!from || !to || from > to) return null

  return { from, to }
}

function parsePartialRange(value: string): Date | null {
  const match = value.match(/^\s*(\d{2})\.(\d{2})\.(\d{4})\s*-\s*$/)
  return match ? parseDate(match[1], match[2], match[3]) : null
}

export function AssetHistoryDateRangePicker({ value, onChange }: AssetHistoryDateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(() => formatRange(value))
  const [hasInvalidInput, setHasInvalidInput] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rangeKey = `${value?.from?.getTime() ?? ''}:${value?.to?.getTime() ?? ''}`
  const syncedRangeKeyRef = useRef(rangeKey)

  useEffect(() => {
    if (syncedRangeKeyRef.current === rangeKey) return
    syncedRangeKeyRef.current = rangeKey
    setInputValue(formatRange(value))
    setHasInvalidInput(false)
  }, [rangeKey, value])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleSelect(range: DateRange | undefined) {
    onChange(range)
    setInputValue(formatRange(range))
    setHasInvalidInput(false)
    if (range?.from && range.to && range.from.getTime() !== range.to.getTime()) setOpen(false)
  }

  function handleInputChange(nextValue: string) {
    setInputValue(nextValue)
    setHasInvalidInput(false)

    if (!nextValue.trim()) {
      onChange(undefined)
      return
    }

    const range = parseRange(nextValue)
    if (range) onChange(range)
  }

  function validateInput() {
    if (!inputValue.trim()) {
      setHasInvalidInput(false)
      return
    }

    const range = parseRange(inputValue)
    if (!range && parsePartialRange(inputValue)) {
      setHasInvalidInput(false)
      return
    }

    setHasInvalidInput(!range)
    if (range) {
      onChange(range)
      setInputValue(formatRange(range))
    }
  }

  function clearRange() {
    setInputValue('')
    setHasInvalidInput(false)
    onChange(undefined)
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className={`flex w-full items-center rounded-lg border bg-app transition ${hasInvalidInput ? 'border-loss' : 'border-outline'}`}>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(event) => handleInputChange(event.target.value)}
          onBlur={validateInput}
          placeholder="DD.MM.YYYY - DD.MM.YYYY"
          aria-label="Transaction date range"
          aria-invalid={hasInvalidInput}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-text outline-none placeholder:text-muted"
        />
        {inputValue && (
          <button
            type="button"
            aria-label="Clear date range"
            onClick={clearRange}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-raised hover:text-text">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          aria-label="Open date range calendar"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((current) => !current)}
          className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-raised hover:text-text">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div
          role="dialog"
          aria-label="Select transaction date range"
          className="ui-surface absolute top-full right-0 z-50 mt-1 max-w-[calc(100vw-2rem)] p-3">
          <DayPicker
            mode="range"
            selected={value}
            onSelect={handleSelect}
            defaultMonth={value?.from}
            numberOfMonths={2}
            navLayout="around"
            weekStartsOn={1}
            showOutsideDays
          />
        </div>
      )}
    </div>
  )
}
