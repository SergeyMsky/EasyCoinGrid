import { useState, type FormEvent } from 'react'
import type { CloseRotationInput, SpotRotation } from '@/features/portfolio/portfolio.types'
import { calculateRotationClose } from '@/features/portfolio/utils/rotationMatching'
import { Button } from '@/shared/components/Button'
import { formatCurrency } from '@/shared/utils/format-currency'

type CloseRotationModalProps = {
  rotation: SpotRotation
  onCancel: () => void
  onClose: (input: CloseRotationInput) => void | Promise<void>
}

const quantityPercentages = [25, 50, 75, 100]

export function CloseRotationModal({ rotation, onCancel, onClose }: CloseRotationModalProps) {
  const remainingQty = rotation.buy_qty - rotation.sold_qty
  const [sellPrice, setSellPrice] = useState('')
  const [quantityPercent, setQuantityPercent] = useState(100)
  const [feeAmountUsd, setFeeAmountUsd] = useState('0')
  const [sellTradeId, setSellTradeId] = useState('')
  const [sellTime, setSellTime] = useState(() => toDateTimeLocalValue(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const soldQty = remainingQty * (quantityPercent / 100)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const parsedSellPrice = Number(sellPrice)
    const parsedFee = Number(feeAmountUsd)

    if (!Number.isFinite(parsedSellPrice) || parsedSellPrice <= 0 || !Number.isFinite(parsedFee) || parsedFee < 0) {
      setError('Enter a valid execution price and a non-negative fee.')
      return
    }

    try {
      const closeInput = calculateRotationClose(rotation, {
        sellPrice: parsedSellPrice,
        soldQty,
        sellFeeAmountUsd: parsedFee,
        sellTradeId: sellTradeId.trim() || undefined,
        sellTime: new Date(sellTime).toISOString(),
      })
      setSaving(true)
      await onClose(closeInput)
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : 'Failed to close rotation.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onCancel()
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="close-rotation-title" className="w-full max-w-lg rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <h2 id="close-rotation-title" className="text-xl font-semibold">Close {rotation.symbol} rotation</h2>
        <p className="mt-1 text-sm text-gray-400">Available quantity: {remainingQty}</p>
        <p className="mt-1 text-xs text-gray-500">This records a completed sell; it does not place an order on Binance.</p>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            Execution price (USD)
            <input
              autoFocus
              required
              min="0"
              step="any"
              type="number"
              value={sellPrice}
              onChange={(event) => setSellPrice(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            Quantity to close
            <select
              value={quantityPercent}
              onChange={(event) => setQuantityPercent(Number(event.target.value))}
              className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
            >
              {quantityPercentages.map((percentage) => (
                <option key={percentage} value={percentage}>{percentage}% ({remainingQty * percentage / 100})</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Sell fee (USD)
            <input
              min="0"
              step="any"
              type="number"
              value={feeAmountUsd}
              onChange={(event) => setFeeAmountUsd(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            Sell execution date and time
            <input
              required
              type="datetime-local"
              value={sellTime}
              onChange={(event) => setSellTime(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            Sell trade ID (optional)
            <input
              value={sellTradeId}
              onChange={(event) => setSellTradeId(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/15 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="dashboard" onClick={onCancel} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || remainingQty <= 0}>{saving ? 'Closing…' : `Close ${soldQty} ${rotation.symbol}`}</Button>
          </div>
          <p className="text-xs text-gray-500">Buy price: {formatCurrency(rotation.buy_price, 'USD')}</p>
        </form>
      </section>
    </div>
  )
}

function toDateTimeLocalValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}
