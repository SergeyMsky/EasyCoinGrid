import { describe, expect, it } from 'vitest'
import { BINANCE_TRANSFER_TYPES } from '../../../supabase/functions/_shared/binance-transfer-types'

describe('Binance transfer history types', () => {
  it('only requests supported Spot, Margin, Futures and Funding wallet pairs', () => {
    expect(BINANCE_TRANSFER_TYPES).toHaveLength(18)
    expect(BINANCE_TRANSFER_TYPES.some(({ type }) => type.includes('OPTION') || type.includes('PORTFOLIO'))).toBe(false)
    expect(BINANCE_TRANSFER_TYPES.some(({ type }) => type.includes('ISOLATEDMARGIN'))).toBe(false)
  })
})
