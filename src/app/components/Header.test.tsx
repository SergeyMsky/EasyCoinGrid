import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Header } from './Header'

describe('Header profile menu', () => {
  it('removes the settings gear and changes currency from the profile menu', async () => {
    const user = userEvent.setup()
    const setCurrency = vi.fn()

    render(
      <MemoryRouter>
        <Header
          userEmail="user@example.com"
          currency="USD"
          setCurrency={setCurrency}
          avatarUrl={null}
          navigationOpen={false}
          onToggleNavigation={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Open settings menu' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }))
    const currencyButton = screen.getByRole('button', { name: 'Currency: USD' })
    await user.click(currencyButton)

    const euroButton = screen.getByRole('button', { name: 'EUR' })
    expect(euroButton.querySelector('img')).toHaveAttribute('src', 'https://flagcdn.com/eu.svg')

    await user.click(euroButton)
    expect(setCurrency).toHaveBeenCalledWith('EUR')
  })
})
