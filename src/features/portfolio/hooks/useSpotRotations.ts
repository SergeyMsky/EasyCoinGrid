import { useCallback, useEffect, useState } from 'react'
import type { CloseRotationInput, CreateSpotRotationInput, SpotRotation } from '@/features/portfolio/portfolio.types'
import { closeSpotRotation, createSpotRotation, getSpotRotations } from '@/features/portfolio/api/spot-rotations.api'
import { syncBinanceSpotRotations, type SpotRotationSyncStatus } from '@/features/portfolio/api/binance-spot-trades.api'
import { getSpotRotationBaseAsset } from '@/features/portfolio/utils/spot-rotation-symbol'

type UseSpotRotationsOptions = {
  assets: string[]
  syncFromBinance: boolean
}

export function useSpotRotations({ assets, syncFromBinance }: UseSpotRotationsOptions) {
  const [rotations, setRotations] = useState<SpotRotation[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SpotRotationSyncStatus | null>(null)
  const assetKey = [...new Set(assets.map((asset) => asset.trim().toUpperCase()).filter(Boolean))].sort().join(',')

  const runSync = useCallback(
    async (existingRotations: SpotRotation[]) => {
      const autoRotations = existingRotations.filter((rotation) => rotation.match_type === 'AUTO_API')
      const knownAssets = autoRotations.map((rotation) => getSpotRotationBaseAsset(rotation.symbol))
      const assetsToSync = [...new Set([...(assetKey ? assetKey.split(',') : []), ...knownAssets])]

      const status = await syncBinanceSpotRotations(assetsToSync)
      const updatedRotations = await getSpotRotations()
      return { status, rotations: updatedRotations }
    },
    [assetKey],
  )

  const refreshRotations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      setRotations(await getSpotRotations())
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unable to load spot rotations.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!syncFromBinance) return

    setSyncing(true)
    setError(null)
    try {
      const existingRotations = await getSpotRotations()
      setRotations(existingRotations)
      const result = await runSync(existingRotations)
      setSyncStatus(result.status)
      setRotations(result.rotations)
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Unable to sync Binance spot rotations.')
    } finally {
      setSyncing(false)
    }
  }, [runSync, syncFromBinance])

  useEffect(() => {
    let active = true

    async function loadAndSync() {
      setError(null)

      try {
        const existingRotations = await getSpotRotations()
        if (!active) return
        setRotations(existingRotations)

        if (syncFromBinance) {
          setLoading(true)
          const result = await runSync(existingRotations)
          if (!active) return
          setSyncStatus(result.status)
          setRotations(result.rotations)
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load spot rotations.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadAndSync()

    return () => {
      active = false
    }
  }, [runSync, syncFromBinance])

  const addRotation = useCallback(
    async (input: CreateSpotRotationInput) => {
      await createSpotRotation(input)
      await refreshRotations()
    },
    [refreshRotations],
  )

  const closeRotation = useCallback(
    async (rotation: SpotRotation, input: CloseRotationInput) => {
      await closeSpotRotation(rotation.id, input)
      await refreshRotations()
    },
    [refreshRotations],
  )

  return { rotations, loading, syncing, error, syncStatus, syncNow, refreshRotations, addRotation, closeRotation }
}
