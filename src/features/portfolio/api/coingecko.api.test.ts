import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}))

describe('CoinGecko API', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.invoke.mockReset()
  })

  it('searches coins through the server function', async () => {
    const coin = { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', image: 'https://example.com/btc.png', rank: 1 }
    mocks.invoke.mockResolvedValue({ data: { data: [coin] }, error: null })
    const { searchCoinGeckoCoins } = await import('./coingecko.api')

    await expect(searchCoinGeckoCoins(' btc ')).resolves.toEqual([coin])
    expect(mocks.invoke).toHaveBeenCalledWith('search-coingecko-coins', { body: { query: 'btc' } })
  })

  it('returns no results for short searches without making a request', async () => {
    const { searchCoinGeckoCoins } = await import('./coingecko.api')

    await expect(searchCoinGeckoCoins('b')).resolves.toEqual([])
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('loads a historical price and validates the server response', async () => {
    mocks.invoke.mockResolvedValue({ data: { data: { price: 67234.12, timestamp: '2026-11-02T10:00:00.000Z' } }, error: null })
    const { getHistoricalCoinPrice } = await import('./coingecko.api')

    await expect(getHistoricalCoinPrice('bitcoin', '2026-11-02T10:00:00.000Z')).resolves.toEqual({
      price: 67234.12,
      timestamp: '2026-11-02T10:00:00.000Z',
    })
    expect(mocks.invoke).toHaveBeenCalledWith('get-coingecko-historical-price', {
      body: { coinId: 'bitcoin', time: '2026-11-02T10:00:00.000Z' },
    })

    mocks.invoke.mockResolvedValue({ data: { data: { price: 0, timestamp: '2026-11-02T10:00:00.000Z' } }, error: null })
    await expect(getHistoricalCoinPrice('bitcoin', '2026-11-02T10:00:00.000Z')).rejects.toThrow('Invalid historical price response.')
  })

  it('loads current prices for normalized unique coin IDs and validates the response', async () => {
    const prices = [{ coinId: 'bitcoin', price: 67234.12, change24hPercent: 2.5, timestamp: '2026-11-02T10:00:00.000Z' }]
    mocks.invoke.mockResolvedValue({ data: { data: prices }, error: null })
    const { getCurrentCoinPrices } = await import('./coingecko.api')

    await expect(getCurrentCoinPrices([' bitcoin ', 'bitcoin'])).resolves.toEqual(prices)
    expect(mocks.invoke).toHaveBeenCalledWith('get-coingecko-current-prices', { body: { coinIds: ['bitcoin'] } })

    mocks.invoke.mockResolvedValue({ data: { data: [{ ...prices[0], price: 0 }] }, error: null })
    await expect(getCurrentCoinPrices(['bitcoin'])).rejects.toThrow('Invalid current price response.')

    mocks.invoke.mockResolvedValue({ data: { data: [{ ...prices[0], change24hPercent: Number.NaN }] }, error: null })
    await expect(getCurrentCoinPrices(['bitcoin'])).rejects.toThrow('Invalid current price response.')
  })

  it('surfaces server errors', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { message: 'CoinGecko unavailable' } })
    const { getHistoricalCoinPrice } = await import('./coingecko.api')

    await expect(getHistoricalCoinPrice('bitcoin', '2026-11-02T10:00:00.000Z')).rejects.toThrow('CoinGecko unavailable')
  })
})
