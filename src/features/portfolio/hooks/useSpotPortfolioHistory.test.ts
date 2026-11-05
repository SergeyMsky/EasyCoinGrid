import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSpotPortfolioHistory } from './useSpotPortfolioHistory'

const mocks = vi.hoisted(() => ({
  getSpotPortfolioHistory: vi.fn(),
  recordSpotPortfolioSnapshot: vi.fn(),
  syncBinanceSpotPortfolioHistory: vi.fn(),
}))

vi.mock('@/features/portfolio/api/portfolio-history.api', () => mocks)

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useSpotPortfolioHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_USE_MOCK_PORTFOLIO', 'true')
  })

  it('creates local demo history without calling the live history API', () => {
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)

    const { result } = renderHook(() => useSpotPortfolioHistory(1000, false, 'user-1'), { wrapper: createWrapper() })
    const { snapshots } = result.current

    expect(result.current.demoMode).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(snapshots).toHaveLength(30)
    expect(snapshots[0].snapshot_at).toBe(new Date(now - 29 * 24 * 60 * 60 * 1000).toISOString())
    expect(snapshots.at(-1)?.total_value_usd).toBe(1000)
    expect(snapshots.every((snapshot) => snapshot.total_value_usd > 0 && snapshot.total_value_usd < 1200)).toBe(true)
    expect(mocks.syncBinanceSpotPortfolioHistory).not.toHaveBeenCalled()
    expect(mocks.getSpotPortfolioHistory).not.toHaveBeenCalled()
    expect(mocks.recordSpotPortfolioSnapshot).not.toHaveBeenCalled()
  })

  it('does not report a disabled real history query as loading', () => {
    vi.stubEnv('VITE_USE_MOCK_PORTFOLIO', 'false')

    const { result } = renderHook(() => useSpotPortfolioHistory(null, false, 'user-1'), { wrapper: createWrapper() })

    expect(result.current.loading).toBe(false)
    expect(result.current.snapshots).toEqual([])
  })
})
