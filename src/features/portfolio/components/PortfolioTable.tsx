import { formatNumber, formatPrice } from '@/shared/utils/format-number'
import { formatSignedValue } from '@/shared/utils/format-signed-value'
import { type AssetDisplay, type Currency, type FilterOption, type SortDirection, type SortOption } from '@/features/portfolio/portfolio.types'
import { formatCurrency, formatSignedCurrency, formatUnitPrice } from '@/shared/utils/format-currency'
import { PortfolioSearch } from './PortfolioSearch'
import { exportAssetsToCsv } from '@/shared/utils/export-csv'
import { Download, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/shared/components/Button'

type PortfolioTableProps = {
  assets: AssetDisplay[]
  sortBy: SortOption
  handleSort: (value: SortOption) => void
  sortDirection: SortDirection
  search: string
  onSearchChange: (value: string) => void
  onFilterChange: (value: FilterOption) => void
  view: FilterOption
  refreshPortfolio: () => void
  loading: boolean
  lastUpdated: Date | null
  currency: Currency
}
const filterButtons: Array<{ label: string; value: FilterOption }> = [
  { label: 'All', value: 'all' },
  { label: 'Gainers', value: 'gainers' },
  { label: 'Losers', value: 'losers' },
]
const columnButtons: Array<{
  label: string
  value: SortOption
  className?: string
}> = [
  { label: 'Name', value: 'Name', className: 'justify-start' },
  { label: 'Amount', value: 'Amount' },
  { label: '24h Change', value: 'Change' },
  { label: 'Total', value: 'Total' },
  { label: 'Price', value: 'Price' },
  { label: 'Avg Buy', value: 'Avg' },
  { label: 'P/L', value: 'Pl' },
]

function PortfolioSkeleton() {
  return (
    <tbody aria-label="Loading portfolio">
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index} className="border-b border-outline last:border-0">
          <td className="h-16.25 px-3 py-2">
            <div className="flex items-center gap-3">
              <div className="h-7.5 w-7.5 animate-pulse rounded-full bg-surface-raised" />
              <div className="flex flex-col gap-1">
                <div className="h-6 w-25 animate-pulse rounded bg-surface-raised" />
                <div className="h-4 w-12 animate-pulse rounded bg-surface-raised" />
              </div>
            </div>
          </td>
          {Array.from({ length: 5 }).map((_, cellIndex) => (
            <td key={cellIndex} className="h-16.25 px-3 py-2">
              <div className="ml-auto h-6 w-20 animate-pulse rounded bg-surface-raised" />
            </td>
          ))}
          <td className="h-16.25 px-3 py-2">
            <div className="flex flex-col items-end gap-1">
              <div className="h-6 w-20 animate-pulse rounded bg-surface-raised" />
              <div className="h-4 w-10 animate-pulse rounded bg-surface-raised" />
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  )
}

export function PortfolioTable({
  assets,
  sortBy,
  handleSort,
  sortDirection,
  search,
  onSearchChange,
  onFilterChange,
  view,
  refreshPortfolio,
  loading,
  lastUpdated,
  currency,
}: PortfolioTableProps) {
  return (
    <div className="rounded-xl bg-surface">
      <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-t-xl border border-outline px-4 py-2 sm:flex-row sm:items-center">
        <div className="ui-surface order-1 flex gap-1 bg-app p-1 sm:order-0">
          {filterButtons.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium inset-shadow-[0_0_2px_0_rgb(0_0_0/100%)] transition ${view === value ? 'bg-accent text-on-accent' : 'text-text hover:bg-surface-raised hover:text-text'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:justify-end">
          <PortfolioSearch value={search} onChange={onSearchChange} />
          <div className="flex items-center gap-2">
            <Button type="button" variant="dashboard" aria-label="Export" onClick={() => exportAssetsToCsv(assets)} className="gap-1">
              <Download className="h-5 w-5" />
              <span className="text-xs font-medium">Export</span>
            </Button>
            <Button type="button" variant="dashboard" aria-label="Refresh portfolio" onClick={refreshPortfolio} disabled={loading} className="gap-1">
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin text-text' : ''}`} />
              <span className="text-xs font-medium">{loading ? 'Refreshing…' : 'Refresh'}</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto border-x border-outline">
        <table className="w-full min-w-225 table-fixed" aria-label={loading ? 'Loading portfolio' : 'Portfolio assets'}>
          <colgroup>
            <col className="w-[19.3%]" />
            {Array.from({ length: 6 }).map((_, index) => (
              <col key={index} className="w-[13.45%]" />
            ))}
          </colgroup>
          <thead className="border-b border-outline bg-surface-raised">
            <tr>
              {columnButtons.map(({ label, value, className }) => (
                <th key={value} scope="col" className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleSort(value)}
                    className={`label flex w-full cursor-pointer items-center justify-end gap-1 text-left normal-case transition hover:text-accent! ${className ?? ''}`}>
                    {label}
                    <span className="flex flex-col gap-1 text-xs">
                      <svg
                        className={`w-1.5 ${sortBy === value && sortDirection === 'asc' ? 'text-accent' : 'text-muted'}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="6 8 12 6"
                        fill="currentColor">
                        <path d="M12 8L18 14H6L12 8Z"></path>
                      </svg>
                      <svg
                        className={`w-1.5 ${sortBy === value && sortDirection === 'desc' ? 'text-accent' : 'text-muted'}`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="6 10 12 6"
                        fill="currentColor">
                        <path d="M12 16L6 10H18L12 16Z"></path>
                      </svg>
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          {loading ? (
            <PortfolioSkeleton />
          ) : assets.length === 0 ? (
            <tbody>
              <tr>
                <td className="px-5 py-6 text-center text-xl" colSpan={7}>
                  Nothing found
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y divide-outline">
              {assets.map((asset) => {
                return (
                  <tr key={asset.asset} className="transition-colors hover:bg-surface-raised">
                    <td className="h-16.25 px-3 py-2 text-left">
                      <div className="flex items-center gap-3">
                        {asset.image && <img src={asset.image} alt={asset.asset} className="h-7.5 w-7.5" />}
                        <div className="flex flex-col">
                          <span className="font-medium">{asset.name ?? asset.asset}</span>
                          <span className="text-xs text-muted">{asset.asset}</span>
                        </div>
                      </div>
                    </td>
                    <td className="h-16.25 px-3 py-2 text-right">{formatPrice(asset.amount)}</td>
                    <td className="h-16.25 px-3 py-2 text-right">
                      <div className="flex justify-end">
                        <span
                          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${asset.change24hPercent >= 0 ? 'bg-profit-subtle text-profit' : 'bg-loss-subtle text-loss'}`}>
                          {asset.change24hPercent >= 0 ? (
                            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {`${formatNumber(Math.abs(asset.change24hPercent))}%`}
                        </span>
                      </div>
                    </td>
                    <td className="h-16.25 px-3 py-2 text-right">{formatCurrency(asset.convertedTotal, currency)}</td>
                    <td className="h-16.25 px-3 py-2 text-right">{formatUnitPrice(asset.convertedPrice, currency)}</td>
                    <td className="h-16.25 px-3 py-2 text-right">
                      {asset.convertedAvgBuy === null ? '—' : formatUnitPrice(asset.convertedAvgBuy, currency)}
                    </td>
                    <td
                      className={`h-16.25 px-3 py-2 text-right ${asset.convertedPnl === null ? '' : asset.convertedPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {asset.convertedPnl === null ? (
                        '—'
                      ) : (
                        <div className="flex flex-col">
                          <span>{formatSignedCurrency(asset.convertedPnl, currency)}</span>
                          <span className="text-xs">
                            {asset.convertedPnlPercent === null ? '—' : formatSignedValue(asset.convertedPnlPercent, '', '%')}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          )}
        </table>
      </div>
      <div className="w-full rounded-b-xl border border-outline px-3 py-2 text-right text-xs text-muted">
        Last updated: <span className="text-muted">{lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</span>
      </div>
    </div>
  )
}
