import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssetTransaction } from '@/features/asset-history/asset-history.types'
import { AssetHistoryPage } from './AssetHistoryPage'

const mocks = vi.hoisted(() => ({
  getAssetTransactions: vi.fn(),
  syncAssetTransactions: vi.fn(),
  getPortfolioBalances: vi.fn(),
  getBinanceConnectionStatus: vi.fn(),
  getCoinsMetadata: vi.fn(),
}))

vi.mock('@/features/asset-history/api/asset-history.api', () => ({
  getAssetTransactions: mocks.getAssetTransactions,
  syncAssetTransactions: mocks.syncAssetTransactions,
}))

vi.mock('@/features/settings/api/settings.api', () => ({
  getBinanceConnectionStatus: mocks.getBinanceConnectionStatus,
}))

vi.mock('@/features/portfolio/api/portfolio.api', () => ({
  getCoinsMetadata: mocks.getCoinsMetadata,
  getPortfolioBalances: mocks.getPortfolioBalances,
}))

class TestIntersectionObserver implements IntersectionObserver {
  static latest: TestIntersectionObserver | null = null
  readonly root = null
  readonly rootMargin: string
  readonly scrollMargin: string
  readonly thresholds = [0]
  private readonly callback: IntersectionObserverCallback
  private target: Element | null = null

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.rootMargin = options?.rootMargin ?? '0px'
    this.scrollMargin = options?.scrollMargin ?? '0px'
    TestIntersectionObserver.latest = this
  }

  observe(target: Element) {
    this.target = target
  }

  unobserve() {
    this.target = null
  }

  disconnect() {
    this.target = null
  }

  takeRecords() {
    return []
  }

  trigger() {
    if (!this.target) return

    this.callback(
      [
        {
          boundingClientRect: this.target.getBoundingClientRect(),
          intersectionRatio: 1,
          intersectionRect: this.target.getBoundingClientRect(),
          isIntersecting: true,
          rootBounds: null,
          target: this.target,
          time: 0,
        },
      ],
      this,
    )
  }
}

const deposit: AssetTransaction = {
  id: 'transaction-1',
  source: 'BINANCE_DEPOSIT',
  external_id: 'deposit-1',
  group_id: 'deposit-1',
  event_type: 'DEPOSIT',
  direction: 'IN',
  asset: 'BTC',
  related_asset: null,
  amount: 0.25,
  fee_amount: 0,
  fee_asset: null,
  occurred_at: '2026-10-29T12:00:00.000Z',
  status: '1',
  network: 'BTC',
  transaction_id: 'tx-1',
  source_wallet: null,
  target_wallet: null,
  created_at: '2026-10-29T12:00:00.000Z',
}

describe('AssetHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getAssetTransactions.mockResolvedValue([deposit])
    mocks.getCoinsMetadata.mockResolvedValue({ BTC: { image: 'https://example.com/btc.png' } })
    mocks.getPortfolioBalances.mockResolvedValue([{ asset: 'BTC', free: '1', locked: '0' }])
    mocks.getBinanceConnectionStatus.mockResolvedValue(true)
    mocks.syncAssetTransactions.mockResolvedValue({
      syncedAt: '2026-10-30T12:00:00.000Z',
      depositsImported: 1,
      withdrawalsImported: 0,
      transfersImported: 0,
      simpleEarnRecordsImported: 0,
      convertTradesImported: 0,
      spotTradesImported: 0,
      oldestTransactionTime: Date.parse(deposit.occurred_at),
      newestTransactionTime: Date.parse(deposit.occurred_at),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    TestIntersectionObserver.latest = null
  })

  it('shows imported asset movements and refreshes the list after sync', async () => {
    render(<AssetHistoryPage />)

    expect(await screen.findByRole('heading', { name: 'Asset history' })).toBeInTheDocument()
    expect(await screen.findByText('Deposit')).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'BTC' })).toHaveAttribute('src', 'https://example.com/btc.png')
    expect(screen.getByText('+0.25 BTC')).toBeInTheDocument()
    expect(screen.getByText('BTC')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }))

    await waitFor(() => {
      expect(mocks.syncAssetTransactions).toHaveBeenCalledOnce()
      expect(mocks.syncAssetTransactions).toHaveBeenCalledWith(['BTC'])
      expect(mocks.getAssetTransactions).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 deposits, 0 withdrawals, 0 transfers, 0 Simple Earn records, 0 Convert trades and 0 Spot trades',
    )
  })

  it('explains that Binance must be connected before syncing', async () => {
    mocks.getBinanceConnectionStatus.mockResolvedValue(false)
    mocks.getAssetTransactions.mockResolvedValue([])
    render(<AssetHistoryPage />)

    expect(await screen.findByRole('status')).toHaveTextContent('Connect Binance in Settings')
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeDisabled()
  })

  it('groups transactions under descending calendar-date headings', async () => {
    const latest = { ...deposit, id: 'latest-1', occurred_at: '2026-10-31T12:00:00.000Z' }
    const sameDay = { ...deposit, id: 'latest-2', occurred_at: '2026-10-31T09:00:00.000Z' }
    const previousDay = { ...deposit, id: 'previous-day', occurred_at: '2026-10-29T12:00:00.000Z' }
    mocks.getAssetTransactions.mockResolvedValue([latest, sameDay, previousDay])

    render(<AssetHistoryPage />)

    const table = await screen.findByRole('table', { name: 'Asset history' })
    const dateGroups = within(table).getAllByRole('rowgroup')

    expect(dateGroups).toHaveLength(3)
    expect(within(dateGroups[1]).getByRole('row', { name: /31 Oct 2026.*2 transactions/i })).toBeInTheDocument()
    expect(within(dateGroups[2]).getByRole('row', { name: /29 Oct 2026.*1 transaction/i })).toBeInTheDocument()
    expect(within(dateGroups[1]).getAllByText('Deposit')).toHaveLength(2)
    expect(within(dateGroups[2]).getByText('Deposit')).toBeInTheDocument()
  })

  it('loads the next page when the bottom sentinel intersects and shows skeleton rows', async () => {
    let resolveNextPage!: (items: AssetTransaction[]) => void
    const nextPage = new Promise<AssetTransaction[]>((resolve) => {
      resolveNextPage = resolve
    })
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ ...deposit, id: `page-one-${index}` }))
    const secondPageItem = { ...deposit, id: 'page-two-1', occurred_at: '2026-10-28T12:00:00.000Z' }
    mocks.getAssetTransactions.mockImplementation((offset: number) => (offset === 0 ? Promise.resolve(firstPage) : nextPage))
    vi.stubGlobal(
      'IntersectionObserver',
      class extends TestIntersectionObserver {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          super(callback, options)
        }
      },
    )

    render(<AssetHistoryPage />)

    await waitFor(() => expect(mocks.getAssetTransactions).toHaveBeenCalledWith(0))
    await waitFor(() => expect(TestIntersectionObserver.latest).not.toBeNull())
    act(() => TestIntersectionObserver.latest?.trigger())

    await waitFor(() => expect(mocks.getAssetTransactions).toHaveBeenCalledWith(100))
    expect(screen.getByRole('rowgroup', { name: 'Loading more transactions' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()

    await act(async () => {
      resolveNextPage([secondPageItem])
      await nextPage
    })

    expect(screen.queryByRole('rowgroup', { name: 'Loading more transactions' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Deposit')).toHaveLength(101)
  })
})
