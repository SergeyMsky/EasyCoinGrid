import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'
import { RotationsPage } from './RotationsPage'

const mocks = vi.hoisted(() => ({
  usePortfolioData: vi.fn(),
  useSpotRotations: vi.fn(),
}))

vi.mock('@/features/portfolio/hooks/usePortfolioData', () => ({
  usePortfolioData: mocks.usePortfolioData,
}))

vi.mock('@/features/portfolio/hooks/useSpotRotations', () => ({
  useSpotRotations: mocks.useSpotRotations,
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

  it('shows open rotations and closed history together with section shortcuts', () => {
    render(
      <MemoryRouter initialEntries={['/rotations']}>
        <RotationsPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('tablist', { name: 'Spot rotation views' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open 1/ })).toHaveAttribute('href', '#open-rotations')
    expect(screen.getByRole('link', { name: /History 0/ })).toHaveAttribute('href', '#rotation-history')
    expect(screen.getByRole('heading', { name: 'Open rotations' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Closed history' })).toBeInTheDocument()
  })

  it('enables automatic synchronization only for a connected Binance account', () => {
    render(
      <MemoryRouter>
        <RotationsPage />
      </MemoryRouter>,
    )

    expect(mocks.useSpotRotations).toHaveBeenLastCalledWith({ assets: [], syncFromBinance: false })
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
        <RotationsPage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Sync now' }))
    expect(syncNow).toHaveBeenCalledOnce()
    expect(screen.getByText('No successful sync yet')).toBeInTheDocument()
  })
})
