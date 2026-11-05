import { useEffect, useMemo, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { SpotPortfolioSnapshot } from '@/features/portfolio/portfolio.types'
import { getSpotPortfolioHistory, recordSpotPortfolioSnapshot, syncBinanceSpotPortfolioHistory } from '@/features/portfolio/api/portfolio-history.api'
import { portfolioQueryKeys } from '@/features/portfolio/api/portfolio-query-keys'

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000
const HISTORY_STALE_TIME = 60 * 60 * 1000
const MOCK_HISTORY_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000
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

function createMockPortfolioHistory(totalValueUsd: number, now = Date.now()): SpotPortfolioSnapshot[] {
  return Array.from({ length: MOCK_HISTORY_DAYS }, (_, index) => {
    const progress = index / (MOCK_HISTORY_DAYS - 1)
    const variation = 0.018 * Math.sin(index * 0.55) + 0.008 * Math.sin(index * 0.19)
    const valueFactor = index === MOCK_HISTORY_DAYS - 1 ? 1 : 0.92 + 0.08 * progress + variation

    return {
      id: `mock-portfolio-${index}`,
      snapshot_at: new Date(now - (MOCK_HISTORY_DAYS - 1 - index) * DAY_MS).toISOString(),
      total_value_usd: totalValueUsd * valueFactor,
      source: 'APP_OBSERVED',
    }
  })
}

export function useSpotPortfolioHistory(totalValueUsd: number | null, enabled: boolean, userId: string) {
  const queryClient = useQueryClient()
  const totalValueUsdRef = useRef(totalValueUsd)
  const queryKey = portfolioQueryKeys.history(userId)
  const demoMode = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_PORTFOLIO === 'true'
  const historyQuery = useQuery({
    queryKey,
    queryFn: loadPortfolioHistory,
    enabled: !demoMode && enabled && Boolean(userId),
    staleTime: HISTORY_STALE_TIME,
    gcTime: 60 * 60 * 1000,
  })
  const mockSnapshots = useMemo(
    () => (demoMode && totalValueUsd !== null ? createMockPortfolioHistory(totalValueUsd) : []),
    [demoMode, totalValueUsd],
  )

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
    if (demoMode || !enabled || !userId) return

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
  }, [demoMode, enabled, userId, saveSnapshot])

  const error =
    historyQuery.error instanceof Error
      ? historyQuery.error.message
      : (historyQuery.data?.syncError ?? (recordSnapshotError instanceof Error ? recordSnapshotError.message : null))

  return {
    snapshots: demoMode ? mockSnapshots : (historyQuery.data?.snapshots ?? []),
    loading: demoMode ? totalValueUsd === null : enabled && historyQuery.isPending,
    error: demoMode ? null : error,
    demoMode,
  }
}
