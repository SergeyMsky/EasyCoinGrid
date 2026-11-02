import { supabase } from '@/shared/lib/supabase'
import type { AssetHistoryDateRange, AssetHistorySyncResult, AssetHistoryTypeFilter, AssetTransaction } from '../asset-history.types'

const PAGE_SIZE = 100

const eventTypesByFilter: Partial<Record<AssetHistoryTypeFilter, AssetTransaction['event_type'][]>> = {
  spot: ['SPOT_TRADE', 'SPOT_TRADE_FEE'],
  deposit: ['DEPOSIT'],
  withdrawal: ['WITHDRAWAL'],
  transfer: ['TRANSFER'],
  earn: ['EARN_SUBSCRIPTION', 'EARN_REDEMPTION', 'EARN_REWARD'],
  convert: ['CONVERT'],
}

function normalizeAssetSearch(value: string) {
  const search = value
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .trim()

  return search ? [search] : []
}

export async function getAssetTransactions(
  offset: number,
  filters?: { search: string; type: AssetHistoryTypeFilter; dateRange: AssetHistoryDateRange },
): Promise<AssetTransaction[]> {
  let query = supabase
    .from('asset_transactions')
    .select(
      'id, source, external_id, group_id, event_type, direction, asset, related_asset, amount, fee_amount, fee_asset, occurred_at, status, network, transaction_id, source_wallet, target_wallet, created_at',
    )

  const searchTerms = filters ? normalizeAssetSearch(filters.search) : []
  if (searchTerms.length > 0) {
    const searchFilters = searchTerms.flatMap((search) => [`asset.ilike.%${search}%`, `related_asset.ilike.%${search}%`])
    query = query.or(searchFilters.join(','))
  }

  const eventTypes = filters ? eventTypesByFilter[filters.type] : undefined
  if (eventTypes) query = query.in('event_type', eventTypes)

  if (filters?.dateRange.from) {
    const [year, month, day] = filters.dateRange.from.split('-').map(Number)
    query = query.gte('occurred_at', new Date(year, month - 1, day).toISOString())
  }
  if (filters?.dateRange.to) {
    const [year, month, day] = filters.dateRange.to.split('-').map(Number)
    query = query.lt('occurred_at', new Date(year, month - 1, day + 1).toISOString())
  }

  const { data, error } = await query
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
