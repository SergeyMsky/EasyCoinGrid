import { supabase } from '@/shared/lib/supabase'
import type { Asset } from '@/features/portfolio/portfolio.types'

export class BinanceNotConnectedError extends Error {
  constructor() {
    super('Binance is not connected.')
    this.name = 'BinanceNotConnectedError'
  }
}

export async function getPortfolioBalances(): Promise<Asset[]> {
  const { data, error } = await supabase.functions.invoke('get-binance-portfolio')

  if (error) {
    throw new Error(error.message || 'Failed to fetch portfolio balances')
  }

  if (data?.connected === false) {
    throw new BinanceNotConnectedError()
  }

  if (!Array.isArray(data?.balances)) {
    throw new Error('Invalid portfolio response.')
  }

  return data.balances.filter((asset: Asset) => Number(asset.free) + Number(asset.locked) > 0)
}

export class BinanceUnavailableError extends Error {
  constructor() {
    super('Binance is temporarily unavailable.')
    this.name = 'BinanceUnavailableError'
  }
}

export async function getBinancePrice(asset: string) {
  const { data, error } = await supabase.functions.invoke('get-binance-price', { body: { asset } })

  if (error) {
    if (error.context instanceof Response) {
      const responseData = await error.context.json()

      if (responseData?.error === 'BINANCE_UNAVAILABLE') {
        throw new BinanceUnavailableError()
      }
    }

    throw new Error(error.message || 'Failed to fetch Binance price')
  }

  if (!data?.data) {
    throw new Error('Invalid price response.')
  }

  return data.data
}
export async function getBinanceAvgBuy(asset: string): Promise<{ avgBuy: number | null }> {
  const { data, error } = await supabase.functions.invoke('get-binance-avg-buy', { body: { asset } })

  if (error) {
    throw new Error(error.message || 'Failed to fetch Binance average buy price')
  }

  if (!data?.data || !('avgBuy' in data.data)) {
    throw new Error('Invalid average buy response.')
  }

  return data.data
}

export async function getCoinsMetadata(assets: string[]) {
  const { data, error } = await supabase.functions.invoke('get-coins-metadata', {
    body: { assets },
  })

  if (error) {
    throw new Error(error.message || 'Failed to fetch coin metadata')
  }

  if (!data?.data) {
    throw new Error('Invalid metadata response.')
  }

  return data.data
}
