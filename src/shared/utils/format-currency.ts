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
export function formatSignedCurrency(value: number, currency: Currency): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''

  return `${sign}${formatCurrency(Math.abs(value), currency)}`
}
