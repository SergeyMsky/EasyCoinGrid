import { BRAND_NAME_PARTS } from './brand-name'

export function BrandName() {
  return (
    <span>
      {BRAND_NAME_PARTS.map(({ value, className }) => (
        <span key={value} className={`${className} font-bold tracking-wider lowercase`}>
          {value}
        </span>
      ))}
    </span>
  )
}
