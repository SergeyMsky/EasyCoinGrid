import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, RefreshCw } from 'lucide-react'
import { getAssetTransactions, syncAssetTransactions } from '@/features/asset-history/api/asset-history.api'
import type { AssetHistorySyncResult, AssetTransaction } from '@/features/asset-history/asset-history.types'
import { getCoinsMetadata, getPortfolioBalances } from '@/features/portfolio/api/portfolio.api'
import type { Asset } from '@/features/portfolio/portfolio.types'
import { getBinanceConnectionStatus } from '@/features/settings/api/settings.api'
import { Button } from '@/shared/components/Button'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { WarningMessage } from '@/shared/components/WarningMessage'
import { APP_LOCALE } from '@/shared/utils/locale'
import { CoinImage } from '@/features/portfolio/components/CoinImage'

const dateTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: 'medium', timeStyle: 'short' })
const dateHeadingFormatter = new Intl.DateTimeFormat(APP_LOCALE, { day: '2-digit', month: 'short', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat(APP_LOCALE, { hour: '2-digit', minute: '2-digit' })
const numberFormatter = new Intl.NumberFormat(APP_LOCALE, { maximumFractionDigits: 18 })

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

export function AssetHistoryPage() {
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const [transactions, setTransactions] = useState<AssetTransaction[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<AssetHistorySyncResult | null>(null)
  const [assetMetadata, setAssetMetadata] = useState<Record<string, Pick<Asset, 'image'>>>({})
  const transactionAssetsKey = useMemo(() => [...new Set(transactions.map(({ asset }) => asset.toUpperCase()))].sort().join(','), [transactions])

  useEffect(() => {
    if (!transactionAssetsKey) return

    let active = true
    void getCoinsMetadata(transactionAssetsKey.split(','))
      .then((metadata) => {
        if (active) setAssetMetadata((current) => ({ ...current, ...metadata }))
      })
      .catch((metadataError: unknown) => {
        if (active) console.warn('Asset history coin images unavailable:', metadataError)
      })

    return () => {
      active = false
    }
  }, [transactionAssetsKey])

  useEffect(() => {
    let active = true

    void getAssetTransactions(0)
      .then((items) => {
        if (active) {
          setTransactions(items)
          setHasMore(items.length === 100)
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Failed to load asset history.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    void getBinanceConnectionStatus()
      .then((isConnected) => {
        if (active) setConnected(isConnected)
      })
      .catch((connectionError: unknown) => {
        if (active) setError(connectionError instanceof Error ? connectionError.message : 'Failed to load Binance connection status.')
      })

    return () => {
      active = false
    }
  }, [])

  async function handleSync() {
    setSyncing(true)
    setError(null)

    try {
      const balances = await getPortfolioBalances()
      const result = await syncAssetTransactions(balances.map(({ asset }) => asset))
      setSyncResult(result)
      const items = await getAssetTransactions(0)
      setTransactions(items)
      setHasMore(items.length === 100)
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Failed to sync Binance asset history.')
    } finally {
      setSyncing(false)
    }
  }

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return

    loadingMoreRef.current = true
    setLoadingMore(true)
    setError(null)

    try {
      const items = await getAssetTransactions(transactions.length)
      setTransactions((current) => [...current, ...items])
      setHasMore(items.length === 100)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load more asset history.')
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [hasMore, transactions.length])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || loading || !hasMore || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void handleLoadMore()
      },
      { rootMargin: '200px 0px' },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [handleLoadMore, hasMore, loading])

  return (
    <main className="mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="label mb-2 text-accent">Binance account</p>
          <h1 className="text-3xl font-bold">Asset history</h1>
          <p className="mt-2 text-sm text-muted">
            Review Spot trades, deposits, withdrawals, wallet transfers, Simple Earn activity and Convert trades.
          </p>
        </div>
        <Button type="button" variant="dashboard" onClick={() => void handleSync()} disabled={!connected || syncing || loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>

      {!loading && connected === false && <WarningMessage message="Connect Binance in Settings to import asset history." />}
      {error && <ErrorMessage message={error} />}

      {syncResult && (
        <p className="mt-4 text-sm text-muted" role="status">
          Sync completed {dateTimeFormatter.format(new Date(syncResult.syncedAt))}: {syncResult.depositsImported} deposits,{' '}
          {syncResult.withdrawalsImported} withdrawals, {syncResult.transfersImported} transfers, {syncResult.simpleEarnRecordsImported} Simple Earn
          records, {syncResult.convertTradesImported} Convert trades and {syncResult.spotTradesImported} Spot trades received from Binance.
          {syncResult.oldestTransactionTime !== null && syncResult.newestTransactionTime !== null && (
            <>
              {' '}
              Returned date range: {dateTimeFormatter.format(new Date(syncResult.oldestTransactionTime))}
              {' – '}
              {dateTimeFormatter.format(new Date(syncResult.newestTransactionTime))}.
            </>
          )}
        </p>
      )}

      <section className="ui-surface mt-4 overflow-hidden" aria-busy={loading || loadingMore || syncing}>
        <div className="flex min-h-13.75 items-center justify-between border-b border-outline px-4 py-3">
          <h2 className="text-sm font-semibold">Transactions</h2>
          <span className="text-xs text-muted">{transactions.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-225 table-fixed text-left" aria-label="Asset history">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
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
                      <div aria-hidden="true" className="h-3 w-17 animate-pulse rounded bg-surface-raised" />
                      <div aria-hidden="true" className="h-3 w-21 animate-pulse rounded bg-surface-raised" />
                    </div>
                  </th>
                </tr>
                {Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-t border-outline">
                    {Array.from({ length: 5 }).map((__, cell) => (
                      <td key={cell} className="h-11.75 px-3 py-2">
                        <div aria-hidden="true" className={`${cell !== 0 ? 'ml-auto' : ''} h-4 w-24 animate-pulse rounded bg-surface-raised`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : transactions.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted">
                    {connected ? 'No imported transactions yet. Select “Sync now” to fetch history from Binance.' : 'No transactions to show.'}
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
                            <CoinImage image={assetMetadata[transaction.asset]?.image} asset={transaction.asset} />
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-muted">
                          {Number(transaction.fee_amount) > 0
                            ? formatAmount(transaction.fee_amount, transaction.fee_asset ?? transaction.asset)
                            : '—'}
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
                          <div aria-hidden="true" className="h-3 w-17 animate-pulse rounded bg-surface-raised" />
                          <div aria-hidden="true" className="h-3 w-21 animate-pulse rounded bg-surface-raised" />
                        </div>
                      </th>
                    </tr>
                    {Array.from({ length: 3 }).map((_, index) => (
                      <tr key={index} className="border-t border-outline">
                        {Array.from({ length: 5 }).map((__, cell) => (
                          <td key={cell} className="h-11.75 px-3 py-2">
                            <div aria-hidden="true" className={`${cell !== 0 ? 'ml-auto' : ''} h-4 w-24 animate-pulse rounded bg-surface-raised`} />
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

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Imports Spot trades for current Binance assets and previously tracked pairs, plus deposits, withdrawals, transfers, Simple Earn activity and
        Convert trades. Other history sources are limited to the last 90 days and by Binance endpoint availability.
      </p>
    </main>
  )
}
