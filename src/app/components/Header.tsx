import { BrandLink } from '@/shared/components/BrandLink'
import { ButtonLink } from '@/shared/components/Link'
import { BRAND_NAME } from '@/shared/constants/brand-name'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-outline bg-surface">
      <div className="mx-auto flex h-15.25 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <BrandLink to="/home" ariaLabel={`${BRAND_NAME} home`} />
        </div>
        <nav aria-label="Account" className="flex shrink-0 items-center gap-2">
          <ButtonLink to="/auth?mode=login" size="sm">
            Sign in
          </ButtonLink>
          <ButtonLink to="/auth?mode=register" variant="filled" size="sm">
            Get started
          </ButtonLink>
        </nav>
      </div>
    </header>
  )
}
