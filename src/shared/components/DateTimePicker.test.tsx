import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DateTimePicker } from './DateTimePicker'

function DateTimePickerHarness() {
  const [value, setValue] = useState('2026-11-02T13:45')
  return (
    <>
      <DateTimePicker label="Buy date and time" required value={value} onChange={setValue} />
      <output aria-label="Selected date time">{value}</output>
    </>
  )
}

describe('DateTimePicker', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'PointerEvent',
      class extends MouseEvent {
        pointerId = 1
        pointerType = 'mouse'
      },
    )
    Object.defineProperties(HTMLElement.prototype, {
      hasPointerCapture: { configurable: true, value: () => false },
      setPointerCapture: { configurable: true, value: () => undefined },
      releasePointerCapture: { configurable: true, value: () => undefined },
      scrollIntoView: { configurable: true, value: () => undefined },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(HTMLElement.prototype, 'hasPointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'releasePointerCapture')
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  })

  it('opens the shared react-day-picker calendar and preserves selected time when changing date', async () => {
    const user = userEvent.setup()
    render(<DateTimePickerHarness />)

    await user.click(screen.getByRole('button', { name: 'Choose buy date' }))

    const calendar = screen.getByRole('dialog', { name: 'Buy date and time calendar' })
    expect(calendar.querySelector('.rdp-root')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /November 3rd, 2026/ }))

    expect(screen.getByRole('combobox', { name: 'Buy hour' })).toHaveTextContent('13')
    expect(screen.getByRole('combobox', { name: 'Buy minute' })).toHaveTextContent('45')
    expect(screen.getByLabelText('Selected date time')).toHaveTextContent('2026-11-03T13:45')
  })

  it('updates the deal time with Radix hour and minute selects', async () => {
    const user = userEvent.setup()
    render(<DateTimePickerHarness />)

    await user.click(screen.getByRole('combobox', { name: 'Buy hour' }))
    await user.click(screen.getByRole('option', { name: '09' }))
    await user.click(screen.getByRole('combobox', { name: 'Buy minute' }))
    await user.click(screen.getByRole('option', { name: '20' }))

    expect(screen.getByLabelText('Selected date time')).toHaveTextContent('2026-11-02T09:20')
    expect(screen.getByRole('combobox', { name: 'Buy hour' })).toHaveTextContent('09')
    expect(screen.getByRole('combobox', { name: 'Buy minute' })).toHaveTextContent('20')
  })
})
