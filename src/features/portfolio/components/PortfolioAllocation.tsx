import { formatNumber } from '@/shared/utils/format-number'
import type { AssetDisplay } from '@/features/portfolio/portfolio.types'

type PortfolioAllocationProps = {
  assets: AssetDisplay[]
  loading: boolean
}

function getAssetColor(symbol: string): string {
  const normalized = symbol.toUpperCase()
  let hash = 0
  for (let i = 0; i < normalized.length; i += 1) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 70% 60%)`
}

function PortfolioAllocationSkeleton() {
  return (
    <div className="mb-4 ui-surface px-4 py-2">
      <div className="h-4 w-19 mb-2 rounded bg-white/5 animate-pulse" />
      <div className="h-2 w-full mb-1 rounded-md bg-white/5 animate-pulse" />
      <div className="h-4 w-64 rounded bg-white/5 animate-pulse" />
    </div>
  )
}

export function PortfolioAllocation({ assets, loading }: PortfolioAllocationProps) {
  const entries = assets
    .map((asset) => ({
      asset,
      total: asset.convertedTotal,
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)

  const totalValue = entries.reduce((sum, item) => sum + item.total, 0)

  if (loading) {
    return <PortfolioAllocationSkeleton />
  }

  const mainEntries: typeof entries = []
  const otherEntries: typeof entries = []

  for (const entry of entries) {
    const percentage = (entry.total / totalValue) * 100

    if (percentage < 0.1) {
      otherEntries.push(entry)
    } else {
      mainEntries.push(entry)
    }
  }

  const finalEntries = [...mainEntries]

  if (otherEntries.length > 0) {
    const otherTotal = otherEntries.reduce((sum, item) => sum + item.total, 0)

    finalEntries.push({
      asset: {
        asset: 'OTHER',
        name: 'Other',
        free: '0',
        locked: '0',
        price: 0,
        avgBuy: null,
        change24h: 0,
        change24hPercent: 0,
      } as AssetDisplay,
      total: otherTotal,
    })
  }

  return (
    <div className="mb-4 ui-surface px-4 py-2 w-full">
      <p className="label mb-2">Allocation</p>

      <div className="mb-1 flex overflow-hidden rounded-md">
        {finalEntries.map(({ asset, total }) => {
          const percentage = (total / totalValue) * 100

          return <div key={asset.asset} className="h-2" style={{ width: `${percentage}%`, backgroundColor: getAssetColor(asset.asset) }} />
        })}
      </div>

      <ul className="flex flex-wrap gap-x-4 text-xs text-gray-400">
        {finalEntries.map(({ asset, total }) => {
          const percentage = (total / totalValue) * 100

          return (
            <li key={asset.asset} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getAssetColor(asset.asset) }} />
              <span>{asset.asset}</span>
              <span className="text-gray-500">{formatNumber(percentage, 1)}%</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
