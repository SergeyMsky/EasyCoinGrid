import { useMemo } from 'react'
import { usePortfolioData } from '@/features/portfolio/hooks/usePortfolioData'
import { useSpotRotations } from '@/features/portfolio/hooks/useSpotRotations'
import { ActiveRotationsTable } from '@/features/portfolio/components/ActiveRotationsTable'
import { ClosedRotationsTable } from '@/features/portfolio/components/ClosedRotationsTable'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { WarningMessage } from '@/shared/components/WarningMessage'
import { Spinner } from '@/shared/components/Spinner'
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react'
import { formatSignedCurrency } from '@/shared/utils/format-currency'

export function RotationsPage() {
  const { assets, loading: portfolioLoading, error: portfolioError, isBinanceConnected } = usePortfolioData()
  const {
    rotations,
    loading: rotationsLoading,
    syncing,
    error: rotationsError,
    syncStatus,
    syncNow,
    addRotation,
    closeRotation,
  } = useSpotRotations({
    assets: assets.map((asset) => asset.asset),
    syncFromBinance: isBinanceConnected === true,
  })
  const openRotations = useMemo(() => rotations.filter((rotation) => rotation.status === 'OPEN'), [rotations])
  const closedRotations = useMemo(
    () => rotations.filter((rotation) => rotation.status === 'CLOSED').sort((a, b) => {
      const aTime = a.sell_time ? Date.parse(a.sell_time) : 0
      const bTime = b.sell_time ? Date.parse(b.sell_time) : 0
      return bTime - aTime
    }),
    [rotations],
  )
  const realizedPnl = useMemo(
    () => rotations.reduce((total, rotation) => total + (rotation.realized_pnl_usd ?? 0), 0),
    [rotations],
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="label mb-2">Binance Spot</p>
          <h1 className="text-3xl font-bold">Spot rotations</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Follow open buys and review realized results from completed sell cycles.
          </p>
        </div>
        <nav aria-label="Jump to rotation section" className="flex items-center gap-2">
          <a href="#open-rotations" className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-gray-300 transition hover:border-emerald-400/30 hover:text-white">
            <ArrowUp className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            Open <span className="text-gray-500">{openRotations.length}</span>
          </a>
          <a href="#rotation-history" className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-gray-300 transition hover:border-emerald-400/30 hover:text-white">
            <ArrowDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
            History <span className="text-gray-500">{closedRotations.length}</span>
          </a>
        </nav>
      </div>

      <section aria-label="Rotation overview" className="mt-7 grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-gray-400">Open rotations</p>
          <p className="mt-2 text-2xl font-semibold text-white">{openRotations.length}</p>
          <p className="mt-1 text-xs text-gray-500">Buy lots still being tracked</p>
        </article>
        <article className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-gray-400">Closed rotations</p>
          <p className="mt-2 text-2xl font-semibold text-white">{closedRotations.length}</p>
          <p className="mt-1 text-xs text-gray-500">Completed sell cycles</p>
        </article>
        <article className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-gray-400">Realized PnL</p>
          <p className={`mt-2 text-2xl font-semibold ${realizedPnl >= 0 ? 'text-[#00A857]' : 'text-[#FF4D4D]'}`}>
            {formatSignedCurrency(realizedPnl, 'USD')}
          </p>
          <p className="mt-1 text-xs text-gray-500">Closed rotations after recorded fees</p>
        </article>
      </section>

      {portfolioError && <WarningMessage message={`Unable to check Binance connection: ${portfolioError}`} />}
      {!portfolioLoading && isBinanceConnected === false && (
        <WarningMessage message="Binance is not connected. You can still add and track rotations manually; connect Binance in Settings to sync trade history." />
      )}
      {!portfolioLoading && isBinanceConnected === null && import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_PORTFOLIO === 'true' && (
        <WarningMessage message="Mock portfolio data is enabled. Automatic Binance trade sync is paused." />
      )}
      {rotationsError && <ErrorMessage message={rotationsError} />}
      {isBinanceConnected === true && (
        <div className="mt-5 flex flex-wrap items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <details className="min-w-0 flex-1">
            <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-sm font-medium text-gray-200 [&::-webkit-details-marker]:hidden">
              <span className={`h-2 w-2 shrink-0 rounded-full ${syncStatus ? 'bg-emerald-400' : 'bg-gray-500'}`} />
              Binance sync
              <span className="truncate text-xs font-normal text-gray-500">
                {syncStatus
                  ? `Last updated ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(syncStatus.syncedAt))}`
                  : syncing || rotationsLoading ? 'Syncing trade history…' : 'No successful sync yet'}
              </span>
            </summary>
            <div className="mt-3 border-t border-white/10 pt-3">
            {syncStatus ? (
              <>
                <p className="text-xs text-gray-400">
                  {syncStatus.symbolsScanned} pairs checked · {syncStatus.tradesImported} executions imported
                </p>
                {syncStatus.oldestTradeTime !== null && syncStatus.newestTradeTime !== null && (
                  <p className="mt-1 text-xs text-gray-500">
                    Available trade range: {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(syncStatus.oldestTradeTime))}
                    {' – '}{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(syncStatus.newestTradeTime))}
                  </p>
                )}
                {syncStatus.unmatchedSellTrades > 0 && (
                  <p className="mt-3 rounded-md border border-amber-400/15 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
                    {syncStatus.unmatchedSellTrades} sell execution(s) had no matching buy in the returned trade history. This can happen when older trades are unavailable or assets entered the wallet another way.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400">Sync current assets and previously imported pairs across supported USD-stablecoin Spot markets.</p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              Binance may not return every historical execution. The available date range shows the coverage returned for this account.
            </p>
            </div>
          </details>
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={syncing || rotationsLoading}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-medium text-gray-300 transition hover:border-emerald-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      )}

      {rotationsLoading ? (
        <div className="mt-8 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-gray-400">
          <Spinner className="size-5 border-2 border-white/10 border-t-emerald-400" />
          Loading your rotations…
        </div>
      ) : (
        <>
          <div id="open-rotations" className="scroll-mt-24">
            <ActiveRotationsTable rotations={openRotations} onCreateRotation={addRotation} onCloseRotation={closeRotation} />
          </div>
          <div id="rotation-history" className="scroll-mt-24">
            <ClosedRotationsTable rotations={closedRotations} />
          </div>
        </>
      )}
    </main>
  )
}
