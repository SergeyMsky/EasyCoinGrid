import { describe, expect, it } from 'vitest'
import { formatCurrency, formatSignedCurrency, formatUnitPrice } from './format-currency'
import { APP_LOCALE } from './locale'

describe('currency formatters', () => {
  it('preserves currency formatting while reusing formatters for repeated calls', () => {
    const expected = new Intl.NumberFormat(APP_LOCALE, {
      style: 'currency',
      currency: 'EUR',
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format(1234.567)

    expect(formatCurrency(1234.567, 'EUR')).toBe(expected)
    expect(formatCurrency(1234.567, 'EUR')).toBe(expected)
  })

  it('caches unit-price formatting by currency and precision', () => {
    const values = [123.456, 0.123456, 0.0000123456]
    const results = values.map((value) => formatUnitPrice(value, 'USD'))

    expect(results).toEqual(
      values.map((value) => {
        const currencyDigits = new Intl.NumberFormat(APP_LOCALE, { style: 'currency', currency: 'USD' }).resolvedOptions().minimumFractionDigits ?? 2
        const magnitude = Math.floor(Math.log10(Math.abs(value)))
        const maximumFractionDigits = Math.max(currencyDigits, Math.min(12, 5 - magnitude - 1))
        return new Intl.NumberFormat(APP_LOCALE, {
          style: 'currency',
          currency: 'USD',
          currencyDisplay: 'narrowSymbol',
          minimumFractionDigits: currencyDigits,
          maximumFractionDigits,
        }).format(value)
      }),
    )
    expect(formatUnitPrice(values[1], 'USD')).toBe(results[1])
  })

  it('formats signed currency values with the existing sign behavior', () => {
    expect(formatSignedCurrency(12.5, 'USD')).toBe(`+${formatCurrency(12.5, 'USD')}`)
    expect(formatSignedCurrency(-12.5, 'USD')).toBe(`-${formatCurrency(12.5, 'USD')}`)
    expect(formatSignedCurrency(0, 'USD')).toBe(formatCurrency(0, 'USD'))
  })
})
