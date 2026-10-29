import { useState } from 'react'
import { formatCurrency } from '@/shared/utils/format-currency'
import type { CloseRotationInput, CreateSpotRotationInput, SpotRotation } from '@/features/portfolio/portfolio.types'
import { Button } from '@/shared/components/Button'
import { CloseRotationModal } from './CloseRotationModal'
import { CreateRotationModal } from './CreateRotationModal'

type ActiveRotationsTableProps = {
  rotations: SpotRotation[]
  onCreateRotation: (input: CreateSpotRotationInput) => void | Promise<void>
  onCloseRotation: (rotation: SpotRotation, input: CloseRotationInput) => void | Promise<void>
}

export function ActiveRotationsTable({ rotations, onCreateRotation, onCloseRotation }: ActiveRotationsTableProps) {
  const [selectedRotation, setSelectedRotation] = useState<SpotRotation | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  return (
    <>
      <section className="mt-8 overflow-hidden rounded-md border border-white/10 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-lg font-semibold">Open rotations</h2>
          <Button type="button" size="sm" onClick={() => setIsCreating(true)}>Add rotation</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="bg-black/20 text-gray-300">
              <tr>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Buy execution</th>
                <th className="px-4 py-3 text-right">Buy price</th>
                <th className="px-4 py-3 text-right">Remaining quantity</th>
                <th className="px-4 py-3 text-right">Buy fee (USD)</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rotations.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-gray-400" colSpan={6}>No active rotations.</td></tr>
              ) : (
                rotations.map((rotation) => (
                  <tr key={rotation.id} className="border-t border-white/5">
                    <td className="px-4 py-3 font-medium">{rotation.symbol}</td>
                    <td className="px-4 py-3">
                      <div className="min-w-36 space-y-1">
                        <p>{rotation.buy_time ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(rotation.buy_time)) : '—'}</p>
                        <p className="text-xs text-gray-400">Trade ID: {rotation.buy_trade_id ?? '—'}</p>
                        <p className="text-xs text-gray-500">Order ID: {rotation.buy_order_id ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(rotation.buy_price, 'USD')}</td>
                    <td className="px-4 py-3 text-right">{rotation.buy_qty - rotation.sold_qty}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(rotation.fee_amount, 'USD')}</td>
                    <td className="px-4 py-3 text-right">
                      {rotation.match_type === 'AUTO_API' ? (
                        <span className="text-xs text-gray-400" title="This rotation is updated automatically from Binance trade history.">Binance auto-sync</span>
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
