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
