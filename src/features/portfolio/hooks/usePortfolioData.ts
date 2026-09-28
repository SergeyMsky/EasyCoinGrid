import { useCallback, useEffect, useState } from 'react'
import { BinanceNotConnectedError, BinanceUnavailableError, getBinanceAvgBuy, getBinancePrice, getCoinsMetadata, getPortfolioBalances } from '../api/portfolio.api'
import type { Asset } from '@/features/portfolio/portfolio.types'
import { mockPortfolio } from '../portfolio.mock'

export function usePortfolioData() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [binanceUnavailable, setBinanceUnavailable] = useState(false)
  const [assets, setAssets] = useState<Asset[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isBinanceConnected, setIsBinanceConnected] = useState<boolean | null>(null)

  const loadPortfolio = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setBinanceUnavailable(false)

      // mock portfolio data
      const useMockPortfolio = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_PORTFOLIO === 'true'

      if (useMockPortfolio) {
        setIsBinanceConnected(null)
        setAssets(mockPortfolio)
        setLastUpdated(new Date())
        return
      }
      // mock portfolio data

      const balances = await getPortfolioBalances()
      setIsBinanceConnected(true)

      let metadata: Record<string, { name: string; image: string | null }> = {}

      try {
        metadata = await getCoinsMetadata(balances.map((asset) => asset.asset))
      } catch (metaError) {
        console.warn('Coin metadata unavailable:', metaError)
      }

      const portfolioAssets = await Promise.all(
        balances.map(async (asset) => {
          const [priceResult, avgBuyResult] = await Promise.allSettled([getBinancePrice(asset.asset), getBinanceAvgBuy(asset.asset)])
          const price = priceResult.status === 'fulfilled' ? priceResult.value.price : 0
          const change24h = priceResult.status === 'fulfilled' ? priceResult.value.change24h : 0
          const avgBuy = avgBuyResult.status === 'fulfilled' ? avgBuyResult.value.avgBuy : null
          const change24hPercent = priceResult.status === 'fulfilled' ? Number(priceResult.value.change24hPercent) : 0

          if (priceResult.status === 'rejected') {
            console.warn(`Price unavailable for ${asset.asset}`, priceResult.reason)

            if (priceResult.reason instanceof BinanceUnavailableError) {
              setBinanceUnavailable(true)
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

      setAssets(portfolioAssets)
      setLastUpdated(new Date())
    } catch (loadError) {
      if (loadError instanceof BinanceNotConnectedError) {
        setIsBinanceConnected(false)
        setAssets([])
        setError(null)
        setBinanceUnavailable(false)
        setLastUpdated(null)
        return
      }
      console.error('Failed to load portfolio:', loadError)
      setError('Unable to load your portfolio.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPortfolio()

    const intervalId = setInterval(
      () => {
        void loadPortfolio()
      },
      5 * 60 * 1000,
    )
    return () => clearInterval(intervalId)
  }, [loadPortfolio])

  const refreshPortfolio = useCallback(() => {
    void loadPortfolio()
  }, [loadPortfolio])

  return { assets, loading, error, refreshPortfolio, lastUpdated, binanceUnavailable, isBinanceConnected }
}
