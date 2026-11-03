import { formatNumber, formatPrice } from '@/shared/utils/format-number'
import { formatSignedValue } from '@/shared/utils/format-signed-value'
import { type AssetDisplay, type Currency, type FilterOption, type SortDirection, type SortOption } from '@/features/portfolio/portfolio.types'
import { formatCurrency, formatSignedCurrency, formatUnitPrice } from '@/shared/utils/format-currency'
import { SearchInput } from '@/shared/components/SearchInput'
import { CoinImage } from './CoinImage'
import { exportAssetsToCsv } from '@/shared/utils/export-csv'
import { Download, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { Skeleton } from '@/shared/components/Skeleton'
import { SortIndicator } from '@/shared/components/SortIndicator'
import { TablePagination } from '@/shared/components/TablePagination'
import { TABLE_PAGE_SIZE, useTablePagination } from '@/shared/hooks/useTablePagination'

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
  refreshing?: boolean
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
              <Skeleton className="h-7.5 w-7.5 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-6 w-25" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          </td>
          {Array.from({ length: 5 }).map((_, cellIndex) => (
            <td key={cellIndex} className="h-16.25 px-3 py-2">
              <Skeleton className="ml-auto h-6 w-20" />
            </td>
          ))}
          <td className="h-16.25 px-3 py-2">
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-10" />
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
  refreshing = false,
  lastUpdated,
  currency,
}: PortfolioTableProps) {
  const { currentPage, pageItems: pageAssets, onPageChange } = useTablePagination(assets, JSON.stringify([sortBy, sortDirection, search, view]))

  return (
    <div className="ui-surface mt-4 overflow-hidden">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-outline px-4 py-2 sm:flex-row sm:items-center">
        <div className="ui-surface order-1 flex gap-1 bg-app p-1 sm:order-0">
          {filterButtons.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium inset-shadow-[0_0_2px_0_rgb(0_0_0/100%)] transition ${view === value ? 'bg-accent text-on-accent' : 'text-text hover:bg-surface-raised hover:text-text'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex w-full items-center justify-between gap-2 sm:justify-end">
          <SearchInput value={search} onChange={onSearchChange} placeholder="Search in Your Assets" ariaLabel="Search assets" />
          <div className="flex items-center gap-2">
            <Button type="button" variant="dashboard" aria-label="Export" onClick={() => exportAssetsToCsv(assets)} className="gap-1">
              <Download className="h-4 w-4" />
              <span className="font-medium">Export</span>
            </Button>
            <Button
              type="button"
              variant="dashboard"
              aria-label="Refresh portfolio"
              onClick={refreshPortfolio}
              disabled={loading || refreshing}
              className="gap-1">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-text' : ''}`} />
              <span className="font-medium">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
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
                    <SortIndicator active={sortBy === value} direction={sortDirection} />
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
                <td className="px-3 py-10 text-center text-sm text-muted" colSpan={7}>
                  Nothing found
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="divide-y divide-outline">
              {pageAssets.map((asset) => {
                return (
                  <tr key={asset.asset}>
                    <td className="h-16.25 px-3 py-2 text-left">
                      <div className="flex items-center gap-3">
                        <CoinImage image={asset.image} asset={asset.asset} />
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
      <TablePagination currentPage={currentPage} pageSize={TABLE_PAGE_SIZE} totalItems={assets.length} onPageChange={onPageChange} />
      <div className="w-full border-t border-outline px-3 py-2 text-right text-xs text-muted">
        Last updated: <span className="text-muted">{lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</span>
      </div>
    </div>
  )
}
