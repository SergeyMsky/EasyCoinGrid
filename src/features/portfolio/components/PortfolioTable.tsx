import { formatNumber, formatPrice } from '@/shared/utils/format-number'
import { formatSignedValue } from '@/shared/utils/format-signed-value'
import { type AssetDisplay, type Currency, type FilterOption, type SortDirection, type SortOption } from '@/features/portfolio/portfolio.types'
import { formatCurrency, formatSignedCurrency } from '@/shared/utils/format-currency'
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
const columnButtons: Array<{ label: string; value: SortOption; className?: string }> = [
  { label: 'Name', value: 'Name', className: 'justify-start' },
  { label: 'Amount', value: 'Amount' },
  { label: '24h Change', value: 'Change' },
  { label: 'Total', value: 'Total' },
  { label: 'Price', value: 'Price' },
  { label: 'Avg Buy', value: 'Avg' },
  { label: 'P/L', value: 'Pl' },
]

const tableGrid = 'min-w-225 grid grid-cols-[minmax(160px,1fr)_repeat(6,minmax(100px,0.5fr))] lg:grid-cols-[minmax(150px,1.5fr)_repeat(6,1fr)] items-center gap-4 lg:gap-6'

function PortfolioSkeleton() {
  return (
    <ul aria-label="Loading portfolio" className="border-l border-r border-white/10">
      {Array.from({ length: 5 }).map((_, index) => (
        <li key={index} className={`${tableGrid} px-3 py-2 min-h-16.25 border-b border-white/3.5 last:border-0`}>
          <div className="flex items-center gap-3">
            <div className="h-7.5 w-7.5 rounded-full bg-white/5 animate-pulse" />
            <div className="flex flex-col gap-1">
              <div className="h-6 w-25 rounded bg-white/5 animate-pulse" />
              <div className="h-4 w-12 rounded bg-white/5 animate-pulse" />
            </div>
          </div>
          <div className="h-6 w-20 ml-auto rounded bg-white/5 animate-pulse" />
          <div className="h-6 w-20 ml-auto rounded bg-white/5 animate-pulse" />
          <div className="h-6 w-20 ml-auto rounded bg-white/5 animate-pulse" />
          <div className="h-6 w-20 ml-auto rounded bg-white/5 animate-pulse" />
          <div className="h-6 w-20 ml-auto rounded bg-white/5 animate-pulse" />
          <div className="flex items-end flex-col gap-1">
            <div className="h-6 w-20 rounded bg-white/5 animate-pulse" />
            <div className="h-4 w-10 rounded bg-white/5 animate-pulse" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function PortfolioTable({ assets, sortBy, handleSort, sortDirection, search, onSearchChange, onFilterChange, view, refreshPortfolio, loading, lastUpdated, currency }: PortfolioTableProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 px-4 py-2 border border-white/10 backdrop-blur-md bg-white/5 rounded-t-md justify-between">
        <div className="flex gap-1 ui-surface p-1 bg-black/10! order-1 sm:order-0">
          {filterButtons.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition ${view === value ? 'bg-emerald-400 text-black' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center w-full sm:justify-end justify-between">
          <PortfolioSearch value={search} onChange={onSearchChange} />
          <div className="flex gap-2 items-center">
            <Button type="button" variant="dashboard" aria-label="Export portfolio as CSV" onClick={() => exportAssetsToCsv(assets)}>
              <Download className="w-5 h-5" />
            </Button>
            <Button type="button" variant="dashboard" aria-label="Refresh portfolio" onClick={refreshPortfolio} disabled={loading}>
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin text-white' : ''}`} />
            </Button>
          </div>
        </div>
      </div>
      <div className="backdrop-blur-md bg-white/5 overflow-x-auto">
        <div className="min-w-max">
          <div className={`${tableGrid} px-3 py-2 text-lg font-medium border border-white/10 bg-black/20 border-t-0`}>
            {columnButtons.map(({ label, value, className }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleSort(value)}
                className={`text-left cursor-pointer flex justify-end gap-1 items-center label transition hover:text-emerald-400! ${className ?? ''}`}
              >
                {label}
                <span className="text-xs flex flex-col gap-1">
                  <svg
                    className={`w-1.5 ${sortBy === value && sortDirection === 'asc' ? 'text-emerald-400' : 'text-gray-500'}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="6 8 12 6"
                    fill="currentColor"
                  >
                    <path d="M12 8L18 14H6L12 8Z"></path>
                  </svg>
                  <svg
                    className={`w-1.5 ${sortBy === value && sortDirection === 'desc' ? 'text-emerald-400' : 'text-gray-500'}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="6 10 12 6"
                    fill="currentColor"
                  >
                    <path d="M12 16L6 10H18L12 16Z"></path>
                  </svg>
                </span>
              </button>
            ))}
          </div>
          {loading ? (
            <PortfolioSkeleton />
          ) : assets.length === 0 ? (
            <div className="px-5 py-6 text-center text-xl">Nothing found</div>
          ) : (
            <ul className="border-l border-r border-white/10" aria-label="Portfolio assets">
              {assets.map((asset) => {
                return (
                  <li key={asset.asset} className={`${tableGrid} px-3 py-2 text-right min-h-16.25 border-b border-white/3.5 last:border-0 hover:bg-black/20`}>
                    <div className="flex items-center gap-3 text-left">
                      {asset.image && <img src={asset.image} alt={asset.asset} className="w-7.5 h-7.5" />}
                      <div className="flex flex-col">
                        <span className="font-medium">{asset.name ?? asset.asset}</span>
                        <span className="text-xs text-gray-500">{asset.asset}</span>
                      </div>
                    </div>
                    <span>{formatPrice(asset.amount)}</span>
                    <div className="flex justify-end">
                      <span className={`flex gap-1 items-center px-2 py-1 rounded-md text-xs ${asset.change24hPercent >= 0 ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                        {asset.change24hPercent >= 0 ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
                        {`${formatNumber(Math.abs(asset.change24hPercent))}%`}
                      </span>
                    </div>
                    <span>{formatCurrency(asset.convertedTotal, currency)}</span>
                    <span>{formatCurrency(asset.convertedPrice, currency)}</span>
                    <span>{asset.convertedAvgBuy === null ? '—' : formatCurrency(asset.convertedAvgBuy, currency)}</span>
                    <span className={`flex flex-col ${asset.convertedPnl === null ? '' : asset.convertedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {asset.convertedPnl === null ? (
                        '—'
                      ) : (
                        <>
                          <span>{formatSignedCurrency(asset.convertedPnl, currency)}</span>
                          <span className="text-xs">{asset.convertedPnlPercent === null ? '—' : formatSignedValue(asset.convertedPnlPercent, '', '%')}</span>
                        </>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
      <div className="px-3 py-2 w-full rounded-b-md bg-black/20 backdrop-blur-md border border-white/10 text-gray-500 text-xs text-right">
        Last updated: <span className="text-gray-400">{lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</span>
      </div>
    </>
  )
}
