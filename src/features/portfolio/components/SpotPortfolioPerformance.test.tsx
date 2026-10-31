import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AssetDisplay, SpotPortfolioSnapshot } from '@/features/portfolio/portfolio.types'
import { SpotPortfolioPerformance } from './SpotPortfolioPerformance'

function asset(asset: string, convertedTotal: number): AssetDisplay {
  return {
    asset,
    free: '0',
    locked: '0',
    price: 1,
    avgBuy: null,
    change24h: 0,
    change24hPercent: 0,
    amount: convertedTotal,
    convertedPrice: 1,
    convertedAvgBuy: null,
    convertedChange24h: 0,
    convertedTotal,
    convertedPnl: 0,
    convertedPnlPercent: null,
  }
}

describe('SpotPortfolioPerformance', () => {
  it('renders the Spot account value chart and warns that changes are not cash-flow adjusted', async () => {
    const now = Date.now()
    const snapshots: SpotPortfolioSnapshot[] = [
      { id: 'one', snapshot_at: new Date(now - 60_000).toISOString(), total_value_usd: 1000, source: 'BINANCE_DAILY' },
      { id: 'two', snapshot_at: new Date(now).toISOString(), total_value_usd: 1100, source: 'APP_OBSERVED' },
    ]

    render(
      <SpotPortfolioPerformance
        snapshots={snapshots}
        loading={false}
        error={null}
        enabled
        assets={[asset('USDT', 800), asset('SOL', 200)]}
        currency="USD"
        currencyRate={1}
      />,
    )

    expect(screen.getByText('Spot portfolio value')).toBeInTheDocument()
    expect(screen.getByText('Portfolio allocation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /SOL, 20\.00 percent/ })).toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByRole('button', { name: /SOL, 20\.00 percent/ }))
    expect(screen.getAllByText('SOL')).toHaveLength(2)
    expect(screen.getByRole('img', { name: /Spot portfolio value history, 2 data points/ })).toBeInTheDocument()
    const chart = screen.getByRole('img', { name: /Spot portfolio value history/ })
    const chartSvg = chart.querySelector('svg')
    expect(chartSvg).not.toBeNull()
    fireEvent.mouseMove(chartSvg!, { clientX: 400, clientY: 100 })
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/\$1,000\.00|\$1,100\.00/)
    expect(screen.getByText('value change for selected period').parentElement).toHaveTextContent(/\+\$100\.00/)
    expect(screen.getByText(/not cash-flow-adjusted profit/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1M' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('explains why the chart is unavailable without a connected exchange', () => {
    render(<SpotPortfolioPerformance snapshots={[]} loading={false} error={null} enabled={false} assets={[]} currency="USD" currencyRate={1} />)

    expect(screen.getByText('Connect a real Binance account to load Spot portfolio history.')).toBeInTheDocument()
  })

  it('converts the chart value and selected-period change to the selected currency', () => {
    const now = Date.now()
    const snapshots: SpotPortfolioSnapshot[] = [
      { id: 'one', snapshot_at: new Date(now - 60_000).toISOString(), total_value_usd: 1000, source: 'BINANCE_DAILY' },
      { id: 'two', snapshot_at: new Date(now).toISOString(), total_value_usd: 1100, source: 'APP_OBSERVED' },
    ]

    render(
      <SpotPortfolioPerformance
        snapshots={snapshots}
        loading={false}
        error={null}
        enabled
        assets={[asset('USDT', 800), asset('SOL', 200)]}
        currency="EUR"
        currencyRate={0.92}
      />,
    )

    expect(screen.getByText('Spot portfolio value').nextElementSibling).toHaveTextContent(/€1,012\.00/)
    expect(screen.getByText('value change for selected period').parentElement).toHaveTextContent(/\+€92\.00/)
    expect(screen.getByRole('img', { name: /Spot portfolio value history, 2 data points/ })).toBeInTheDocument()
  })
})
