import type { Currency } from '@/features/portfolio/portfolio.types'
import { APP_LOCALE } from './locale'

export function formatCurrency(value: number, currency: Currency): string {
  return new Intl.NumberFormat(APP_LOCALE, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatUnitPrice(value: number, currency: Currency): string {
  const currencyDigits = new Intl.NumberFormat(APP_LOCALE, { style: 'currency', currency }).resolvedOptions().minimumFractionDigits ?? 2
  const magnitude = value === 0 ? 0 : Math.floor(Math.log10(Math.abs(value)))
  const maximumFractionDigits = Math.max(currencyDigits, Math.min(12, 5 - magnitude - 1))

  return new Intl.NumberFormat(APP_LOCALE, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: currencyDigits,
    maximumFractionDigits,
  }).format(value)
}

export function formatSignedCurrency(value: number, currency: Currency): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''

  return `${sign}${formatCurrency(Math.abs(value), currency)}`
}
