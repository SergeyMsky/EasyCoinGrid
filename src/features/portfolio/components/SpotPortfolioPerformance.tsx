import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts'
import type { AssetDisplay, Currency, SpotPortfolioSnapshot } from '@/features/portfolio/portfolio.types'
import { getPortfolioHistoryChange, getPortfolioHistoryPoints, type PortfolioHistoryPeriod } from '@/features/portfolio/utils/portfolio-history'
import { formatCurrency, formatSignedCurrency } from '@/shared/utils/format-currency'
import { WarningMessage } from '@/shared/components/WarningMessage'
import { CircleAlert } from 'lucide-react'
import { APP_LOCALE } from '@/shared/utils/locale'

type SpotPortfolioPerformanceProps = {
  snapshots: SpotPortfolioSnapshot[]
  loading: boolean
  error: string | null
  enabled: boolean
  assets: AssetDisplay[]
  currency: Currency
  currencyRate: number
}

const periods: PortfolioHistoryPeriod[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL']
const allocationColors = Array.from({ length: 8 }, (_, index) => `var(--color-chart-${index + 1})`)
const axisDateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  month: 'short',
  day: 'numeric',
})
const tooltipDateFormatter = new Intl.DateTimeFormat(APP_LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type AllocationSegment = {
  symbol: string
  value: number
  percentage: number
  color: string
}

function PortfolioHistoryTooltip({ active, payload, label, currency }: TooltipContentProps & { currency: Currency }) {
  if (!active || !payload?.length || typeof label !== 'number' || typeof payload[0].value !== 'number') return null

  return (
    <div role="tooltip" className="rounded-lg border border-outline bg-surface-raised px-3 py-2">
      <p className="text-xs text-muted">{tooltipDateFormatter.format(label)}</p>
      <p className="mt-1 text-sm font-semibold text-accent">{formatCurrency(payload[0].value, currency)}</p>
    </div>
  )
}

function AllocationTooltip({ active, payload, currency }: TooltipContentProps & { currency: Currency }) {
  const segment = payload?.[0]?.payload as AllocationSegment | undefined
  if (!active || !segment) return null

  return (
    <div role="tooltip" className="rounded-lg border border-outline bg-surface-raised px-3 py-2">
      <p className="text-sm font-semibold text-text">{segment.symbol}</p>
      <p className="mt-1 text-xs text-muted">
        {formatCurrency(segment.value, currency)} · {segment.percentage.toFixed(2)}%
      </p>
    </div>
  )
}

export function SpotPortfolioPerformance({ snapshots, loading, error, enabled, assets, currency, currencyRate }: SpotPortfolioPerformanceProps) {
  const [period, setPeriod] = useState<PortfolioHistoryPeriod>('1M')
  const [activeAllocationIndex, setActiveAllocationIndex] = useState(0)
  const points = useMemo(() => getPortfolioHistoryPoints(snapshots, period), [snapshots, period])
  const change = getPortfolioHistoryChange(points)
  const start = points[0]
  const end = points[points.length - 1]
  const displayPoints = useMemo(() => points.map((point) => ({ ...point, value: point.valueUsd * currencyRate })), [points, currencyRate])
  const compactCurrencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(APP_LOCALE, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        notation: 'compact',
        maximumFractionDigits: 1,
      }),
    [currency],
  )
  const allocation = useMemo(() => {
    const valuedAssets = assets
      .filter((asset) => Number.isFinite(asset.convertedTotal) && asset.convertedTotal > 0)
      .sort((a, b) => b.convertedTotal - a.convertedTotal)
    const total = valuedAssets.reduce((sum, asset) => sum + asset.convertedTotal, 0)
    const visibleAssets = valuedAssets.slice(0, 7).map((asset, index) => ({
      symbol: asset.asset,
      value: asset.convertedTotal,
      percentage: (asset.convertedTotal / total) * 100,
      color: allocationColors[index % allocationColors.length],
    }))
    const otherValue = valuedAssets.slice(7).reduce((sum, asset) => sum + asset.convertedTotal, 0)

    if (otherValue > 0) {
      visibleAssets.push({
        symbol: 'Other',
        value: otherValue,
        percentage: (otherValue / total) * 100,
        color: allocationColors[7],
      })
    }

    return { total, segments: visibleAssets }
  }, [assets])
  const selectedAllocation = allocation.segments[activeAllocationIndex] ?? allocation.segments[0]

  return (
    <section className="ui-surface mt-4 overflow-hidden p-4">
      {error && <WarningMessage message={error} className="mt-0 mb-4" />}
      <div className="grid lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,350px)]">
        <div className="mb-6 min-w-0 border-b border-outline pb-6 lg:mr-8 lg:mb-0 lg:border-r lg:border-b-0 lg:pt-0 lg:pr-8 lg:pb-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label">Spot portfolio value</p>
              {end ? (
                <>
                  <p className="mt-1 text-2xl font-bold text-text sm:text-3xl">{formatCurrency(end.valueUsd * currencyRate, currency)}</p>
                  {change && (
                    <p className={`mt-1 text-sm font-medium ${change.changeUsd >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatSignedCurrency(change.changeUsd * currencyRate, currency)}
                      {change.changePercent !== null && ` (${change.changePercent >= 0 ? '+' : ''}${change.changePercent.toFixed(2)}%)`}
                      <span className="ml-1 text-xs text-muted">value change for selected period</span>
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-xl font-semibold text-muted">{loading ? 'Loading history…' : 'Not enough history yet'}</p>
              )}
            </div>
            <div className="ui-surface flex gap-1 bg-app p-1" role="group" aria-label="Portfolio history period">
              {periods.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={period === option}
                  onClick={() => setPeriod(option)}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium inset-shadow-[0_0_2px_0_rgb(0_0_0/100%)] transition ${period === option ? 'bg-accent text-on-accent' : 'text-text hover:bg-surface-raised hover:text-text'}`}>
                  {option}
                </button>
              ))}
            </div>
          </div>

          {points.length > 1 ? (
            <div className="mt-5">
              <div role="img" aria-label={`Spot portfolio value history, ${points.length} data points`} className="h-56 w-full sm:h-64">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 800, height: 256 }}>
                  <AreaChart data={displayPoints} margin={{ top: 12, right: 12, bottom: 0, left: 8 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-outline)" strokeDasharray="3 5" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value: number) => axisDateFormatter.format(value)}
                      tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={32}
                    />
                    <YAxis
                      dataKey="value"
                      domain={['auto', 'auto']}
                      tickFormatter={(value: number) => compactCurrencyFormatter.format(value)}
                      tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={64}
                    />
                    <Tooltip
                      content={(props) => <PortfolioHistoryTooltip {...props} currency={currency} />}
                      cursor={{
                        stroke: 'var(--color-outline)',
                        strokeDasharray: '4 4',
                      }}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Spot portfolio value"
                      stroke="var(--color-accent)"
                      strokeWidth={2.5}
                      fill="var(--color-accent-subtle)"
                      activeDot={{
                        r: 5,
                        fill: 'var(--color-accent)',
                        stroke: 'var(--color-surface)',
                        strokeWidth: 2,
                      }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-xs text-muted">
                {points.length} snapshots ·{' '}
                {start && end
                  ? `${new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: 'medium' }).format(start.timestamp)} – ${new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: 'medium' }).format(end.timestamp)}`
                  : ''}
              </p>
            </div>
          ) : (
            <div className="mt-5 flex h-64 items-center justify-center rounded-lg border border-dashed border-outline px-6 text-center text-sm text-muted sm:h-64">
              {!enabled
                ? 'Connect a real Binance account to load Spot portfolio history.'
                : loading
                  ? 'Loading available Binance account snapshots…'
                  : 'The chart appears after at least two historical snapshots are available.'}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between">
            <p className="label">Portfolio allocation</p>
            {allocation.total > 0 && <p className="text-sm font-medium text-text">{formatCurrency(allocation.total, currency)}</p>}
          </div>

          {allocation.segments.length ? (
            <>
              <div className="relative mx-auto h-56 max-w-xs">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 224 }}>
                  <PieChart>
                    <Pie
                      data={allocation.segments}
                      dataKey="value"
                      nameKey="symbol"
                      innerRadius="68%"
                      outerRadius="92%"
                      stroke="var(--color-surface)"
                      strokeWidth={2}
                      onMouseEnter={(_, index) => setActiveAllocationIndex(index)}>
                      {allocation.segments.map((segment) => (
                        <Cell key={segment.symbol} fill={segment.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={(props) => <AllocationTooltip {...props} currency={currency} />}
                      isAnimationActive={false}
                      wrapperStyle={{ zIndex: 100 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {selectedAllocation && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="max-w-36 truncate text-sm font-medium text-text">{selectedAllocation.symbol}</span>
                    <span className="mt-1 text-lg font-medium text-text">{formatCurrency(selectedAllocation.value, currency)}</span>
                    <span className="mt-0.5 text-sm text-muted">{selectedAllocation.percentage.toFixed(2)}%</span>
                  </div>
                )}
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
                {allocation.segments.map((segment, index) => (
                  <li key={segment.symbol}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveAllocationIndex(index)}
                      onFocus={() => setActiveAllocationIndex(index)}
                      className="flex w-full min-w-0 items-center gap-2 text-left text-xs"
                      aria-label={`${segment.symbol}, ${segment.percentage.toFixed(2)} percent`}>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                      <span className="min-w-0 flex-1 truncate text-muted">{segment.symbol}</span>
                      <span className="shrink-0 text-text">{segment.percentage.toFixed(2)}%</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-5 flex h-64 items-center justify-center rounded-lg border border-dashed border-outline px-6 text-center text-sm text-muted">
              No Spot assets to display.
            </div>
          )}
        </div>
      </div>

      <p className="mt-5 flex items-center gap-2 border-t border-outline pt-4 text-xs leading-relaxed text-warning">
        <CircleAlert className="h-4 w-4 shrink-0" />
        Historical values use Binance Spot account snapshots where available. Older history may be unavailable; app snapshots are collected only while
        the app is open. Values are converted to {currency} using the current exchange rate. Value change is not cash-flow-adjusted profit and may
        include deposits, withdrawals, or transfers.
      </p>
    </section>
  )
}
