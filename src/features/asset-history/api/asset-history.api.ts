import { supabase } from '@/shared/lib/supabase'
import type { AssetHistorySyncResult, AssetTransaction } from '../asset-history.types'

const PAGE_SIZE = 100

export async function getAssetTransactions(offset: number): Promise<AssetTransaction[]> {
  const { data, error } = await supabase
    .from('asset_transactions')
    .select(
      'id, source, external_id, group_id, event_type, direction, asset, related_asset, amount, fee_amount, fee_asset, occurred_at, status, network, transaction_id, source_wallet, target_wallet, created_at',
    )
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) throw new Error(error.message || 'Failed to load asset history.')

  return data as AssetTransaction[]
}

export async function syncAssetTransactions(assets: string[]): Promise<AssetHistorySyncResult> {
  const { data, error } = await supabase.functions.invoke('sync-binance-asset-history', { body: { assets } })

  if (error) {
    if (error.context instanceof Response) {
      const responseData = await error.context.json()
      if (typeof responseData?.error === 'string') throw new Error(responseData.error)
    }

    throw new Error(error.message || 'Failed to sync Binance asset history.')
  }

  const hasNoTransactions = data?.oldestTransactionTime === null && data?.newestTransactionTime === null
  const hasValidRange =
    typeof data?.oldestTransactionTime === 'number' &&
    Number.isFinite(data.oldestTransactionTime) &&
    typeof data?.newestTransactionTime === 'number' &&
    Number.isFinite(data.newestTransactionTime) &&
    data.oldestTransactionTime <= data.newestTransactionTime

  if (
    typeof data?.syncedAt !== 'string' ||
    !Number.isFinite(Date.parse(data.syncedAt)) ||
    !Number.isInteger(data?.depositsImported) ||
    data.depositsImported < 0 ||
    !Number.isInteger(data?.withdrawalsImported) ||
    data.withdrawalsImported < 0 ||
    !Number.isInteger(data?.transfersImported) ||
    data.transfersImported < 0 ||
    !Number.isInteger(data?.simpleEarnRecordsImported) ||
    data.simpleEarnRecordsImported < 0 ||
    !Number.isInteger(data?.convertTradesImported) ||
    data.convertTradesImported < 0 ||
    !Number.isInteger(data?.spotTradesImported) ||
    data.spotTradesImported < 0 ||
    (!hasNoTransactions && !hasValidRange)
  ) {
    throw new Error('Invalid asset history sync response.')
  }

  return data as AssetHistorySyncResult
}
