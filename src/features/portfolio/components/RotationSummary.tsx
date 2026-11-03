import { Skeleton } from '@/shared/components/Skeleton'
import type { Currency } from '@/features/portfolio/portfolio.types'
import { formatCurrency, formatSignedCurrency } from '@/shared/utils/format-currency'

type RotationSummaryProps = {
  openCount: number
  closedCount: number
  openInvestedUsd: number
  openValueUsd: number | null
  floatingPnlUsd: number | null
  missingOpenPriceCount: number
  realizedPnlUsd: number
  currency: Currency
  currencyRate: number
  loading: boolean
  pricesLoading: boolean
}

export function RotationSummary({
  openCount,
  closedCount,
  openInvestedUsd,
  openValueUsd,
  floatingPnlUsd,
  missingOpenPriceCount,
  realizedPnlUsd,
  currency,
  currencyRate,
  loading,
  pricesLoading,
}: RotationSummaryProps) {
  return (
    <section
      aria-label="Rotation overview"
      aria-busy={loading}
      className="ui-surface mt-4 grid grid-cols-1 gap-x-5 gap-y-4 overflow-hidden px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
      <article>
        <p className="label">Open deals</p>
        {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-text">{openCount}</p>}
        <p className="text-xs text-subtle">Buys without a recorded sale</p>
      </article>
      <article>
        <p className="label">Open invested</p>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className="text-2xl font-bold text-text">{formatCurrency(openInvestedUsd * currencyRate, currency)}</p>
        )}
        <p className="text-xs text-subtle">Recorded stake across open deals</p>
      </article>
      <article>
        <p className="label">Current value</p>
        {loading || (pricesLoading && missingOpenPriceCount > 0) ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className="text-2xl font-bold text-text">
            {openValueUsd === null ? '—' : formatCurrency(openValueUsd * currencyRate, currency)}
          </p>
        )}
        <p className="text-xs text-subtle">
          {pricesLoading && missingOpenPriceCount > 0
            ? 'Loading current price estimates…'
            : missingOpenPriceCount
              ? `Price unavailable for ${missingOpenPriceCount} open ${missingOpenPriceCount === 1 ? 'deal' : 'deals'}`
              : 'Based on current price estimates'}
        </p>
      </article>
      <article>
        <p className="label">Closed deals</p>
        {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-text">{closedCount}</p>}
        <p className="text-xs text-subtle">Buys with a recorded sale</p>
      </article>
      <article>
        <p className="label">Floating P/L</p>
        {loading || (pricesLoading && missingOpenPriceCount > 0) ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className={`text-2xl font-bold ${floatingPnlUsd === null ? 'text-muted' : floatingPnlUsd >= 0 ? 'text-profit' : 'text-loss'}`}>
            {floatingPnlUsd === null ? '—' : formatSignedCurrency(floatingPnlUsd * currencyRate, currency)}
          </p>
        )}
        <p className="text-xs text-subtle">Open deals after recorded buy fees</p>
      </article>
      <article>
        <p className="label">Realized P/L</p>
        {loading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className={`text-2xl font-bold ${realizedPnlUsd >= 0 ? 'text-profit' : 'text-loss'}`}>
            {formatSignedCurrency(realizedPnlUsd * currencyRate, currency)}
          </p>
        )}
        <p className="text-xs text-subtle">Closed deals after recorded fees</p>
      </article>
    </section>
  )
}
