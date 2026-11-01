import { useCallback, useMemo, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getAssetTransactions, syncAssetTransactions } from '@/features/asset-history/api/asset-history.api'
import type { AssetHistorySyncResult } from '@/features/asset-history/asset-history.types'
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
    <main className="mx-auto px-4 pt-10 pb-4">
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
        onLoadMore={handleLoadMore}
      />

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Imports Spot trades for current Binance assets and previously tracked pairs, plus deposits, withdrawals, transfers, Simple Earn activity and
        Convert trades. Other history sources are limited to the last 90 days and by Binance endpoint availability.
      </p>
    </main>
  )
}
