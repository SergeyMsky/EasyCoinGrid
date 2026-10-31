import type { Asset } from '@/features/portfolio/portfolio.types'
import { getSpotRotationBaseAsset } from '@/features/portfolio/utils/spot-rotation-symbol'

type RotationAssetCellProps = {
  symbol: string
  metadata: Record<string, Pick<Asset, 'name' | 'image'>>
}

export function RotationAssetCell({ symbol, metadata }: RotationAssetCellProps) {
  const asset = getSpotRotationBaseAsset(symbol)
  const coin = metadata[asset]

  return (
    <div className="flex items-center gap-3">
      {coin?.image && <img src={coin.image} alt={asset} className="h-7.5 w-7.5 shrink-0" />}
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{coin?.name ?? asset}</span>
        <span className="text-xs text-muted">{asset}</span>
      </div>
    </div>
  )
}
