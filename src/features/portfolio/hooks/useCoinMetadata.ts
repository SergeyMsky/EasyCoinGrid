import { useQuery } from '@tanstack/react-query'
import { getCoinsMetadata } from '@/features/portfolio/api/portfolio.api'
import { portfolioQueryKeys } from '@/features/portfolio/api/portfolio-query-keys'

const METADATA_STALE_TIME = 24 * 60 * 60 * 1000

export function useCoinMetadata(userId: string, assets: string[]) {
  const normalizedAssets = [...new Set(assets.map((asset) => asset.trim().toUpperCase()).filter(Boolean))].sort()

  return useQuery({
    queryKey: portfolioQueryKeys.rotationMetadata(userId, normalizedAssets),
    queryFn: () => getCoinsMetadata(normalizedAssets),
    enabled: normalizedAssets.length > 0,
    staleTime: METADATA_STALE_TIME,
    gcTime: METADATA_STALE_TIME,
  })
}
