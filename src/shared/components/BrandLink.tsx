import { Link } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { BrandName } from '@/shared/constants/brand'
import { BRAND_NAME } from '@/shared/constants/brand-name'

type BrandLinkProps = {
  to: string
  ariaLabel?: string
  compact?: boolean
  onClick?: () => void
}

export function BrandLink({ to, ariaLabel = BRAND_NAME, compact = false, onClick }: BrandLinkProps) {
  return (
    <Link to={to} aria-label={ariaLabel} onClick={onClick} className="group relative flex min-w-0 items-center gap-1.5">
      <img className="h-8.5 w-8.5 shrink-0" src={logo} alt="" aria-hidden="true" />
      <span
        className={`truncate text-lg text-accent lg:absolute lg:left-10 lg:whitespace-nowrap lg:transition-opacity lg:duration-150 ${
          compact ? 'lg:pointer-events-none lg:opacity-0' : 'lg:opacity-100 lg:delay-300'
        }`}>
        <BrandName />
      </span>
    </Link>
  )
}
