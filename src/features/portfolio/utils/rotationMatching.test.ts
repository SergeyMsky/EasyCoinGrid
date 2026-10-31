import { describe, expect, it } from 'vitest'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'
import {
  calculateNetRealizedPnl,
  calculateRotationClose,
  matchBinanceTradesFifo,
  type BinanceSpotTrade,
} from '@/features/portfolio/utils/rotationMatching'

const rotation: SpotRotation = {
  id: 'rotation-1',
  user_id: 'user-1',
  symbol: 'BTCUSDT',
  buy_order_id: 'buy-1',
  buy_trade_id: 'buy-trade-1',
  buy_time: '2026-10-29T12:00:00.000Z',
  buy_price: 100,
  buy_qty: 2,
  status: 'OPEN',
  sell_order_id: null,
  sell_trade_id: null,
  sell_time: null,
  sell_price: null,
  sold_qty: 0,
  fee_amount: 2,
  realized_pnl_usd: null,
  realized_pnl_percent: null,
  match_type: 'MANUAL',
}

function trade(overrides: Partial<BinanceSpotTrade>): BinanceSpotTrade {
  return {
    id: '1',
    orderId: 'order-1',
    symbol: 'BTCUSDT',
    price: 100,
    qty: 1,
    commission: 0,
    commissionAsset: 'USDT',
    time: 1,
    isBuyer: true,
    ...overrides,
  }
}

describe('calculateNetRealizedPnl', () => {
  it('subtracts USD-converted fees from realized PnL and computes return on cost basis', () => {
    expect(calculateNetRealizedPnl({ buyPrice: 100, soldQty: 2, sellPrice: 120, feeAmountUsd: 4 })).toEqual({
      realizedPnlUsd: 36,
      realizedPnlPercent: 18,
    })
  })

  it('rejects invalid values', () => {
    expect(() => calculateNetRealizedPnl({ buyPrice: 0, soldQty: 1, sellPrice: 10 })).toThrow(RangeError)
  })
})

describe('calculateRotationClose', () => {
  it('allocates the buy fee proportionally for a partial close', () => {
    expect(calculateRotationClose(rotation, { sellPrice: 120, soldQty: 1, sellFeeAmountUsd: 1, sellTime: '2026-10-29T13:00:00.000Z' })).toEqual({
      sellPrice: 120,
      soldQty: 1,
      sellFeeAmountUsd: 1,
      sellTradeId: undefined,
      sellTime: '2026-10-29T13:00:00.000Z',
      realizedPnlUsd: 18,
      realizedPnlPercent: 18,
    })
  })

  it('rejects a close larger than the remaining quantity', () => {
    expect(() => calculateRotationClose(rotation, { sellPrice: 120, soldQty: 3, sellFeeAmountUsd: 0, sellTime: '2026-10-29T13:00:00.000Z' })).toThrow(
      RangeError,
    )
  })
})

describe('matchBinanceTradesFifo', () => {
  const options = {
    userId: 'user-1',
    priceToUsd: (price: number) => price,
    feeToUsd: (amount: number) => amount,
  }

  it('matches sells against buys in FIFO order and leaves the residual lot open', () => {
    const trades = [
      trade({ id: 2, orderId: 20, price: 110, qty: 1.5, time: 2, isBuyer: false, commission: 0.5 }),
      trade({ id: 1, orderId: 10, price: 100, qty: 1, time: 1, isBuyer: true, commission: 1 }),
      trade({ id: 3, orderId: 11, price: 105, qty: 1, time: 1.5, isBuyer: true }),
    ]

    const result = matchBinanceTradesFifo(trades, options)

    expect(result.rotations).toHaveLength(3)
    expect(result.rotations[0]).toMatchObject({
      status: 'CLOSED',
      buy_order_id: '10',
      buy_trade_id: '1',
      buy_time: new Date(1).toISOString(),
      sell_trade_id: '2',
      sell_time: new Date(2).toISOString(),
      buy_qty: 1,
      sold_qty: 1,
    })
    expect(result.rotations[0].fee_amount).toBeCloseTo(1.3333333333333333)
    expect(result.rotations[0].realized_pnl_usd).toBeCloseTo(8.666666666666671)
    expect(result.rotations[1]).toMatchObject({
      status: 'CLOSED',
      buy_order_id: '11',
      buy_qty: 0.5,
      sold_qty: 0.5,
    })
    expect(result.rotations[1].fee_amount).toBeCloseTo(0.16666666666666666)
    expect(result.rotations[1].realized_pnl_usd).toBeCloseTo(2.3333333333333335)
    expect(result.rotations[2]).toMatchObject({ status: 'OPEN', buy_order_id: '11', buy_qty: 0.5 })
    expect(result.rotations[2]).toMatchObject({
      buy_trade_id: '3',
      buy_time: new Date(1.5).toISOString(),
      sell_trade_id: null,
      sell_time: null,
    })
    expect(result.unmatchedSellTrades).toEqual([])
  })

  it('reports sell quantities that have no matching buy lot', () => {
    const result = matchBinanceTradesFifo([trade({ isBuyer: false })], options)

    expect(result.rotations).toEqual([])
    expect(result.unmatchedSellTrades).toHaveLength(1)
  })

  it('uses the USD-normalized trade prices and fees returned by the Binance function', () => {
    const result = matchBinanceTradesFifo(
      [
        trade({ id: 1, price: 2, priceUsd: 200, qty: 1, commission: 0.01, commissionUsd: 2 }),
        trade({ id: 2, price: 2.5, priceUsd: 250, qty: 1, commission: 0.01, commissionUsd: 2, time: 2, isBuyer: false }),
      ],
      options,
    )

    expect(result.rotations[0]).toMatchObject({
      status: 'CLOSED',
      buy_price: 200,
      sell_price: 250,
      fee_amount: 4,
      realized_pnl_usd: 46,
    })
  })

  it('matches trades for the same asset across different quote pairs', () => {
    const result = matchBinanceTradesFifo(
      [
        trade({ id: 1, symbol: 'ETHBTC', baseAsset: 'ETH', price: 2000, priceUsd: 2000, time: 1 }),
        trade({ id: 2, symbol: 'ETHUSDC', baseAsset: 'ETH', price: 2200, priceUsd: 2200, time: 2, isBuyer: false }),
      ],
      options,
    )

    expect(result.rotations).toHaveLength(1)
    expect(result.rotations[0]).toMatchObject({
      symbol: 'ETHBTC',
      status: 'CLOSED',
      buy_price: 2000,
      sell_price: 2200,
      realized_pnl_usd: 200,
    })
  })
})
