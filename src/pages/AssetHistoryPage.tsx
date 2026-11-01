import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { portfolioQueryKeys } from '@/features/portfolio/api/portfolio-query-keys'

const TRANSACTION_PAGE_SIZE = 100
const TRANSACTION_STALE_TIME = 5 * 60 * 1000
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

export function AssetHistoryPage({ userId }: { userId: string }) {
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(false)
  const assetMetadataRef = useRef<Record<string, Pick<Asset, 'image'>>>({})
  const metadataRequestsRef = useRef(new Set<string>())
  const metadataAttemptsRef = useRef(new Map<string, number>())
  const queryClient = useQueryClient()
  const [syncResult, setSyncResult] = useState<AssetHistorySyncResult | null>(null)
  const [assetMetadata, setAssetMetadata] = useState<Record<string, Pick<Asset, 'image'>>>({})
  const [loadingImageAssets, setLoadingImageAssets] = useState<Set<string>>(() => new Set())
  const transactionsQuery = useInfiniteQuery({
    queryKey: portfolioQueryKeys.assetTransactions(userId),
    queryFn: ({ pageParam }) => getAssetTransactions(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage.length === TRANSACTION_PAGE_SIZE ? pages.length * TRANSACTION_PAGE_SIZE : undefined),
    enabled: Boolean(userId),
    staleTime: TRANSACTION_STALE_TIME,
    gcTime: 60 * 60 * 1000,
  })
  const connectionQuery = useQuery({
    queryKey: portfolioQueryKeys.binanceConnection(userId),
    queryFn: getBinanceConnectionStatus,
    enabled: Boolean(userId),
    staleTime: TRANSACTION_STALE_TIME,
    gcTime: 60 * 60 * 1000,
  })
  const syncMutation = useMutation({
    mutationFn: async () => {
      const balances = await getPortfolioBalances()
      return syncAssetTransactions(balances.map(({ asset }) => asset))
    },
    onSuccess: async (result) => {
      setSyncResult(result)
      await queryClient.resetQueries({ queryKey: portfolioQueryKeys.assetTransactions(userId), exact: true })
    },
  })
  const transactions = useMemo(() => transactionsQuery.data?.pages.flat() ?? [], [transactionsQuery.data])
  const loading = transactionsQuery.isPending
  const loadingMore = transactionsQuery.isFetchingNextPage
  const hasMore = Boolean(transactionsQuery.hasNextPage)
  const connected = connectionQuery.data ?? null
  const error = transactionsQuery.error ?? connectionQuery.error ?? syncMutation.error
  const errorMessage = error instanceof Error ? error.message : error ? 'Failed to load asset history.' : null
  const transactionAssetsKey = useMemo(
    () =>
      [
        ...new Set(
          transactions.flatMap(({ asset, fee_asset, related_asset }) =>
            [asset, fee_asset, related_asset].filter((value): value is string => Boolean(value)).map((value) => value.toUpperCase()),
          ),
        ),
      ]
        .sort()
        .join(','),
    [transactions],
  )

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!transactionAssetsKey) return

    const assetsToLoad = transactionAssetsKey.split(',').filter((asset) => {
      const attempts = metadataAttemptsRef.current.get(asset) ?? 0
      return !assetMetadataRef.current[asset]?.image && !metadataRequestsRef.current.has(asset) && attempts < 3
    })
    if (assetsToLoad.length === 0) return

    for (const asset of assetsToLoad) metadataRequestsRef.current.add(asset)
    setLoadingImageAssets((current) => new Set([...current, ...assetsToLoad]))

    void (async () => {
      let pendingAssets = assetsToLoad
      let lastError: unknown

      try {
        for (let attempt = 0; attempt < 3 && pendingAssets.length > 0; attempt += 1) {
          for (const asset of pendingAssets) {
            metadataAttemptsRef.current.set(asset, (metadataAttemptsRef.current.get(asset) ?? 0) + 1)
          }

          try {
            const metadata = await getCoinsMetadata(pendingAssets)
            assetMetadataRef.current = { ...assetMetadataRef.current, ...metadata }
            if (isMountedRef.current) setAssetMetadata((current) => ({ ...current, ...metadata }))
          } catch (metadataError) {
            lastError = metadataError
          }

          if (!isMountedRef.current) break
          pendingAssets = pendingAssets.filter((asset) => !assetMetadataRef.current[asset]?.image)
          if (pendingAssets.length > 0 && attempt < 2) {
            await new Promise((resolve) => window.setTimeout(resolve, 300 * 2 ** attempt))
          }
        }

        if (pendingAssets.length > 0) {
          console.warn(
            lastError ? 'Asset history coin images unavailable after retries:' : 'No coin image was returned after retries:',
            lastError ?? pendingAssets,
          )
        }
      } finally {
        for (const asset of assetsToLoad) metadataRequestsRef.current.delete(asset)
        if (isMountedRef.current) {
          setLoadingImageAssets((current) => {
            const next = new Set(current)
            for (const asset of assetsToLoad) next.delete(asset)
            return next
          })
        }
      }
    })()
  }, [transactionAssetsKey])

  async function handleSync() {
    try {
      await syncMutation.mutateAsync()
    } catch {
      // The mutation error is surfaced in the page state.
    }
  }

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = transactionsQuery
  const handleLoadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return
    await fetchNextPage()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target || loading || !hasMore || loadingMore || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void handleLoadMore()
      },
      { rootMargin: '200px 0px' },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [handleLoadMore, hasMore, loading, loadingMore])

  return (
    <main className="mx-auto px-4 pt-10 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="label mb-2 text-accent">Binance account</p>
          <h1 className="text-3xl font-bold">Asset history</h1>
          <p className="mt-2 text-sm text-muted">
            Review Spot trades, deposits, withdrawals, wallet transfers, Simple Earn activity and Convert trades.
          </p>
        </div>
        <Button
          type="button"
          variant="dashboard"
          onClick={() => void handleSync()}
          disabled={!connected || syncMutation.isPending || loading}
          className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
          {syncMutation.isPending ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>

      {!loading && connected === false && <WarningMessage message="Connect Binance in Settings to import asset history." />}
      {errorMessage && <ErrorMessage message={errorMessage} />}

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

      <section className="ui-surface mt-4 overflow-hidden" aria-busy={loading || loadingMore || syncMutation.isPending}>
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
                            <CoinImage
                              image={assetMetadata[transaction.asset]?.image}
                              asset={transaction.asset}
                              loading={loadingImageAssets.has(transaction.asset)}
                            />
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-muted">
                          {Number(transaction.fee_amount) > 0 ? (
                            <span className="flex items-center justify-end gap-2">
                              {formatAmount(transaction.fee_amount, transaction.fee_asset ?? transaction.asset)}
                              <CoinImage
                                image={assetMetadata[transaction.fee_asset ?? transaction.asset]?.image}
                                asset={transaction.fee_asset ?? transaction.asset}
                                loading={loadingImageAssets.has(transaction.fee_asset ?? transaction.asset)}
                              />
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
