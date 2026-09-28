import { formatSignedValue } from '@/shared/utils/format-signed-value'
import { type AssetDisplay, type Currency } from '@/features/portfolio/portfolio.types'
import { formatCurrency, formatSignedCurrency } from '@/shared/utils/format-currency'

type PortfolioSummaryProps = {
  assets: AssetDisplay[]
  loading: boolean
  currency: Currency
}

function PortfolioSummarySkeleton() {
  return (
    <ul className="mb-4 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 *:flex *:flex-col *:basis-1/4 *:gap-1">
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index} className="ui-surface px-4 py-4">
          <div className="h-4 w-20 rounded bg-white/5 animate-pulse" />
          <div className="h-7 sm:h-8 w-32 rounded bg-white/5 animate-pulse" />
          <div className="h-4 w-25 rounded bg-white/5 animate-pulse" />
        </li>
      ))}
    </ul>
  )
}

export function PortfolioSummary({ assets, loading, currency }: PortfolioSummaryProps) {
  const totalValue = assets.reduce((sum, asset) => sum + asset.convertedTotal, 0)

  const totalProfitLoss = assets.reduce((sum, asset) => sum + asset.convertedPnl, 0)

  const totalInvested = assets.reduce((sum, asset) => {
    if (asset.convertedAvgBuy === null) return sum
    return sum + asset.convertedAvgBuy * asset.amount
  }, 0)

  const totalProfitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : null

  const priceChange = assets.reduce((sum, asset) => sum + asset.amount * asset.change24h, 0)

  const previousTotalValue = totalValue - priceChange
  const priceChangePercent = previousTotalValue > 0 ? (priceChange / previousTotalValue) * 100 : 0

  const bestAsset = assets.reduce<AssetDisplay | null>((best, asset) => {
    if (!best || asset.change24hPercent > best.change24hPercent) {
      return asset
    }
    return best
  }, null)

  if (loading) {
    return <PortfolioSummarySkeleton />
  }

  return (
    <ul className="mb-4 mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 *:flex *:flex-col *:basis-1/4 *:gap-1">
      <li className="ui-surface px-4 py-4">
        <span className="label">Total Value</span>
        <strong className="text-xl sm:text-2xl">{formatCurrency(totalValue, currency)}</strong>
        <span className="text-xs text-gray-300">{assets.length} assets tracked</span>
      </li>
      <li className="ui-surface px-4 py-4">
        <span className="label">24h Change</span>
        <strong className={`text-xl sm:text-2xl ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatSignedCurrency(priceChange, currency)}</strong>
        <span className={`text-xs ${priceChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatSignedValue(priceChangePercent, '', '%')}</span>
      </li>
      <li className="ui-surface px-4 py-4">
        <span className="label">Total P/L</span>
        <strong className={`text-xl sm:text-2xl ${totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatSignedCurrency(totalProfitLoss, currency)}</strong>
        <div className="text-xs text-gray-500">
          <span className={`text-xs ${totalProfitLossPercent === null ? 'text-gray-300' : totalProfitLossPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalProfitLossPercent === null ? '—' : `${formatSignedValue(totalProfitLossPercent, '', '%')}`}
          </span>{' '}
          all time
        </div>
      </li>
      <li className="ui-surface px-4 py-4">
        <span className="label">Best 24h</span>
        {bestAsset ? (
          <>
            <strong className="text-xl sm:text-2xl flex gap-2">
              {bestAsset.image && <img src={bestAsset.image} alt={bestAsset.asset} className="w-7.5 h-7.5" />}
              {bestAsset.asset} <span className={`${bestAsset.change24hPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatSignedValue(bestAsset.change24hPercent, '', '%')}</span>
            </strong>
            <span className="text-xs text-gray-500">Top performer today</span>
          </>
        ) : (
          <>
            <strong className="text-xl sm:text-2xl">—</strong>
            <span className="text-xs text-gray-500">No data</span>
          </>
        )}
      </li>
    </ul>
  )
}
