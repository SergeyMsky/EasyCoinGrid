import { useMemo, useState } from 'react'
import { useSpotRotations } from '@/features/portfolio/hooks/useSpotRotations'
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
  const { rates } = useExchangeRates(userId)
  const { rotations, loading, error, addRotation, closeRotation, removeRotation, deleting } = useSpotRotations({
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
  const openCount = manualRotations.filter((rotation) => rotation.status === 'OPEN').length
  const closedCount = manualRotations.filter((rotation) => rotation.status === 'CLOSED').length
  const realizedPnlUsd = manualRotations.reduce((total, rotation) => total + (rotation.realized_pnl_usd ?? 0), 0)
  const currencyRate = rates[currency] ?? 1

  return (
    <main className="mx-auto px-4 pt-10 pb-4">
      <div>
        <h1 className="text-3xl font-bold">Spot trade journal</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Track each buy as its own deal, separate from the average price of coins already in your wallet. Add a sale now or record it later.
        </p>
      </div>

      <RotationSummary
        openCount={openCount}
        closedCount={closedCount}
        realizedPnlUsd={realizedPnlUsd}
        currency={currency}
        currencyRate={currencyRate}
        loading={loading}
      />

      {error && <ErrorMessage message={error} />}

      <SpotDealsTable
        rotations={manualRotations}
        currency={currency}
        currencyRate={currencyRate}
        loading={loading}
        deleting={deleting}
        onAdd={() => setIsAdding(true)}
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
    </main>
  )
}
