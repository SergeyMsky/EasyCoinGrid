import { supabase } from '@/shared/lib/supabase'
import type { Asset } from '@/features/portfolio/portfolio.types'

type CoinMetadata = {
  name: string
  image: string | null
}

const COIN_METADATA_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const COIN_METADATA_STORAGE_PREFIX = 'easycoingrid:coin-metadata:'
const coinMetadataCache = new Map<string, { metadata: CoinMetadata; expiresAt: number }>()
const coinMetadataRequests = new Map<string, Promise<CoinMetadata | null>>()

function readCachedCoinMetadata(asset: string) {
  const cached = coinMetadataCache.get(asset)
  if (cached) return cached
  if (typeof window === 'undefined') return undefined

  try {
    const stored = window.localStorage.getItem(`${COIN_METADATA_STORAGE_PREFIX}${asset}`)
    if (!stored) return undefined

    const value: unknown = JSON.parse(stored)
    if (
      typeof value !== 'object' ||
      value === null ||
      !('metadata' in value) ||
      typeof value.metadata !== 'object' ||
      value.metadata === null ||
      !('name' in value.metadata) ||
      typeof value.metadata.name !== 'string' ||
      !('image' in value.metadata) ||
      typeof value.metadata.image !== 'string' ||
      !('expiresAt' in value) ||
      typeof value.expiresAt !== 'number'
    ) {
      window.localStorage.removeItem(`${COIN_METADATA_STORAGE_PREFIX}${asset}`)
      return undefined
    }

    const result = {
      metadata: { name: value.metadata.name, image: value.metadata.image },
      expiresAt: value.expiresAt,
    }
    coinMetadataCache.set(asset, result)
    return result
  } catch (error) {
    console.warn(`Unable to read cached ${asset} image metadata:`, error)
    return undefined
  }
}

function getCachedCoinMetadata(asset: string) {
  return readCachedCoinMetadata(asset)?.metadata
}

export function getCachedCoinImage(asset: string) {
  return getCachedCoinMetadata(asset.trim().toUpperCase())?.image ?? null
}

function hasFreshCoinMetadata(asset: string) {
  const cached = readCachedCoinMetadata(asset)
  return Boolean(cached && cached.expiresAt > Date.now())
}

function cacheCoinMetadata(asset: string, metadata: CoinMetadata) {
  const cached = { metadata, expiresAt: Date.now() + COIN_METADATA_CACHE_TTL_MS }
  coinMetadataCache.set(asset, cached)

  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(`${COIN_METADATA_STORAGE_PREFIX}${asset}`, JSON.stringify(cached))
  } catch (error) {
    console.warn(`Unable to persist cached ${asset} image metadata:`, error)
  }
}

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

export async function getCoinsMetadata(assets: string[], options: { forceRefresh?: boolean } = {}) {
  const normalizedAssets = [...new Set(assets.map((asset) => asset.trim().toUpperCase()).filter(Boolean))]
  const { forceRefresh = false } = options
  const assetsToFetch = normalizedAssets.filter((asset) => (!hasFreshCoinMetadata(asset) || forceRefresh) && !coinMetadataRequests.has(asset))

  if (assetsToFetch.length > 0) {
    const request = (async () => {
      const { data, error } = await supabase.functions.invoke('get-coins-metadata', {
        body: { assets: assetsToFetch },
      })

      if (error) throw new Error(error.message || 'Failed to fetch coin metadata')
      if (!data?.data || typeof data.data !== 'object' || Array.isArray(data.data)) {
        throw new Error('Invalid metadata response.')
      }

      return data.data as Record<string, CoinMetadata>
    })()

    for (const asset of assetsToFetch) {
      const assetRequest = request
        .then((metadata) => {
          const result = metadata[asset] ?? null
          if (result?.image) {
            cacheCoinMetadata(asset, result)
          }
          return result
        })
        .finally(() => {
          coinMetadataRequests.delete(asset)
        })

      coinMetadataRequests.set(asset, assetRequest)
    }
  }

  const results = await Promise.all(
    normalizedAssets.map(async (asset) => {
      const request = coinMetadataRequests.get(asset)
      const cachedMetadata = getCachedCoinMetadata(asset)
      try {
        const fetchedMetadata = request ? await request : undefined
        return [asset, fetchedMetadata?.image ? fetchedMetadata : (cachedMetadata ?? fetchedMetadata ?? { name: asset, image: null })] as const
      } catch (error) {
        if (cachedMetadata?.image) {
          console.warn(`Using cached ${asset} image metadata after refresh failed:`, error)
          return [asset, cachedMetadata] as const
        }
        throw error
      }
    }),
  )

  return Object.fromEntries(results.map(([asset, metadata]) => [asset, metadata ?? { name: asset, image: null }])) as Record<string, CoinMetadata>
}
