import { describe, expect, it } from 'vitest'
import type { SpotPortfolioSnapshot } from '@/features/portfolio/portfolio.types'
import { getPortfolioHistoryChange, getPortfolioHistoryPoints } from './portfolio-history'

const now = Date.parse('2026-10-29T12:00:00.000Z')

function snapshot(id: string, daysAgo: number, value: number): SpotPortfolioSnapshot {
  return {
    id,
    snapshot_at: new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    total_value_usd: value,
    source: 'BINANCE_DAILY',
  }
}

describe('portfolio history calculations', () => {
  it('filters by selected range and sorts snapshots chronologically', () => {
    const points = getPortfolioHistoryPoints([snapshot('old', 10, 90), snapshot('new', 0, 110), snapshot('week', 3, 100)], '1W', now)

    expect(points.map((point) => point.valueUsd)).toEqual([100, 110])
  })

  it('calculates absolute and percentage value change without describing it as realized profit', () => {
    expect(getPortfolioHistoryChange([
      { timestamp: now - 1000, valueUsd: 200, source: 'BINANCE_DAILY' },
      { timestamp: now, valueUsd: 220, source: 'APP_OBSERVED' },
    ])).toEqual({ changeUsd: 20, changePercent: 10 })
  })

  it('does not calculate change for a single data point', () => {
    expect(getPortfolioHistoryChange([{ timestamp: now, valueUsd: 220, source: 'APP_OBSERVED' }])).toBeNull()
  })
})
