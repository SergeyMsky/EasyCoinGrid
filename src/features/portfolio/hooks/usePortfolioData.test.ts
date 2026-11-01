import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { usePortfolioData } from './usePortfolioData'

const mocks = vi.hoisted(() => ({
  StablecoinUsdRatesUnavailableError: class StablecoinUsdRatesUnavailableError extends Error {},
  getBinanceAvgBuy: vi.fn(),
  getBinancePrice: vi.fn(),
  getCoinsMetadata: vi.fn(),
  getPortfolioBalances: vi.fn(),
  getStablecoinUsdRates: vi.fn(),
}))

vi.mock('../api/portfolio.api', () => ({
  BinanceNotConnectedError: class BinanceNotConnectedError extends Error {},
  BinanceUnavailableError: class BinanceUnavailableError extends Error {},
  getBinanceAvgBuy: mocks.getBinanceAvgBuy,
  getBinancePrice: mocks.getBinancePrice,
  getCoinsMetadata: mocks.getCoinsMetadata,
  getPortfolioBalances: mocks.getPortfolioBalances,
}))

vi.mock('../api/usdt-usd-rate.api', () => ({
  StablecoinUsdRatesUnavailableError: mocks.StablecoinUsdRatesUnavailableError,
  getStablecoinUsdRates: mocks.getStablecoinUsdRates,
}))

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  })

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('usePortfolioData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_USE_MOCK_PORTFOLIO', 'false')
    mocks.getPortfolioBalances.mockResolvedValue([{ asset: 'BTC', free: '1', locked: '0' }])
    mocks.getStablecoinUsdRates.mockResolvedValue({
      rates: { USDT: 0.999, USDC: 0.99975 },
      source: 'Kraken',
      updatedAt: '2026-10-31T00:00:00.000Z',
    })
    mocks.getCoinsMetadata.mockResolvedValue({})
    mocks.getBinancePrice.mockResolvedValue({ price: 100, change24h: 2, change24hPercent: 2 })
    mocks.getBinanceAvgBuy.mockResolvedValue({ avgBuy: 90 })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('converts current Binance USDT prices to USD with the current Kraken rate', async () => {
    const { result } = renderHook(() => usePortfolioData('user-1'), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.assets).toHaveLength(1))

    expect(result.current.stablecoinUsdRates).toEqual({ USDT: 0.999, USDC: 0.99975 })
    expect(result.current.stablecoinRatesUpdatedAt).toBe('2026-10-31T00:00:00.000Z')
    expect(result.current.assets[0]).toMatchObject({
      price: 99.9,
      change24h: 1.998,
      avgBuy: 90,
    })
  })

  it('converts USDC balances using the independent USDC/USD rate', async () => {
    mocks.getPortfolioBalances.mockResolvedValue([{ asset: 'USDC', free: '1', locked: '0' }])
    mocks.getBinancePrice.mockResolvedValue({ price: 1, change24h: 0, change24hPercent: 0 })

    const { result } = renderHook(() => usePortfolioData('user-1'), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.assets).toHaveLength(1))

    expect(result.current.assets[0].price).toBe(0.99975)
  })

  it('does not silently value the portfolio at 1 USD if the live rate is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getStablecoinUsdRates.mockRejectedValue(new mocks.StablecoinUsdRatesUnavailableError('Rate provider unavailable'))

    const { result } = renderHook(() => usePortfolioData('user-1'), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.error).toBe('Rate provider unavailable'))

    expect(result.current.assets).toEqual([])
    expect(mocks.getBinancePrice).not.toHaveBeenCalled()
  })

  it('uses the mock portfolio without requesting a live rate in development mock mode', async () => {
    vi.stubEnv('VITE_USE_MOCK_PORTFOLIO', 'true')

    const { result } = renderHook(() => usePortfolioData('user-1'), { wrapper: createQueryWrapper() })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.assets.length).toBeGreaterThan(0)
    expect(result.current.stablecoinUsdRates).toBeNull()
    expect(mocks.getStablecoinUsdRates).not.toHaveBeenCalled()
  })

  it('reuses fresh portfolio data after the hook remounts', async () => {
    const wrapper = createQueryWrapper()
    const first = renderHook(() => usePortfolioData('user-1'), { wrapper })
    await waitFor(() => expect(first.result.current.assets).toHaveLength(1))
    first.unmount()

    const second = renderHook(() => usePortfolioData('user-1'), { wrapper })
    expect(second.result.current.assets).toHaveLength(1)
    expect(mocks.getPortfolioBalances).toHaveBeenCalledOnce()
  })
})
