import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BinanceNotConnectedError,
  BinanceUnavailableError,
  getBinanceAvgBuy,
  getBinancePrice,
  getCoinsMetadata,
  getPortfolioBalances,
} from '../api/portfolio.api'
import { getStablecoinUsdRates, StablecoinUsdRatesUnavailableError } from '../api/usdt-usd-rate.api'
import type { Asset } from '@/features/portfolio/portfolio.types'
import { mockPortfolio } from '../portfolio.mock'
import { portfolioQueryKeys } from '../api/portfolio-query-keys'

type PortfolioData = {
  assets: Asset[]
  lastUpdated: Date | null
  binanceUnavailable: boolean
  isBinanceConnected: boolean | null
  stablecoinUsdRates: { USDT: number; USDC: number } | null
  stablecoinRatesUpdatedAt: string | null
}

const PORTFOLIO_STALE_TIME = 5 * 60 * 1000
const PORTFOLIO_REFRESH_INTERVAL = 5 * 60 * 1000

async function loadPortfolio(): Promise<PortfolioData> {
  try {
    // mock portfolio data
    const useMockPortfolio = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_PORTFOLIO === 'true'

    if (useMockPortfolio) {
      return {
        assets: mockPortfolio,
        lastUpdated: new Date(),
        binanceUnavailable: false,
        isBinanceConnected: null,
        stablecoinUsdRates: null,
        stablecoinRatesUpdatedAt: null,
      }
    }
    // mock portfolio data

    const balances = await getPortfolioBalances()
    const currentStablecoinRates = await getStablecoinUsdRates()

    let metadata: Record<string, { name: string; image: string | null }> = {}

    try {
      metadata = await getCoinsMetadata(balances.map((asset) => asset.asset))
    } catch (metaError) {
      console.warn('Coin metadata unavailable:', metaError)
    }

    let binanceUnavailable = false
    const portfolioAssets = await Promise.all(
      balances.map(async (asset) => {
        const [priceResult, avgBuyResult] = await Promise.allSettled([getBinancePrice(asset.asset), getBinanceAvgBuy(asset.asset)])
        const quoteUsdRate =
          asset.asset === 'USDC' || asset.asset === 'LDUSDC' ? currentStablecoinRates.rates.USDC : currentStablecoinRates.rates.USDT
        const price = priceResult.status === 'fulfilled' ? priceResult.value.price * quoteUsdRate : 0
        const change24h = priceResult.status === 'fulfilled' ? priceResult.value.change24h * quoteUsdRate : 0
        const avgBuy = avgBuyResult.status === 'fulfilled' ? avgBuyResult.value.avgBuy : null
        const change24hPercent = priceResult.status === 'fulfilled' ? Number(priceResult.value.change24hPercent) : 0

        if (priceResult.status === 'rejected') {
          console.warn(`Price unavailable for ${asset.asset}`, priceResult.reason)

          if (priceResult.reason instanceof BinanceUnavailableError) {
            binanceUnavailable = true
          }
        }

        if (avgBuyResult.status === 'rejected') {
          console.warn(`Average buy price unavailable for ${asset.asset}`, avgBuyResult.reason)
        }

        return {
          ...asset,
          price,
          avgBuy,
          change24h,
          change24hPercent,
          name: metadata[asset.asset]?.name ?? asset.asset,
          image: metadata[asset.asset]?.image ?? null,
        }
      }),
    )

    return {
      assets: portfolioAssets,
      lastUpdated: new Date(),
      binanceUnavailable,
      isBinanceConnected: true,
      stablecoinUsdRates: currentStablecoinRates.rates,
      stablecoinRatesUpdatedAt: currentStablecoinRates.updatedAt,
    }
  } catch (loadError) {
    if (loadError instanceof BinanceNotConnectedError) {
      return {
        assets: [],
        lastUpdated: null,
        binanceUnavailable: false,
        isBinanceConnected: false,
        stablecoinUsdRates: null,
        stablecoinRatesUpdatedAt: null,
      }
    }

    throw loadError
  }
}

export function usePortfolioData(userId: string) {
  const query = useQuery({
    queryKey: portfolioQueryKeys.portfolio(userId),
    queryFn: loadPortfolio,
    enabled: Boolean(userId),
    staleTime: PORTFOLIO_STALE_TIME,
    gcTime: 60 * 60 * 1000,
    refetchInterval: PORTFOLIO_REFRESH_INTERVAL,
    refetchIntervalInBackground: false,
  })
  const { refetch } = query
  const refreshPortfolio = useCallback(() => {
    void refetch()
  }, [refetch])
  const queryError = query.error
  const error = queryError instanceof StablecoinUsdRatesUnavailableError ? queryError.message : queryError ? 'Unable to load your portfolio.' : null

  return {
    assets: query.data?.assets ?? [],
    loading: query.isPending,
    refreshing: query.isFetching,
    error,
    refreshPortfolio,
    lastUpdated: query.data?.lastUpdated ?? null,
    binanceUnavailable: query.data?.binanceUnavailable ?? false,
    isBinanceConnected: query.data?.isBinanceConnected ?? null,
    stablecoinUsdRates: query.data?.stablecoinUsdRates ?? null,
    stablecoinRatesUpdatedAt: query.data?.stablecoinRatesUpdatedAt ?? null,
  }
}
