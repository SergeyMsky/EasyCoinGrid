import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import type { AssetDisplay, Currency, SpotPortfolioSnapshot } from '@/features/portfolio/portfolio.types'
import { getPortfolioHistoryChange, getPortfolioHistoryPoints, type PortfolioHistoryPeriod } from '@/features/portfolio/utils/portfolio-history'
import { formatCurrency, formatSignedCurrency } from '@/shared/utils/format-currency'
import { WarningMessage } from '@/shared/components/WarningMessage'

type SpotPortfolioPerformanceProps = {
  snapshots: SpotPortfolioSnapshot[]
  loading: boolean
  error: string | null
  enabled: boolean
  assets: AssetDisplay[]
  currency: Currency
}

const periods: PortfolioHistoryPeriod[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL']
const allocationColors = ['#13b8a6', '#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316']
const axisDateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const tooltipDateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const compactCurrencyFormatter = new Intl.NumberFormat('uk-UA', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  notation: 'compact',
  maximumFractionDigits: 1,
})

type AllocationSegment = {
  symbol: string
  value: number
  percentage: number
  color: string
}

function PortfolioHistoryTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length || typeof label !== 'number' || typeof payload[0].value !== 'number') return null

  return (
    <div role="tooltip" className="rounded-lg border border-white/10 bg-[#151a17] px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400">{tooltipDateFormatter.format(label)}</p>
      <p className="mt-1 text-sm font-semibold text-[#B6F542]">{formatCurrency(payload[0].value, 'USD')}</p>
    </div>
  )
}

function AllocationTooltip({ active, payload }: TooltipContentProps) {
  const segment = payload?.[0]?.payload as AllocationSegment | undefined
  if (!active || !segment) return null

  return (
    <div role="tooltip" className="rounded-lg border border-white/10 bg-[#151a17] px-3 py-2 shadow-xl">
      <p className="text-sm font-semibold text-white">{segment.symbol}</p>
      <p className="mt-1 text-xs text-gray-400">{formatCurrency(segment.value, 'USD')} · {segment.percentage.toFixed(2)}%</p>
    </div>
  )
}

export function SpotPortfolioPerformance({ snapshots, loading, error, enabled, assets, currency }: SpotPortfolioPerformanceProps) {
  const [period, setPeriod] = useState<PortfolioHistoryPeriod>('1M')
  const [activeAllocationIndex, setActiveAllocationIndex] = useState(0)
  const points = useMemo(() => getPortfolioHistoryPoints(snapshots, period), [snapshots, period])
  const change = getPortfolioHistoryChange(points)
  const start = points[0]
  const end = points[points.length - 1]
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
    <section className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#0c100e] p-5 sm:p-7">
      {error && <WarningMessage message={error} />}
      <div className="grid gap-8 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.8fr)] lg:gap-10">
        <div className="min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="label">Portfolio allocation</p>
            <p className="mt-1 text-sm text-gray-400">Spot asset distribution</p>
          </div>
          {allocation.total > 0 && (
            <p className="text-sm font-medium text-gray-300">{formatCurrency(allocation.total, currency)}</p>
          )}
        </div>

        {allocation.segments.length ? (
          <>
            <div className="relative mx-auto mt-3 h-56 max-w-xs">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 224 }}>
                <PieChart>
                  <Pie
                    data={allocation.segments}
                    dataKey="value"
                    nameKey="symbol"
                    innerRadius="68%"
                    outerRadius="92%"
                    paddingAngle={1}
                    stroke="#0c100e"
                    strokeWidth={2}
                    onMouseEnter={(_, index) => setActiveAllocationIndex(index)}
                  >
                    {allocation.segments.map((segment) => (
                      <Cell key={segment.symbol} fill={segment.color} />
                    ))}
                  </Pie>
                  <Tooltip content={AllocationTooltip} isAnimationActive={false} />
                </PieChart>
              </ResponsiveContainer>
              {selectedAllocation && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="max-w-[9rem] truncate text-sm font-medium text-gray-300">{selectedAllocation.symbol}</span>
                  <span className="mt-1 text-lg font-semibold text-white">{formatCurrency(selectedAllocation.value, currency)}</span>
                  <span className="mt-0.5 text-sm text-gray-400">{selectedAllocation.percentage.toFixed(2)}%</span>
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
                    aria-label={`${segment.symbol}, ${segment.percentage.toFixed(2)} percent`}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                    <span className="min-w-0 flex-1 truncate text-gray-400">{segment.symbol}</span>
                    <span className="shrink-0 font-semibold text-gray-200">{segment.percentage.toFixed(2)}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mt-5 flex h-64 items-center justify-center rounded-lg border border-dashed border-white/10 px-6 text-center text-sm text-gray-500">
            No Spot assets to display.
          </div>
        )}
        </div>

        <div className="min-w-0 border-t border-white/10 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">Spot portfolio value</p>
            {end ? (
              <>
                <p className="mt-1 text-2xl font-semibold text-white sm:text-3xl">{formatCurrency(end.valueUsd, 'USD')}</p>
                {change && (
                  <p className={`mt-1 text-sm font-medium ${change.changeUsd >= 0 ? 'text-[#00A857]' : 'text-[#FF4D4D]'}`}>
                    {formatSignedCurrency(change.changeUsd, 'USD')}
                    {change.changePercent !== null && ` (${change.changePercent >= 0 ? '+' : ''}${change.changePercent.toFixed(2)}%)`}
                    <span className="ml-1 text-xs text-gray-500">value change for selected period</span>
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-xl font-semibold text-gray-400">{loading ? 'Loading history…' : 'Not enough history yet'}</p>
            )}
          </div>
          <div className="flex rounded-lg border border-white/10 p-1" role="group" aria-label="Portfolio history period">
            {periods.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={period === option}
                onClick={() => setPeriod(option)}
                className={`cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium transition sm:px-2.5 ${
                  period === option ? 'bg-lime-300 text-black' : 'text-gray-400 hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {points.length > 1 ? (
          <div className="mt-5">
            <div
              role="img"
              aria-label={`Spot portfolio value history, ${points.length} data points`}
              className="h-56 w-full sm:h-64"
            >
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 800, height: 256 }}>
                <AreaChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="portfolio-area-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#B6F542" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#B6F542" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 5" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value: number) => axisDateFormatter.format(value)}
                    tick={{ fill: '#737b75', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={32}
                  />
                  <YAxis
                    dataKey="valueUsd"
                    domain={['auto', 'auto']}
                    tickFormatter={(value: number) => compactCurrencyFormatter.format(value)}
                    tick={{ fill: '#737b75', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                  />
                  <Tooltip
                    content={PortfolioHistoryTooltip}
                    cursor={{ stroke: 'rgba(182,245,66,0.35)', strokeDasharray: '4 4' }}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="valueUsd"
                    name="Spot portfolio value"
                    stroke="#B6F542"
                    strokeWidth={2.5}
                    fill="url(#portfolio-area-gradient)"
                    activeDot={{ r: 5, fill: '#B6F542', stroke: '#0c100e', strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              {points.length} snapshots · {start && end ? `${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(start.timestamp)} – ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(end.timestamp)}` : ''}
            </p>
          </div>
        ) : (
          <div className="mt-5 flex h-56 items-center justify-center rounded-lg border border-dashed border-white/10 px-6 text-center text-sm text-gray-500 sm:h-64">
            {!enabled
              ? 'Connect a real Binance account to load Spot portfolio history.'
              : loading
                ? 'Loading available Binance account snapshots…'
                : 'The chart appears after at least two historical snapshots are available.'}
          </div>
        )}
        </div>
      </div>

      <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-relaxed text-amber-200/70">
        Historical values use Binance Spot account snapshots where available. Older history may be unavailable; app snapshots are collected only while the app is open. Value change is not cash-flow-adjusted profit and may include deposits, withdrawals, or transfers.
      </p>
    </section>
  )
}
