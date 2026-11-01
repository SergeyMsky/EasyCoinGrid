import { formatSignedCurrency } from '@/shared/utils/format-currency'
import type { Currency } from '@/features/portfolio/portfolio.types'

type RotationSummaryProps = {
  openCount: number
  closedCount: number
  realizedPnl: number
  currency: Currency
  currencyRate: number
  loading: boolean
}

export function RotationSummary({ openCount, closedCount, realizedPnl, currency, currencyRate, loading }: RotationSummaryProps) {
  return (
    <section
      aria-label="Rotation overview"
      aria-busy={loading}
      className="ui-surface mt-4 grid grid-cols-1 gap-4 overflow-hidden px-4 py-4 *:flex *:basis-1/3 *:flex-col *:gap-1 *:border-r *:border-outline *:last:border-0 sm:grid-cols-3 lg:grid-cols-3">
      <article>
        <p className="label">Open rotations</p>
        {loading ? (
          <div aria-hidden="true" className="h-8 w-12 animate-pulse rounded bg-surface-raised" />
        ) : (
          <p className="text-2xl font-bold text-text">{openCount}</p>
        )}
        <p className="text-xs text-subtle">Buy lots still being tracked</p>
      </article>
      <article>
        <p className="label">Closed rotations</p>
        {loading ? (
          <div aria-hidden="true" className="h-8 w-12 animate-pulse rounded bg-surface-raised" />
        ) : (
          <p className="text-2xl font-bold text-text">{closedCount}</p>
        )}
        <p className="text-xs text-subtle">Completed sell cycles</p>
      </article>
      <article>
        <p className="label">Realized PnL</p>
        {loading ? (
          <div aria-hidden="true" className="h-8 w-32 animate-pulse rounded bg-surface-raised" />
        ) : (
          <p className={`text-2xl font-bold ${realizedPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
            {formatSignedCurrency(realizedPnl * currencyRate, currency)}
          </p>
        )}
        <p className="text-xs text-subtle">Closed rotations after recorded fees</p>
      </article>
    </section>
  )
}
