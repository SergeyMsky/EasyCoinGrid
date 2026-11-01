import { describe, expect, it } from 'vitest'
import { getBinanceTransferRows } from '../../../supabase/functions/_shared/binance-transfer-history'

describe('getBinanceTransferRows', () => {
  it('treats a zero-total response without rows as empty history', () => {
    expect(getBinanceTransferRows({ total: 0 }, 'MAIN_FUNDING', 1, 100)).toEqual([])
  })

  it('returns rows from a populated response', () => {
    const row = { asset: 'BTC', amount: '0.5', tranId: 123, timestamp: 1 }

    expect(getBinanceTransferRows({ total: 1, rows: [row] }, 'MAIN_FUNDING', 1, 100)).toEqual([row])
  })

  it('treats a page beyond the reported total as empty when rows are omitted', () => {
    expect(getBinanceTransferRows({ total: 100 }, 'MAIN_FUNDING', 2, 100)).toEqual([])
  })

  it('rejects malformed responses and rows', () => {
    expect(() => getBinanceTransferRows({ total: 100 }, 'MAIN_FUNDING', 1, 100)).toThrow(
      'Binance returned an invalid transfer history response for MAIN_FUNDING.',
    )
    expect(() => getBinanceTransferRows({ total: 1, rows: [null] }, 'MAIN_FUNDING', 1, 100)).toThrow(
      'Binance returned an invalid transfer record for MAIN_FUNDING.',
    )
  })
})
