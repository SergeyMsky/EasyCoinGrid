import { useEffect, useMemo, useState } from 'react'
import { usePortfolioData } from '@/features/portfolio/hooks/usePortfolioData'
import { useSpotRotations } from '@/features/portfolio/hooks/useSpotRotations'
import { ActiveRotationsTable } from '@/features/portfolio/components/ActiveRotationsTable'
import { ClosedRotationsTable } from '@/features/portfolio/components/ClosedRotationsTable'
import { getCoinsMetadata } from '@/features/portfolio/api/portfolio.api'
import { FALLBACK_RATES, getExchangeRates } from '@/features/portfolio/api/exchange-rates.api'
import type { Asset, Currency } from '@/features/portfolio/portfolio.types'
import { getSpotRotationBaseAsset } from '@/features/portfolio/utils/spot-rotation-symbol'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { WarningMessage } from '@/shared/components/WarningMessage'
import { ArrowUpRight, History, RefreshCw } from 'lucide-react'
import { formatSignedCurrency } from '@/shared/utils/format-currency'
import { Button } from '@/shared/components/Button'
import { APP_LOCALE } from '@/shared/utils/locale'

function RotationTableSkeleton({ activeTab, currency }: { activeTab: 'open' | 'closed'; currency: Currency }) {
  const isOpen = activeTab === 'open'
  const columns = isOpen
    ? ['Symbol', 'Buy execution', `Buy price (${currency})`, 'Remaining quantity', `Buy fee (${currency})`, 'Action']
    : [
        'Symbol',
        'Buy execution',
        `Buy price (${currency})`,
        'Sell execution',
        `Sell price (${currency})`,
        'Quantity',
        `Realized PnL (${currency})`,
        'Realized PnL (%)',
      ]
  const columnWidths = isOpen
    ? ['w-[20%]', 'w-[16%]', 'w-[16%]', 'w-[16%]', 'w-[16%]', 'w-[16%]']
    : ['w-[18%]', 'w-[16%]', 'w-[9%]', 'w-[16%]', 'w-[9%]', 'w-[9%]', 'w-[12%]', 'w-[11%]']

  return (
    <section className="ui-surface mt-4 overflow-hidden" aria-busy="true">
      <div className="flex min-h-13.75 items-center justify-between border-b border-outline px-4 py-2">
        <h2 className="text-sm font-semibold">{isOpen ? 'Open rotations' : 'Closed history'}</h2>
        {isOpen && <div aria-hidden="true" className="h-9.5 w-28.75 animate-pulse rounded bg-surface-raised" />}
      </div>
      <div className="overflow-x-auto">
        <table
          className={`w-full ${isOpen ? 'min-w-225' : 'min-w-275'} table-fixed text-left`}
          aria-label={`Loading ${isOpen ? 'open' : 'closed'} rotations`}>
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={index} className={width} />
            ))}
          </colgroup>
          <thead className="label border-b border-outline bg-surface-raised normal-case">
            <tr>
              {columns.map((column, index) => (
                <th key={column} className={`px-3 py-2 ${(isOpen ? index >= 2 : index === 2 || index >= 4) ? 'text-right' : ''}`} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-t border-outline">
                {columns.map((column, columnIndex) => (
                  <td
                    key={column}
                    className={`h-19.25 px-3 py-2 ${(isOpen ? columnIndex >= 2 : columnIndex === 2 || columnIndex >= 4) ? 'text-right' : ''}`}>
                    <div
                      aria-hidden="true"
                      className={`ml-auto h-5 animate-pulse rounded bg-surface-raised ${
                        columnIndex === 0
                          ? 'mr-auto ml-0! w-20'
                          : column.includes('execution')
                            ? 'mr-auto ml-0! h-5 w-32'
                            : columnIndex === columns.length - 1 && isOpen
                              ? 'h-4! w-24'
                              : 'w-20'
                      }`}
                    />
                    {column.includes('execution') && (
                      <div aria-hidden="true" className="mt-1 space-y-1">
                        <div className="h-3 w-20 animate-pulse rounded bg-surface-raised" />
                        <div className="h-3 w-24 animate-pulse rounded bg-surface-raised" />
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function RotationsPage({ currency }: { currency: Currency }) {
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open')
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES)
  const [rotationAssetMetadata, setRotationAssetMetadata] = useState<Record<string, Pick<Asset, 'name' | 'image'>>>({})
  const { assets, loading: portfolioLoading, error: portfolioError, isBinanceConnected } = usePortfolioData()
  const {
    rotations,
    loading: rotationsLoading,
    syncing,
    error: rotationsError,
    syncStatus,
    syncNow,
    addRotation,
    closeRotation,
  } = useSpotRotations({
    assets: assets.map((asset) => asset.asset),
    syncFromBinance: isBinanceConnected === true,
  })
  const openRotations = useMemo(() => rotations.filter((rotation) => rotation.status === 'OPEN'), [rotations])
  const closedRotations = useMemo(
    () =>
      rotations
        .filter((rotation) => rotation.status === 'CLOSED')
        .sort((a, b) => {
          const aTime = a.sell_time ? Date.parse(a.sell_time) : 0
          const bTime = b.sell_time ? Date.parse(b.sell_time) : 0
          return bTime - aTime
        }),
    [rotations],
  )
  const realizedPnl = useMemo(() => rotations.reduce((total, rotation) => total + (rotation.realized_pnl_usd ?? 0), 0), [rotations])
  const currencyRate = rates[currency] ?? 1
  const rotationAssets = useMemo(() => [...new Set(rotations.map((rotation) => getSpotRotationBaseAsset(rotation.symbol)))], [rotations])
  const missingRotationAssets = useMemo(
    () => rotationAssets.filter((symbol) => !assets.some((asset) => asset.asset === symbol) && !rotationAssetMetadata[symbol]),
    [assets, rotationAssets, rotationAssetMetadata],
  )
  const assetMetadata = useMemo(() => {
    const metadata = { ...rotationAssetMetadata }

    for (const asset of assets) {
      metadata[asset.asset] = {
        name: asset.name ?? asset.asset,
        image: asset.image ?? null,
      }
    }

    return metadata
  }, [assets, rotationAssetMetadata])

  useEffect(() => {
    let active = true
    void getExchangeRates()
      .then(({ rates: exchangeRates }) => {
        if (active) {
          setRates({
            ...FALLBACK_RATES,
            ...exchangeRates,
            USD: 1,
          })
        }
      })
      .catch((rateError: unknown) => {
        if (active) {
          console.warn('Rotation exchange rates unavailable:', rateError)
          setRates(FALLBACK_RATES)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (portfolioLoading || missingRotationAssets.length === 0) return

    let active = true
    void getCoinsMetadata(missingRotationAssets)
      .then((metadata) => {
        if (active) {
          setRotationAssetMetadata((current) => ({ ...current, ...metadata }))
        }
      })
      .catch((metadataError: unknown) => {
        if (active) {
          console.warn('Rotation coin metadata unavailable:', metadataError)
        }
      })

    return () => {
      active = false
    }
  }, [missingRotationAssets, portfolioLoading])

  return (
    <main className="mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="label mb-2 text-accent">Binance Spot</p>
          <h1 className="text-3xl font-bold">Spot rotations</h1>
          <p className="mt-2 text-sm text-muted">Follow open buys and review realized results from completed sell cycles.</p>
        </div>
      </div>

      <section
        aria-label="Rotation overview"
        aria-busy={rotationsLoading}
        className="ui-surface mt-4 grid grid-cols-1 gap-4 overflow-hidden px-4 py-4 *:flex *:basis-1/3 *:flex-col *:gap-1 *:border-r *:border-outline *:last:border-0 sm:grid-cols-3 lg:grid-cols-3">
        <article>
          <p className="label">Open rotations</p>
          {rotationsLoading ? (
            <div aria-hidden="true" className="h-8 w-12 animate-pulse rounded bg-surface-raised" />
          ) : (
            <p className="text-2xl font-semibold text-text">{openRotations.length}</p>
          )}
          <p className="text-xs text-subtle">Buy lots still being tracked</p>
        </article>
        <article>
          <p className="label">Closed rotations</p>
          {rotationsLoading ? (
            <div aria-hidden="true" className="h-8 w-12 animate-pulse rounded bg-surface-raised" />
          ) : (
            <p className="text-2xl font-semibold text-text">{closedRotations.length}</p>
          )}
          <p className="text-xs text-subtle">Completed sell cycles</p>
        </article>
        <article>
          <p className="label">Realized PnL</p>
          {rotationsLoading ? (
            <div aria-hidden="true" className="h-8 w-32 animate-pulse rounded bg-surface-raised" />
          ) : (
            <p className={`text-2xl font-semibold ${realizedPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatSignedCurrency(realizedPnl * currencyRate, currency)}
            </p>
          )}
          <p className="text-xs text-subtle">Closed rotations after recorded fees</p>
        </article>
      </section>

      {portfolioError && <WarningMessage message={`Unable to load portfolio data: ${portfolioError}`} />}
      <p className="mt-2 text-xs text-muted" role="note">
        Imported trade prices and historical rotation P/L are approximate and assume 1 USDT ≈ 1 USD; historical USDT/USD rates are not applied.
      </p>
      {!portfolioLoading && isBinanceConnected === false && (
        <WarningMessage message="Binance is not connected. You can still add and track rotations manually; connect Binance in Settings to sync trade history." />
      )}
      {!portfolioLoading && isBinanceConnected === null && import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_PORTFOLIO === 'true' && (
        <WarningMessage message="Mock portfolio data is enabled. Automatic Binance trade sync is paused." />
      )}
      {rotationsError && <ErrorMessage message={rotationsError} />}
      {isBinanceConnected === true && (
        <details className="ui-surface mt-4 min-w-0 overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-medium text-text hover:bg-surface-raised [&::-webkit-details-marker]:hidden">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${syncStatus ? 'bg-accent shadow-[0_0_6px_2px_var(--color-accent)]/80' : 'animate-pulse bg-muted shadow-[0_0_6px_2px_var(--color-muted)]/80'}`}
            />
            Binance sync
            <span className="flex-1 truncate text-xs font-normal text-muted">
              {syncStatus
                ? `Last updated ${new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(syncStatus.syncedAt))}`
                : syncing || rotationsLoading
                  ? 'Syncing trade history…'
                  : 'No successful sync yet'}
            </span>
            <Button
              type="button"
              variant="dashboard"
              aria-label="Refresh rotations"
              onClick={() => void syncNow()}
              disabled={syncing || rotationsLoading}
              className="gap-1">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing || rotationsLoading ? 'animate-spin text-text' : ''}`} />
              <span className="text-xs font-medium">{syncing || rotationsLoading ? 'Syncing…' : 'Sync now'}</span>
            </Button>
          </summary>
          <div className="border-t border-outline p-4 pt-3">
            {syncStatus ? (
              <>
                <p className="text-xs text-muted">
                  {syncStatus.symbolsScanned} pairs checked · {syncStatus.tradesImported} executions imported
                </p>
                {syncStatus.oldestTradeTime !== null && syncStatus.newestTradeTime !== null && (
                  <p className="mt-1 text-xs text-muted">
                    Available trade range:{' '}
                    {new Intl.DateTimeFormat(APP_LOCALE, {
                      dateStyle: 'medium',
                    }).format(new Date(syncStatus.oldestTradeTime))}
                    {' – '}
                    {new Intl.DateTimeFormat(APP_LOCALE, {
                      dateStyle: 'medium',
                    }).format(new Date(syncStatus.newestTradeTime))}
                  </p>
                )}
                {syncStatus.unmatchedSellTrades > 0 && (
                  <p className="mt-3 rounded-md border border-warning-outline bg-warning-subtle px-3 py-2 text-xs text-warning">
                    {syncStatus.unmatchedSellTrades} sell execution(s) had no matching buy in the returned trade history. This can happen when older
                    trades are unavailable or assets entered the wallet another way.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted">Sync current assets and previously imported pairs across supported USD-stablecoin Spot markets.</p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Binance may not return every historical execution. The available date range shows the coverage returned for this account.
            </p>
          </div>
        </details>
      )}

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4 border-b border-outline">
          <div role="tablist" aria-label="Spot rotation views" className="flex gap-6">
            <button
              type="button"
              role="tab"
              id="open-rotations-tab"
              aria-selected={activeTab === 'open'}
              aria-controls="open-rotations-panel"
              aria-label={`Open orders ${openRotations.length}`}
              onClick={() => setActiveTab('open')}
              className={`-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 pb-3 text-sm transition ${
                activeTab === 'open' ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'
              }`}>
              <ArrowUpRight className={`h-4 w-4 ${activeTab === 'open' ? 'text-accent' : 'text-muted'}`} aria-hidden="true" />
              Open orders
              <span className={activeTab === 'open' ? 'text-accent' : 'text-muted'}>{openRotations.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="closed-rotations-tab"
              aria-selected={activeTab === 'closed'}
              aria-controls="closed-rotations-panel"
              aria-label={`Closed trades ${closedRotations.length}`}
              onClick={() => setActiveTab('closed')}
              className={`-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 pb-3 text-sm transition ${
                activeTab === 'closed' ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'
              }`}>
              <History className={`h-4 w-4 ${activeTab === 'closed' ? 'text-accent' : 'text-muted'}`} aria-hidden="true" />
              Closed trades
              <span className={activeTab === 'closed' ? 'text-accent' : 'text-muted'}>{closedRotations.length}</span>
            </button>
          </div>
          <span className="hidden pb-3 text-xs text-muted sm:inline">All amounts in {currency}</span>
        </div>
        <div
          role="tabpanel"
          id={activeTab === 'open' ? 'open-rotations-panel' : 'closed-rotations-panel'}
          aria-labelledby={activeTab === 'open' ? 'open-rotations-tab' : 'closed-rotations-tab'}
          aria-busy={rotationsLoading}
          tabIndex={0}>
          {rotationsLoading ? (
            <RotationTableSkeleton activeTab={activeTab} currency={currency} />
          ) : activeTab === 'open' ? (
            <div id="open-rotations">
              <ActiveRotationsTable
                rotations={openRotations}
                assetMetadata={assetMetadata}
                currency={currency}
                currencyRate={currencyRate}
                onCreateRotation={addRotation}
                onCloseRotation={closeRotation}
              />
            </div>
          ) : (
            <div id="rotation-history">
              <ClosedRotationsTable rotations={closedRotations} assetMetadata={assetMetadata} currency={currency} currencyRate={currencyRate} />
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
