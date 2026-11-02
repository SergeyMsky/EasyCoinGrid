import * as Checkbox from '@radix-ui/react-checkbox'
import * as Dialog from '@radix-ui/react-dialog'
import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import type { CloseRotationInput, CreateSpotRotationInput, Currency, SpotRotation } from '@/features/portfolio/portfolio.types'
import { calculateNetRealizedPnl, calculateRotationClose } from '@/features/portfolio/utils/rotationMatching'
import { Button } from '@/shared/components/Button'
import { DateTimePicker } from '@/shared/components/DateTimePicker'
import { formatSignedCurrency, formatUnitPrice } from '@/shared/utils/format-currency'
import { formatDateTimeLocalValue } from '@/shared/utils/date-time'
import { formatNumber } from '@/shared/utils/format-number'
import { formatSignedValue } from '@/shared/utils/format-signed-value'

type ManualSpotDealModalBaseProps = {
  currency: Currency
  currencyRate: number
  onCancel: () => void
}

type ManualSpotDealModalProps = ManualSpotDealModalBaseProps &
  (
    | {
        rotation?: undefined
        onCreate: (input: CreateSpotRotationInput) => void | Promise<void>
        onClose?: never
      }
    | {
        rotation: SpotRotation
        onCreate?: never
        onClose: (rotation: SpotRotation, input: CloseRotationInput) => void | Promise<void>
      }
  )

export function ManualSpotDealModal(props: ManualSpotDealModalProps) {
  const { rotation, onCancel, currency, currencyRate } = props
  const now = formatDateTimeLocalValue(new Date())
  const [symbol, setSymbol] = useState(rotation?.symbol ?? '')
  const [buyQty, setBuyQty] = useState(rotation ? String(rotation.buy_qty - rotation.sold_qty) : '')
  const [invested, setInvested] = useState(rotation?.invested_amount == null ? '' : String(rotation.invested_amount))
  const [buyPrice, setBuyPrice] = useState(rotation ? String(rotation.buy_price) : '')
  const [buyTime, setBuyTime] = useState(rotation?.buy_time ? formatDateTimeLocalValue(new Date(rotation.buy_time)) : now)
  const [buyFee, setBuyFee] = useState(rotation ? String(rotation.fee_amount) : '0')
  const [alreadySold, setAlreadySold] = useState(Boolean(rotation))
  const [sellPrice, setSellPrice] = useState('')
  const [sellTime, setSellTime] = useState(now)
  const [sellFee, setSellFee] = useState('0')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const quantity = Number(buyQty)
  const investedUsd = Number(invested)
  const buyPriceUsd = Number(buyPrice)
  const buyFeeUsd = Number(buyFee)
  const sellPriceUsd = Number(sellPrice)
  const sellFeeUsd = Number(sellFee)
  const validBuy =
    Number.isFinite(quantity) &&
    quantity > 0 &&
    Number.isFinite(investedUsd) &&
    (rotation !== undefined || investedUsd > 0) &&
    Number.isFinite(buyPriceUsd) &&
    buyPriceUsd > 0 &&
    Number.isFinite(buyFeeUsd) &&
    buyFeeUsd >= 0
  const validSell = Number.isFinite(sellPriceUsd) && sellPriceUsd > 0 && Number.isFinite(sellFeeUsd) && sellFeeUsd >= 0
  const preview =
    validBuy && alreadySold && validSell
      ? rotation
        ? calculateRotationClose(rotation, {
            sellPrice: sellPriceUsd,
            soldQty: quantity,
            sellFeeAmountUsd: sellFeeUsd,
            sellTime,
          })
        : calculateNetRealizedPnl({
            buyPrice: buyPriceUsd,
            soldQty: quantity,
            sellPrice: sellPriceUsd,
            feeAmountUsd: buyFeeUsd + sellFeeUsd,
          })
      : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const normalizedSymbol = symbol.trim().toUpperCase().replace(/\s/g, '')
    if (!rotation && !/^[A-Z0-9]{2,20}\/(USD|USDT|USDC|FDUSD|TUSD|USDP|DAI|BUSD)$/.test(normalizedSymbol)) {
      setError('Use a USD-quoted pair, such as DOT/USDT or DOT/USD.')
      return
    }

    if (!validBuy || !buyTime || !Number.isFinite(new Date(buyTime).getTime())) {
      setError('Check the amount, invested value, buy price, fee and buy date.')
      return
    }

    if (
      alreadySold &&
      (!validSell ||
        !sellTime ||
        !Number.isFinite(new Date(sellTime).getTime()) ||
        new Date(sellTime).getTime() < new Date(rotation?.buy_time ?? buyTime).getTime())
    ) {
      setError('Check the sale price, fee and date. The sale cannot be before the buy.')
      return
    }

    try {
      setSaving(true)
      if (rotation) {
        await props.onClose(
          rotation,
          calculateRotationClose(rotation, {
            sellPrice: sellPriceUsd,
            soldQty: quantity,
            sellFeeAmountUsd: sellFeeUsd,
            sellTime: new Date(sellTime).toISOString(),
          }),
        )
      } else {
        const buyInput = {
          symbol: normalizedSymbol,
          buyPrice: buyPriceUsd,
          buyQty: quantity,
          investedAmountUsd: investedUsd,
          feeAmountUsd: buyFeeUsd,
          buyTime: new Date(buyTime).toISOString(),
        }

        if (alreadySold) {
          await props.onCreate({
            ...buyInput,
            sellPrice: sellPriceUsd,
            sellFeeAmountUsd: sellFeeUsd,
            sellTime: new Date(sellTime).toISOString(),
          })
        } else {
          await props.onCreate(buyInput)
        }
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this spot deal.')
    } finally {
      setSaving(false)
    }
  }

  const dialogTitle = rotation ? `Record a sale for ${rotation.symbol}` : 'Add a spot deal'
  const buyFieldsDisabled = Boolean(rotation)

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !saving) onCancel()
      }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay/80" />
        <Dialog.Content
          onEscapeKeyDown={(event) => {
            if (saving) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (saving) event.preventDefault()
          }}
          className="ui-surface fixed top-1/2 left-1/2 z-50 max-h-[min(90vh,52rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto bg-surface-raised p-5 sm:p-6">
          <Dialog.Title className="text-xl font-semibold">{dialogTitle}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted">
            {rotation
              ? 'Record the sale of this open deal. No order will be placed on an exchange.'
              : 'Record the buy and, if already sold, the sale. This journal does not place exchange orders.'}
          </Dialog.Description>

          <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
            <section aria-labelledby="spot-buy-title">
              <h3 id="spot-buy-title" className="mb-3 text-sm font-semibold">
                Buy
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2">
                  Pair (USD/USDT)
                  <input
                    required
                    autoFocus={!rotation}
                    disabled={buyFieldsDisabled}
                    value={symbol}
                    onChange={(event) => setSymbol(event.target.value)}
                    placeholder="e.g. DOT/USDT"
                    autoComplete="off"
                    className="input mt-1 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  Amount (coins)
                  <input
                    required
                    min="0"
                    step="any"
                    type="number"
                    inputMode="decimal"
                    disabled={buyFieldsDisabled}
                    value={buyQty}
                    onChange={(event) => setBuyQty(event.target.value)}
                    className="input mt-1 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  Invested (USD/USDT)
                  <input
                    required
                    min="0"
                    step="any"
                    type="number"
                    inputMode="decimal"
                    disabled={buyFieldsDisabled}
                    value={invested}
                    onChange={(event) => setInvested(event.target.value)}
                    className="input mt-1 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  Entry price (USD/USDT)
                  <input
                    required
                    min="0"
                    step="any"
                    type="number"
                    inputMode="decimal"
                    disabled={buyFieldsDisabled}
                    value={buyPrice}
                    onChange={(event) => setBuyPrice(event.target.value)}
                    className="input mt-1 px-3 py-2"
                  />
                </label>
                <DateTimePicker
                  label="Buy date and time"
                  required
                  disabled={buyFieldsDisabled}
                  value={buyTime}
                  onChange={setBuyTime}
                />
                {!rotation && (
                  <label className="block text-sm">
                    Buy fee (USD)
                    <input
                      min="0"
                      step="any"
                      type="number"
                      inputMode="decimal"
                      value={buyFee}
                      onChange={(event) => setBuyFee(event.target.value)}
                      className="input mt-1 px-3 py-2"
                    />
                  </label>
                )}
              </div>
              {!rotation && validBuy && (
                <p className="mt-3 text-xs text-muted">
                  P/L and ROI use amount × entry price as the trade cost. Invested is saved separately as your recorded stake.
                </p>
              )}
            </section>

            {!rotation && (
              <div className="flex items-start gap-3 border-y border-outline py-3 text-sm">
                <Checkbox.Root
                  id="already-sold"
                  checked={alreadySold}
                  onCheckedChange={(checked) => setAlreadySold(checked === true)}
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-outline bg-surface text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent data-[state=checked]:border-accent data-[state=checked]:bg-accent">
                  <Checkbox.Indicator>
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span>
                  <label htmlFor="already-sold" className="block cursor-pointer font-medium">
                    I have already sold this amount
                  </label>
                  <span className="mt-0.5 block text-xs text-muted">Leave this off to save the buy as an open deal.</span>
                </span>
              </div>
            )}

            {alreadySold && (
              <section aria-labelledby="spot-sale-title">
                <h3 id="spot-sale-title" className="mb-3 text-sm font-semibold">
                  Sale
                </h3>
                {rotation && (
                  <p className="mb-3 text-sm text-muted">
                    {formatNumber(quantity)} coins · entry {formatUnitPrice(rotation.buy_price * currencyRate, currency)}
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    Close price (USD/USDT)
                    <input
                      required
                      min="0"
                      step="any"
                      type="number"
                      inputMode="decimal"
                      value={sellPrice}
                      onChange={(event) => setSellPrice(event.target.value)}
                      className="input mt-1 px-3 py-2"
                    />
                  </label>
                  <DateTimePicker label="Close date and time" required value={sellTime} onChange={setSellTime} />
                  <label className="block text-sm">
                    Sell fee (USD)
                    <input
                      min="0"
                      step="any"
                      type="number"
                      inputMode="decimal"
                      value={sellFee}
                      onChange={(event) => setSellFee(event.target.value)}
                      className="input mt-1 px-3 py-2"
                    />
                  </label>
                </div>
                {preview && (
                  <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-l-2 border-accent bg-accent-subtle px-4 py-3">
                    <div>
                      <p className="text-xs text-muted">Estimated P/L after fees</p>
                      <p className={`mt-1 text-xl font-semibold ${preview.realizedPnlUsd >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {formatSignedCurrency(preview.realizedPnlUsd * currencyRate, currency)}
                      </p>
                    </div>
                    <p className={`text-sm font-medium ${preview.realizedPnlUsd >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatSignedValue(preview.realizedPnlPercent, '', '%')} ROI
                    </p>
                  </div>
                )}
              </section>
            )}

            {error && (
              <p role="alert" className="text-sm text-error">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3 border-t border-outline pt-4">
              <Button type="button" variant="dashboard" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : rotation ? 'Save sale' : alreadySold ? 'Save completed deal' : 'Save open deal'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
