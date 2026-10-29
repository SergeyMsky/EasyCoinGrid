import { useEffect, useRef, useState } from 'react'
import type { SpotPortfolioSnapshot } from '@/features/portfolio/portfolio.types'
import { getSpotPortfolioHistory, recordSpotPortfolioSnapshot, syncBinanceSpotPortfolioHistory } from '@/features/portfolio/api/portfolio-history.api'

const SNAPSHOT_INTERVAL_MS = 60 * 60 * 1000

export function useSpotPortfolioHistory(totalValueUsd: number | null, enabled: boolean) {
  const [snapshots, setSnapshots] = useState<SpotPortfolioSnapshot[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const lastSnapshotAt = useRef(0)
  const totalValueUsdRef = useRef(totalValueUsd)

  useEffect(() => {
    totalValueUsdRef.current = totalValueUsd
  }, [totalValueUsd])

  useEffect(() => {
    if (!enabled) return

    let active = true

    async function loadHistory() {
      setLoading(true)
      let syncError: string | null = null

      try {
        await syncBinanceSpotPortfolioHistory()
      } catch (loadError) {
        syncError = loadError instanceof Error ? loadError.message : 'Unable to sync Binance Spot portfolio history.'
      }

      try {
        const history = await getSpotPortfolioHistory()
        if (active) {
          setSnapshots(history)
          setError(syncError)
        }
      } catch (historyError) {
        if (active) {
          const historyMessage = historyError instanceof Error ? historyError.message : 'Unable to load Spot portfolio history.'
          setError(syncError ? `${syncError} ${historyMessage}` : historyMessage)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadHistory()

    return () => {
      active = false
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    let active = true

    async function recordSnapshot() {
      const now = Date.now()
      if (now - lastSnapshotAt.current < SNAPSHOT_INTERVAL_MS) return

      const currentValueUsd = totalValueUsdRef.current
      if (currentValueUsd === null) return

      try {
        lastSnapshotAt.current = now
        await recordSpotPortfolioSnapshot(currentValueUsd)
        const history = await getSpotPortfolioHistory()
        if (active) setSnapshots(history)
      } catch (snapshotError) {
        lastSnapshotAt.current = 0
        if (active) setError(snapshotError instanceof Error ? snapshotError.message : 'Unable to record Spot portfolio value.')
      }
    }

    void recordSnapshot()
    const intervalId = setInterval(() => void recordSnapshot(), SNAPSHOT_INTERVAL_MS)

    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [enabled])

  return { snapshots, loading, error }
}
