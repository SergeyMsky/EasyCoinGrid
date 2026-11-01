import type { Currency } from '@/features/portfolio/portfolio.types'
import { APP_LOCALE } from './locale'

const currencyFormatters = new Map<Currency, Intl.NumberFormat>()
const currencyFractionDigits = new Map<Currency, number>()
const unitPriceFormatters = new Map<string, Intl.NumberFormat>()

function getCurrencyFormatter(currency: Currency) {
  let formatter = currencyFormatters.get(currency)

  if (!formatter) {
    formatter = new Intl.NumberFormat(APP_LOCALE, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    })
    currencyFormatters.set(currency, formatter)
  }

  return formatter
}

function getCurrencyFractionDigits(currency: Currency) {
  let fractionDigits = currencyFractionDigits.get(currency)

  if (fractionDigits === undefined) {
    fractionDigits = new Intl.NumberFormat(APP_LOCALE, { style: 'currency', currency }).resolvedOptions().minimumFractionDigits ?? 2
    currencyFractionDigits.set(currency, fractionDigits)
  }

  return fractionDigits
}

function getUnitPriceFormatter(currency: Currency, maximumFractionDigits: number) {
  const key = `${currency}:${maximumFractionDigits}`
  let formatter = unitPriceFormatters.get(key)

  if (!formatter) {
    formatter = new Intl.NumberFormat(APP_LOCALE, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: getCurrencyFractionDigits(currency),
      maximumFractionDigits,
    })
    unitPriceFormatters.set(key, formatter)
  }

  return formatter
}

export function formatCurrency(value: number, currency: Currency): string {
  return getCurrencyFormatter(currency).format(value)
}

export function formatUnitPrice(value: number, currency: Currency): string {
  const currencyDigits = getCurrencyFractionDigits(currency)
  const magnitude = value === 0 ? 0 : Math.floor(Math.log10(Math.abs(value)))
  const maximumFractionDigits = Math.max(currencyDigits, Math.min(12, 5 - magnitude - 1))

  return getUnitPriceFormatter(currency, maximumFractionDigits).format(value)
}

export function formatSignedCurrency(value: number, currency: Currency): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''

  return `${sign}${formatCurrency(Math.abs(value), currency)}`
}
