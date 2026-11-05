export const BRAND_NAME_PARTS = [
  { value: 'coin', className: 'text-text' },
  { value: 'bilka', className: 'text-accent' },
] as const

export const BRAND_NAME = BRAND_NAME_PARTS.map(({ value }) => value).join('')
