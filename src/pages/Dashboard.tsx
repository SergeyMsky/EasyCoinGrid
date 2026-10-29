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
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useSpotPortfolioHistory } from '@/features/portfolio/hooks/useSpotPortfolioHistory'

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
  const { assets, loading, error, refreshPortfolio, lastUpdated, binanceUnavailable, isBinanceConnected } = usePortfolioData()
  const { rotations, loading: rotationsLoading, error: rotationsError } = useSpotRotations({ assets: [], syncFromBinance: false })
  const [sortBy, setSortBy] = useState<SortOption>('Total')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<FilterOption>(getStoredView())
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES)
  const currentRate = rates[currency] ?? 1
  const canValuePortfolio = !loading && assets.length > 0 && assets.every((asset) => Number.isFinite(asset.price) && asset.price > 0)
  const currentValueUsd = canValuePortfolio ? assets.reduce((total, asset) => total + (Number(asset.free) + Number(asset.locked)) * asset.price, 0) : null
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
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-bold sm:text-4xl ">Binance Spot Wallet Balance</h1>

      <ErrorMessage message={rotationsError} />
      <section className="mt-8 rounded-md border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Spot rotations</h2>
            <p className="mt-1 text-sm text-gray-400">Track realized profit from individual spot trades.</p>
          </div>
          <Link
            to="/rotations"
            className="inline-flex items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-400/20"
          >
            View rotations <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
      {!rotationsLoading && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-white/5 bg-black/10 px-4 py-3">
            <p className="label">Open rotations</p>
            <p className="mt-1 text-xl font-semibold">{rotations.filter((rotation) => rotation.status === 'OPEN').length}</p>
          </div>
          <div className="rounded-md border border-white/5 bg-black/10 px-4 py-3">
            <p className="label">Realized PnL</p>
            <p className={`mt-1 text-xl font-semibold ${rotations.reduce((total, rotation) => total + (rotation.realized_pnl_usd ?? 0), 0) >= 0 ? 'text-[#00A857]' : 'text-[#FF4D4D]'}`}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', signDisplay: 'always' }).format(rotations.reduce((total, rotation) => total + (rotation.realized_pnl_usd ?? 0), 0))}
            </p>
          </div>
        </div>
      )}
      {rotationsLoading && <p className="mt-4 text-sm text-gray-400">Loading rotation summary…</p>}
      {!loading && error ? (
        <PortfolioErrorState onRetry={refreshPortfolio} loading={loading} />
      ) : !loading && isBinanceConnected === false ? (
        <NoConnectionState />
      ) : (
        <>
          {binanceUnavailable && <WarningMessage message="Binance is temporarily unavailable. Please try again later." />}

          <Suspense fallback={<div aria-hidden="true" className="mt-6 h-72 animate-pulse rounded-xl border border-white/10 bg-[#0c100e]" />}>
            <SpotPortfolioPerformance
              snapshots={portfolioHistory.snapshots}
              loading={portfolioHistory.loading}
              error={portfolioHistory.error}
              enabled={isBinanceConnected === true}
              assets={displayAssets}
              currency={currency}
            />
          </Suspense>
          <PortfolioSummary assets={displayAssets} loading={loading} currency={currency} />
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
