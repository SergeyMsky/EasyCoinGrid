import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  it('shows workspace links and marks the current section active', () => {
    render(
      <MemoryRouter initialEntries={['/rotations']}>
        <Sidebar mobileOpen={false} onNavigate={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('link', { name: 'Spot rotations' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('navigation', { name: 'Legal navigation' })).toContainElement(screen.getByRole('link', { name: 'Privacy policy' }))
  })
})
