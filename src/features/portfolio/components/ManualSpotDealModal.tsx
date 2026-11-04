import * as Checkbox from '@radix-ui/react-checkbox'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'
import { CoinSearchInput } from '@/features/portfolio/components/CoinSearchInput'
import { getHistoricalCoinPrice, type CoinGeckoCoin, type HistoricalCoinPrice } from '@/features/portfolio/api/coingecko.api'
import type { CloseRotationInput, CreateSpotRotationInput, Currency, EditSpotRotationInput, SpotRotation } from '@/features/portfolio/portfolio.types'
import { calculateNetRealizedPnl, calculateRotationClose } from '@/features/portfolio/utils/rotationMatching'
import { Button } from '@/shared/components/Button'
import { DateTimePicker } from '@/shared/components/DateTimePicker'
import { formatSignedCurrency, formatUnitPrice } from '@/shared/utils/format-currency'
import { formatDateTimeLocalValue } from '@/shared/utils/date-time'
import { formatNumber } from '@/shared/utils/format-number'
import { formatSignedValue } from '@/shared/utils/format-signed-value'
import { APP_LOCALE } from '@/shared/utils/locale'

function getHistoricalLookupTime(value: string) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return null

  date.setUTCMinutes(0, 0, 0)
  return date.toISOString()
}

function getHistoricalPriceKey(coinId: string | null, time: string | null) {
  return coinId && time ? `${coinId}:${time}` : null
}

function formatPriceTimestamp(value: string) {
  return new Intl.DateTimeFormat(APP_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

function HistoricalPriceStatus({
  query,
  isSelected,
  isOverridden,
  onUseEstimate,
}: {
  query: UseQueryResult<HistoricalCoinPrice, Error>
  isSelected: boolean
  isOverridden: boolean
  onUseEstimate: () => void
}) {
  if (!isSelected) return null
  if (query.isFetching) {
    return (
      <p className="mt-1 text-xs text-muted" role="status">
        Loading historical estimate…
      </p>
    )
  }
  if (query.error) {
    return (
      <p className="mt-1 text-xs text-error" role="alert">
        {query.error.message} Enter the price manually.
      </p>
    )
  }
  if (!query.data) return null

  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted">
      <span>CoinGecko estimate · {formatPriceTimestamp(query.data.timestamp)} UTC · not the exact execution price</span>
      {isOverridden && (
        <button type="button" className="font-medium text-accent hover:underline" onClick={onUseEstimate}>
          Use estimate
        </button>
      )}
    </div>
  )
}

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
        mode?: never
        onUpdate?: never
      }
    | {
        rotation: SpotRotation
        mode?: never
        onCreate?: never
        onClose: (rotation: SpotRotation, input: CloseRotationInput) => void | Promise<void>
      }
    | {
        rotation: SpotRotation
        mode: 'edit'
        onCreate?: never
        onClose?: never
        onUpdate: (rotation: SpotRotation, input: EditSpotRotationInput) => void | Promise<void>
      }
  )

export function ManualSpotDealModal(props: ManualSpotDealModalProps) {
  const { rotation, onCancel, currency, currencyRate } = props
  const isEditing = props.mode === 'edit'
  const isRecordingSale = Boolean(rotation && !isEditing)
  const now = formatDateTimeLocalValue(new Date())
  const [symbol, setSymbol] = useState(rotation?.symbol ?? '')
  const [coinQuery, setCoinQuery] = useState(rotation?.symbol ?? '')
  const [selectedCoin, setSelectedCoin] = useState<CoinGeckoCoin | null>(
    rotation?.coingecko_id
      ? {
          id: rotation.coingecko_id,
          name: rotation.symbol.split('/')[0] ?? rotation.symbol,
          symbol: rotation.symbol.split('/')[0] ?? rotation.symbol,
          image: '',
          rank: 0,
        }
      : null,
  )
  const [buyQty, setBuyQty] = useState(
    rotation ? String(isEditing && rotation.status === 'CLOSED' ? rotation.buy_qty : rotation.buy_qty - rotation.sold_qty) : '',
  )
  const [invested, setInvested] = useState(rotation?.invested_amount == null ? '' : String(rotation.invested_amount))
  const [buyPrice, setBuyPrice] = useState<{ key: string | null; value: string } | null>(
    rotation
      ? {
          key: getHistoricalPriceKey(
            rotation.coingecko_id,
            getHistoricalLookupTime(rotation.buy_time ? formatDateTimeLocalValue(new Date(rotation.buy_time)) : ''),
          ),
          value: String(rotation.buy_price),
        }
      : null,
  )
  const [buyTime, setBuyTime] = useState(rotation?.buy_time ? formatDateTimeLocalValue(new Date(rotation.buy_time)) : now)
  const [buyFee, setBuyFee] = useState(rotation ? String(rotation.fee_amount) : '0')
  const [alreadySold, setAlreadySold] = useState(Boolean(rotation && (!isEditing || rotation.status === 'CLOSED')))
  const [sellPrice, setSellPrice] = useState<{ key: string | null; value: string } | null>(
    rotation?.status === 'CLOSED' && rotation.sell_price !== null
      ? {
          key: getHistoricalPriceKey(
            rotation.coingecko_id,
            getHistoricalLookupTime(rotation.sell_time ? formatDateTimeLocalValue(new Date(rotation.sell_time)) : ''),
          ),
          value: String(rotation.sell_price),
        }
      : null,
  )
  const [sellTime, setSellTime] = useState(
    rotation?.status === 'CLOSED' && rotation.sell_time ? formatDateTimeLocalValue(new Date(rotation.sell_time)) : now,
  )
  const [sellFee, setSellFee] = useState('0')
  const [coinWasChanged, setCoinWasChanged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const quantity = Number(buyQty)
  const investedUsd = Number(invested)
  const coinId = selectedCoin?.id ?? (!coinWasChanged ? (rotation?.coingecko_id ?? null) : null)
  const buyLookupTime = getHistoricalLookupTime(buyTime)
  const sellLookupTime = getHistoricalLookupTime(sellTime)
  const buyPriceKey = getHistoricalPriceKey(coinId, buyLookupTime)
  const sellPriceKey = getHistoricalPriceKey(coinId, sellLookupTime)
  const buyPriceQuery = useQuery({
    queryKey: ['coingecko', 'historical-price', coinId, buyLookupTime],
    queryFn: () => {
      if (!coinId || !buyLookupTime) throw new Error('Choose a coin and valid buy date first.')
      return getHistoricalCoinPrice(coinId, buyLookupTime)
    },
    enabled: Boolean(coinId && buyLookupTime && !isRecordingSale),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  })
  const sellPriceQuery = useQuery({
    queryKey: ['coingecko', 'historical-price', coinId, sellLookupTime],
    queryFn: () => {
      if (!coinId || !sellLookupTime) throw new Error('Choose a coin and valid sale date first.')
      return getHistoricalCoinPrice(coinId, sellLookupTime)
    },
    enabled: Boolean(coinId && sellLookupTime && alreadySold),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  })
  const buyPriceValue = buyPrice?.key === buyPriceKey ? buyPrice.value : (buyPriceQuery.data?.price.toString() ?? '')
  const sellPriceValue = sellPrice?.key === sellPriceKey ? sellPrice.value : (sellPriceQuery.data?.price.toString() ?? '')
  const buyPriceUsd = Number(buyPriceValue)
  const buyFeeUsd = Number(buyFee)
  const sellPriceUsd = Number(sellPriceValue)
  const sellFeeUsd = Number(sellFee)
  const validBuy =
    Number.isFinite(quantity) &&
    quantity > 0 &&
    (isEditing
      ? invested.trim() === '' || (Number.isFinite(investedUsd) && investedUsd >= 0)
      : rotation !== undefined || (Number.isFinite(investedUsd) && investedUsd > 0)) &&
    Number.isFinite(buyPriceUsd) &&
    buyPriceUsd > 0 &&
    Number.isFinite(buyFeeUsd) &&
    buyFeeUsd >= 0
  const validSell = Number.isFinite(sellPriceUsd) && sellPriceUsd > 0 && Number.isFinite(sellFeeUsd) && sellFeeUsd >= 0
  const preview =
    validBuy && alreadySold && validSell
      ? isRecordingSale && rotation
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
            feeAmountUsd: buyFeeUsd + (isEditing && rotation?.status === 'CLOSED' ? 0 : sellFeeUsd),
          })
      : null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const normalizedSymbol = symbol.trim().toUpperCase().replace(/\s/g, '')
    if (!isRecordingSale && !/^[A-Z0-9]{2,20}\/(USD|USDT|USDC|FDUSD|TUSD|USDP|DAI|BUSD)$/.test(normalizedSymbol)) {
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
        new Date(sellTime).getTime() < new Date(isRecordingSale ? (rotation?.buy_time ?? buyTime) : buyTime).getTime())
    ) {
      setError('Check the sale price, fee and date. The sale cannot be before the buy.')
      return
    }

    try {
      setSaving(true)
      if (props.mode === 'edit' && rotation) {
        const editingRotation = rotation
        const editBase = {
          symbol: normalizedSymbol,
          coinGeckoId: coinId,
          buyPrice: buyPriceUsd,
          buyQty: quantity,
          investedAmountUsd: invested.trim() === '' ? null : investedUsd,
          feeAmountUsd: buyFeeUsd + (editingRotation.status === 'CLOSED' ? 0 : sellFeeUsd),
          buyTime: new Date(buyTime).toISOString(),
        }
        const editInput: EditSpotRotationInput =
          editingRotation.status === 'CLOSED'
            ? {
                ...editBase,
                status: 'CLOSED',
                sellPrice: sellPriceUsd,
                sellTime: new Date(sellTime).toISOString(),
              }
            : { ...editBase, status: 'OPEN' }
        await props.onUpdate(editingRotation, editInput)
      } else if ('onClose' in props && rotation) {
        await props.onClose(
          rotation,
          calculateRotationClose(rotation, {
            sellPrice: sellPriceUsd,
            soldQty: quantity,
            sellFeeAmountUsd: sellFeeUsd,
            sellTime: new Date(sellTime).toISOString(),
          }),
        )
      } else if ('onCreate' in props) {
        const buyInput = {
          symbol: normalizedSymbol,
          coinGeckoId: selectedCoin?.id ?? null,
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

  const dialogTitle = isEditing && rotation ? `Edit ${rotation.symbol} deal` : rotation ? `Record a sale for ${rotation.symbol}` : 'Add a spot deal'
  const buyFieldsDisabled = isRecordingSale
  const editingClosedDeal = isEditing && rotation?.status === 'CLOSED'

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !saving) onCancel()
      }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          onEscapeKeyDown={(event) => {
            if (saving) event.preventDefault()
          }}
          onPointerDownOutside={(event) => {
            if (saving) event.preventDefault()
          }}
          className="ui-surface fixed top-1/2 left-1/2 z-50 max-h-[min(90vh,52rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-5">
          <Dialog.Title className="text-xl font-semibold">{dialogTitle}</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm leading-relaxed text-muted">
            {isEditing && rotation
              ? 'Update the recorded details for this manual deal. Profit and ROI will be recalculated.'
              : rotation
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
                  Coin or pair (USD/USDT)
                  <CoinSearchInput
                    autoFocus={!rotation}
                    disabled={buyFieldsDisabled}
                    value={coinQuery}
                    selectedCoin={selectedCoin}
                    onValueChange={(value) => {
                      setCoinQuery(value)
                      setSelectedCoin(null)
                      setCoinWasChanged(true)
                      setSymbol(value)
                    }}
                    onSelect={(coin) => {
                      setSelectedCoin(coin)
                      setCoinWasChanged(false)
                      setSymbol(`${coin.symbol}/USDT`)
                    }}
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
                    required={!isEditing}
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
                <div className="block text-sm">
                  <label htmlFor="buy-price">Entry price (USD/USDT)</label>
                  <input
                    id="buy-price"
                    required
                    min="0"
                    step="any"
                    type="number"
                    inputMode="decimal"
                    disabled={buyFieldsDisabled}
                    value={buyPriceValue}
                    onChange={(event) => setBuyPrice({ key: buyPriceKey, value: event.target.value })}
                    className="input mt-1 px-3 py-2"
                  />
                  <HistoricalPriceStatus
                    query={buyPriceQuery}
                    isSelected={Boolean(coinId)}
                    onUseEstimate={() => setBuyPrice(null)}
                    isOverridden={buyPrice?.key === buyPriceKey}
                  />
                </div>
                <DateTimePicker label="Buy date and time" required disabled={buyFieldsDisabled} value={buyTime} onChange={setBuyTime} />
                {!isRecordingSale && (
                  <label className="block text-sm">
                    {editingClosedDeal ? 'Total fees (USD)' : 'Buy fee (USD)'}
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
                {isRecordingSale && rotation && (
                  <p className="mb-3 text-sm text-muted">
                    {formatNumber(quantity)} coins · entry {formatUnitPrice(rotation.buy_price * currencyRate, currency)}
                  </p>
                )}
                <div className="grid gap-3 border-b border-outline pb-5 sm:grid-cols-2">
                  <div className="block text-sm">
                    <label htmlFor="sell-price">Close price (USD/USDT)</label>
                    <input
                      id="sell-price"
                      required
                      min="0"
                      step="any"
                      type="number"
                      inputMode="decimal"
                      value={sellPriceValue}
                      onChange={(event) => setSellPrice({ key: sellPriceKey, value: event.target.value })}
                      className="input mt-1 px-3 py-2"
                    />
                    <HistoricalPriceStatus
                      query={sellPriceQuery}
                      isSelected={Boolean(coinId)}
                      onUseEstimate={() => setSellPrice(null)}
                      isOverridden={sellPrice?.key === sellPriceKey}
                    />
                  </div>
                  <DateTimePicker label="Close date and time" required value={sellTime} onChange={setSellTime} />
                  {!editingClosedDeal && (
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
                  )}
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
            <div className="flex justify-end gap-3">
              <Button type="button" variant="dashboard" className="text-md font-medium" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : isEditing ? 'Save changes' : rotation ? 'Save sale' : alreadySold ? 'Save completed deal' : 'Save open deal'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
