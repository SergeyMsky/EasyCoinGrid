import { describe, expect, it } from 'vitest'
import {
  BINANCE_EARN_HISTORY_ENDPOINTS,
  getBinanceHistoryRows,
  getBinanceHttpError,
  normalizeConvertRecord,
  normalizeEarnRecord,
  normalizeSpotTradeRecord,
} from '../../../supabase/functions/_shared/binance-additional-history'

describe('Binance Simple Earn and Convert history normalization', () => {
  it('uses the documented Simple Earn history paths', () => {
    expect(BINANCE_EARN_HISTORY_ENDPOINTS.map(({ path }) => path)).toEqual([
      '/sapi/v1/simple-earn/flexible/history/subscriptionRecord',
      '/sapi/v1/simple-earn/flexible/history/redemptionRecord',
      '/sapi/v1/simple-earn/flexible/history/rewardsRecord',
      '/sapi/v1/simple-earn/locked/history/subscriptionRecord',
      '/sapi/v1/simple-earn/locked/history/redemptionRecord',
      '/sapi/v1/simple-earn/locked/history/rewardsRecord',
    ])
  })

  it('requests all Flexible reward types without adding a type to Locked rewards', () => {
    expect(BINANCE_EARN_HISTORY_ENDPOINTS.find(({ kind }) => kind === 'FLEXIBLE_REWARD')).toHaveProperty('queryParams', { type: 'ALL' })
    expect(BINANCE_EARN_HISTORY_ENDPOINTS.find(({ kind }) => kind === 'LOCKED_REWARD')).not.toHaveProperty('queryParams')
  })

  it('records Earn subscriptions as movements from Spot into the Earn product', () => {
    const transaction = normalizeEarnRecord('user-1', 'FLEXIBLE_SUBSCRIPTION', {
      purchaseId: 123,
      asset: 'USDT',
      amount: '50.00000000',
      purchaseTime: 1793500000000,
      status: 'SUCCESS',
    })

    expect(transaction).toMatchObject({
      source: 'BINANCE_SIMPLE_EARN',
      event_type: 'EARN_SUBSCRIPTION',
      direction: 'OUT',
      asset: 'USDT',
      amount: '50.00000000',
      source_wallet: 'SPOT',
      target_wallet: 'SIMPLE_EARN_FLEXIBLE',
    })
  })

  it('records Earn rewards as inbound asset movements', () => {
    const transaction = normalizeEarnRecord('user-1', 'LOCKED_REWARD', {
      positionId: 456,
      asset: 'BNB',
      amount: '0.002',
      time: 1793500000000,
    })

    expect(transaction).toMatchObject({
      event_type: 'EARN_REWARD',
      direction: 'IN',
      source_wallet: 'SIMPLE_EARN_LOCKED',
      target_wallet: 'SPOT',
    })
  })

  it('normalizes Flexible reward history using Binance rewards fields', () => {
    const transaction = normalizeEarnRecord('user-1', 'FLEXIBLE_REWARD', {
      asset: 'USDT',
      rewards: '0.00012345',
      projectId: 'project-1',
      type: 'REALTIME',
      time: 1793500000000,
    })

    expect(transaction).toMatchObject({
      event_type: 'EARN_REWARD',
      direction: 'IN',
      asset: 'USDT',
      amount: '0.00012345',
      external_id: 'FLEXIBLE_REWARD:USDT:0.00012345:2026-11-01T02:26:40.000Z:project-1:REALTIME',
    })
  })

  it('records a Spot buy as linked base, quote, and fee movements with exact decimal multiplication', () => {
    const transactions = normalizeSpotTradeRecord(
      'user-1',
      {
        id: 31,
        orderId: 1001,
        price: '650.25',
        qty: '0.0002',
        commission: '0.00000020',
        commissionAsset: 'BNB',
        time: 1793500000000,
        isBuyer: true,
      },
      { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT' },
    )

    expect(transactions).toHaveLength(3)
    expect(transactions[0]).toMatchObject({
      external_id: 'BNBUSDT:31:BASE',
      group_id: 'BNBUSDT:31',
      event_type: 'SPOT_TRADE',
      direction: 'IN',
      asset: 'BNB',
      related_asset: 'USDT',
      amount: '0.0002',
      transaction_id: '1001',
    })
    expect(transactions[1]).toMatchObject({
      external_id: 'BNBUSDT:31:QUOTE',
      direction: 'OUT',
      asset: 'USDT',
      related_asset: 'BNB',
      amount: '0.13005',
    })
    expect(transactions[2]).toMatchObject({
      external_id: 'BNBUSDT:31:FEE',
      event_type: 'SPOT_TRADE_FEE',
      direction: 'OUT',
      asset: 'BNB',
      amount: '0.00000020',
      fee_amount: '0',
      fee_asset: null,
    })
  })

  it('records a Spot sell and omits zero-fee movements', () => {
    const transactions = normalizeSpotTradeRecord(
      'user-1',
      {
        id: 32,
        orderId: 1002,
        price: '650.25',
        qty: '0.0002',
        commission: '0.000',
        commissionAsset: '',
        time: 1793500000000,
        isBuyer: false,
      },
      { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT' },
    )

    expect(transactions).toHaveLength(2)
    expect(transactions[0]).toMatchObject({ direction: 'OUT', asset: 'BNB' })
    expect(transactions[1]).toMatchObject({ direction: 'IN', asset: 'USDT', amount: '0.13005' })
  })

  it('represents a Convert trade as linked outgoing and incoming asset movements', () => {
    const transactions = normalizeConvertRecord('user-1', {
      orderId: 987,
      fromAsset: 'BTC',
      fromAmount: '0.01',
      toAsset: 'USDT',
      toAmount: '650',
      createTime: 1793500000000,
      orderStatus: 'SUCCESS',
    })

    expect(transactions).toHaveLength(2)
    expect(transactions[0]).toMatchObject({
      external_id: '987:OUT',
      group_id: '987',
      event_type: 'CONVERT',
      direction: 'OUT',
      asset: 'BTC',
      related_asset: 'USDT',
      amount: '0.01',
    })
    expect(transactions[1]).toMatchObject({
      external_id: '987:IN',
      group_id: '987',
      event_type: 'CONVERT',
      direction: 'IN',
      asset: 'USDT',
      related_asset: 'BTC',
      amount: '650',
    })
  })

  it('accepts array Convert responses and paginated Earn responses', () => {
    const convertRecord = { orderId: 1 }
    const earnRecord = { purchaseId: 2 }

    expect(getBinanceHistoryRows([convertRecord], 'Convert history')).toEqual([convertRecord])
    expect(getBinanceHistoryRows({ total: 1, rows: [earnRecord] }, 'Earn history')).toEqual([earnRecord])
    expect(getBinanceHistoryRows({ total: 0 }, 'Earn history')).toEqual([])
  })

  it('preserves Binance HTTP error code and message', () => {
    expect(getBinanceHttpError(400, '{"code":-1102,"msg":"Mandatory parameter was not sent"}')).toBe(
      'Binance rejected an asset history request (HTTP 400): [-1102] Mandatory parameter was not sent',
    )
    expect(getBinanceHttpError(403, 'Forbidden')).toBe('Binance rejected an asset history request (HTTP 403): Forbidden')
  })
})
