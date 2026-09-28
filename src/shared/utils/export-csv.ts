import type { Asset } from '@/features/portfolio/portfolio.types'

export function exportAssetsToCsv(assets: Asset[]) {
  const rows = [
    ['Asset', 'Amount', 'Price', 'Total', 'P/L'],
    ...assets.map((asset) => {
      const amount = Number(asset.free) + Number(asset.locked)
      const total = amount * asset.price
      const profitLoss = asset.avgBuy === null ? '' : (asset.price - asset.avgBuy) * amount

      return [asset.asset, amount, asset.price, total, profitLoss]
    }),
  ]

  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'portfolio.csv'
  link.click()

  URL.revokeObjectURL(url)
}
