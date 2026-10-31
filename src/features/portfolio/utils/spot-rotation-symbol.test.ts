import { describe, expect, it } from 'vitest'
import { getSpotRotationBaseAsset } from './spot-rotation-symbol'

describe('getSpotRotationBaseAsset', () => {
  it('extracts the base asset from supported spot trading pairs', () => {
    expect(getSpotRotationBaseAsset('BTCUSDT')).toBe('BTC')
    expect(getSpotRotationBaseAsset('USDTUSDC')).toBe('USDT')
  })

  it('normalizes symbols and preserves symbols without a quote suffix', () => {
    expect(getSpotRotationBaseAsset('ethusdt')).toBe('ETH')
    expect(getSpotRotationBaseAsset(' BNB ')).toBe('BNB')
  })
})
