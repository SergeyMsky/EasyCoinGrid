import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'
import { formatCurrency, formatSignedCurrency } from '@/shared/utils/format-currency'
import { RotationsPage } from './RotationsPage'

const mocks = vi.hoisted(() => ({
  useSpotRotations: vi.fn(),
  useExchangeRates: vi.fn(),
  removeRotation: vi.fn(),
}))

vi.mock('@/features/portfolio/hooks/useSpotRotations', () => ({
  useSpotRotations: mocks.useSpotRotations,
}))

vi.mock('@/features/portfolio/hooks/useExchangeRates', () => ({
  useExchangeRates: mocks.useExchangeRates,
}))

const closedDeal: SpotRotation = {
  id: 'deal-1',
  user_id: 'user-1',
  symbol: 'DOT/USDT',
  buy_order_id: null,
  buy_trade_id: null,
  buy_time: '2026-10-29T12:00:00.000Z',
  buy_price: 6.712,
  buy_qty: 7.42,
  invested_amount: 50,
  status: 'CLOSED',
  sell_order_id: null,
  sell_trade_id: null,
  sell_time: '2026-10-30T12:00:00.000Z',
  sell_price: 7.525,
  sold_qty: 7.42,
  fee_amount: 0,
  realized_pnl_usd: 6.03246,
  realized_pnl_percent: 12.11,
  match_type: 'MANUAL',
}

describe('RotationsPage', () => {
  beforeEach(() => {
    mocks.useSpotRotations.mockReturnValue({
      rotations: [],
      loading: true,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      removeRotation: mocks.removeRotation,
      deleting: false,
    })
    mocks.useExchangeRates.mockReturnValue({ rates: { USD: 1 } })
  })

  it('renders the spot journal heading and summary while loading', () => {
    render(<RotationsPage currency="USD" userId="user-1" />)

    expect(screen.getByRole('heading', { name: 'Spot trade journal', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Rotation overview' })).toHaveAttribute('aria-busy', 'true')
  })

  it('shows manual deal fields and converts monetary values to the selected currency', () => {
    mocks.useSpotRotations.mockReturnValue({
      rotations: [closedDeal, { ...closedDeal, id: 'auto-deal', symbol: 'BTC/USDT', match_type: 'AUTO_API' }],
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      removeRotation: mocks.removeRotation,
      deleting: false,
    })
    mocks.useExchangeRates.mockReturnValue({ rates: { USD: 1, EUR: 2 } })

    render(<RotationsPage currency="EUR" userId="user-1" />)

    expect(screen.getByRole('region', { name: 'Manual spot deals' })).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByRole('columnheader', { name: 'Invested (EUR)' })).toBeInTheDocument()
    expect(screen.getByText('DOT/USDT')).toBeInTheDocument()
    expect(screen.getByText(formatCurrency(100, 'EUR'))).toBeInTheDocument()
    expect(screen.getAllByText(formatSignedCurrency(6.03246 * 2, 'EUR'))).toHaveLength(2)
    expect(screen.queryByText('BTC/USDT')).not.toBeInTheDocument()
  })

  it('requires confirmation before deleting a deal', async () => {
    mocks.removeRotation.mockResolvedValue(undefined)
    mocks.useSpotRotations.mockReturnValue({
      rotations: [closedDeal],
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      removeRotation: mocks.removeRotation,
      deleting: false,
    })

    render(<RotationsPage currency="USD" userId="user-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Delete DOT/USDT deal' }))
    expect(screen.getByRole('heading', { name: 'Delete this spot deal?' })).toBeInTheDocument()
    expect(mocks.removeRotation).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete deal' }))
    await waitFor(() => expect(mocks.removeRotation).toHaveBeenCalledWith(closedDeal))
  })
})
