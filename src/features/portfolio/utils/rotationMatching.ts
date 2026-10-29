import type { CloseRotationInput, SpotRotation } from '@/features/portfolio/portfolio.types'

export type BinanceSpotTrade = {
  id: number | string
  orderId: number | string
  symbol: string
  baseAsset?: string
  price: string | number
  qty: string | number
  commission: string | number
  commissionAsset: string
  time: number
  isBuyer: boolean
  priceUsd?: number
  commissionUsd?: number
}

type RealizedPnlInput = {
  buyPrice: number
  soldQty: number
  sellPrice: number
  feeAmountUsd?: number
}

type MatchBinanceTradesOptions = {
  userId: string
  priceToUsd: (price: number, trade: BinanceSpotTrade) => number
  feeToUsd: (amount: number, asset: string, trade: BinanceSpotTrade) => number
}

type OpenLot = {
  buyTrade: BinanceSpotTrade
  buyPriceUsd: number
  remainingQty: number
  remainingFeeUsd: number
}

export type BinanceTradeMatchResult = {
  rotations: SpotRotation[]
  unmatchedSellTrades: BinanceSpotTrade[]
}

export function calculateNetRealizedPnl({ buyPrice, soldQty, sellPrice, feeAmountUsd = 0 }: RealizedPnlInput) {
  if (![buyPrice, soldQty, sellPrice, feeAmountUsd].every(Number.isFinite)) {
    throw new TypeError('Price, quantity, and fee values must be finite numbers.')
  }
  if (buyPrice <= 0 || sellPrice < 0 || soldQty <= 0 || feeAmountUsd < 0) {
    throw new RangeError('Prices and quantities must be positive, and fees cannot be negative.')
  }

  const costBasisUsd = buyPrice * soldQty
  const realizedPnlUsd = (sellPrice - buyPrice) * soldQty - feeAmountUsd

  return {
    realizedPnlUsd,
    realizedPnlPercent: (realizedPnlUsd / costBasisUsd) * 100,
  }
}

export function matchBinanceTradesFifo(
  trades: BinanceSpotTrade[],
  { userId, priceToUsd, feeToUsd }: MatchBinanceTradesOptions,
): BinanceTradeMatchResult {
  const orderedTrades = [...trades].sort((a, b) => a.time - b.time || Number(a.id) - Number(b.id))
  const lotsBySymbol = new Map<string, OpenLot[]>()
  const rotations: SpotRotation[] = []
  const unmatchedSellTrades: BinanceSpotTrade[] = []

  for (const trade of orderedTrades) {
    const quantity = Number(trade.qty)
    const price = Number(trade.price)
    const commission = Number(trade.commission)
    const priceUsd = trade.priceUsd ?? priceToUsd(price, trade)
    const feeUsd = trade.commissionUsd ?? feeToUsd(commission, trade.commissionAsset, trade)

    if (![quantity, price, commission, priceUsd, feeUsd].every(Number.isFinite) || quantity <= 0 || price <= 0 || commission < 0 || priceUsd <= 0 || feeUsd < 0) {
      throw new RangeError(`Trade ${trade.id} contains invalid price, quantity, or fee data.`)
    }

    const assetKey = trade.baseAsset ?? trade.symbol
    const lots = lotsBySymbol.get(assetKey) ?? []

    if (trade.isBuyer) {
      lots.push({ buyTrade: trade, buyPriceUsd: priceUsd, remainingQty: quantity, remainingFeeUsd: feeUsd })
      lotsBySymbol.set(assetKey, lots)
      continue
    }

    let remainingToSell = quantity
    let matchedIndex = 0

    while (remainingToSell > 0 && lots.length > 0) {
      const lot = lots[0]
      const matchedQty = Math.min(remainingToSell, lot.remainingQty)
      const buyFeeUsd = lot.remainingFeeUsd * (matchedQty / lot.remainingQty)
      const sellFeeUsd = feeUsd * (matchedQty / quantity)
      const totalFeeUsd = buyFeeUsd + sellFeeUsd
      const { realizedPnlUsd, realizedPnlPercent } = calculateNetRealizedPnl({
        buyPrice: lot.buyPriceUsd,
        soldQty: matchedQty,
        sellPrice: priceUsd,
        feeAmountUsd: totalFeeUsd,
      })

      rotations.push({
        id: `${trade.symbol}:${lot.buyTrade.id}:${trade.id}:${matchedIndex}`,
        user_id: userId,
        symbol: lot.buyTrade.symbol,
        buy_order_id: String(lot.buyTrade.orderId),
        buy_trade_id: String(lot.buyTrade.id),
        buy_time: new Date(lot.buyTrade.time).toISOString(),
        buy_price: lot.buyPriceUsd,
        buy_qty: matchedQty,
        status: 'CLOSED',
        sell_order_id: String(trade.orderId),
        sell_trade_id: String(trade.id),
        sell_time: new Date(trade.time).toISOString(),
        sell_price: priceUsd,
        sold_qty: matchedQty,
        fee_amount: totalFeeUsd,
        realized_pnl_usd: realizedPnlUsd,
        realized_pnl_percent: realizedPnlPercent,
        match_type: 'AUTO_API',
      })

      lot.remainingQty -= matchedQty
      lot.remainingFeeUsd -= buyFeeUsd
      remainingToSell -= matchedQty
      matchedIndex += 1

      if (lot.remainingQty <= Number.EPSILON) lots.shift()
    }

    if (remainingToSell > Number.EPSILON) unmatchedSellTrades.push(trade)
  }

  for (const lots of lotsBySymbol.values()) {
    for (const lot of lots) {
      rotations.push({
        id: `${lot.buyTrade.symbol}:${lot.buyTrade.id}:open`,
        user_id: userId,
        symbol: lot.buyTrade.symbol,
        buy_order_id: String(lot.buyTrade.orderId),
        buy_trade_id: String(lot.buyTrade.id),
        buy_time: new Date(lot.buyTrade.time).toISOString(),
        buy_price: lot.buyPriceUsd,
        buy_qty: lot.remainingQty,
        status: 'OPEN',
        sell_order_id: null,
        sell_trade_id: null,
        sell_time: null,
        sell_price: null,
        sold_qty: 0,
        fee_amount: lot.remainingFeeUsd,
        realized_pnl_usd: null,
        realized_pnl_percent: null,
        match_type: 'AUTO_API',
      })
    }
  }

  return { rotations, unmatchedSellTrades }
}

export function calculateRotationClose(rotation: SpotRotation, input: Omit<CloseRotationInput, 'realizedPnlUsd' | 'realizedPnlPercent'>) {
  const remainingQty = rotation.buy_qty - rotation.sold_qty
  if (!Number.isFinite(input.soldQty) || input.soldQty <= 0 || input.soldQty > remainingQty) {
    throw new RangeError('The sell quantity cannot exceed the remaining rotation quantity.')
  }
  if (!Number.isFinite(input.sellPrice) || input.sellPrice <= 0 || !Number.isFinite(input.sellFeeAmountUsd) || input.sellFeeAmountUsd < 0) {
    throw new RangeError('Enter a positive sell price and a non-negative fee.')
  }

  const allocatedBuyFeeUsd = rotation.fee_amount * (input.soldQty / remainingQty)
  const pnl = calculateNetRealizedPnl({
    buyPrice: rotation.buy_price,
    soldQty: input.soldQty,
    sellPrice: input.sellPrice,
    feeAmountUsd: allocatedBuyFeeUsd + input.sellFeeAmountUsd,
  })

  return { ...input, ...pnl }
}
