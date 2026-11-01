import { RefreshCw } from 'lucide-react'
import type { AssetHistorySyncResult } from '@/features/asset-history/asset-history.types'
import { Button } from '@/shared/components/Button'
import { WarningMessage } from '@/shared/components/WarningMessage'
import { APP_LOCALE } from '@/shared/utils/locale'

const dateTimeFormatter = new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: 'medium', timeStyle: 'short' })

type AssetHistorySyncPanelProps = {
  connected: boolean | null
  loading: boolean
  syncing: boolean
  syncResult: AssetHistorySyncResult | null
  onSync: () => void
}

export function AssetHistorySyncPanel({ connected, loading, syncing, syncResult, onSync }: AssetHistorySyncPanelProps) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="label mb-2 text-accent">Binance account</p>
          <h1 className="text-3xl font-bold">Asset history</h1>
          <p className="mt-2 text-sm text-muted">
            Review Spot trades, deposits, withdrawals, wallet transfers, Simple Earn activity and Convert trades.
          </p>
        </div>
        <Button type="button" variant="dashboard" onClick={onSync} disabled={!connected || syncing || loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          {syncing ? 'Syncing…' : 'Sync now'}
        </Button>
      </div>

      {!loading && connected === false && <WarningMessage message="Connect Binance in Settings to import asset history." />}

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
    </>
  )
}
