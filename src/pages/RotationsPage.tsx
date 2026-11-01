import { useMemo } from 'react'
import { usePortfolioData } from '@/features/portfolio/hooks/usePortfolioData'
import { useSpotRotations } from '@/features/portfolio/hooks/useSpotRotations'
import { BinanceRotationSyncPanel } from '@/features/portfolio/components/BinanceRotationSyncPanel'
import { RotationSummary } from '@/features/portfolio/components/RotationSummary'
import { RotationViews } from '@/features/portfolio/components/RotationViews'
import { useCoinMetadata } from '@/features/portfolio/hooks/useCoinMetadata'
import { useExchangeRates } from '@/features/portfolio/hooks/useExchangeRates'
import type { Currency } from '@/features/portfolio/portfolio.types'
import { getSpotRotationBaseAsset } from '@/features/portfolio/utils/spot-rotation-symbol'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { WarningMessage } from '@/shared/components/WarningMessage'

export function RotationsPage({ currency, userId }: { currency: Currency; userId: string }) {
  const { rates } = useExchangeRates(userId)
  const { assets, loading: portfolioLoading, error: portfolioError, isBinanceConnected } = usePortfolioData(userId)
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
    userId,
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
    () => rotationAssets.filter((symbol) => !assets.some((asset) => asset.asset === symbol)),
    [assets, rotationAssets],
  )
  const { data: rotationAssetMetadata = {}, error: rotationMetadataError } = useCoinMetadata(userId, missingRotationAssets)
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

  return (
    <main className="mx-auto px-4 pt-10 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="label mb-2 text-accent">Binance Spot</p>
          <h1 className="text-3xl font-bold">Spot rotations</h1>
          <p className="mt-2 text-sm text-muted">Follow open buys and review realized results from completed sell cycles.</p>
        </div>
      </div>

      <RotationSummary
        openCount={openRotations.length}
        closedCount={closedRotations.length}
        realizedPnl={realizedPnl}
        currency={currency}
        currencyRate={currencyRate}
        loading={rotationsLoading}
      />

      {portfolioError && <WarningMessage message={`Unable to load portfolio data: ${portfolioError}`} />}
      {rotationMetadataError instanceof Error && <WarningMessage message={`Unable to load coin details: ${rotationMetadataError.message}`} />}
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
        <BinanceRotationSyncPanel syncStatus={syncStatus} syncing={syncing} rotationsLoading={rotationsLoading} onSync={() => void syncNow()} />
      )}

      <RotationViews
        openRotations={openRotations}
        closedRotations={closedRotations}
        assetMetadata={assetMetadata}
        currency={currency}
        currencyRate={currencyRate}
        loading={rotationsLoading}
        onCreateRotation={addRotation}
        onCloseRotation={closeRotation}
      />
    </main>
  )
}
