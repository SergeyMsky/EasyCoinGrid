import { supabase } from '@/shared/lib/supabase'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'
import { matchBinanceTradesFifo, type BinanceSpotTrade } from '@/features/portfolio/utils/rotationMatching'

type BinanceSpotTradesResponse = {
  symbols: string[]
  trades: BinanceSpotTrade[]
  syncedAt: string
  oldestTradeTime: number | null
  newestTradeTime: number | null
}

export type SpotRotationSyncStatus = {
  syncedAt: string
  symbolsScanned: number
  tradesImported: number
  unmatchedSellTrades: number
  oldestTradeTime: number | null
  newestTradeTime: number | null
}

export async function syncBinanceSpotRotations(assets: string[], knownSymbols: string[] = []): Promise<SpotRotationSyncStatus> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(`Unable to verify your Binance account: ${userError.message}`)
  }
  if (!user) {
    throw new Error('Sign in before syncing Binance spot rotations.')
  }

  const { data, error } = await supabase.functions.invoke<BinanceSpotTradesResponse>('get-binance-spot-trades', {
    body: { assets, knownSymbols },
  })

  if (error) {
    if (error.context instanceof Response) {
      const responseBody = await error.context.text()
      let detail = responseBody || error.message

      try {
        const responseData: unknown = JSON.parse(responseBody)
        if (typeof responseData === 'object' && responseData !== null && 'error' in responseData && typeof responseData.error === 'string') {
          detail = responseData.error
        }
      } catch {
        // Keep the response body as-is when the Edge Function did not return JSON.
      }

      throw new Error(`Unable to load Binance spot trades (HTTP ${error.context.status}): ${detail}`)
    }

    throw new Error(`Unable to load Binance spot trades: ${error.message}`)
  }
  if (
    !data ||
    !Array.isArray(data.symbols) ||
    !Array.isArray(data.trades) ||
    typeof data.syncedAt !== 'string' ||
    !(data.oldestTradeTime === null || Number.isFinite(data.oldestTradeTime)) ||
    !(data.newestTradeTime === null || Number.isFinite(data.newestTradeTime))
  ) {
    throw new Error('Invalid Binance spot trades response.')
  }

  const { rotations, unmatchedSellTrades } = matchBinanceTradesFifo(data.trades, {
    userId: user.id,
    priceToUsd: (price) => price,
    feeToUsd: (amount) => amount,
  })

  if (unmatchedSellTrades.length > 0) {
    console.warn(`Binance rotation sync found ${unmatchedSellTrades.length} sell trade(s) without a matching buy trade.`)
  }

  const rows = rotations.map((rotation: SpotRotation) => ({
    symbol: rotation.symbol,
    buy_order_id: rotation.buy_order_id,
    buy_trade_id: rotation.buy_trade_id,
    buy_time: rotation.buy_time,
    buy_price: rotation.buy_price,
    buy_qty: rotation.buy_qty,
    status: rotation.status,
    sell_order_id: rotation.sell_order_id,
    sell_trade_id: rotation.sell_trade_id,
    sell_time: rotation.sell_time,
    sell_price: rotation.sell_price,
    sold_qty: rotation.sold_qty,
    fee_amount: rotation.fee_amount,
    realized_pnl_usd: rotation.realized_pnl_usd,
    realized_pnl_percent: rotation.realized_pnl_percent,
  }))

  const { error: syncError } = await supabase.rpc('sync_auto_spot_rotations', {
    p_symbols: data.symbols,
    p_rotations: rows,
  })

  if (syncError) {
    throw new Error(`Unable to save Binance spot rotations: ${syncError.message}`)
  }

  return {
    syncedAt: data.syncedAt,
    symbolsScanned: data.symbols.length,
    tradesImported: data.trades.length,
    unmatchedSellTrades: unmatchedSellTrades.length,
    oldestTradeTime: data.oldestTradeTime,
    newestTradeTime: data.newestTradeTime,
  }
}
