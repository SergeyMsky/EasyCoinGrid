import { RefreshCw } from 'lucide-react'
import type { SpotRotationSyncStatus } from '@/features/portfolio/api/binance-spot-trades.api'
import { Button } from '@/shared/components/Button'
import { APP_LOCALE } from '@/shared/utils/locale'

const dateTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: 'medium', timeStyle: 'short' })
const dateFormatter = new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: 'medium' })

type BinanceRotationSyncPanelProps = {
  syncStatus: SpotRotationSyncStatus | null
  syncing: boolean
  rotationsLoading: boolean
  onSync: () => void
}

export function BinanceRotationSyncPanel({ syncStatus, syncing, rotationsLoading, onSync }: BinanceRotationSyncPanelProps) {
  const isSyncing = syncing || rotationsLoading

  return (
    <details className="ui-surface mt-4 min-w-0 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium text-text hover:bg-surface-raised [&::-webkit-details-marker]:hidden">
        <span className="relative flex size-2.5">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${syncStatus ? 'bg-accent' : 'animate-ping bg-muted'}`}></span>
          <span className={`relative inline-flex size-2.5 rounded-full opacity-75 ${syncStatus ? 'bg-accent' : 'bg-muted'}`}></span>
        </span>
        Binance sync
        <span className="flex-1 truncate text-xs font-normal text-muted">
          {syncStatus
            ? `Last updated ${dateTimeFormatter.format(new Date(syncStatus.syncedAt))}`
            : isSyncing
              ? 'Syncing trade history…'
              : 'No successful sync yet'}
        </span>
        <Button type="button" variant="dashboard" aria-label="Refresh rotations" onClick={onSync} disabled={isSyncing} className="gap-1">
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-text' : ''}`} />
          <span className="text-xs font-medium">{isSyncing ? 'Syncing…' : 'Sync now'}</span>
        </Button>
      </summary>
      <div className="border-t border-outline p-4 pt-3">
        {syncStatus ? (
          <>
            <p className="text-xs text-muted">
              {syncStatus.symbolsScanned} pairs checked · {syncStatus.tradesImported} executions imported
            </p>
            {syncStatus.oldestTradeTime !== null && syncStatus.newestTradeTime !== null && (
              <p className="mt-1 text-xs text-muted">
                Available trade range: {dateFormatter.format(new Date(syncStatus.oldestTradeTime))}
                {' – '}
                {dateFormatter.format(new Date(syncStatus.newestTradeTime))}
              </p>
            )}
            {syncStatus.unmatchedSellTrades > 0 && (
              <p className="mt-3 rounded-md border border-warning-outline bg-warning-subtle px-3 py-2 text-xs text-warning">
                {syncStatus.unmatchedSellTrades} sell execution(s) had no matching buy in the returned trade history. This can happen when older
                trades are unavailable or assets entered the wallet another way.
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted">Sync current assets and previously imported pairs across supported USD-stablecoin Spot markets.</p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Binance may not return every historical execution. The available date range shows the coverage returned for this account.
        </p>
      </div>
    </details>
  )
}
