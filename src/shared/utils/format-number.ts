export function formatNumber(
  value: number | string | null | undefined,
  maximumFractionDigits = 2,
): string {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
    useGrouping: true,
  }).format(number)
}

export function formatPrice(value: number): string {
  const fractionDigits = Math.abs(value) >= 1 ? 2 : 6

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: fractionDigits,
  }).format(value)
}