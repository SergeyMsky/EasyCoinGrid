import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'
import { useSpotRotations } from './useSpotRotations'

const mocks = vi.hoisted(() => ({
  closeSpotRotation: vi.fn(),
  createSpotRotation: vi.fn(),
  deleteSpotRotation: vi.fn(),
  getSpotRotations: vi.fn(),
  syncBinanceSpotRotations: vi.fn(),
  updateSpotRotation: vi.fn(),
}))

vi.mock('@/features/portfolio/api/spot-rotations.api', () => ({
  closeSpotRotation: mocks.closeSpotRotation,
  createSpotRotation: mocks.createSpotRotation,
  deleteSpotRotation: mocks.deleteSpotRotation,
  getSpotRotations: mocks.getSpotRotations,
  updateSpotRotation: mocks.updateSpotRotation,
}))

vi.mock('@/features/portfolio/api/binance-spot-trades.api', () => ({
  syncBinanceSpotRotations: mocks.syncBinanceSpotRotations,
}))

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function createWrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useSpotRotations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSpotRotations.mockResolvedValue([])
    mocks.deleteSpotRotation.mockResolvedValue(undefined)
    mocks.updateSpotRotation.mockResolvedValue(undefined)
    mocks.syncBinanceSpotRotations.mockResolvedValue({
      syncedAt: '2026-10-31T12:00:00.000Z',
      symbolsScanned: 1,
      tradesImported: 0,
      unmatchedSellTrades: 0,
      oldestTradeTime: null,
      newestTradeTime: null,
    })
  })

  it('reuses cached rotations and does not sync Binance when mounted', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const options = { userId: 'user-1', assets: ['BTC'], syncFromBinance: true }
    const first = renderHook(() => useSpotRotations(options), { wrapper })

    await waitFor(() => expect(first.result.current.loading).toBe(false))
    first.unmount()

    const second = renderHook(() => useSpotRotations(options), { wrapper })
    expect(second.result.current.rotations).toEqual([])
    expect(mocks.getSpotRotations).toHaveBeenCalledOnce()
    expect(mocks.syncBinanceSpotRotations).not.toHaveBeenCalled()
  })

  it('syncs Binance only when explicitly requested', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const hook = renderHook(() => useSpotRotations({ userId: 'user-1', assets: ['BTC'], syncFromBinance: true }), { wrapper })

    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    await act(async () => hook.result.current.syncNow())

    expect(mocks.syncBinanceSpotRotations).toHaveBeenCalledWith(['BTC'])
    await waitFor(() => expect(hook.result.current.syncStatus).toMatchObject({ symbolsScanned: 1, tradesImported: 0 }))
    hook.unmount()

    const remounted = renderHook(() => useSpotRotations({ userId: 'user-1', assets: ['BTC'], syncFromBinance: true }), { wrapper })
    await waitFor(() => expect(remounted.result.current.syncStatus).toMatchObject({ symbolsScanned: 1, tradesImported: 0 }))
  })

  it('deletes a deal and exposes the pending state', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const hook = renderHook(() => useSpotRotations({ userId: 'user-1', assets: [], syncFromBinance: false }), { wrapper })

    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    const rotation: SpotRotation = {
      id: 'deal-1',
      user_id: 'user-1',
      symbol: 'DOT/USDT',
      coinpaprika_id: null,
      coingecko_id: null,
      buy_order_id: null,
      buy_trade_id: null,
      buy_time: '2026-10-29T12:00:00.000Z',
      buy_price: 6.712,
      buy_qty: 7.42,
      invested_amount: 50,
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

    await act(async () => hook.result.current.removeRotation(rotation))

    expect(mocks.deleteSpotRotation).toHaveBeenCalledWith('deal-1', expect.anything())
    expect(hook.result.current.deleting).toBe(false)
  })

  it('updates a manual deal and invalidates the cached rotations', async () => {
    const queryClient = createQueryClient()
    const wrapper = createWrapper(queryClient)
    const hook = renderHook(() => useSpotRotations({ userId: 'user-1', assets: [], syncFromBinance: false }), { wrapper })

    await waitFor(() => expect(hook.result.current.loading).toBe(false))
    const rotation = {
      id: 'deal-1',
      user_id: 'user-1',
      symbol: 'DOT/USDT',
      coinpaprika_id: null,
      coingecko_id: null,
      buy_order_id: null,
      buy_trade_id: null,
      buy_time: '2026-10-29T12:00:00.000Z',
      buy_price: 6.712,
      buy_qty: 7.42,
      invested_amount: 50,
      status: 'OPEN' as const,
      sell_order_id: null,
      sell_trade_id: null,
      sell_time: null,
      sell_price: null,
      sold_qty: 0,
      fee_amount: 0,
      realized_pnl_usd: null,
      realized_pnl_percent: null,
      match_type: 'MANUAL' as const,
    }
    const input = {
      symbol: 'DOT/USDT',
      coinGeckoId: null,
      buyPrice: 7,
      buyQty: 7,
      investedAmountUsd: 49,
      feeAmountUsd: 0,
      buyTime: '2026-10-29T12:00:00.000Z',
      status: 'OPEN' as const,
    }

    await act(async () => hook.result.current.editRotation(rotation, input))

    expect(mocks.updateSpotRotation).toHaveBeenCalledWith(rotation, input)
    expect(mocks.getSpotRotations).toHaveBeenCalledTimes(2)
  })
})
