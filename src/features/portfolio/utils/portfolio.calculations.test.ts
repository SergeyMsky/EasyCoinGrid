import { describe, expect, it } from 'vitest'
import type { Asset } from '@/features/portfolio/portfolio.types'
import { enrichAsset, sortAssets } from '@/features/portfolio/utils/portfolio.calculations'

const asset: Asset = {
  asset: 'BTC',
  free: '2',
  locked: '1',
  price: 100,
  avgBuy: 80,
  change24h: 5,
  change24hPercent: 6.25,
  name: 'Bitcoin',
  image: null,
}

describe('enrichAsset', () => {
  it('calculates converted asset values', () => {
    const result = enrichAsset(asset, 2)

    expect(result.amount).toBe(3)
    expect(result.convertedPrice).toBe(200)
    expect(result.convertedAvgBuy).toBe(160)
    expect(result.convertedChange24h).toBe(10)
    expect(result.convertedTotal).toBe(600)
    expect(result.convertedPnl).toBe(120)
    expect(result.convertedPnlPercent).toBe(25)
  })

  it('handles assets without average buy price', () => {
    const result = enrichAsset(
      {
        ...asset,
        avgBuy: null,
      },
      2,
    )

    expect(result.convertedAvgBuy).toBeNull()
    expect(result.convertedPnl).toBe(0)
    expect(result.convertedPnlPercent).toBeNull()
  })
})

describe('sortAssets', () => {
  it('sorts assets by total descending', () => {
    const assets = [enrichAsset({ ...asset, asset: 'BTC', free: '1' }, 1), enrichAsset({ ...asset, asset: 'ETH', free: '3' }, 1)]

    const result = sortAssets(assets, 'Total', 'desc')

    expect(result.map((item) => item.asset)).toEqual(['ETH', 'BTC'])
  })

  it('does not mutate the original array', () => {
    const assets = [enrichAsset({ ...asset, asset: 'BTC' }, 1), enrichAsset({ ...asset, asset: 'ETH' }, 1)]

    const original = [...assets]

    sortAssets(assets, 'Name', 'desc')

    expect(assets).toEqual(original)
  })
})
