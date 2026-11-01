import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { PasswordField } from './PasswordField'

function ControlledPasswordField() {
  const [value, setValue] = useState('')

  return <PasswordField label="Password" value={value} onChange={(event) => setValue(event.target.value)} autoComplete="current-password" required />
}

describe('PasswordField', () => {
  it('toggles password visibility while keeping the entered value', () => {
    render(<ControlledPasswordField />)

    const input = screen.getByLabelText('Password')
    fireEvent.change(input, { target: { value: 'secret123' } })

    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveValue('secret123')
    expect(input).toHaveAttribute('autocomplete', 'current-password')
    expect(input).toBeRequired()

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Password')).toHaveValue('secret123')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('uses a distinct accessible label for password confirmation', () => {
    render(<PasswordField label="Confirm new password" value="" onChange={() => {}} visibilityLabel="password confirmation" />)

    expect(screen.getByRole('button', { name: 'Show password confirmation' })).toBeInTheDocument()
  })
})
