import { useState, type FormEvent } from 'react'
import type { CreateSpotRotationInput } from '@/features/portfolio/portfolio.types'
import { Button } from '@/shared/components/Button'

type CreateRotationModalProps = {
  onCancel: () => void
  onCreate: (input: CreateSpotRotationInput) => void | Promise<void>
}

export function CreateRotationModal({ onCancel, onCreate }: CreateRotationModalProps) {
  const [symbol, setSymbol] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [buyQty, setBuyQty] = useState('')
  const [feeAmountUsd, setFeeAmountUsd] = useState('0')
  const [buyOrderId, setBuyOrderId] = useState('')
  const [buyTradeId, setBuyTradeId] = useState('')
  const [buyTime, setBuyTime] = useState(() => toDateTimeLocalValue(new Date()))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const parsedBuyPrice = Number(buyPrice)
    const parsedBuyQty = Number(buyQty)
    const parsedFee = Number(feeAmountUsd)
    const normalizedSymbol = symbol.trim().toUpperCase()

    if (!/^[A-Z0-9]{2,30}$/.test(normalizedSymbol)) {
      setError('Enter a valid trading symbol, for example BTCUSDT.')
      return
    }
    if (
      !Number.isFinite(parsedBuyPrice) ||
      parsedBuyPrice <= 0 ||
      !Number.isFinite(parsedBuyQty) ||
      parsedBuyQty <= 0 ||
      !Number.isFinite(parsedFee) ||
      parsedFee < 0
    ) {
      setError('Enter a positive buy price and quantity, and a non-negative fee.')
      return
    }

    try {
      setSaving(true)
      await onCreate({
        symbol: normalizedSymbol,
        buyPrice: parsedBuyPrice,
        buyQty: parsedBuyQty,
        feeAmountUsd: parsedFee,
        buyOrderId: buyOrderId.trim() || undefined,
        buyTradeId: buyTradeId.trim() || undefined,
        buyTime: new Date(buyTime).toISOString(),
      })
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create spot rotation.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel()
      }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-rotation-title"
        className="w-full max-w-lg rounded-xl border border-outline bg-surface-raised p-6">
        <h2 id="create-rotation-title" className="text-xl font-semibold">
          Add spot rotation
        </h2>
        <p className="mt-1 text-sm text-muted">Enter a completed buy trade. Prices and fees must be in USD.</p>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            Trading symbol
            <input
              required
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
              placeholder="BTCUSDT"
              className="input mt-1 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Buy price (USD)
            <input
              required
              min="0"
              step="any"
              type="number"
              value={buyPrice}
              onChange={(event) => setBuyPrice(event.target.value)}
              className="input mt-1 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Quantity
            <input
              required
              min="0"
              step="any"
              type="number"
              value={buyQty}
              onChange={(event) => setBuyQty(event.target.value)}
              className="input mt-1 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Buy fee (USD)
            <input
              min="0"
              step="any"
              type="number"
              value={feeAmountUsd}
              onChange={(event) => setFeeAmountUsd(event.target.value)}
              className="input mt-1 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Buy execution date and time
            <input
              required
              type="datetime-local"
              value={buyTime}
              onChange={(event) => setBuyTime(event.target.value)}
              className="input mt-1 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Buy order ID (optional)
            <input value={buyOrderId} onChange={(event) => setBuyOrderId(event.target.value)} className="input mt-1 px-3 py-2" />
          </label>
          <label className="block text-sm">
            Buy trade ID (optional)
            <input value={buyTradeId} onChange={(event) => setBuyTradeId(event.target.value)} className="input mt-1 px-3 py-2" />
          </label>
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="dashboard" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add rotation'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

function toDateTimeLocalValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}
