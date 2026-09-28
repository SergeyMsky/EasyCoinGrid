import { useEffect, useMemo, useState } from 'react'
import { VIEW_OPTIONS, type Currency, type FilterOption, type SortDirection, type SortOption } from '@/features/portfolio/portfolio.types'
import { PortfolioSummary } from '@/features/portfolio/components/PortfolioSummary'
import { PortfolioAllocation } from '@/features/portfolio/components/PortfolioAllocation'
import { PortfolioTable } from '@/features/portfolio/components/PortfolioTable'
import { usePortfolioData } from '@/features/portfolio/hooks/usePortfolioData'
import { NoConnectionState } from '@/features/portfolio/components/NoConnectionState'
import { FALLBACK_RATES, getExchangeRates } from '@/features/portfolio/api/exchange-rates.api'
import { WarningMessage } from '@/shared/components/WarningMessage'
import { PortfolioErrorState } from '@/features/portfolio/components/PortfolioErrorState'
import { enrichAsset, sortAssets } from '@/features/portfolio/utils/portfolio.calculations'

type DashboardProps = {
  currency: Currency
}

function getStoredView(): FilterOption {
  const storedView = localStorage.getItem('view')
  return VIEW_OPTIONS.includes(storedView as FilterOption) ? (storedView as FilterOption) : 'all'
}

export function Dashboard({ currency }: DashboardProps) {
  const { assets, loading, error, refreshPortfolio, lastUpdated, binanceUnavailable, isBinanceConnected } = usePortfolioData()
  const [sortBy, setSortBy] = useState<SortOption>('Total')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<FilterOption>(getStoredView())
  const [rates, setRates] = useState<Record<Currency, number>>(FALLBACK_RATES)
  const currentRate = rates[currency] ?? 1

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

  if (!loading && error) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-2xl font-bold sm:text-4xl">Binance Spot Wallet Balance</h1>

        <PortfolioErrorState onRetry={refreshPortfolio} loading={loading} />
      </section>
    )
  }
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-2xl font-bold sm:text-4xl ">Binance Spot Wallet Balance</h1>

      {!loading && isBinanceConnected === false ? (
        <NoConnectionState />
      ) : (
        <>
          {binanceUnavailable && <WarningMessage message="Binance is temporarily unavailable. Please try again later." />}

          <PortfolioSummary assets={displayAssets} loading={loading} currency={currency} />
          <PortfolioAllocation assets={displayAssets} loading={loading} />
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
