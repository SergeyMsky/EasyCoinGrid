import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSpotRotations } from './useSpotRotations'

const mocks = vi.hoisted(() => ({
  closeSpotRotation: vi.fn(),
  createSpotRotation: vi.fn(),
  getSpotRotations: vi.fn(),
  syncBinanceSpotRotations: vi.fn(),
}))

vi.mock('@/features/portfolio/api/spot-rotations.api', () => ({
  closeSpotRotation: mocks.closeSpotRotation,
  createSpotRotation: mocks.createSpotRotation,
  getSpotRotations: mocks.getSpotRotations,
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
})
