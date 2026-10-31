import { useState } from 'react'
import { formatCurrency } from '@/shared/utils/format-currency'
import type { Asset, CloseRotationInput, CreateSpotRotationInput, Currency, SpotRotation } from '@/features/portfolio/portfolio.types'
import { Button } from '@/shared/components/Button'
import { CloseRotationModal } from './CloseRotationModal'
import { CreateRotationModal } from './CreateRotationModal'
import { CloudCheck, Plus } from 'lucide-react'
import { RotationAssetCell } from './RotationAssetCell'
import { APP_LOCALE } from '@/shared/utils/locale'

type ActiveRotationsTableProps = {
  rotations: SpotRotation[]
  assetMetadata: Record<string, Pick<Asset, 'name' | 'image'>>
  currency: Currency
  currencyRate: number
  onCreateRotation: (input: CreateSpotRotationInput) => void | Promise<void>
  onCloseRotation: (rotation: SpotRotation, input: CloseRotationInput) => void | Promise<void>
}

export function ActiveRotationsTable({
  rotations,
  assetMetadata,
  currency,
  currencyRate,
  onCreateRotation,
  onCloseRotation,
}: ActiveRotationsTableProps) {
  const [selectedRotation, setSelectedRotation] = useState<SpotRotation | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <>
      <section className="ui-surface mt-4 overflow-hidden">
        <div className="flex min-h-13.75 items-center justify-between border-b border-outline px-4 py-2">
          <h2 className="text-sm font-semibold">Open rotations</h2>
          <Button type="button" variant="dashboard" onClick={() => setIsCreating(true)} className="gap-1">
            <Plus className="h-5 w-5" />
            <span className="text-xs font-medium">Add rotation</span>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-225 table-fixed text-left">
            <colgroup>
              <col className="w-[20%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="label border-b border-outline bg-surface-raised normal-case">
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Buy execution</th>
                <th className="px-3 py-2 text-right">Buy price ({currency})</th>
                <th className="px-3 py-2 text-right">Remaining quantity</th>
                <th className="px-3 py-2 text-right">Buy fee ({currency})</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rotations.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-muted" colSpan={6}>
                    No active rotations.
                  </td>
                </tr>
              ) : (
                rotations.map((rotation) => (
                  <tr key={rotation.id} className="min-h-16.25 border-t border-outline">
                    <td className="px-3 py-2">
                      <RotationAssetCell symbol={rotation.symbol} metadata={assetMetadata} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="min-w-36 space-y-1">
                        <p className="text-sm">
                          {rotation.buy_time
                            ? new Intl.DateTimeFormat(APP_LOCALE, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(rotation.buy_time))
                            : '—'}
                        </p>
                        <p className="text-xs text-muted">Trade ID: {rotation.buy_trade_id ?? '—'}</p>
                        <p className="text-xs text-muted">Order ID: {rotation.buy_order_id ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(rotation.buy_price * currencyRate, currency)}</td>
                    <td className="px-3 py-2 text-right">{rotation.buy_qty - rotation.sold_qty}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(rotation.fee_amount * currencyRate, currency)}</td>
                    <td className="px-3 py-2 text-right">
                      {rotation.match_type === 'AUTO_API' ? (
                        <span
                          className="flex items-center justify-end gap-1 text-xs text-muted"
                          title="This rotation is updated automatically from trade history.">
                          auto-sync
                          <CloudCheck className="h-4 w-4" />
                        </span>
                      ) : (
                        <Button type="button" size="sm" onClick={() => setSelectedRotation(rotation)}>
                          ⚡ Close Rotation
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      {selectedRotation && (
        <CloseRotationModal
          rotation={selectedRotation}
          onCancel={() => setSelectedRotation(null)}
          onClose={async (input) => {
            await onCloseRotation(selectedRotation, input)
            setSelectedRotation(null)
          }}
        />
      )}
      {isCreating && (
        <CreateRotationModal
          onCancel={() => setIsCreating(false)}
          onCreate={async (input) => {
            await onCreateRotation(input)
            setIsCreating(false)
          }}
        />
      )}
    </>
  )
}
