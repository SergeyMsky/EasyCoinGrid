import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SpotPortfolioSnapshot } from '@/features/portfolio/portfolio.types'
import { getSpotPortfolioHistory, recordSpotPortfolioSnapshot, syncBinanceSpotPortfolioHistory } from '@/features/portfolio/api/portfolio-history.api'
import { portfolioQueryKeys } from '@/features/portfolio/api/portfolio-query-keys'

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000
const HISTORY_STALE_TIME = 60 * 60 * 1000
const lastSnapshotAtByUser = new Map<string, number>()

type PortfolioHistoryData = {
  snapshots: SpotPortfolioSnapshot[]
  syncError: string | null
}

async function loadPortfolioHistory(): Promise<PortfolioHistoryData> {
  let syncError: string | null = null

  try {
    await syncBinanceSpotPortfolioHistory()
  } catch (error) {
    syncError = error instanceof Error ? error.message : 'Unable to sync Binance Spot portfolio history.'
  }

  return {
    snapshots: await getSpotPortfolioHistory(),
    syncError,
  }
}

export function useSpotPortfolioHistory(totalValueUsd: number | null, enabled: boolean, userId: string) {
  const queryClient = useQueryClient()
  const totalValueUsdRef = useRef(totalValueUsd)
  const queryKey = portfolioQueryKeys.history(userId)
  const historyQuery = useQuery({
    queryKey,
    queryFn: loadPortfolioHistory,
    enabled: enabled && Boolean(userId),
    staleTime: HISTORY_STALE_TIME,
    gcTime: 60 * 60 * 1000,
  })

  const { mutateAsync: saveSnapshot, error: recordSnapshotError } = useMutation({
    mutationFn: async (totalValue: number) => {
      await recordSpotPortfolioSnapshot(totalValue)
      return getSpotPortfolioHistory()
    },
    onSuccess: (snapshots) => {
      queryClient.setQueryData<PortfolioHistoryData>(queryKey, (current) => ({
        snapshots,
        syncError: current?.syncError ?? null,
      }))
    },
  })

  useEffect(() => {
    totalValueUsdRef.current = totalValueUsd
  }, [totalValueUsd])

  useEffect(() => {
    if (!enabled || !userId) return

    async function recordSnapshot() {
      const now = Date.now()
      const lastSnapshotAt = lastSnapshotAtByUser.get(userId) ?? 0
      if (now - lastSnapshotAt < SNAPSHOT_INTERVAL_MS) return

      const currentValueUsd = totalValueUsdRef.current
      if (currentValueUsd === null) return

      lastSnapshotAtByUser.set(userId, now)
      try {
        await saveSnapshot(currentValueUsd)
      } catch {
        if (lastSnapshotAt === 0) {
          lastSnapshotAtByUser.delete(userId)
        } else {
          lastSnapshotAtByUser.set(userId, lastSnapshotAt)
        }
      }
    }

    void recordSnapshot()
    const intervalId = setInterval(() => void recordSnapshot(), SNAPSHOT_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [enabled, userId, saveSnapshot])

  const error =
    historyQuery.error instanceof Error
      ? historyQuery.error.message
      : (historyQuery.data?.syncError ?? (recordSnapshotError instanceof Error ? recordSnapshotError.message : null))

  return {
    snapshots: historyQuery.data?.snapshots ?? [],
    loading: historyQuery.isPending,
    error,
  }
}
