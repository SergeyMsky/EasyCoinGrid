import { useMemo, useState } from 'react'
import { useSpotRotations } from '@/features/portfolio/hooks/useSpotRotations'
import { useSpotRotationPrices } from '@/features/portfolio/hooks/useSpotRotationPrices'
import { useExchangeRates } from '@/features/portfolio/hooks/useExchangeRates'
import type { Currency, SpotRotation } from '@/features/portfolio/portfolio.types'
import { RotationSummary } from '@/features/portfolio/components/RotationSummary'
import { SpotDealsTable } from '@/features/portfolio/components/SpotDealsTable'
import { ManualSpotDealModal } from '@/features/portfolio/components/ManualSpotDealModal'
import { ErrorMessage } from '@/shared/components/ErrorMessage'

type RotationsPageProps = {
  currency: Currency
  userId: string
}

export function RotationsPage({ currency, userId }: RotationsPageProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedRotation, setSelectedRotation] = useState<SpotRotation | null>(null)
  const [editingRotation, setEditingRotation] = useState<SpotRotation | null>(null)
  const { rates } = useExchangeRates(userId)
  const { rotations, loading, error, addRotation, closeRotation, editRotation, removeRotation, deleting } = useSpotRotations({
    userId,
    assets: [],
    syncFromBinance: false,
  })
  const manualRotations = useMemo(
    () =>
      rotations
        .filter((rotation) => rotation.match_type === 'MANUAL')
        .sort((a, b) => (b.buy_time ? Date.parse(b.buy_time) : 0) - (a.buy_time ? Date.parse(a.buy_time) : 0)),
    [rotations],
  )
  const {
    pricesByCoinId,
    loading: pricesLoading,
    refreshing: pricesRefreshing,
    error: pricesError,
    updatedAt: pricesUpdatedAt,
    refreshPrices,
  } = useSpotRotationPrices(userId, manualRotations)
  const openCount = manualRotations.filter((rotation) => rotation.status === 'OPEN').length
  const closedCount = manualRotations.filter((rotation) => rotation.status === 'CLOSED').length
  const openRotations = manualRotations.filter((rotation) => rotation.status === 'OPEN')
  const missingOpenPriceCount = openRotations.filter((rotation) => !rotation.coingecko_id || !pricesByCoinId[rotation.coingecko_id]).length
  const openInvestedUsd = openRotations.reduce((total, rotation) => {
    const remainingQty = Math.max(0, rotation.buy_qty - rotation.sold_qty)
    return total + (rotation.invested_amount ?? rotation.buy_price * remainingQty)
  }, 0)
  const openValueUsd =
    missingOpenPriceCount > 0
      ? null
      : openRotations.reduce((total, rotation) => {
          const remainingQty = Math.max(0, rotation.buy_qty - rotation.sold_qty)
          const currentPrice = rotation.coingecko_id ? pricesByCoinId[rotation.coingecko_id] : undefined
          return total + (currentPrice?.price ?? 0) * remainingQty
        }, 0)
  const floatingPnlUsd =
    missingOpenPriceCount > 0
      ? null
      : openRotations.reduce((total, rotation) => {
          const currentPrice = rotation.coingecko_id ? (pricesByCoinId[rotation.coingecko_id]?.price ?? 0) : 0
          const remainingQty = Math.max(0, rotation.buy_qty - rotation.sold_qty)
          return total + (currentPrice - rotation.buy_price) * remainingQty - rotation.fee_amount
        }, 0)
  const realizedPnlUsd = manualRotations.reduce((total, rotation) => total + (rotation.realized_pnl_usd ?? 0), 0)
  const currencyRate = rates[currency] ?? 1

  return (
    <main className="page-container">
      <div>
        <p className="sign">Spot</p>
        <h1 className="text-3xl font-bold">Trade journal</h1>
        <p className="mt-2 text-sm text-muted">
          Track each buy as its own deal, separate from the average price of coins already in your wallet. Add a sale now or record it later.
        </p>
      </div>

      <RotationSummary
        openCount={openCount}
        closedCount={closedCount}
        openInvestedUsd={openInvestedUsd}
        openValueUsd={openValueUsd}
        floatingPnlUsd={floatingPnlUsd}
        missingOpenPriceCount={missingOpenPriceCount}
        realizedPnlUsd={realizedPnlUsd}
        currency={currency}
        currencyRate={currencyRate}
        loading={loading}
        pricesLoading={pricesLoading}
      />

      {error && <ErrorMessage message={error} />}

      <SpotDealsTable
        rotations={manualRotations}
        pricesByCoinId={pricesByCoinId}
        pricesLoading={pricesLoading}
        pricesRefreshing={pricesRefreshing}
        pricesError={pricesError}
        pricesUpdatedAt={pricesUpdatedAt}
        currency={currency}
        currencyRate={currencyRate}
        loading={loading}
        deleting={deleting}
        onAdd={() => setIsAdding(true)}
        onRefreshPrices={refreshPrices}
        onEdit={setEditingRotation}
        onRecordSale={setSelectedRotation}
        onDelete={removeRotation}
      />

      {isAdding && (
        <ManualSpotDealModal
          currency={currency}
          currencyRate={currencyRate}
          onCancel={() => setIsAdding(false)}
          onCreate={async (input) => {
            await addRotation(input)
            setIsAdding(false)
          }}
        />
      )}
      {selectedRotation && (
        <ManualSpotDealModal
          key={selectedRotation.id}
          rotation={selectedRotation}
          currency={currency}
          currencyRate={currencyRate}
          onCancel={() => setSelectedRotation(null)}
          onClose={async (rotation, input) => {
            await closeRotation(rotation, input)
            setSelectedRotation(null)
          }}
        />
      )}
      {editingRotation && (
        <ManualSpotDealModal
          key={`edit-${editingRotation.id}`}
          mode="edit"
          rotation={editingRotation}
          currency={currency}
          currencyRate={currencyRate}
          onCancel={() => setEditingRotation(null)}
          onUpdate={async (rotation, input) => {
            await editRotation(rotation, input)
            setEditingRotation(null)
          }}
        />
      )}
    </main>
  )
}
