import { supabase } from '@/shared/lib/supabase'

type BinanceSpotTradesSyncResponse = {
  syncedAt: string
  symbolsScanned: number
  tradesImported: number
  unmatchedSellTrades: number
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

export async function syncBinanceSpotRotations(assets: string[]): Promise<SpotRotationSyncStatus> {
  const { data, error } = await supabase.functions.invoke<BinanceSpotTradesSyncResponse>('get-binance-spot-trades', {
    body: { assets },
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
    typeof data.syncedAt !== 'string' ||
    !Number.isInteger(data.symbolsScanned) ||
    !Number.isInteger(data.tradesImported) ||
    !Number.isInteger(data.unmatchedSellTrades) ||
    !(data.oldestTradeTime === null || Number.isFinite(data.oldestTradeTime)) ||
    !(data.newestTradeTime === null || Number.isFinite(data.newestTradeTime))
  ) {
    throw new Error('Invalid Binance spot trades response.')
  }

  if (data.unmatchedSellTrades > 0) {
    console.warn(`Binance rotation sync found ${data.unmatchedSellTrades} sell trade(s) without a matching buy trade.`)
  }

  return {
    syncedAt: data.syncedAt,
    symbolsScanned: data.symbolsScanned,
    tradesImported: data.tradesImported,
    unmatchedSellTrades: data.unmatchedSellTrades,
    oldestTradeTime: data.oldestTradeTime,
    newestTradeTime: data.newestTradeTime,
  }
}
