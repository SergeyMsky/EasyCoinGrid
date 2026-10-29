export type Asset = {
  asset: string
  free: string
  locked: string
  price: number
  avgBuy: number | null
  change24h: number
  change24hPercent: number
  name?: string
  image?: string | null
}

export type AssetDisplay = Asset & {
  amount: number
  convertedPrice: number
  convertedAvgBuy: number | null
  convertedChange24h: number
  convertedTotal: number
  convertedPnl: number
  convertedPnlPercent: number | null
}

export type SortOption = 'Name' | 'Amount' | 'Change' | 'Total' | 'Price' | 'Avg' | 'Pl'

export type SortDirection = 'asc' | 'desc'

export const VIEW_OPTIONS = ['all', 'gainers', 'losers'] as const
export type FilterOption = (typeof VIEW_OPTIONS)[number]

export const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'UAH'] as const
export const SORTED_CURRENCY_OPTIONS = [...CURRENCY_OPTIONS].sort((a, b) => a.localeCompare(b))
export type Currency = (typeof CURRENCY_OPTIONS)[number]

export type SpotRotationStatus = 'OPEN' | 'CLOSED'
export type SpotRotationMatchType = 'AUTO_API' | 'MANUAL'

export type SpotRotation = {
  id: string
  user_id: string
  symbol: string
  buy_order_id: string | null
  buy_trade_id: string | null
  buy_time: string | null
  buy_price: number
  buy_qty: number
  status: SpotRotationStatus
  sell_order_id: string | null
  sell_trade_id: string | null
  sell_time: string | null
  sell_price: number | null
  sold_qty: number
  fee_amount: number
  realized_pnl_usd: number | null
  realized_pnl_percent: number | null
  match_type: SpotRotationMatchType
}

export type CloseRotationInput = {
  sellPrice: number
  soldQty: number
  sellFeeAmountUsd: number
  sellTradeId?: string
  sellTime: string
  realizedPnlUsd: number
  realizedPnlPercent: number
}

export type CreateSpotRotationInput = {
  symbol: string
  buyPrice: number
  buyQty: number
  feeAmountUsd: number
  buyOrderId?: string
  buyTradeId?: string
  buyTime: string
}

export type SpotPortfolioSnapshot = {
  id: string
  snapshot_at: string
  total_value_usd: number
  source: 'BINANCE_DAILY' | 'APP_OBSERVED'
}
