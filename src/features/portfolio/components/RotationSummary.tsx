import { Skeleton } from '@/shared/components/Skeleton'
import type { Currency } from '@/features/portfolio/portfolio.types'
import { formatSignedCurrency } from '@/shared/utils/format-currency'

type RotationSummaryProps = {
  openCount: number
  closedCount: number
  realizedPnlUsd: number
  currency: Currency
  currencyRate: number
  loading: boolean
}

export function RotationSummary({ openCount, closedCount, realizedPnlUsd, currency, currencyRate, loading }: RotationSummaryProps) {
  return (
    <section
      aria-label="Rotation overview"
      aria-busy={loading}
      className="ui-surface mt-4 grid grid-cols-1 gap-4 overflow-hidden px-4 py-4 *:flex *:basis-1/3 *:flex-col *:gap-1 *:border-r *:border-outline *:last:border-0 sm:grid-cols-3 lg:grid-cols-3">
      <article>
        <p className="label">Open deals</p>
        {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-text">{openCount}</p>}
        <p className="text-xs text-subtle">Buys without a recorded sale</p>
      </article>
      <article>
        <p className="label">Closed deals</p>
        {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-text">{closedCount}</p>}
        <p className="text-xs text-subtle">Buys with a recorded sale</p>
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
