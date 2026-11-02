import { useEffect, useRef } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from 'lucide-react'
import type { AssetHistoryTypeFilter, AssetTransaction } from '@/features/asset-history/asset-history.types'
import { AssetHistoryDateRangePicker } from '@/features/asset-history/components/AssetHistoryDateRangePicker'
import { CoinImage } from '@/features/portfolio/components/CoinImage'
import { SearchInput } from '@/shared/components/SearchInput'
import { Select } from '@/shared/components/Select'
import { Skeleton } from '@/shared/components/Skeleton'
import { APP_LOCALE } from '@/shared/utils/locale'

const dateHeadingFormatter = new Intl.DateTimeFormat(APP_LOCALE, { day: '2-digit', month: 'short', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat(APP_LOCALE, { hour: '2-digit', minute: '2-digit' })
const numberFormatter = new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 18 })
const transactionTypeOptions: Array<{ label: string; value: AssetHistoryTypeFilter }> = [
  { label: 'All types', value: 'all' },
  { label: 'Spot trade', value: 'spot' },
  { label: 'Deposit', value: 'deposit' },
  { label: 'Withdrawal', value: 'withdrawal' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Simple Earn', value: 'earn' },
  { label: 'Convert', value: 'convert' },
]

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function groupTransactionsByDate(transactions: AssetTransaction[]) {
  const groups = new Map<string, { date: Date; transactions: AssetTransaction[] }>()

  for (const transaction of transactions) {
    const date = new Date(transaction.occurred_at)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const group = groups.get(key)

    if (group) {
      group.transactions.push(transaction)
    } else {
      groups.set(key, { date, transactions: [transaction] })
    }
  }

  return [...groups.entries()].map(([key, group]) => ({
    key,
    label: dateHeadingFormatter.format(group.date),
    transactions: group.transactions,
  }))
}

function formatAmount(value: number | string, asset: string) {
  return `${numberFormatter.format(Number(value))} ${asset}`
}

function getTransactionLabel(transaction: AssetTransaction) {
  switch (transaction.event_type) {
    case 'DEPOSIT':
      return 'Deposit'
    case 'WITHDRAWAL':
      return 'Withdrawal'
    case 'TRANSFER':
      return `Transfer${transaction.source_wallet && transaction.target_wallet ? ` · ${transaction.source_wallet} → ${transaction.target_wallet}` : ''}`
    case 'EARN_SUBSCRIPTION':
      return 'Simple Earn · Subscribe'
    case 'EARN_REDEMPTION':
      return 'Simple Earn · Redeem'
    case 'EARN_REWARD':
      return 'Simple Earn · Reward'
    case 'SPOT_TRADE':
      return `Spot trade · ${transaction.direction === 'OUT' ? `${transaction.asset} → ${transaction.related_asset}` : `${transaction.related_asset} → ${transaction.asset}`}`
    case 'SPOT_TRADE_FEE':
      return 'Spot trade · Fee'
    case 'CONVERT':
      return `Convert · ${transaction.direction === 'OUT' ? `${transaction.asset} → ${transaction.related_asset}` : `${transaction.related_asset} → ${transaction.asset}`}`
  }
}

function TransactionIcon({ transaction }: { transaction: AssetTransaction }) {
  if (transaction.direction === 'IN') return <ArrowDownLeft className="h-4 w-4 text-profit" aria-hidden="true" />
  if (transaction.direction === 'OUT') return <ArrowUpRight className="h-4 w-4 text-loss" aria-hidden="true" />
  return <ArrowLeftRight className="h-4 w-4 text-accent" aria-hidden="true" />
}

type AssetHistoryTransactionsTableProps = {
  transactions: AssetTransaction[]
  loading: boolean
  loadingMore: boolean
  syncing: boolean
  hasMore: boolean
  connected: boolean | null
  search: string
  typeFilter: AssetHistoryTypeFilter
  dateRange: { from: string; to: string }
  hasFilters: boolean
  onSearchChange: (value: string) => void
  onTypeFilterChange: (value: AssetHistoryTypeFilter) => void
  onDateRangeChange: (range: { from: string; to: string }) => void
  onLoadMore: () => void | Promise<unknown>
}

export function AssetHistoryTransactionsTable({
  transactions,
  loading,
  loadingMore,
  syncing,
  hasMore,
  connected,
  search,
  typeFilter,
  dateRange,
  hasFilters,
  onSearchChange,
  onTypeFilterChange,
  onDateRangeChange,
  onLoadMore,
}: AssetHistoryTransactionsTableProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || loading || !hasMore || loadingMore || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void onLoadMore()
      },
      { rootMargin: '200px 0px' },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, onLoadMore])

  return (
    <section className="ui-surface relative mt-4" aria-busy={loading || loadingMore || syncing}>
      <div className="flex flex-col gap-3 border-b border-outline px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-end gap-2">
          <h2 className="text-sm font-semibold">Transactions</h2>
          <span className="text-xs text-muted">{transactions.length} shown</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="Search asset"
            ariaLabel="Search transactions by asset"
            className="sm:w-56"
          />
          <Select
            ariaLabel="Filter transactions by type"
            value={typeFilter}
            options={transactionTypeOptions}
            onValueChange={onTypeFilterChange}
            className="sm:w-40"
          />
          <AssetHistoryDateRangePicker
            value={
              dateRange.from
                ? { from: new Date(`${dateRange.from}T00:00:00`), to: dateRange.to ? new Date(`${dateRange.to}T00:00:00`) : undefined }
                : undefined
            }
            onChange={(range) =>
              onDateRangeChange({
                from: range?.from ? formatDateInput(range.from) : '',
                to: range?.to ? formatDateInput(range.to) : '',
              })
            }
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-225 table-fixed text-left" aria-label="Asset history">
          <colgroup>
            <col className="w-[25%]" />
            <col className="w-[25%]" />
            <col className="w-[20%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead className="label border-b border-outline bg-surface-raised normal-case">
            <tr>
              <th scope="col" className="label px-3 py-2 normal-case">
                Type
              </th>
              <th scope="col" className="label px-3 py-2 text-right normal-case">
                Amount
              </th>
              <th scope="col" className="label px-3 py-2 text-right normal-case">
                Fee
              </th>
              <th scope="col" className="label px-3 py-2 text-right normal-case">
                Time
              </th>
              <th scope="col" className="label px-3 py-2 text-right normal-case">
                Status
              </th>
            </tr>
          </thead>
          {loading ? (
            <tbody>
              <tr className="border-t border-outline bg-app">
                <th colSpan={5} scope="rowgroup" className="h-10.25 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <Skeleton className="h-3 w-17" />
                    <Skeleton className="h-3 w-21" />
                  </div>
                </th>
              </tr>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-t border-outline">
                  {Array.from({ length: 5 }).map((__, cell) => (
                    <td key={cell} className="h-11.75 px-3 py-2">
                      <Skeleton className={`${cell !== 0 ? 'ml-auto' : ''} h-4 w-24`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ) : transactions.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted">
                  {hasFilters
                    ? 'No transactions match your search or filter.'
                    : connected
                      ? 'No imported transactions yet. Select “Sync now” to fetch history from Binance.'
                      : 'No transactions to show.'}
                </td>
              </tr>
            </tbody>
          ) : (
            <>
              {groupTransactionsByDate(transactions).map((group) => (
                <tbody key={group.key}>
                  <tr className="border-t border-outline bg-app">
                    <th colSpan={5} scope="rowgroup" className="px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-semibold">{group.label}</span>
                        <span className="text-xs font-normal text-muted">
                          {group.transactions.length} {group.transactions.length === 1 ? 'transaction' : 'transactions'}
                        </span>
                      </div>
                    </th>
                  </tr>
                  {group.transactions.map((transaction) => (
                    <tr key={transaction.id} className="h-11.75 border-t border-outline text-sm">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <TransactionIcon transaction={transaction} />
                          <span className="truncate" title={getTransactionLabel(transaction)}>
                            {getTransactionLabel(transaction)}
                          </span>
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          transaction.direction === 'IN' ? 'text-profit' : transaction.direction === 'OUT' ? 'text-loss' : 'text-text'
                        }`}>
                        <span className="flex items-center justify-end gap-2">
                          {transaction.direction === 'IN' ? '+' : transaction.direction === 'OUT' ? '−' : ''}
                          {formatAmount(transaction.amount, transaction.asset)}
                          <CoinImage image={null} asset={transaction.asset} resolveMissingImage />
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-muted">
                        {Number(transaction.fee_amount) > 0 ? (
                          <span className="flex items-center justify-end gap-2">
                            {formatAmount(transaction.fee_amount, transaction.fee_asset ?? transaction.asset)}
                            <CoinImage image={null} asset={transaction.fee_asset ?? transaction.asset} resolveMissingImage />
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-muted">{timeFormatter.format(new Date(transaction.occurred_at))}</td>
                      <td className="px-3 py-2 text-right">
                        <span className="truncate text-muted" title={transaction.status}>
                          {transaction.status}
                        </span>
                        {transaction.network && <span className="truncate text-xs text-muted"> {transaction.network}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
              {loadingMore && (
                <tbody aria-label="Loading more transactions">
                  <tr className="border-t border-outline bg-app">
                    <th colSpan={5} scope="rowgroup" className="h-10.25 px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <Skeleton className="h-3 w-17" />
                        <Skeleton className="h-3 w-21" />
                      </div>
                    </th>
                  </tr>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-t border-outline">
                      {Array.from({ length: 5 }).map((__, cell) => (
                        <td key={cell} className="h-11.75 px-3 py-2">
                          <Skeleton className={`${cell !== 0 ? 'ml-auto' : ''} h-4 w-24`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              )}
            </>
          )}
        </table>
      </div>
      {!loading && hasMore && <div ref={loadMoreRef} aria-hidden="true" className="h-px" />}
    </section>
  )
}
