import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'
import { formatCurrency } from '@/shared/utils/format-currency'
import { RotationsPage } from './RotationsPage'

const mocks = vi.hoisted(() => ({
  usePortfolioData: vi.fn(),
  useSpotRotations: vi.fn(),
  getCoinsMetadata: vi.fn(),
  getExchangeRates: vi.fn(),
}))

vi.mock('@/features/portfolio/hooks/usePortfolioData', () => ({
  usePortfolioData: mocks.usePortfolioData,
}))

vi.mock('@/features/portfolio/hooks/useSpotRotations', () => ({
  useSpotRotations: mocks.useSpotRotations,
}))

vi.mock('@/features/portfolio/api/portfolio.api', () => ({
  getCoinsMetadata: mocks.getCoinsMetadata,
}))

vi.mock('@/features/portfolio/api/exchange-rates.api', () => ({
  FALLBACK_RATES: {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 144.5,
    CHF: 0.91,
    CAD: 1.34,
    AUD: 1.49,
    UAH: 36.92,
  },
  getExchangeRates: mocks.getExchangeRates,
}))

const rotation: SpotRotation = {
  id: 'rotation-1',
  user_id: 'user-1',
  symbol: 'BTCUSDT',
  buy_order_id: 'buy-1',
  buy_trade_id: 'buy-trade-1',
  buy_time: '2026-10-29T12:00:00.000Z',
  buy_price: 100,
  buy_qty: 1,
  status: 'OPEN',
  sell_order_id: null,
  sell_trade_id: null,
  sell_time: null,
  sell_price: null,
  sold_qty: 0,
  fee_amount: 0,
  realized_pnl_usd: null,
  realized_pnl_percent: null,
  match_type: 'MANUAL',
}

describe('RotationsPage', () => {
  beforeEach(() => {
    mocks.getCoinsMetadata.mockResolvedValue({})
    mocks.getExchangeRates.mockResolvedValue({
      rates: { USD: 1, EUR: 2, GBP: 0.79, JPY: 144.5, CHF: 0.91, CAD: 1.34, AUD: 1.49, UAH: 36.92 },
    })
    mocks.usePortfolioData.mockReturnValue({
      assets: [],
      loading: false,
      error: null,
      isBinanceConnected: false,
    })
    mocks.useSpotRotations.mockReturnValue({
      rotations: [rotation],
      loading: false,
      syncing: false,
      error: null,
      syncStatus: null,
      syncNow: vi.fn(),
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
    })
  })

  it('shows open orders and switches to closed trade history using tabs', async () => {
    const user = userEvent.setup()
    mocks.getCoinsMetadata.mockResolvedValueOnce({
      BTC: { name: 'Bitcoin', image: 'https://example.com/btc.png' },
    })
    render(
      <MemoryRouter initialEntries={['/rotations']}>
        <RotationsPage currency="EUR" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('tablist', { name: 'Spot rotation views' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Open orders 1/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Open rotations' })).toBeInTheDocument()
    expect(screen.getByText('All amounts in EUR')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Buy price (EUR)' })).toBeInTheDocument()
    const buyPriceCell = within(screen.getAllByRole('row')[1]).getAllByRole('cell')[2]
    await waitFor(() => {
      expect(buyPriceCell.textContent).toBe(formatCurrency(200, 'EUR'))
    })
    await waitFor(() => {
      expect(mocks.getCoinsMetadata).toHaveBeenCalledWith(['BTC'])
      expect(screen.getByRole('img', { name: 'BTC' })).toHaveAttribute('src', 'https://example.com/btc.png')
    })
    expect(screen.getByText('Bitcoin')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Closed trades 0/ }))

    expect(screen.getByRole('tab', { name: /Closed trades 0/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Closed history' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Open rotations' })).not.toBeInTheDocument()
  })

  it('enables automatic synchronization only for a connected Binance account', () => {
    render(
      <MemoryRouter>
        <RotationsPage currency="USD" />
      </MemoryRouter>,
    )

    expect(mocks.useSpotRotations).toHaveBeenLastCalledWith({ assets: [], syncFromBinance: false })
  })

  it('shows a table skeleton while rotations are loading', async () => {
    const user = userEvent.setup()
    mocks.useSpotRotations.mockReturnValue({
      rotations: [],
      loading: true,
      syncing: false,
      error: null,
      syncStatus: null,
      syncNow: vi.fn(),
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
    })

    render(
      <MemoryRouter>
        <RotationsPage currency="USD" />
      </MemoryRouter>,
    )

    const overview = screen.getByRole('region', { name: 'Rotation overview' })
    expect(overview).toHaveAttribute('aria-busy', 'true')
    expect(within(overview).getByText('Open rotations')).toBeInTheDocument()
    expect(within(overview).getByText('Closed rotations')).toBeInTheDocument()
    expect(within(overview).getByText('Realized PnL')).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Spot rotation views' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Loading open rotations' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(6)
    expect(screen.queryByText('Loading your rotations…')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Closed trades/ }))

    expect(screen.getByRole('table', { name: 'Loading closed rotations' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(8)
  })

  it('offers a manual retry when Binance is connected but no sync has succeeded yet', async () => {
    const user = userEvent.setup()
    const syncNow = vi.fn()
    mocks.usePortfolioData.mockReturnValue({
      assets: [],
      loading: false,
      error: null,
      isBinanceConnected: true,
    })
    mocks.useSpotRotations.mockReturnValue({
      rotations: [],
      loading: false,
      syncing: false,
      error: null,
      syncStatus: null,
      syncNow,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
    })

    render(
      <MemoryRouter>
        <RotationsPage currency="USD" />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Refresh rotations' }))
    expect(syncNow).toHaveBeenCalledOnce()
    expect(screen.getByText('No successful sync yet')).toBeInTheDocument()
  })
})
