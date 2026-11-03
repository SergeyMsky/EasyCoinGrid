import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'
import { formatCurrency, formatSignedCurrency, formatUnitPrice } from '@/shared/utils/format-currency'
import { RotationsPage } from './RotationsPage'

const mocks = vi.hoisted(() => ({
  useSpotRotations: vi.fn(),
  useSpotRotationPrices: vi.fn(),
  useExchangeRates: vi.fn(),
  removeRotation: vi.fn(),
  editRotation: vi.fn(),
  refreshPrices: vi.fn(),
}))

vi.mock('@/features/portfolio/hooks/useSpotRotations', () => ({
  useSpotRotations: mocks.useSpotRotations,
}))

vi.mock('@/features/portfolio/hooks/useSpotRotationPrices', () => ({
  useSpotRotationPrices: mocks.useSpotRotationPrices,
}))

vi.mock('@/features/portfolio/hooks/useExchangeRates', () => ({
  useExchangeRates: mocks.useExchangeRates,
}))

vi.mock('@/features/portfolio/components/CoinImage', () => ({
  CoinImage: ({ asset, resolveMissingImage }: { asset: string; resolveMissingImage?: boolean }) => (
    <img alt={asset} data-resolve-missing-image={resolveMissingImage ? 'true' : 'false'} />
  ),
}))

const closedDeal: SpotRotation = {
  id: 'deal-1',
  user_id: 'user-1',
  symbol: 'DOT/USDT',
  coinpaprika_id: null,
  coingecko_id: null,
  buy_order_id: null,
  buy_trade_id: null,
  buy_time: '2026-10-29T12:00:00.000Z',
  buy_price: 6.712,
  buy_qty: 7.42,
  invested_amount: 50,
  status: 'CLOSED',
  sell_order_id: null,
  sell_trade_id: null,
  sell_time: '2026-10-30T12:00:00.000Z',
  sell_price: 7.525,
  sold_qty: 7.42,
  fee_amount: 0,
  realized_pnl_usd: 6.03246,
  realized_pnl_percent: 12.11,
  match_type: 'MANUAL',
}

describe('RotationsPage', () => {
  beforeEach(() => {
    localStorage.removeItem('spot-deals-sort')
    mocks.useSpotRotations.mockReturnValue({
      rotations: [],
      loading: true,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      editRotation: mocks.editRotation,
      removeRotation: mocks.removeRotation,
      deleting: false,
    })
    mocks.useExchangeRates.mockReturnValue({ rates: { USD: 1 } })
    mocks.refreshPrices.mockResolvedValue(undefined)
    mocks.useSpotRotationPrices.mockReturnValue({
      pricesByCoinId: {},
      loading: false,
      refreshing: false,
      error: null,
      updatedAt: null,
      refreshPrices: mocks.refreshPrices,
    })

  })

  it('renders the spot journal heading and summary while loading', () => {
    render(<RotationsPage currency="USD" userId="user-1" />)

    expect(screen.getByRole('heading', { name: 'Spot trade journal', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Rotation overview' })).toHaveAttribute('aria-busy', 'true')
  })

  it('shows manual deal fields and converts monetary values to the selected currency', () => {
    mocks.useSpotRotations.mockReturnValue({
      rotations: [closedDeal, { ...closedDeal, id: 'auto-deal', symbol: 'BTC/USDT', match_type: 'AUTO_API' }],
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      editRotation: mocks.editRotation,
      removeRotation: mocks.removeRotation,
      deleting: false,
    })
    mocks.useExchangeRates.mockReturnValue({ rates: { USD: 1, EUR: 2 } })

    render(<RotationsPage currency="EUR" userId="user-1" />)

    expect(screen.getByRole('region', { name: 'Manual spot deals' })).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByRole('columnheader', { name: 'Invested (EUR)' })).toBeInTheDocument()
    expect(screen.getByText('DOT/USDT')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'DOT' })).toHaveAttribute('data-resolve-missing-image', 'true')
    expect(screen.getByText(formatCurrency(100, 'EUR'))).toBeInTheDocument()
    expect(screen.getAllByText(formatSignedCurrency(6.03246 * 2, 'EUR'))).toHaveLength(2)
    expect(within(screen.getAllByRole('row')[1]).getByText('Closed')).toBeInTheDocument()
    expect(screen.queryByText(/^24h/)).not.toBeInTheDocument()
    expect(screen.getByText('Exit price')).toBeInTheDocument()
    expect(screen.getByText('Realized')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'P/L & ROI' })).toBeInTheDocument()
    expect(screen.queryByText('BTC/USDT')).not.toBeInTheDocument()
  })

  it('filters the journal by open and closed deal status', () => {
    const openDeal: SpotRotation = {
      ...closedDeal,
      id: 'open-deal',
      symbol: 'BTC/USDT',
      status: 'OPEN',
      sell_time: null,
      sell_price: null,
      sold_qty: 0,
      realized_pnl_usd: null,
      realized_pnl_percent: null,
    }
    mocks.useSpotRotations.mockReturnValue({
      rotations: [closedDeal, openDeal],
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      editRotation: mocks.editRotation,
      removeRotation: mocks.removeRotation,
      deleting: false,
    })

    render(<RotationsPage currency="USD" userId="user-1" />)

    const filters = screen.getByRole('group', { name: 'Filter spot deals' })
    expect(within(filters).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('DOT/USDT')).toBeInTheDocument()
    expect(screen.getByText('BTC/USDT')).toBeInTheDocument()

    fireEvent.click(within(filters).getByRole('button', { name: 'Open' }))
    expect(within(filters).getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('DOT/USDT')).not.toBeInTheDocument()
    expect(screen.getByText('BTC/USDT')).toBeInTheDocument()

    fireEvent.click(within(filters).getByRole('button', { name: 'Closed' }))
    expect(screen.queryByText('BTC/USDT')).not.toBeInTheDocument()
    expect(screen.getByText('DOT/USDT')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Search spot deals' }), { target: { value: 'BTC' } })
    expect(screen.queryByText('DOT/USDT')).not.toBeInTheDocument()
    expect(screen.getByText('No spot deals found')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(screen.getByText('DOT/USDT')).toBeInTheDocument()
    expect(screen.getByText('BTC/USDT')).toBeInTheDocument()
    expect(within(filters).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sorts deals by amount in both directions', () => {
    const smallerDeal = { ...closedDeal, id: 'deal-2', symbol: 'BTC/USDT', buy_qty: 1 }
    mocks.useSpotRotations.mockReturnValue({
      rotations: [closedDeal, smallerDeal],
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      editRotation: mocks.editRotation,
      removeRotation: mocks.removeRotation,
      deleting: false,
    })

    render(<RotationsPage currency="USD" userId="user-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Amount' }))
    let rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('DOT/USDT')).toBeInTheDocument()
    expect(within(rows[2]).getByText('BTC/USDT')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Amount' }))
    rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('BTC/USDT')).toBeInTheDocument()
    expect(within(rows[2]).getByText('DOT/USDT')).toBeInTheDocument()
  })

  it('marks Entry as the default newest-first sort', () => {
    const olderDeal = { ...closedDeal, id: 'older-deal', symbol: 'BTC/USDT', buy_time: '2026-10-28T12:00:00.000Z' }
    mocks.useSpotRotations.mockReturnValue({
      rotations: [olderDeal, closedDeal],
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      editRotation: mocks.editRotation,
      removeRotation: mocks.removeRotation,
      deleting: false,
    })

    render(<RotationsPage currency="USD" userId="user-1" />)

    expect(screen.getByRole('columnheader', { name: 'Entry' })).toHaveAttribute('aria-sort', 'descending')
    let rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('DOT/USDT')).toBeInTheDocument()
    expect(within(rows[2]).getByText('BTC/USDT')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Entry' }))
    rows = screen.getAllByRole('row')
    expect(screen.getByRole('columnheader', { name: 'Entry' })).toHaveAttribute('aria-sort', 'ascending')
    expect(within(rows[1]).getByText('BTC/USDT')).toBeInTheDocument()
    expect(within(rows[2]).getByText('DOT/USDT')).toBeInTheDocument()
  })

  it('persists and restores the selected deal sort', () => {
    const smallerDeal = { ...closedDeal, id: 'deal-2', symbol: 'BTC/USDT', buy_qty: 1 }
    mocks.useSpotRotations.mockReturnValue({
      rotations: [closedDeal, smallerDeal],
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      editRotation: mocks.editRotation,
      removeRotation: mocks.removeRotation,
      deleting: false,
    })

    const firstRender = render(<RotationsPage currency="USD" userId="user-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Amount' }))
    expect(JSON.parse(localStorage.getItem('spot-deals-sort') ?? 'null')).toEqual({ sortBy: 'amount', sortDirection: 'desc' })
    firstRender.unmount()

    render(<RotationsPage currency="USD" userId="user-1" />)
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toHaveAttribute('aria-sort', 'descending')
    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('DOT/USDT')).toBeInTheDocument()
    expect(within(rows[2]).getByText('BTC/USDT')).toBeInTheDocument()
  })

  it('paginates the filtered spot deals', () => {
    const rotations = Array.from({ length: 12 }, (_, index) => ({
      ...closedDeal,
      id: `deal-${index}`,
      symbol: `COIN${index}/USDT`,
      buy_time: new Date(Date.UTC(2026, 9, index + 1)).toISOString(),
    }))
    mocks.useSpotRotations.mockReturnValue({
      rotations,
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      editRotation: mocks.editRotation,
      removeRotation: mocks.removeRotation,
      deleting: false,
    })

    render(<RotationsPage currency="USD" userId="user-1" />)

    expect(screen.getByText('COIN11/USDT')).toBeInTheDocument()
    expect(screen.queryByText('COIN1/USDT')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1–10 of 12')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))

    expect(screen.getByText('COIN1/USDT')).toBeInTheDocument()
    expect(screen.getByText('COIN0/USDT')).toBeInTheDocument()
    expect(screen.queryByText('COIN11/USDT')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 11–12 of 12')).toBeInTheDocument()
  })

  it('shows current position value and estimated P/L for an open linked deal', () => {
    const openDeal: SpotRotation = {
      ...closedDeal,
      id: 'open-deal',
      coingecko_id: 'bitcoin',
      buy_price: 10,
      buy_qty: 2,
      invested_amount: 20,
      status: 'OPEN',
      sell_time: null,
      sell_price: null,
      sold_qty: 0,
      fee_amount: 1,
      realized_pnl_usd: null,
      realized_pnl_percent: null,
    }
    mocks.useSpotRotations.mockReturnValue({
      rotations: [openDeal],
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      editRotation: mocks.editRotation,
      removeRotation: mocks.removeRotation,
      deleting: false,
    })
    mocks.useSpotRotationPrices.mockReturnValue({
      pricesByCoinId: { bitcoin: { coinId: 'bitcoin', price: 12, change24hPercent: 4.25, timestamp: '2026-11-02T10:00:00.000Z' } },
      loading: false,
      refreshing: false,
      error: null,
      updatedAt: Date.parse('2026-11-02T10:00:00.000Z'),
      refreshPrices: mocks.refreshPrices,
    })
    mocks.useExchangeRates.mockReturnValue({ rates: { USD: 1, EUR: 2 } })

    render(<RotationsPage currency="EUR" userId="user-1" />)

    const summary = screen.getByRole('region', { name: 'Rotation overview' })
    expect(within(summary).getByText('Open invested')).toBeInTheDocument()
    expect(within(summary).getByText(formatCurrency(40, 'EUR'))).toBeInTheDocument()
    expect(within(summary).getByText('Current value')).toBeInTheDocument()
    expect(within(summary).getByText(formatCurrency(48, 'EUR'))).toBeInTheDocument()
    expect(within(summary).getByText('Floating P/L')).toBeInTheDocument()
    expect(within(summary).getByText(formatSignedCurrency(6, 'EUR'))).toBeInTheDocument()

    const openRow = screen.getAllByRole('row')[1]
    expect(openRow).toHaveTextContent(formatUnitPrice(24, 'EUR'))
    expect(openRow).toHaveTextContent('Open')
    expect(openRow).toHaveTextContent('Market price')
    expect(within(openRow).getByText('24h +4.25%')).toBeInTheDocument()
    expect(openRow).toHaveTextContent('Floating')
    expect(within(openRow).getByText(formatSignedCurrency(6, 'EUR'))).toBeInTheDocument()
    expect(screen.getByText('+15%')).toBeInTheDocument()
    expect(screen.getByText(/CoinGecko estimates · updated/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Refresh current prices' }))
    expect(mocks.refreshPrices).toHaveBeenCalledOnce()
  })

  it('marks open position value and P/L unavailable when current prices are missing', () => {
    const openDeal: SpotRotation = {
      ...closedDeal,
      status: 'OPEN',
      sell_time: null,
      sell_price: null,
      sold_qty: 0,
      realized_pnl_usd: null,
      realized_pnl_percent: null,
    }
    mocks.useSpotRotations.mockReturnValue({
      rotations: [openDeal],
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      editRotation: mocks.editRotation,
      removeRotation: mocks.removeRotation,
      deleting: false,
    })
    mocks.useSpotRotationPrices.mockReturnValue({
      pricesByCoinId: {},
      loading: false,
      refreshing: false,
      error: null,
      updatedAt: null,
      refreshPrices: mocks.refreshPrices,
    })

    render(<RotationsPage currency="USD" userId="user-1" />)

    const summary = screen.getByRole('region', { name: 'Rotation overview' })
    expect(within(summary).getByText('Current value')).toBeInTheDocument()
    expect(within(summary).getByText('Floating P/L')).toBeInTheDocument()
    expect(within(summary).getAllByText('—')).toHaveLength(2)
    expect(within(summary).getByText('Price unavailable for 1 open deal')).toBeInTheDocument()
  })

  it('requires confirmation before deleting a deal', async () => {
    mocks.removeRotation.mockResolvedValue(undefined)
    mocks.useSpotRotations.mockReturnValue({
      rotations: [closedDeal],
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      editRotation: mocks.editRotation,
      removeRotation: mocks.removeRotation,
      deleting: false,
    })

    render(<RotationsPage currency="USD" userId="user-1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Actions for DOT/USDT deal' }))
    expect(screen.queryByRole('button', { name: 'Record sale' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }))
    expect(screen.getByRole('heading', { name: 'Delete this spot deal?' })).toBeInTheDocument()
    expect(mocks.removeRotation).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete deal' }))
    await waitFor(() => expect(mocks.removeRotation).toHaveBeenCalledWith(closedDeal))
  })

  it('opens the edit form for a manual deal', () => {
    mocks.useSpotRotations.mockReturnValue({
      rotations: [closedDeal],
      loading: false,
      error: null,
      addRotation: vi.fn(),
      closeRotation: vi.fn(),
      editRotation: mocks.editRotation,
      removeRotation: mocks.removeRotation,
      deleting: false,
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children)

    render(<RotationsPage currency="USD" userId="user-1" />, { wrapper })
    fireEvent.click(screen.getByRole('button', { name: 'Actions for DOT/USDT deal' }))
    fireEvent.click(screen.getByRole('button', { name: /^Edit$/ }))

    expect(screen.getByRole('heading', { name: 'Edit DOT/USDT deal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Entry price (USD/USDT)' })).toBeEnabled()
  })
})
