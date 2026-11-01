import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CloseRotationInput, CreateSpotRotationInput, SpotRotation } from '@/features/portfolio/portfolio.types'
import { closeSpotRotation, createSpotRotation, getSpotRotations } from '@/features/portfolio/api/spot-rotations.api'
import { syncBinanceSpotRotations, type SpotRotationSyncStatus } from '@/features/portfolio/api/binance-spot-trades.api'
import { getSpotRotationBaseAsset } from '@/features/portfolio/utils/spot-rotation-symbol'
import { portfolioQueryKeys } from '@/features/portfolio/api/portfolio-query-keys'

type UseSpotRotationsOptions = {
  userId: string
  assets: string[]
  syncFromBinance: boolean
}

const ROTATIONS_STALE_TIME = 60 * 1000

export function useSpotRotations({ userId, assets, syncFromBinance }: UseSpotRotationsOptions) {
  const queryClient = useQueryClient()
  const queryKey = portfolioQueryKeys.rotations(userId)
  const syncStatusKey = portfolioQueryKeys.rotationSyncStatus(userId)
  const normalizedAssets = [...new Set(assets.map((asset) => asset.trim().toUpperCase()).filter(Boolean))]

  const rotationsQuery = useQuery({
    queryKey,
    queryFn: getSpotRotations,
    enabled: Boolean(userId),
    staleTime: ROTATIONS_STALE_TIME,
    gcTime: 60 * 60 * 1000,
  })
  const syncStatusQuery = useQuery<SpotRotationSyncStatus | null>({
    queryKey: syncStatusKey,
    queryFn: async () => null,
    enabled: false,
    initialData: null,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
  })

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!syncFromBinance) {
        throw new Error('Connect Binance before syncing spot rotations.')
      }

      const currentRotations: SpotRotation[] =
        queryClient.getQueryData<SpotRotation[]>(queryKey) ??
        (await queryClient.fetchQuery<SpotRotation[]>({ queryKey, queryFn: getSpotRotations, staleTime: ROTATIONS_STALE_TIME }))
      const autoRotations = currentRotations.filter((rotation) => rotation.match_type === 'AUTO_API')
      const knownAssets = autoRotations.map((rotation) => getSpotRotationBaseAsset(rotation.symbol))
      const assetsToSync = [...new Set([...normalizedAssets, ...knownAssets])]
      const status = await syncBinanceSpotRotations(assetsToSync)
      const updatedRotations = await getSpotRotations()

      return { status, rotations: updatedRotations }
    },
    onSuccess: ({ status, rotations }) => {
      queryClient.setQueryData(syncStatusKey, status)
      queryClient.setQueryData(queryKey, rotations)
    },
  })

  const createMutation = useMutation({
    mutationFn: createSpotRotation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const closeMutation = useMutation({
    mutationFn: ({ rotation, input }: { rotation: SpotRotation; input: CloseRotationInput }) => closeSpotRotation(rotation.id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const refreshRotations = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  const syncNow = useCallback(async () => {
    if (!syncFromBinance) return
    try {
      await syncMutation.mutateAsync()
    } catch {
      // The mutation error is returned through the hook and displayed by the page.
    }
  }, [syncFromBinance, syncMutation])

  const addRotation = useCallback(
    async (input: CreateSpotRotationInput) => {
      await createMutation.mutateAsync(input)
    },
    [createMutation],
  )

  const closeRotation = useCallback(
    async (rotation: SpotRotation, input: CloseRotationInput) => {
      await closeMutation.mutateAsync({ rotation, input })
    },
    [closeMutation],
  )

  const error = rotationsQuery.error ?? syncMutation.error

  return {
    rotations: rotationsQuery.data ?? [],
    loading: rotationsQuery.isPending,
    syncing: syncMutation.isPending,
    error: error instanceof Error ? error.message : error ? 'Unable to load spot rotations.' : null,
    syncStatus: syncStatusQuery.data,
    syncNow,
    refreshRotations,
    addRotation,
    closeRotation,
  }
}
