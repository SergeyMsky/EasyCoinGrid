import * as Dialog from '@radix-ui/react-dialog'
import { ArrowDownToLine, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Currency, SpotRotation } from '@/features/portfolio/portfolio.types'
import { Button } from '@/shared/components/Button'
import { formatCurrency, formatSignedCurrency, formatUnitPrice } from '@/shared/utils/format-currency'
import { formatNumber } from '@/shared/utils/format-number'
import { formatSignedValue } from '@/shared/utils/format-signed-value'
import { APP_LOCALE } from '@/shared/utils/locale'

type SpotDealsTableProps = {
  rotations: SpotRotation[]
  currency: Currency
  currencyRate: number
  loading: boolean
  deleting: boolean
  onAdd: () => void
  onRecordSale: (rotation: SpotRotation) => void
  onDelete: (rotation: SpotRotation) => Promise<void>
}

function formatExecutionDate(time: string | null) {
  if (!time) return '—'

  return new Intl.DateTimeFormat(APP_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(time))
}

function DealName({ symbol }: { symbol: string }) {
  const [base, quote] = symbol.split('/')
  return (
    <div>
      <p className="font-medium">{base}</p>
      <p className="text-xs text-muted">{quote ? `${base}/${quote}` : symbol}</p>
    </div>
  )
}

export function SpotDealsTable({ rotations, currency, currencyRate, loading, deleting, onAdd, onRecordSale, onDelete }: SpotDealsTableProps) {
  const [selectedForDeletion, setSelectedForDeletion] = useState<SpotRotation | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const columns = ['Name', 'Amount', 'Invested', 'Entry', 'Close', 'P/L', 'ROI', 'Actions']

  return (
    <section aria-label="Manual spot deals" aria-busy={loading} className="ui-surface mt-6 overflow-hidden">
      <div className="flex min-h-13.75 items-center justify-between gap-3 border-b border-outline px-4 py-2">
        <div>
          <h2 className="text-sm font-semibold">Spot deals</h2>
          <p className="mt-0.5 text-xs text-muted">Each row is one buy idea, separate from your wallet’s average price.</p>
        </div>
        <Button type="button" variant="dashboard" onClick={onAdd} className="gap-1">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-medium">Add deal</span>
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-250 table-fixed text-left">
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[9%]" />
            <col className="w-[12%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[10%]" />
            <col className="w-[7%]" />
            <col className="w-[13%]" />
          </colgroup>
          <thead className="label border-b border-outline bg-surface-raised normal-case">
            <tr>
              {columns.map((column, index) => (
                <th key={column || 'action'} scope="col" className={`px-3 py-2 ${index > 0 && index !== 3 && index !== 4 ? 'text-right' : ''}`}>
                  {index === 2 ? `Invested (${currency})` : column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <tr key={index} aria-hidden="true" className="border-t border-outline">
                  {columns.map((column, columnIndex) => (
                    <td key={`${column}-${columnIndex}`} className="h-16 px-3 py-2">
                      <span
                        className={`block h-4 animate-pulse rounded bg-surface-raised motion-reduce:animate-none ${columnIndex === 0 ? 'w-24' : 'ml-auto w-16'}`}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : rotations.length === 0 ? (
              <tr>
                <td className="px-3 py-12 text-center" colSpan={columns.length}>
                  <p className="text-sm font-medium">Your spot journal is empty</p>
                  <p className="mt-1 text-sm text-muted">Add a buy to track a deal separately from your long-term holdings.</p>
                  <Button type="button" variant="dashboard" onClick={onAdd} className="mt-4 gap-1">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add your first deal
                  </Button>
                </td>
              </tr>
            ) : (
              rotations.map((rotation) => {
                const isOpen = rotation.status === 'OPEN'
                const pnl = rotation.realized_pnl_usd
                const resultClass = pnl === null ? 'text-muted' : pnl >= 0 ? 'text-profit' : 'text-loss'

                return (
                  <tr key={rotation.id} className="border-t border-outline">
                    <td className="px-3 py-3">
                      <DealName symbol={rotation.symbol} />
                      {isOpen && <span className="mt-1 inline-block text-xs text-accent">Open</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatNumber(rotation.buy_qty)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {rotation.invested_amount === null ? '—' : formatCurrency(rotation.invested_amount * currencyRate, currency)}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm">{formatExecutionDate(rotation.buy_time)}</p>
                      <p className="mt-1 text-xs text-muted">{formatUnitPrice(rotation.buy_price * currencyRate, currency)}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm">{formatExecutionDate(rotation.sell_time)}</p>
                      <p className="mt-1 text-xs text-muted">
                        {rotation.sell_price === null ? '—' : formatUnitPrice(rotation.sell_price * currencyRate, currency)}
                      </p>
                    </td>
                    <td className={`px-3 py-3 text-right font-medium tabular-nums ${resultClass}`}>
                      {pnl === null ? '—' : formatSignedCurrency(pnl * currencyRate, currency)}
                    </td>
                    <td className={`px-3 py-3 text-right font-medium tabular-nums ${resultClass}`}>
                      {rotation.realized_pnl_percent === null ? '—' : formatSignedValue(rotation.realized_pnl_percent, '', '%')}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {isOpen && (
                          <Button
                            type="button"
                            variant="dashboard"
                            size="sm"
                            aria-label={`Record sale for ${rotation.symbol}`}
                            onClick={() => onRecordSale(rotation)}>
                            <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="dashboard"
                          size="sm"
                          aria-label={`Delete ${rotation.symbol} deal`}
                          className="text-loss hover:border-loss-outline hover:bg-loss-subtle hover:text-loss"
                          onClick={() => {
                            setDeleteError(null)
                            setSelectedForDeletion(rotation)
                          }}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-outline px-4 py-2 text-xs text-muted">
        Values are recorded in USD/USDT and displayed in {currency}. P/L includes the fees you enter; ROI uses the buy amount × entry price.
      </p>
      <Dialog.Root
        open={selectedForDeletion !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setSelectedForDeletion(null)
            setDeleteError(null)
          }
        }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/80" />
          <Dialog.Content
            onEscapeKeyDown={(event) => {
              if (deleting) event.preventDefault()
            }}
            onPointerDownOutside={(event) => {
              if (deleting) event.preventDefault()
            }}
            className="ui-surface fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 bg-surface-raised p-5 sm:p-6">
            <Dialog.Title className="text-lg font-semibold">Delete this spot deal?</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted">
              {selectedForDeletion
                ? `This will permanently remove the ${selectedForDeletion.symbol} deal and its recorded buy and sale details.`
                : ''}
            </Dialog.Description>
            {deleteError && (
              <p role="alert" className="mt-3 text-sm text-error">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="dashboard" disabled={deleting} onClick={() => setSelectedForDeletion(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="filled"
                disabled={deleting || !selectedForDeletion}
                className="border-loss bg-loss hover:border-loss hover:bg-loss-subtle hover:text-loss"
                onClick={async () => {
                  if (!selectedForDeletion) return
                  setDeleteError(null)
                  try {
                    await onDelete(selectedForDeletion)
                    setSelectedForDeletion(null)
                  } catch (error) {
                    setDeleteError(error instanceof Error ? error.message : 'Unable to delete this spot deal.')
                  }
                }}>
                {deleting ? 'Deleting…' : 'Delete deal'}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}
