import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PrivacyPage } from './PrivacyPage'

describe('PrivacyPage', () => {
  it('explains the app data, providers, and available controls', () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Privacy policy' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Information the app uses' })).toBeInTheDocument()
    expect(screen.getByText(/encrypted copies/i)).toBeInTheDocument()
    expect(screen.getByText(/public bucket/i)).toBeInTheDocument()
    expect(screen.getByText(/does not delete existing rotation records/i)).toBeInTheDocument()
  })
})
