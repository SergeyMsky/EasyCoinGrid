import { formatSignedCurrency, formatUnitPrice } from '@/shared/utils/format-currency'
import { formatSignedValue } from '@/shared/utils/format-signed-value'
import type { Asset, Currency, SpotRotation } from '@/features/portfolio/portfolio.types'
import { RotationAssetCell } from './RotationAssetCell'
import { APP_LOCALE } from '@/shared/utils/locale'

type ClosedRotationsTableProps = {
  rotations: SpotRotation[]
  assetMetadata: Record<string, Pick<Asset, 'name' | 'image'>>
  currency: Currency
  currencyRate: number
}

export function ClosedRotationsTable({ rotations, assetMetadata, currency, currencyRate }: ClosedRotationsTableProps) {
  return (
    <section className="ui-surface mt-4 overflow-hidden">
      <div className="flex min-h-13.75 items-center justify-between border-b border-outline px-4 py-2">
        <h2 className="text-sm font-semibold">Closed history</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-275 table-fixed text-left">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[9%]" />
            <col className="w-[16%]" />
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
          </colgroup>
          <thead className="label border-b border-outline bg-surface-raised normal-case">
            <tr>
              <th className="px-3 py-2">Symbol</th>
              <th className="px-3 py-2">Buy execution</th>
              <th className="px-3 py-2 text-right">Buy price ({currency})</th>
              <th className="px-3 py-2">Sell execution</th>
              <th className="px-3 py-2 text-right">Sell price ({currency})</th>
              <th className="px-3 py-2 text-right">Quantity</th>
              <th className="px-3 py-2 text-right">Realized PnL ({currency})</th>
              <th className="px-3 py-2 text-right">Realized PnL (%)</th>
            </tr>
          </thead>
          <tbody>
            {rotations.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted" colSpan={8}>
                  No closed rotations yet.
                </td>
              </tr>
            ) : (
              rotations.map((rotation) => {
                const pnl = rotation.realized_pnl_usd
                const pnlClass = pnl === null ? 'text-muted' : pnl >= 0 ? 'text-profit' : 'text-loss'

                return (
                  <tr key={rotation.id} className="min-h-16.25 border-t border-outline">
                    <td className="px-3 py-2">
                      <RotationAssetCell symbol={rotation.symbol} metadata={assetMetadata} />
                    </td>
                    <td className="px-3 py-2">
                      <ExecutionDetails side="Buy" time={rotation.buy_time} tradeId={rotation.buy_trade_id} orderId={rotation.buy_order_id} />
                    </td>
                    <td className="px-3 py-2 text-right">{formatUnitPrice(rotation.buy_price * currencyRate, currency)}</td>
                    <td className="px-3 py-2">
                      <ExecutionDetails side="Sell" time={rotation.sell_time} tradeId={rotation.sell_trade_id} orderId={rotation.sell_order_id} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {rotation.sell_price === null ? '—' : formatUnitPrice(rotation.sell_price * currencyRate, currency)}
                    </td>
                    <td className="px-3 py-2 text-right">{rotation.sold_qty}</td>
                    <td className={`px-3 py-2 text-right font-medium ${pnlClass}`}>
                      {pnl === null ? '—' : formatSignedCurrency(pnl * currencyRate, currency)}
                    </td>
                    <td className={`px-3 py-2 text-right font-medium ${pnlClass}`}>
                      {rotation.realized_pnl_percent === null ? '—' : formatSignedValue(rotation.realized_pnl_percent, '', '%')}
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

function ExecutionDetails({
  side,
  time,
  tradeId,
  orderId,
}: {
  side: 'Buy' | 'Sell'
  time: string | null
  tradeId: string | null
  orderId: string | null
}) {
  return (
    <div className="min-w-36 space-y-1">
      <p className="text-sm">
        {time
          ? new Intl.DateTimeFormat(APP_LOCALE, {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(time))
          : '—'}
      </p>
      <p className="text-xs text-muted">
        {side} trade ID: {tradeId ?? '—'}
      </p>
      <p className="text-xs text-muted">
        {side} order ID: {orderId ?? '—'}
      </p>
    </div>
  )
}
