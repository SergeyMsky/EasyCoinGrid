import { formatSignedValue } from '@/shared/utils/format-signed-value'
import { type AssetDisplay, type Currency } from '@/features/portfolio/portfolio.types'
import { formatCurrency, formatSignedCurrency } from '@/shared/utils/format-currency'
import { CoinImage } from './CoinImage'
import { Skeleton } from '@/shared/components/Skeleton'

type PortfolioSummaryProps = {
  assets: AssetDisplay[]
  loading: boolean
  currency: Currency
}

function PortfolioSummarySkeleton() {
  return (
    <ul
      aria-label="Loading portfolio summary"
      aria-busy="true"
      className="ui-surface mt-4 grid grid-cols-1 gap-4 overflow-hidden px-4 py-4 *:flex *:basis-1/4 *:flex-col *:gap-1 *:border-r *:border-outline *:last:border-0 sm:grid-cols-2 lg:grid-cols-4">
      <li>
        <span className="label">Total Value</span>
        <Skeleton className="h-7 w-32 sm:h-8" />
        <Skeleton className="h-4 w-25" />
      </li>
      <li>
        <span className="label">24h Change</span>
        <Skeleton className="h-7 w-32 sm:h-8" />
        <Skeleton className="h-4 w-16" />
      </li>
      <li>
        <span className="label">Total P/L</span>
        <Skeleton className="h-7 w-32 sm:h-8" />
        <Skeleton className="h-4 w-20" />
      </li>
      <li>
        <span className="label">Best 24h</span>
        <Skeleton className="h-7 w-36 sm:h-8" />
        <Skeleton className="h-4 w-28" />
      </li>
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
    <ul className="ui-surface mt-4 grid grid-cols-1 gap-4 overflow-hidden px-4 py-4 *:flex *:basis-1/4 *:flex-col *:gap-1 *:border-r *:border-outline *:last:border-0 sm:grid-cols-2 lg:grid-cols-4">
      <li>
        <span className="label">Total Value</span>
        <strong className="text-xl sm:text-2xl">{formatCurrency(totalValue, currency)}</strong>
        <span className="text-xs text-subtle">{assets.length} assets tracked</span>
      </li>
      <li>
        <span className="label">24h Change</span>
        <strong className={`text-xl sm:text-2xl ${priceChange >= 0 ? 'text-profit' : 'text-loss'}`}>
          {formatSignedCurrency(priceChange, currency)}
        </strong>
        <span className={`text-xs ${priceChangePercent >= 0 ? 'text-profit' : 'text-loss'}`}>{formatSignedValue(priceChangePercent, '', '%')}</span>
      </li>
      <li>
        <span className="label">Total P/L</span>
        <strong className={`text-xl sm:text-2xl ${totalProfitLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
          {formatSignedCurrency(totalProfitLoss, currency)}
        </strong>
        <div className="text-xs text-subtle">
          <span className={`text-xs ${totalProfitLossPercent === null ? 'text-subtle' : totalProfitLossPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
            {totalProfitLossPercent === null ? '—' : `${formatSignedValue(totalProfitLossPercent, '', '%')}`}
          </span>{' '}
          all time
        </div>
      </li>
      <li>
        <span className="label">Best 24h</span>
        {bestAsset ? (
          <>
            <strong className="flex gap-2 text-xl sm:text-2xl">
              <CoinImage image={bestAsset.image} asset={bestAsset.asset} />
              {bestAsset.asset}{' '}
              <span className={`${bestAsset.change24hPercent >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatSignedValue(bestAsset.change24hPercent, '', '%')}
              </span>
            </strong>
            <span className="text-xs text-subtle">Top performer today</span>
          </>
        ) : (
          <>
            <strong className="text-xl sm:text-2xl">—</strong>
            <span className="text-xs text-subtle">No data</span>
          </>
        )}
      </li>
    </ul>
  )
}
