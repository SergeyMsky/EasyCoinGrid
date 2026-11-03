import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronRight, LogOut, Menu, Settings, Sparkles, X } from 'lucide-react'
import { SORTED_CURRENCY_OPTIONS, type Currency } from '@/features/portfolio/portfolio.types'
import { Link, NavLink } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { ButtonLink } from '@/shared/components/Link'

type HeaderProps = {
  onLogout?: () => void
  userEmail?: string
  currency: Currency
  setCurrency: (value: Currency) => void
  avatarUrl: string | null
  navigationOpen: boolean
  onToggleNavigation: () => void
}

const currencyFlagCodes: Record<Currency, string> = {
  USD: 'us',
  EUR: 'eu',
  GBP: 'gb',
  JPY: 'jp',
  CHF: 'ch',
  CAD: 'ca',
  AUD: 'au',
  UAH: 'ua',
}

function CurrencyFlag({ currency }: { currency: Currency }) {
  return (
    <img
      src={`https://flagcdn.com/${currencyFlagCodes[currency]}.svg`}
      alt=""
      aria-hidden="true"
      className="h-3.5 w-5 shrink-0 rounded-xs object-cover"
    />
  )
}

export function Header({ onLogout, userEmail, currency, setCurrency, avatarUrl, navigationOpen, onToggleNavigation }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-outline bg-app">
      <div className="flex h-15.25 items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          {userEmail && (
            <button
              type="button"
              aria-label={navigationOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={navigationOpen}
              onClick={onToggleNavigation}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-outline bg-surface-raised text-text transition hover:border-muted hover:bg-surface hover:text-text lg:hidden">
              {navigationOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
          <Link to={userEmail ? '/dashboard' : '/home'} className="group flex items-center gap-1 sm:gap-2">
            <img className="h-6 w-6 sm:h-8 sm:w-8" src={logo} alt="CoinBilka Logo" />
            <span className="text-md translate-y-px font-bold tracking-wider text-accent uppercase sm:text-lg">
              <span className="text-text">Coin</span>Bilka
            </span>
          </Link>
          {!userEmail && (
            <nav className="hidden items-center gap-5 sm:flex">
              <NavLink
                to="/home"
                className={({ isActive }) => `font-medium tracking-wider transition ${isActive ? 'text-text' : 'text-muted hover:text-text'}`}>
                Home
              </NavLink>
            </nav>
          )}
        </div>
        <div className="flex h-full items-center gap-4">
          {userEmail ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Open profile menu"
                  className="group my-auto h-8 w-8 cursor-pointer overflow-hidden rounded-md border border-outline bg-accent-subtle text-sm font-medium text-accent transition duration-200 hover:border-muted">
                  {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" /> : userEmail[0].toUpperCase()}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={4} className="ui-surface z-50 w-54 overflow-hidden">
                  <DropdownMenu.Label className="block px-4 py-3">
                    <p className="label mb-1 flex items-center gap-1.5 text-[10px]">
                      <Sparkles className="h-3 w-3 text-accent" />
                      Signed in as
                    </p>
                    <p className="truncate text-sm text-text" title={userEmail}>
                      {userEmail}
                    </p>
                  </DropdownMenu.Label>
                  <DropdownMenu.Separator className="border-b border-outline" />
                  <div className="p-1.5">
                    <DropdownMenu.Sub>
                      <DropdownMenu.SubTrigger
                        aria-label={`Currency: ${currency}`}
                        className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-text transition duration-200 outline-none hover:bg-surface-raised hover:text-text data-[state=open]:bg-surface-raised">
                        <span>Currency</span>
                        <span className="flex items-center gap-1">
                          <span className="rounded-md border border-accent-outline bg-accent-subtle px-2 py-1 text-xs font-semibold text-accent">
                            <span className="flex items-center gap-1.5">
                              <CurrencyFlag currency={currency} />
                              {currency}
                            </span>
                          </span>
                          <ChevronRight
                            className="h-4 w-4 text-muted transition group-hover:text-accent group-data-[state=open]:rotate-90 group-data-[state=open]:text-accent"
                            aria-hidden="true"
                          />
                        </span>
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.SubContent sideOffset={12} alignOffset={-6} className="ui-surface z-50 min-w-36 overflow-hidden p-1.5">
                          <DropdownMenu.RadioGroup value={currency} className="space-y-1">
                            {SORTED_CURRENCY_OPTIONS.map((option) => (
                              <DropdownMenu.RadioItem
                                key={option}
                                value={option}
                                onSelect={() => setCurrency(option)}
                                className="relative flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-xs font-medium text-muted transition duration-200 outline-none hover:bg-surface-raised hover:text-text data-highlighted:bg-surface-raised data-highlighted:text-text data-[state=checked]:bg-accent data-[state=checked]:text-on-accent">
                                <span className="flex items-center gap-2">
                                  <CurrencyFlag currency={option} />
                                  {option}
                                </span>
                                <DropdownMenu.ItemIndicator>
                                  <Check className="h-4 w-4 shrink-0 text-app" strokeWidth={2.5} aria-hidden="true" />
                                </DropdownMenu.ItemIndicator>
                              </DropdownMenu.RadioItem>
                            ))}
                          </DropdownMenu.RadioGroup>
                        </DropdownMenu.SubContent>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Sub>
                  </div>
                  <DropdownMenu.Separator className="border-b border-outline" />
                  <div className="space-y-1 p-1.5">
                    <DropdownMenu.Item asChild>
                      <Link
                        to="/settings"
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-text transition duration-200 outline-none hover:bg-surface-raised hover:text-text data-highlighted:bg-surface-raised">
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        Settings
                      </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onSelect={() => onLogout?.()}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-loss transition duration-200 outline-none hover:bg-loss-subtle hover:text-loss data-highlighted:bg-loss-subtle">
                      <LogOut className="h-4 w-4" />
                      Log out
                    </DropdownMenu.Item>
                  </div>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <ButtonLink to="/auth?mode=register" size="sm">
              Get started
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  )
}
