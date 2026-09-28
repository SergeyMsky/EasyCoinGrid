import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PortfolioTable } from './PortfolioTable'
import { useState } from 'react'

const assets = [
  {
    asset: 'BTC',
    name: 'Bitcoin',
    free: '0.5',
    locked: '0',
    price: 65000,
    avgBuy: 50000,
    change24h: 2.5,
    amount: 0.5,
    convertedPrice: 65000,
    convertedAvgBuy: 50000,
    convertedChange24h: 2.5,
    convertedTotal: 32500,
    change24hPercent: 2.5,
    convertedPnl: 7500,
    convertedPnlPercent: 30,
    image: null,
  },
  {
    asset: 'ETH',
    name: 'Ethereum',
    free: '2',
    locked: '0',
    price: 4000,
    avgBuy: 3000,
    change24h: -48,
    amount: 2,
    convertedPrice: 4000,
    convertedAvgBuy: 3000,
    convertedChange24h: -48,
    convertedTotal: 8000,
    change24hPercent: -1.2,
    convertedPnl: 2000,
    convertedPnlPercent: 33.33,
    image: null,
  },
]

const defaultProps = {
  assets,
  sortBy: 'Total' as const,
  handleSort: vi.fn(),
  sortDirection: 'desc' as const,
  search: '',
  onSearchChange: vi.fn(),
  onFilterChange: vi.fn(),
  view: 'all' as const,
  refreshPortfolio: vi.fn(),
  loading: false,
  lastUpdated: null,
  currency: 'USD' as const,
}

describe('PortfolioTable', () => {
  it('calls onFilterChange when a filter is selected', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(<PortfolioTable {...defaultProps} onFilterChange={onFilterChange} />)

    await user.click(screen.getByRole('button', { name: 'Gainers' }))

    expect(onFilterChange).toHaveBeenCalledWith('gainers')
  })

  it('calls onSearchChange when user enters a search query', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()

    function TestHarness() {
      const [search, setSearch] = useState('')

      return (
        <PortfolioTable
          {...defaultProps}
          search={search}
          onSearchChange={(value) => {
            onSearchChange(value)
            setSearch(value)
          }}
        />
      )
    }

    render(<TestHarness />)

    await user.type(screen.getByPlaceholderText('Search in Your Assets'), 'bitcoin')

    expect(onSearchChange).toHaveBeenLastCalledWith('bitcoin')
  })

  it('calls handleSort when a column is selected', async () => {
    const user = userEvent.setup()
    const handleSort = vi.fn()

    render(<PortfolioTable {...defaultProps} handleSort={handleSort} />)

    await user.click(screen.getByRole('button', { name: 'Total' }))

    expect(handleSort).toHaveBeenCalledWith('Total')
  })

  it('shows loading skeleton while portfolio is loading', () => {
    render(<PortfolioTable {...defaultProps} loading />)

    expect(screen.getByRole('list', { name: 'Loading portfolio' })).toBeInTheDocument()
    expect(screen.queryByText('Bitcoin')).not.toBeInTheDocument()
  })

  it('shows empty state when there are no assets', () => {
    render(<PortfolioTable {...defaultProps} assets={[]} />)
    expect(screen.getByText('Nothing found')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Portfolio assets' })).not.toBeInTheDocument()
  })
})
