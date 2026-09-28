import { formatNumber } from './format-number'

export function formatSignedValue(value: number, prefix = '', suffix = ''): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''

  return `${sign}${prefix}${formatNumber(Math.abs(value))}${suffix}`
}
