import { supabase } from '@/shared/lib/supabase'

export type CoinGeckoCoin = {
  id: string
  name: string
  symbol: string
  image: string
  rank: number
}

export type HistoricalCoinPrice = {
  price: number
  timestamp: string
}

export type CurrentCoinPrice = {
  coinId: string
  price: number
  change24hPercent?: number | null
  timestamp: string
}

function isCurrentCoinPrice(value: unknown): value is CurrentCoinPrice {
  if (!value || typeof value !== 'object') return false
  if (!('coinId' in value) || typeof value.coinId !== 'string') return false
  if (!('price' in value) || typeof value.price !== 'number' || !Number.isFinite(value.price) || value.price <= 0) return false
  return (
    'timestamp' in value &&
    typeof value.timestamp === 'string' &&
    Number.isFinite(Date.parse(value.timestamp)) &&
    (!('change24hPercent' in value) ||
      value.change24hPercent === null ||
      (typeof value.change24hPercent === 'number' && Number.isFinite(value.change24hPercent)))
  )
}

export async function searchCoinGeckoCoins(query: string): Promise<CoinGeckoCoin[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) return []

  const { data, error } = await supabase.functions.invoke('search-coingecko-coins', {
    body: { query: normalizedQuery },
  })

  if (error) {
    throw new Error(error.message || 'Unable to search coins.')
  }
  if (!Array.isArray(data?.data)) {
    throw new Error('Invalid coin search response.')
  }

  return data.data as CoinGeckoCoin[]
}

export async function getHistoricalCoinPrice(coinId: string, time: string): Promise<HistoricalCoinPrice> {
  const { data, error } = await supabase.functions.invoke('get-coingecko-historical-price', {
    body: { coinId, time },
  })

  if (error) {
    throw new Error(error.message || 'Unable to load historical coin price.')
  }
  if (!Number.isFinite(data?.data?.price) || data.data.price <= 0 || typeof data.data.timestamp !== 'string') {
    throw new Error('Invalid historical price response.')
  }

  return data.data as HistoricalCoinPrice
}

export async function getCurrentCoinPrices(coinIds: string[]): Promise<CurrentCoinPrice[]> {
  const normalizedIds = [...new Set(coinIds.map((coinId) => coinId.trim()).filter(Boolean))].sort()
  if (!normalizedIds.length) return []

  const { data, error } = await supabase.functions.invoke('get-coingecko-current-prices', {
    body: { coinIds: normalizedIds },
  })

  if (error) {
    throw new Error(error.message || 'Unable to load current coin prices.')
  }
  if (!Array.isArray(data?.data) || !data.data.every(isCurrentCoinPrice)) {
    throw new Error('Invalid current price response.')
  }

  return data.data as CurrentCoinPrice[]
}
