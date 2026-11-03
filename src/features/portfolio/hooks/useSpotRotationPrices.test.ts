import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'
import { useSpotRotationPrices } from './useSpotRotationPrices'

const mocks = vi.hoisted(() => ({
  getCurrentCoinPrices: vi.fn(),
}))

vi.mock('@/features/portfolio/api/coingecko.api', () => ({
  getCurrentCoinPrices: mocks.getCurrentCoinPrices,
}))

const openRotation: SpotRotation = {
  id: 'open-deal',
  user_id: 'user-1',
  symbol: 'BTC/USDT',
  coinpaprika_id: null,
  coingecko_id: 'bitcoin',
  buy_order_id: null,
  buy_trade_id: null,
  buy_time: '2026-11-01T10:00:00.000Z',
  buy_price: 60000,
  buy_qty: 0.1,
  invested_amount: 6000,
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

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useSpotRotationPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentCoinPrices.mockResolvedValue([{ coinId: 'bitcoin', price: 61000, timestamp: '2026-11-02T10:00:00.000Z' }])
  })

  it('requests unique IDs for open positions and maps returned quotes by coin ID', async () => {
    const closedRotation = { ...openRotation, id: 'closed-deal', status: 'CLOSED' as const, coingecko_id: 'ethereum' }
    const hook = renderHook(() => useSpotRotationPrices('user-1', [openRotation, { ...openRotation, id: 'second-open' }, closedRotation]), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(hook.result.current.pricesByCoinId.bitcoin?.price).toBe(61000))

    expect(mocks.getCurrentCoinPrices).toHaveBeenCalledOnce()
    expect(mocks.getCurrentCoinPrices).toHaveBeenCalledWith(['bitcoin'])
    expect(hook.result.current.updatedAt).toBe(Date.parse('2026-11-02T10:00:00.000Z'))

    await act(async () => hook.result.current.refreshPrices())
    expect(mocks.getCurrentCoinPrices).toHaveBeenCalledTimes(2)
  })

  it('does not request prices when there are no linked open positions', async () => {
    const hook = renderHook(() => useSpotRotationPrices('user-1', [{ ...openRotation, coingecko_id: null }]), { wrapper: createWrapper() })
    await act(async () => Promise.resolve())

    expect(mocks.getCurrentCoinPrices).not.toHaveBeenCalled()
    expect(hook.result.current.pricesByCoinId).toEqual({})
  })
})
