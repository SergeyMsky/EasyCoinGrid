import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Header } from './Header'

describe('Header currency selector', () => {
  it('shows CDN flags beside currency codes and preserves currency selection', async () => {
    const user = userEvent.setup()
    const setCurrency = vi.fn()

    render(
      <MemoryRouter>
        <Header currency="USD" setCurrency={setCurrency} avatarUrl={null} navigationOpen={false} onToggleNavigation={vi.fn()} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Open settings menu' }))
    await user.click(screen.getByRole('button', { name: /Currency/ }))

    const euroButton = screen.getByRole('button', { name: 'EUR' })
    expect(euroButton.querySelector('img')).toHaveAttribute('src', 'https://flagcdn.com/eu.svg')

    await user.click(euroButton)
    expect(setCurrency).toHaveBeenCalledWith('EUR')
  })
})
