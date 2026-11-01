import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { VIEW_OPTIONS, type Currency, type FilterOption, type SortDirection, type SortOption } from '@/features/portfolio/portfolio.types'
import { PortfolioSummary } from '@/features/portfolio/components/PortfolioSummary'
import { PortfolioTable } from '@/features/portfolio/components/PortfolioTable'
import { usePortfolioData } from '@/features/portfolio/hooks/usePortfolioData'
import { NoConnectionState } from '@/features/portfolio/components/NoConnectionState'
import { FALLBACK_RATES, getExchangeRates } from '@/features/portfolio/api/exchange-rates.api'
import { WarningMessage } from '@/shared/components/WarningMessage'
import { PortfolioErrorState } from '@/features/portfolio/components/PortfolioErrorState'
import { enrichAsset, sortAssets } from '@/features/portfolio/utils/portfolio.calculations'
import { useSpotRotations } from '@/features/portfolio/hooks/useSpotRotations'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { ArrowUpRight, Repeat2 } from 'lucide-react'
import { useSpotPortfolioHistory } from '@/features/portfolio/hooks/useSpotPortfolioHistory'
import { ButtonLink } from '@/shared/components/Link'
import { formatSignedCurrency } from '@/shared/utils/format-currency'
import { formatUnitPrice } from '@/shared/utils/format-currency'
import { APP_LOCALE } from '@/shared/utils/locale'

const SpotPortfolioPerformance = lazy(() =>
  import('@/features/portfolio/components/SpotPortfolioPerformance').then(({ SpotPortfolioPerformance: component }) => ({
    default: component,
  })),
)

type DashboardProps = {
  currency: Currency
}

function getStoredView(): FilterOption {
  const storedView = localStorage.getItem('view')
  return VIEW_OPTIONS.includes(storedView as FilterOption) ? (storedView as FilterOption) : 'all'
}

export function Dashboard({ currency }: DashboardProps) {
  const {
    assets,
    loading,
    error,
    refreshPortfolio,
    lastUpdated,
    binanceUnavailable,
    isBinanceConnected,
    stablecoinUsdRates,
    stablecoinRatesUpdatedAt,
  } = usePortfolioData()
  const { rotations, loading: rotationsLoading, error: rotationsError } = useSpotRotations({ assets: [], syncFromBinance: false })
  const [sortBy, setSortBy] = useState<SortOption>('Total')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<FilterOption>(getStoredView())
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES)
  const currentRate = rates[currency] ?? 1
  const canValuePortfolio = !loading && assets.length > 0 && assets.every((asset) => Number.isFinite(asset.price) && asset.price > 0)
  const currentValueUsd = canValuePortfolio
    ? assets.reduce((total, asset) => total + (Number(asset.free) + Number(asset.locked)) * asset.price, 0)
    : null
  const portfolioHistory = useSpotPortfolioHistory(currentValueUsd, isBinanceConnected === true)

  useEffect(() => {
    localStorage.setItem('view', view)
  }, [view])

  useEffect(() => {
    let isActive = true

    getExchangeRates()
      .then((data) => {
        if (!isActive) return

        setRates({
          ...FALLBACK_RATES,
          ...data.rates,
          USD: 1,
        })
      })
      .catch(() => {
        if (isActive) {
          setRates(FALLBACK_RATES)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  const handleSort = (value: SortOption) => {
    if (value === sortBy) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
      return
    }

    setSortBy(value)
    setSortDirection('desc')
  }
  const displayAssets = useMemo(() => assets.map((asset) => enrichAsset(asset, currentRate)), [assets, currentRate])

  const sortedAssets = useMemo(() => sortAssets(displayAssets, sortBy, sortDirection), [displayAssets, sortBy, sortDirection])

  const filteredAssets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return sortedAssets
    }

    return sortedAssets.filter((asset) => {
      const assetName = asset.name?.toLowerCase() ?? ''
      const assetSymbol = asset.asset.toLowerCase()

      return assetName.includes(normalizedSearch) || assetSymbol.includes(normalizedSearch)
    })
  }, [sortedAssets, search])

  const visibleAssets = useMemo(() => {
    if (view === 'all') return filteredAssets
    if (view === 'gainers') {
      return filteredAssets.filter((asset) => {
        const percent = Number(asset.change24hPercent) || 0
        return percent > 0
      })
    }

    if (view === 'losers') {
      return filteredAssets.filter((asset) => {
        const percent = Number(asset.change24hPercent) || 0
        return percent < 0
      })
    }
    return filteredAssets
  }, [filteredAssets, view])

  return (
    <section className="mx-auto px-4 py-10">
      <div>
        <p className="label mb-2 text-accent">Binance Spot</p>
        <h1 className="text-3xl font-bold">Portfolio overview</h1>
        <p className="mt-2 text-sm text-muted">Track your portfolio balance, asset allocation, and performance at a glance.</p>
      </div>

      <ErrorMessage message={rotationsError} />
      {!loading && error ? (
        <PortfolioErrorState onRetry={refreshPortfolio} loading={loading} message={`${error} Please try again.`} />
      ) : !loading && isBinanceConnected === false ? (
        <NoConnectionState />
      ) : (
        <>
          {binanceUnavailable && <WarningMessage message="Binance is temporarily unavailable. Please try again later." />}
          <PortfolioSummary assets={displayAssets} loading={loading} currency={currency} />
          {stablecoinUsdRates && stablecoinRatesUpdatedAt && (
            <p className="mt-2 text-xs text-muted" role="note">
              Current Kraken rates: 1 USDT = {formatUnitPrice(stablecoinUsdRates.USDT, 'USD')}; 1 USDC ={' '}
              {formatUnitPrice(stablecoinUsdRates.USDC, 'USD')} (updated{' '}
              {new Intl.DateTimeFormat(APP_LOCALE, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(stablecoinRatesUpdatedAt))}). Average
              buy prices, portfolio history, and historical P/L remain approximate and assume 1 USDT ≈ 1 USD.
            </p>
          )}
          <Suspense fallback={<div aria-hidden="true" className="mt-6 h-72 animate-pulse rounded-lg border border-outline bg-surface" />}>
            <SpotPortfolioPerformance
              snapshots={portfolioHistory.snapshots}
              loading={portfolioHistory.loading}
              error={portfolioHistory.error}
              enabled={isBinanceConnected === true}
              assets={displayAssets}
              currency={currency}
              currencyRate={currentRate}
            />
          </Suspense>
          {!rotationsLoading && (
            <div className="ui-surface mt-4 flex flex-col items-start gap-4 p-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-2">
                <Repeat2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <h2 className="text-lg font-semibold">Spot rotations</h2>
                  <p className="mt-1 text-sm text-muted">Track realized profit from individual spot trades.</p>
                </div>
              </div>
              <div className="border-outline pr-4 sm:border-r">
                <p className="label">Open rotations</p>
                <p className="mt-1 text-xl font-semibold">{rotations.filter((rotation) => rotation.status === 'OPEN').length}</p>
              </div>
              <div>
                <p className="label">Realized PnL ({currency})</p>
                <p
                  className={`mt-1 text-xl font-semibold ${rotations.reduce((total, rotation) => total + (rotation.realized_pnl_usd ?? 0), 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatSignedCurrency(rotations.reduce((total, rotation) => total + (rotation.realized_pnl_usd ?? 0), 0) * currentRate, currency)}
                </p>
              </div>
              <ButtonLink to="/rotations" size="sm">
                View rotations
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>
          )}
          {rotationsLoading && <p className="mt-4 text-sm text-muted">Loading rotation summary…</p>}
          <PortfolioTable
            assets={visibleAssets}
            sortBy={sortBy}
            handleSort={handleSort}
            sortDirection={sortDirection}
            search={search}
            onSearchChange={setSearch}
            onFilterChange={setView}
            view={view}
            refreshPortfolio={refreshPortfolio}
            loading={loading}
            lastUpdated={lastUpdated}
            currency={currency}
          />
        </>
      )}
    </section>
  )
}
