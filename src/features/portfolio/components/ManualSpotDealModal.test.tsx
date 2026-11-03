import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'
import { ManualSpotDealModal } from './ManualSpotDealModal'

const mocks = vi.hoisted(() => ({
  getHistoricalCoinPrice: vi.fn(),
}))

vi.mock('@/features/portfolio/api/coingecko.api', () => ({
  getHistoricalCoinPrice: mocks.getHistoricalCoinPrice,
}))

vi.mock('@/features/portfolio/components/CoinSearchInput', () => ({
  CoinSearchInput: ({ onSelect }: { onSelect: (coin: { id: string; name: string; symbol: string; image: string; rank: number }) => void }) =>
    createElement('button', {
      type: 'button',
      onClick: () => onSelect({ id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', image: '', rank: 1 }),
      children: 'Select Bitcoin',
    }),
}))

vi.mock('@/shared/components/DateTimePicker', () => ({
  DateTimePicker: ({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) =>
    createElement('label', {
      children: [
        label,
        createElement('input', {
          key: label,
          type: 'datetime-local',
          'aria-label': label,
          required,
          value,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
        }),
      ],
    }),
}))

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const closedRotation: SpotRotation = {
  id: 'deal-1',
  user_id: 'user-1',
  symbol: 'DOT/USDT',
  coinpaprika_id: null,
  coingecko_id: 'polkadot',
  buy_order_id: null,
  buy_trade_id: null,
  buy_time: '2026-10-29T12:00:00.000Z',
  buy_price: 100,
  buy_qty: 2,
  invested_amount: 200,
  status: 'CLOSED',
  sell_order_id: null,
  sell_trade_id: null,
  sell_time: '2026-10-30T12:00:00.000Z',
  sell_price: 110,
  sold_qty: 2,
  fee_amount: 2,
  realized_pnl_usd: 18,
  realized_pnl_percent: 9,
  match_type: 'MANUAL',
}

describe('ManualSpotDealModal historical price estimates', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.clearAllMocks()
    mocks.getHistoricalCoinPrice.mockResolvedValue({
      price: 67234.12,
      timestamp: '2026-11-02T10:00:00.000Z',
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prefills the estimated buy price and saves a manual override with the coin ID', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(<ManualSpotDealModal currency="USD" currencyRate={1} onCancel={vi.fn()} onCreate={onCreate} />, { wrapper: createWrapper() })

    fireEvent.click(screen.getByRole('button', { name: 'Coin or pair (USD/USDT)' }))

    const entryPrice = screen.getByRole('spinbutton', { name: 'Entry price (USD/USDT)' })
    await waitFor(() => expect(entryPrice).toHaveValue(67234.12))
    expect(screen.getByText(/CoinGecko estimate/)).toBeInTheDocument()

    fireEvent.change(entryPrice, { target: { value: '67000' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount (coins)' }), { target: { value: '0.01' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Invested (USD/USDT)' }), { target: { value: '670' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save open deal' }))

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC/USDT',
          coinGeckoId: 'bitcoin',
          buyPrice: 67000,
          buyQty: 0.01,
          investedAmountUsd: 670,
        }),
      ),
    )
  })

  it('saves edited values for a closed manual deal with total fees', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(
      <ManualSpotDealModal
        mode="edit"
        rotation={closedRotation}
        currency="USD"
        currencyRate={1}
        onCancel={vi.fn()}
        onUpdate={onUpdate}
      />,
      { wrapper: createWrapper() },
    )

    expect(screen.queryByRole('checkbox', { name: /already sold/i })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Amount (coins)' }), { target: { value: '3' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Invested (USD/USDT)' }), { target: { value: '270' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Entry price (USD/USDT)' }), { target: { value: '90' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Total fees (USD)' }), { target: { value: '3' } })
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Close price (USD/USDT)' }), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        closedRotation,
        expect.objectContaining({
          symbol: 'DOT/USDT',
          coinGeckoId: 'polkadot',
          buyPrice: 90,
          buyQty: 3,
          investedAmountUsd: 270,
          feeAmountUsd: 3,
          status: 'CLOSED',
          sellPrice: 100,
        }),
      ),
    )
  })
})
