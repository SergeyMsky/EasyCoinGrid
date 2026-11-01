import type { Asset } from '@/features/portfolio/portfolio.types'
import { getSpotRotationBaseAsset } from '@/features/portfolio/utils/spot-rotation-symbol'
import { CoinImage } from './CoinImage'

type RotationAssetCellProps = {
  symbol: string
  metadata: Record<string, Pick<Asset, 'name' | 'image'>>
}

export function RotationAssetCell({ symbol, metadata }: RotationAssetCellProps) {
  const asset = getSpotRotationBaseAsset(symbol)
  const coin = metadata[asset]

  return (
    <div className="flex items-center gap-3">
      <CoinImage image={coin?.image} asset={asset} />
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{coin?.name ?? asset}</span>
        <span className="text-xs text-muted">{asset}</span>
      </div>
    </div>
  )
}
