import { formatCurrency, formatSignedCurrency } from '@/shared/utils/format-currency'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'

type ClosedRotationsTableProps = {
  rotations: SpotRotation[]
}

export function ClosedRotationsTable({ rotations }: ClosedRotationsTableProps) {
  return (
    <section className="mt-8 overflow-hidden rounded-md border border-white/10 bg-white/5 backdrop-blur-md">
      <h2 className="border-b border-white/10 px-4 py-3 text-lg font-semibold">Closed history</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-180 text-left text-sm">
          <thead className="bg-black/20 text-gray-300">
            <tr>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Buy execution</th>
              <th className="px-4 py-3 text-right">Buy price</th>
              <th className="px-4 py-3">Sell execution</th>
              <th className="px-4 py-3 text-right">Sell price</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right">Realized PnL (USD)</th>
              <th className="px-4 py-3 text-right">Realized PnL (%)</th>
            </tr>
          </thead>
          <tbody>
            {rotations.length === 0 ? (
              <tr><td className="px-4 py-6 text-center text-gray-400" colSpan={8}>No closed rotations yet.</td></tr>
            ) : (
              rotations.map((rotation) => {
                const pnl = rotation.realized_pnl_usd
                const pnlClass = pnl === null ? 'text-gray-400' : pnl >= 0 ? 'text-[#00A857]' : 'text-[#FF4D4D]'

                return (
                  <tr key={rotation.id} className="border-t border-white/5">
                    <td className="px-4 py-3 font-medium">{rotation.symbol}</td>
                    <td className="px-4 py-3">
                      <ExecutionDetails side="Buy" time={rotation.buy_time} tradeId={rotation.buy_trade_id} orderId={rotation.buy_order_id} />
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(rotation.buy_price, 'USD')}</td>
                    <td className="px-4 py-3">
                      <ExecutionDetails side="Sell" time={rotation.sell_time} tradeId={rotation.sell_trade_id} orderId={rotation.sell_order_id} />
                    </td>
                    <td className="px-4 py-3 text-right">{rotation.sell_price === null ? '—' : formatCurrency(rotation.sell_price, 'USD')}</td>
                    <td className="px-4 py-3 text-right">{rotation.sold_qty}</td>
                    <td className={`px-4 py-3 text-right font-medium ${pnlClass}`}>{pnl === null ? '—' : formatSignedCurrency(pnl, 'USD')}</td>
                    <td className={`px-4 py-3 text-right font-medium ${pnlClass}`}>
                      {rotation.realized_pnl_percent === null ? '—' : `${rotation.realized_pnl_percent >= 0 ? '+' : ''}${rotation.realized_pnl_percent.toFixed(2)}%`}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ExecutionDetails({ side, time, tradeId, orderId }: { side: 'Buy' | 'Sell'; time: string | null; tradeId: string | null; orderId: string | null }) {
  return (
    <div className="min-w-36 space-y-1">
      <p>{time ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(time)) : '—'}</p>
      <p className="text-xs text-gray-400">{side} trade ID: {tradeId ?? '—'}</p>
      <p className="text-xs text-gray-500">{side} order ID: {orderId ?? '—'}</p>
    </div>
  )
}
