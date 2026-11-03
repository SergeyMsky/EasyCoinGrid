import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentCoinPrices } from '@/features/portfolio/api/coingecko.api'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'

const CURRENT_PRICES_STALE_TIME = 45 * 1000
const CURRENT_PRICES_REFRESH_INTERVAL = 60 * 1000

export function useSpotRotationPrices(userId: string, rotations: SpotRotation[]) {
  const coinIds = useMemo(
    () =>
      [
        ...new Set(
          rotations
            .filter((rotation) => rotation.status === 'OPEN')
            .map((rotation) => rotation.coingecko_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ].sort(),
    [rotations],
  )

  const pricesQuery = useQuery({
    queryKey: ['coingecko', 'current-prices', userId, coinIds],
    queryFn: () => getCurrentCoinPrices(coinIds),
    enabled: Boolean(userId && coinIds.length),
    staleTime: CURRENT_PRICES_STALE_TIME,
    refetchInterval: CURRENT_PRICES_REFRESH_INTERVAL,
    refetchIntervalInBackground: false,
    retry: false,
  })

  const pricesByCoinId = useMemo(() => Object.fromEntries((pricesQuery.data ?? []).map((price) => [price.coinId, price])), [pricesQuery.data])

  const updatedAt = useMemo(() => {
    const timestamps = (pricesQuery.data ?? []).map((price) => Date.parse(price.timestamp)).filter(Number.isFinite)
    return timestamps.length ? Math.max(...timestamps) : null
  }, [pricesQuery.data])

  return {
    pricesByCoinId,
    updatedAt,
    loading: pricesQuery.isFetching && !pricesQuery.data,
    refreshing: pricesQuery.isFetching,
    error: pricesQuery.error instanceof Error ? pricesQuery.error.message : null,
    refreshPrices: async () => {
      await pricesQuery.refetch()
    },
  }
}
