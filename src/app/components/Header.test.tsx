import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Header } from './Header'

describe('Header profile menu', () => {
  it('changes currency from the profile menu', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }))
    const currencyMenuItem = screen.getByRole('menuitem', { name: 'Currency: USD' })
    await user.click(currencyMenuItem)

    const euroMenuItem = screen.getByRole('menuitemradio', { name: 'EUR' })
    expect(euroMenuItem.querySelector('img')).toHaveAttribute('src', 'https://flagcdn.com/eu.svg')

    fireEvent.click(euroMenuItem)
    expect(setCurrency).toHaveBeenCalledWith('EUR')
  })

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Header
          userEmail="user@example.com"
          currency="USD"
          setCurrency={vi.fn()}
          avatarUrl={null}
          navigationOpen={false}
          onToggleNavigation={vi.fn()}
        />
      </MemoryRouter>,
    )

    const trigger = screen.getByRole('button', { name: 'Open profile menu' })
    await user.click(trigger)
    expect(screen.getByRole('menu', { name: 'Open profile menu' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu', { name: 'Open profile menu' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
