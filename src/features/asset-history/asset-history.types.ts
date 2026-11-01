export type AssetTransaction = {
  id: string
  source: 'BINANCE_DEPOSIT' | 'BINANCE_WITHDRAWAL' | 'BINANCE_TRANSFER' | 'BINANCE_SIMPLE_EARN' | 'BINANCE_CONVERT' | 'BINANCE_SPOT_TRADE'
  external_id: string
  group_id: string | null
  event_type:
    'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'EARN_SUBSCRIPTION' | 'EARN_REDEMPTION' | 'EARN_REWARD' | 'CONVERT' | 'SPOT_TRADE' | 'SPOT_TRADE_FEE'
  direction: 'IN' | 'OUT' | 'INTERNAL'
  asset: string
  related_asset: string | null
  amount: number | string
  fee_amount: number | string
  fee_asset: string | null
  occurred_at: string
  status: string
  network: string | null
  transaction_id: string | null
  source_wallet: string | null
  target_wallet: string | null
  created_at: string
}

export type AssetHistorySyncResult = {
  syncedAt: string
  depositsImported: number
  withdrawalsImported: number
  transfersImported: number
  simpleEarnRecordsImported: number
  convertTradesImported: number
  spotTradesImported: number
  oldestTransactionTime: number | null
  newestTransactionTime: number | null
}
