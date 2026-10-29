import type { SpotPortfolioSnapshot } from '@/features/portfolio/portfolio.types'

export type PortfolioHistoryPeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'

export type PortfolioHistoryPoint = {
  timestamp: number
  valueUsd: number
  source: SpotPortfolioSnapshot['source']
}

const periodMilliseconds: Record<Exclude<PortfolioHistoryPeriod, 'ALL'>, number> = {
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
  '3M': 90 * 24 * 60 * 60 * 1000,
  '1Y': 365 * 24 * 60 * 60 * 1000,
}

export function getPortfolioHistoryPoints(snapshots: SpotPortfolioSnapshot[], period: PortfolioHistoryPeriod, now = Date.now()): PortfolioHistoryPoint[] {
  const cutoff = period === 'ALL' ? Number.NEGATIVE_INFINITY : now - periodMilliseconds[period]
  const deduplicated = new Map<number, PortfolioHistoryPoint>()

  for (const snapshot of snapshots) {
    const timestamp = Date.parse(snapshot.snapshot_at)
    if (!Number.isFinite(timestamp) || timestamp > now) continue
    const valueUsd = Number(snapshot.total_value_usd)
    if (!Number.isFinite(valueUsd) || valueUsd < 0 || timestamp < cutoff) continue

    deduplicated.set(timestamp, { timestamp, valueUsd, source: snapshot.source })
  }

  return [...deduplicated.values()].sort((a, b) => a.timestamp - b.timestamp)
}

export function getPortfolioHistoryChange(points: PortfolioHistoryPoint[]) {
  if (points.length < 2) return null

  const firstValue = points[0].valueUsd
  const lastValue = points[points.length - 1].valueUsd

  return {
    changeUsd: lastValue - firstValue,
    changePercent: firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : null,
  }
}
