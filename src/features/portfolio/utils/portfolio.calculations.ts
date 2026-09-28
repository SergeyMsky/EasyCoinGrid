import type { Asset, SortDirection, SortOption } from '../portfolio.types'

export function enrichAsset(asset: Asset, rate: number) {
  const amount = Number(asset.free) + Number(asset.locked)
  const convertedPrice = asset.price * rate
  const convertedAvgBuy = asset.avgBuy === null ? null : asset.avgBuy * rate
  const convertedChange24h = asset.change24h * rate
  const convertedTotal = amount * convertedPrice
  const convertedPnl = convertedAvgBuy === null ? 0 : (convertedPrice - convertedAvgBuy) * amount
  const convertedPnlPercent = convertedAvgBuy === null || convertedAvgBuy === 0 ? null : ((convertedPrice - convertedAvgBuy) / convertedAvgBuy) * 100

  return {
    ...asset,
    amount,
    convertedPrice,
    convertedAvgBuy,
    convertedChange24h,
    convertedTotal,
    convertedPnl,
    convertedPnlPercent,
  }
}

export type EnrichedAsset = ReturnType<typeof enrichAsset>

export function sortAssets(assets: EnrichedAsset[], sortBy: SortOption, sortDirection: SortDirection) {
  const direction = sortDirection === 'desc' ? 1 : -1

  return [...assets].sort((a, b) => {
    switch (sortBy) {
      case 'Name':
        return a.asset.localeCompare(b.asset) * direction

      case 'Amount':
        return (b.amount - a.amount) * direction

      case 'Change':
        return (b.change24hPercent - a.change24hPercent) * direction

      case 'Total':
        return (b.convertedTotal - a.convertedTotal) * direction

      case 'Price':
        return (b.convertedPrice - a.convertedPrice) * direction

      case 'Avg':
        if (a.convertedAvgBuy === null && b.convertedAvgBuy === null) return 0
        if (a.convertedAvgBuy === null) return 1
        if (b.convertedAvgBuy === null) return -1

        return (b.convertedAvgBuy - a.convertedAvgBuy) * direction

      case 'Pl':
        return (b.convertedPnl - a.convertedPnl) * direction

      default:
        return 0
    }
  })
}
