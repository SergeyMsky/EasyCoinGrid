import * as Dialog from '@radix-ui/react-dialog'
import * as Popover from '@radix-ui/react-popover'
import { ArrowDownToLine, EllipsisVertical, LockKeyhole, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Currency, SpotRotation } from '@/features/portfolio/portfolio.types'
import { Button } from '@/shared/components/Button'
import { formatCurrency, formatSignedCurrency, formatUnitPrice } from '@/shared/utils/format-currency'
import { formatNumber } from '@/shared/utils/format-number'
import { formatSignedValue } from '@/shared/utils/format-signed-value'
import { APP_LOCALE } from '@/shared/utils/locale'
import type { CurrentCoinPrice } from '@/features/portfolio/api/coingecko.api'
import { StatusDot } from '@/shared/components/StatusDot'
import { CoinImage } from '@/features/portfolio/components/CoinImage'
import { SortIndicator } from '@/shared/components/SortIndicator'
import { SearchInput } from '@/shared/components/SearchInput'
import { TablePagination } from '@/shared/components/TablePagination'
import { TABLE_PAGE_SIZE, useTablePagination } from '@/shared/hooks/useTablePagination'
import { Skeleton } from '@/shared/components/Skeleton'

type SpotDealSortKey = 'name' | 'amount' | 'invested' | 'entry' | 'market' | 'pnl'
type SpotDealSort = { sortBy: SpotDealSortKey; sortDirection: 'asc' | 'desc' }
type SpotDealFilter = 'all' | 'open' | 'closed'
const SPOT_DEALS_SORT_STORAGE_KEY = 'spot-deals-sort'

const filterButtons: Array<{ label: string; value: SpotDealFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
]

const columns: Array<{ label: string; sortKey: SpotDealSortKey | null }> = [
  { label: 'Name', sortKey: 'name' },
  { label: 'Amount', sortKey: 'amount' },
  { label: 'Invested', sortKey: 'invested' },
  { label: 'Entry', sortKey: 'entry' },
  { label: 'Market / Exit', sortKey: 'market' },
  { label: 'P/L & ROI', sortKey: 'pnl' },
  { label: 'Actions', sortKey: null },
]

type SpotDealsTableProps = {
  rotations: SpotRotation[]
  pricesByCoinId: Record<string, CurrentCoinPrice>
  pricesLoading: boolean
  pricesRefreshing: boolean
  pricesError: string | null
  pricesUpdatedAt: number | null
  currency: Currency
  currencyRate: number
  loading: boolean
  deleting: boolean
  onAdd: () => void
  onRefreshPrices: () => Promise<void>
  onEdit: (rotation: SpotRotation) => void
  onRecordSale: (rotation: SpotRotation) => void
  onDelete: (rotation: SpotRotation) => Promise<void>
}

function getStoredSort(): SpotDealSort {
  const defaultSort: SpotDealSort = { sortBy: 'entry', sortDirection: 'desc' }
  const storedSort = localStorage.getItem(SPOT_DEALS_SORT_STORAGE_KEY)
  if (!storedSort) return defaultSort

  let parsed: unknown
  try {
    parsed = JSON.parse(storedSort)
  } catch {
    return defaultSort
  }

  if (!parsed || typeof parsed !== 'object' || !('sortBy' in parsed) || !('sortDirection' in parsed)) return defaultSort
  if (!isSpotDealSortKey(parsed.sortBy) || (parsed.sortDirection !== 'asc' && parsed.sortDirection !== 'desc')) {
    return defaultSort
  }

  return { sortBy: parsed.sortBy, sortDirection: parsed.sortDirection }
}

function isSpotDealSortKey(value: unknown): value is SpotDealSortKey {
  return columns.some((column) => column.sortKey === value)
}

function formatExecutionDate(time: string | null) {
  if (!time) return '—'

  return new Intl.DateTimeFormat(APP_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(time))
}

function DealName({ symbol }: { symbol: string }) {
  const [base, quote] = symbol.split('/')
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <CoinImage asset={base} image={null} resolveMissingImage />
      <div className="min-w-0">
        <p className="truncate font-medium">{base}</p>
        <p className="truncate text-xs text-muted">{quote ? `${base}/${quote}` : symbol}</p>
      </div>
    </div>
  )
}

function SpotDealsSkeleton() {
  return (
    <tbody aria-label="Loading spot deals">
      {Array.from({ length: 4 }, (_, index) => (
        <tr key={index} className="border-t border-outline">
          <td className="h-16 p-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7.5 w-7.5 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <Skeleton className="mt-1 h-5.5 w-15.5 rounded-md" />
          </td>
          <td className="h-16 p-3">
            <Skeleton className="ml-auto h-6 w-14" />
          </td>
          <td className="h-16 p-3">
            <Skeleton className="ml-auto h-5.5 w-20" />
          </td>
          <td className="h-16 p-3">
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5.5 w-16" />
            </div>
          </td>
          <td className="h-16 p-3">
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-25" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-15" />
            </div>
          </td>
          <td className="h-16 p-3">
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-4 w-15" />
              <Skeleton className="h-6 w-22" />
              <Skeleton className="h-4 w-12" />
            </div>
          </td>
          <td className="h-16 p-3">
            <Skeleton className="ml-auto h-8.5 w-8.5 rounded-md" />
          </td>
        </tr>
      ))}
    </tbody>
  )
}

export function SpotDealsTable({
  rotations,
  pricesByCoinId,
  pricesLoading,
  pricesRefreshing,
  pricesError,
  pricesUpdatedAt,
  currency,
  currencyRate,
  loading,
  deleting,
  onAdd,
  onRefreshPrices,
  onEdit,
  onRecordSale,
  onDelete,
}: SpotDealsTableProps) {
  const [selectedForDeletion, setSelectedForDeletion] = useState<SpotRotation | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [openActionsId, setOpenActionsId] = useState<string | null>(null)
  const [sort, setSort] = useState<SpotDealSort>(getStoredSort)
  const [filter, setFilter] = useState<SpotDealFilter>('all')
  const [search, setSearch] = useState('')
  const { sortBy, sortDirection } = sort
  const hasOpenRotations = rotations.some((rotation) => rotation.status === 'OPEN')
  const hasLinkedOpenRotations = rotations.some((rotation) => rotation.status === 'OPEN' && rotation.coingecko_id)
  useEffect(() => {
    localStorage.setItem(SPOT_DEALS_SORT_STORAGE_KEY, JSON.stringify(sort))
  }, [sort])

  const sortedRotations = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1
    const normalizedSearch = search.trim().toLocaleLowerCase()
    const valueFor = (rotation: SpotRotation): string | number | null => {
      switch (sortBy) {
        case 'name':
          return rotation.symbol.split('/')[0] ?? rotation.symbol
        case 'amount':
          return rotation.buy_qty
        case 'invested':
          return rotation.invested_amount
        case 'entry':
          return rotation.buy_time ? Date.parse(rotation.buy_time) : null
        case 'market':
          return rotation.status === 'OPEN'
            ? rotation.coingecko_id
              ? (pricesByCoinId[rotation.coingecko_id]?.price ?? null)
              : null
            : rotation.sell_price
        case 'pnl':
          if (rotation.status === 'CLOSED') return rotation.realized_pnl_usd
          if (!rotation.coingecko_id) return null
          {
            const currentPrice = pricesByCoinId[rotation.coingecko_id]
            if (!currentPrice) return null
            const remainingQty = Math.max(0, rotation.buy_qty - rotation.sold_qty)
            return (currentPrice.price - rotation.buy_price) * remainingQty - rotation.fee_amount
          }
      }
    }

    return rotations
      .filter((rotation) => filter === 'all' || rotation.status.toLowerCase() === filter)
      .filter((rotation) => {
        if (!normalizedSearch) return true
        const [baseAsset, quoteAsset] = rotation.symbol.split('/')
        return (
          baseAsset?.toLocaleLowerCase().includes(normalizedSearch) ||
          quoteAsset?.toLocaleLowerCase().includes(normalizedSearch) ||
          rotation.symbol.toLocaleLowerCase().includes(normalizedSearch)
        )
      })
      .map((rotation, index) => ({ rotation, index, value: valueFor(rotation) }))
      .sort((a, b) => {
        if (a.value === null && b.value !== null) return 1
        if (a.value !== null && b.value === null) return -1
        if (a.value === null || b.value === null) return a.index - b.index

        const comparison =
          typeof a.value === 'string' && typeof b.value === 'string' ? a.value.localeCompare(b.value) : Number(a.value) - Number(b.value)
        return comparison === 0 ? a.index - b.index : comparison * direction
      })
      .map(({ rotation }) => rotation)
  }, [rotations, pricesByCoinId, sortBy, sortDirection, filter, search])
  const {
    currentPage,
    pageItems: pageRotations,
    onPageChange,
  } = useTablePagination(sortedRotations, JSON.stringify([sortBy, sortDirection, filter, search]))

  function handleSort(column: SpotDealSortKey | null) {
    if (!column) return
    if (column === sortBy) {
      setSort((previous) => ({ ...previous, sortDirection: previous.sortDirection === 'asc' ? 'desc' : 'asc' }))
      return
    }

    setSort({ sortBy: column, sortDirection: column === 'name' ? 'asc' : 'desc' })
  }

  return (
    <section aria-label="Manual spot deals" aria-busy={loading} className="ui-surface mt-4 overflow-hidden">
      <div className="flex min-h-13.75 flex-col items-start justify-between gap-4 border-b border-outline px-4 py-2 sm:flex-row sm:items-center">
        <div className="ui-surface flex gap-1 bg-app p-1" role="group" aria-label="Filter spot deals">
          {filterButtons.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium inset-shadow-[0_0_2px_0_rgb(0_0_0/100%)] transition ${
                filter === value ? 'bg-accent text-on-accent' : 'text-text hover:bg-surface-raised hover:text-text'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex w-full items-start gap-2 sm:justify-end">
          <SearchInput value={search} onChange={setSearch} placeholder="Search deals" ariaLabel="Search spot deals" />
          <Button type="button" variant="dashboard" onClick={onAdd} className="gap-1 whitespace-nowrap">
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Add deal</span>
          </Button>
          {hasLinkedOpenRotations && (
            <Button
              type="button"
              variant="dashboard"
              aria-label="Refresh current prices"
              onClick={() => void onRefreshPrices()}
              disabled={pricesRefreshing}
              className="shrink-0 gap-1">
              <RefreshCw className={`h-4 w-4 ${pricesRefreshing ? 'animate-spin text-text motion-reduce:animate-none' : ''}`} aria-hidden="true" />
              <span className="font-medium">{pricesRefreshing ? 'Refreshing…' : 'Refresh'}</span>
            </Button>
          )}
        </div>
      </div>
      {pricesError && hasOpenRotations && (
        <p role="alert" className="border-b border-outline px-4 py-2 text-xs text-error">
          Prices could not be refreshed: {pricesError} Showing the last available estimates where possible.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-250 table-fixed text-left">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[11%]" />
            <col className="w-[13%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[13%]" />
            <col className="w-[9%]" />
          </colgroup>
          <thead className="label border-b border-outline bg-surface-raised normal-case">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.label}
                  scope="col"
                  aria-sort={column.sortKey && sortBy === column.sortKey ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={`px-3 py-2 ${index > 0 ? 'text-right' : ''}`}>
                  {column.sortKey ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.sortKey)}
                      className={`label flex w-full cursor-pointer items-center gap-1 normal-case transition hover:text-accent! ${
                        index === 0 ? 'justify-start text-left' : 'justify-end text-right'
                      }`}>
                      {column.label}
                      <SortIndicator active={sortBy === column.sortKey} direction={sortDirection} />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          {loading ? (
            <SpotDealsSkeleton />
          ) : (
            <tbody>
              {rotations.length === 0 ? (
                <tr>
                  <td className="px-3 py-12 text-center" colSpan={columns.length}>
                    <p className="text-sm font-medium">Your spot journal is empty</p>
                    <p className="mt-1 text-sm text-muted">Add a buy to track a deal separately from your long-term holdings.</p>
                    <Button type="button" variant="dashboard" onClick={onAdd} className="mt-4 gap-1">
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Add your first deal
                    </Button>
                  </td>
                </tr>
              ) : sortedRotations.length === 0 ? (
                <tr>
                  <td className="px-3 py-10 text-center text-sm text-muted" colSpan={columns.length}>
                    Nothing found
                  </td>
                </tr>
              ) : (
                pageRotations.map((rotation) => {
                  const isOpen = rotation.status === 'OPEN'
                  const currentPrice = isOpen && rotation.coingecko_id ? pricesByCoinId[rotation.coingecko_id] : undefined
                  const remainingQty = Math.max(0, rotation.buy_qty - rotation.sold_qty)
                  const unrealizedPnlUsd = currentPrice ? (currentPrice.price - rotation.buy_price) * remainingQty - rotation.fee_amount : null
                  const unrealizedPnlPercent =
                    unrealizedPnlUsd !== null && remainingQty > 0 && rotation.buy_price > 0
                      ? (unrealizedPnlUsd / (rotation.buy_price * remainingQty)) * 100
                      : null
                  const pnl = isOpen ? unrealizedPnlUsd : rotation.realized_pnl_usd
                  const pnlPercent = isOpen ? unrealizedPnlPercent : rotation.realized_pnl_percent
                  const resultClass = pnl === null ? 'text-muted' : pnl >= 0 ? 'text-profit' : 'text-loss'

                  return (
                    <tr key={rotation.id} className="border-t border-outline">
                      <td className="p-3">
                        <DealName symbol={rotation.symbol} />
                        <span
                          className={`mt-1 inline-flex items-center gap-1 rounded-md border border-outline bg-surface-raised px-1.5 py-0.5 text-xs font-medium text-muted`}>
                          {isOpen ? <StatusDot /> : <LockKeyhole className="h-3 w-3" aria-hidden="true" />}
                          {isOpen ? 'Open' : 'Closed'}
                        </span>
                      </td>
                      <td className="p-3 text-right tabular-nums">{formatNumber(rotation.buy_qty)}</td>
                      <td className="p-3 text-right tabular-nums">
                        {rotation.invested_amount === null ? '—' : formatCurrency(rotation.invested_amount * currencyRate, currency)}
                      </td>
                      <td className="p-3 text-right">
                        <p className="text-xs text-muted">{formatExecutionDate(rotation.buy_time)}</p>
                        <p className="mt-1">{formatUnitPrice(rotation.buy_price * currencyRate, currency)}</p>
                      </td>
                      <td className="p-3 text-right">
                        {isOpen ? (
                          currentPrice ? (
                            <div>
                              <p className="flex items-center justify-end gap-1 text-xs text-muted">
                                <StatusDot />
                                Market price
                              </p>
                              <p className="mt-1 text-xs text-muted">{formatExecutionDate(currentPrice.timestamp)}</p>
                              <p className="mt-1 font-medium tabular-nums">{formatUnitPrice(currentPrice.price * currencyRate, currency)}</p>
                              {currentPrice.change24hPercent !== undefined && (
                                <p
                                  className={`mt-1 text-xs font-medium tabular-nums ${
                                    currentPrice.change24hPercent === null
                                      ? 'text-muted'
                                      : currentPrice.change24hPercent > 0
                                        ? 'text-profit'
                                        : currentPrice.change24hPercent < 0
                                          ? 'text-loss'
                                          : 'text-muted'
                                  }`}>
                                  24h {currentPrice.change24hPercent === null ? '—' : formatSignedValue(currentPrice.change24hPercent, '', '%')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="flex items-center justify-end gap-1 text-xs text-muted">
                                <StatusDot />
                                Market price
                              </p>
                              <p className="mt-1 font-medium tabular-nums">—</p>
                              <p className="mt-1 text-xs text-muted">{rotation.coingecko_id ? 'Price unavailable' : 'Select a coin for estimates'}</p>
                            </div>
                          )
                        ) : (
                          <div>
                            <p className="text-xs text-muted">Exit price</p>
                            <p className="mt-1 text-xs text-muted">{formatExecutionDate(rotation.sell_time)}</p>
                            <p className="mt-1 font-medium tabular-nums">
                              {rotation.sell_price === null ? '—' : formatUnitPrice(rotation.sell_price * currencyRate, currency)}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted">
                            {isOpen ? <StatusDot /> : <LockKeyhole className="h-3 w-3" aria-hidden="true" />}
                            {isOpen ? 'Floating' : 'Realized'}
                          </span>
                          <div className={`text-right font-medium tabular-nums ${resultClass}`}>
                            <p>{pnl === null ? '—' : formatSignedCurrency(pnl * currencyRate, currency)}</p>
                            <p className="text-xs">{pnlPercent === null ? '—' : formatSignedValue(pnlPercent, '', '%')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end">
                          <Popover.Root open={openActionsId === rotation.id} onOpenChange={(open) => setOpenActionsId(open ? rotation.id : null)}>
                            <Popover.Trigger asChild>
                              <Button
                                type="button"
                                variant="dashboard"
                                size="sm"
                                aria-label={`Actions for ${rotation.symbol} deal`}
                                aria-haspopup="dialog">
                                <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </Popover.Trigger>
                            <Popover.Portal>
                              <Popover.Content
                                align="end"
                                sideOffset={4}
                                aria-label={`Actions for ${rotation.symbol} deal`}
                                className="ui-surface z-50 min-w-40 overflow-hidden p-1.5">
                                <div className="space-y-1">
                                  {isOpen && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionsId(null)
                                        onRecordSale(rotation)
                                      }}
                                      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-text transition hover:bg-surface-raised">
                                      <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                                      Record sale
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionsId(null)
                                      onEdit(rotation)
                                    }}
                                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-text transition hover:bg-surface-raised">
                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionsId(null)
                                      setDeleteError(null)
                                      setSelectedForDeletion(rotation)
                                    }}
                                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-loss transition hover:bg-loss-subtle">
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    Delete
                                  </button>
                                </div>
                              </Popover.Content>
                            </Popover.Portal>
                          </Popover.Root>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          )}
        </table>
      </div>
      <TablePagination currentPage={currentPage} pageSize={TABLE_PAGE_SIZE} totalItems={sortedRotations.length} onPageChange={onPageChange} />
      {hasOpenRotations && (
        <p
          className="flex items-center justify-end gap-3 border-t border-outline px-3 py-2 text-right text-xs text-muted"
          role="status"
          aria-live="polite">
          {pricesLoading
            ? 'Loading current price estimates…'
            : pricesRefreshing
              ? 'Updating current price estimates…'
              : pricesError
                ? 'Current price estimates could not be refreshed.'
                : pricesUpdatedAt
                  ? `Last updated: ${new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(pricesUpdatedAt)}`
                  : 'Current price estimates refresh every minute for linked coins.'}
        </p>
      )}
      <Dialog.Root
        open={selectedForDeletion !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setSelectedForDeletion(null)
            setDeleteError(null)
          }
        }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
          <Dialog.Content
            onEscapeKeyDown={(event) => {
              if (deleting) event.preventDefault()
            }}
            onPointerDownOutside={(event) => {
              if (deleting) event.preventDefault()
            }}
            className="ui-surface fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 bg-surface-raised p-5 sm:p-6">
            <Dialog.Title className="text-lg font-semibold">Delete this spot deal?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted">
              {selectedForDeletion
                ? `This will permanently remove the ${selectedForDeletion.symbol} deal and its recorded buy and sale details.`
                : ''}
            </Dialog.Description>
            {deleteError && (
              <p role="alert" className="mt-3 text-sm text-error">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="dashboard" disabled={deleting} onClick={() => setSelectedForDeletion(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="filled"
                disabled={deleting || !selectedForDeletion}
                className="border-loss bg-loss hover:border-loss hover:bg-loss-subtle hover:text-loss"
                onClick={async () => {
                  if (!selectedForDeletion) return
                  setDeleteError(null)
                  try {
                    await onDelete(selectedForDeletion)
                    setSelectedForDeletion(null)
                  } catch (error) {
                    setDeleteError(error instanceof Error ? error.message : 'Unable to delete this spot deal.')
                  }
                }}>
                {deleting ? 'Deleting…' : 'Delete deal'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}
