import { Link } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { ButtonLink } from '@/shared/components/Link'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-outline bg-surface">
      <div className="mx-auto flex h-15.25 max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link to="/home" className="group flex items-center gap-1 sm:gap-2">
            <img className="h-6 w-6 sm:h-8 sm:w-8" src={logo} alt="CoinBilka Logo" />
            <span className="text-md translate-y-px font-bold tracking-wider text-accent uppercase sm:text-lg">
              <span className="text-text">Coin</span>Bilka
            </span>
          </Link>
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
