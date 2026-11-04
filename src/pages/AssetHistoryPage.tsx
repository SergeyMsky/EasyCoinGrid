import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAssetTransactions, syncAssetTransactions } from '@/features/asset-history/api/asset-history.api'
import type { AssetHistoryDateRange, AssetHistorySyncResult, AssetHistoryTypeFilter } from '@/features/asset-history/asset-history.types'
import { AssetHistorySyncPanel } from '@/features/asset-history/components/AssetHistorySyncPanel'
import { AssetHistoryTransactionsTable } from '@/features/asset-history/components/AssetHistoryTransactionsTable'
import { getPortfolioBalances } from '@/features/portfolio/api/portfolio.api'
import { getBinanceConnectionStatus } from '@/features/settings/api/settings.api'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { portfolioQueryKeys } from '@/features/portfolio/api/portfolio-query-keys'

const TRANSACTION_PAGE_SIZE = 100
const TRANSACTION_STALE_TIME = 5 * 60 * 1000
export function AssetHistoryPage({ userId }: { userId: string }) {
  const queryClient = useQueryClient()
  const [syncResult, setSyncResult] = useState<AssetHistorySyncResult | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetHistoryTypeFilter>('all')
  const [dateRange, setDateRange] = useState<AssetHistoryDateRange>({ from: '', to: '' })
  const hasFilters = Boolean(debouncedSearch || typeFilter !== 'all' || dateRange.from || dateRange.to)
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250)
    return () => window.clearTimeout(timeout)
  }, [search])

  const transactionsQuery = useInfiniteQuery({
    queryKey: portfolioQueryKeys.assetTransactions(
      userId,
      hasFilters ? { search: debouncedSearch, type: typeFilter, from: dateRange.from, to: dateRange.to } : undefined,
    ),
    queryFn: ({ pageParam }) =>
      hasFilters ? getAssetTransactions(pageParam, { search: debouncedSearch, type: typeFilter, dateRange }) : getAssetTransactions(pageParam),
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
      await queryClient.resetQueries({ queryKey: portfolioQueryKeys.assetTransactions(userId), exact: false })
    },
  })
  const transactions = useMemo(() => transactionsQuery.data?.pages.flat() ?? [], [transactionsQuery.data])
  const loading = transactionsQuery.isPending
  const loadingMore = transactionsQuery.isFetchingNextPage
  const hasMore = Boolean(transactionsQuery.hasNextPage)
  const connected = connectionQuery.data ?? null
  const error = transactionsQuery.error ?? connectionQuery.error ?? syncMutation.error
  const errorMessage = error instanceof Error ? error.message : error ? 'Failed to load asset history.' : null
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

  return (
    <main className="page-container">
      <AssetHistorySyncPanel
        connected={connected}
        loading={loading}
        syncing={syncMutation.isPending}
        syncResult={syncResult}
        onSync={() => void handleSync()}
      />
      {errorMessage && <ErrorMessage message={errorMessage} />}

      <AssetHistoryTransactionsTable
        transactions={transactions}
        loading={loading}
        loadingMore={loadingMore}
        syncing={syncMutation.isPending}
        hasMore={hasMore}
        connected={connected}
        search={search}
        typeFilter={typeFilter}
        dateRange={dateRange}
        hasFilters={hasFilters}
        onSearchChange={setSearch}
        onTypeFilterChange={setTypeFilter}
        onDateRangeChange={setDateRange}
        onLoadMore={handleLoadMore}
      />

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Imports Spot trades for current Binance assets and previously tracked pairs, plus deposits, withdrawals, transfers, Simple Earn activity and
        Convert trades. Other history sources are limited to the last 90 days and by Binance endpoint availability.
      </p>
    </main>
  )
}
