import { Check, ChevronRight, Cog, LogOut, Menu, Settings, Sparkles, X } from 'lucide-react'
import { SORTED_CURRENCY_OPTIONS, type Currency } from '@/features/portfolio/portfolio.types'
import { useEffect, useRef, useState } from 'react'
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
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)

  const profileButtonRef = useRef<HTMLDivElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const settingsButtonRef = useRef<HTMLDivElement>(null)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const currencyMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (
        profileButtonRef.current?.contains(target) ||
        profileMenuRef.current?.contains(target) ||
        settingsButtonRef.current?.contains(target) ||
        settingsMenuRef.current?.contains(target) ||
        currencyMenuRef.current?.contains(target) ||
        target.closest('[role="menu"]')
      ) {
        return
      }
      setProfileOpen(false)
      setSettingsOpen(false)
      setCurrencyOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
          <div ref={settingsButtonRef} className="relative z-10 flex h-full">
            <button
              type="button"
              aria-label="Open settings menu"
              aria-expanded={settingsOpen}
              onClick={() => {
                setSettingsOpen((open) => !open)
                setProfileOpen(false)
                setCurrencyOpen(false)
              }}
              className="my-auto flex cursor-pointer items-center justify-center rounded-full border border-outline bg-surface-raised p-1.5 text-muted transition hover:border-muted! hover:bg-surface! hover:text-text!">
              <Cog className="h-5 w-5" />
            </button>
            {settingsOpen && (
              <div
                ref={settingsMenuRef}
                role="menu"
                onMouseDown={(event) => event.stopPropagation()}
                className="ui-surface absolute top-full right-0 z-10 w-54 overflow-hidden">
                <div className="space-y-1 p-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrencyOpen((open) => !open)}
                    aria-expanded={currencyOpen}
                    className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 pr-1 text-left text-sm font-medium text-text transition hover:bg-surface-raised hover:text-text">
                    <span>Currency</span>
                    <div className="flex items-center gap-1">
                      <span className="rounded-md border border-accent-outline bg-accent-subtle px-2 py-1 text-xs font-semibold text-accent">
                        <span className="flex items-center gap-1.5">
                          <CurrencyFlag currency={currency} />
                          {currency}
                        </span>
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 text-muted transition ${currencyOpen ? 'rotate-90 text-accent' : 'group-hover:translate-x-0.5 group-hover:text-accent'}`}
                      />
                    </div>
                  </button>
                  {currencyOpen && (
                    <div
                      ref={currencyMenuRef}
                      role="group"
                      onMouseDown={(event) => event.stopPropagation()}
                      className="mt-1 space-y-1 border-t border-outline pt-1">
                      {SORTED_CURRENCY_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setCurrency(option)
                            setCurrencyOpen(false)
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition ${
                            currency === option ? 'bg-accent text-on-accent' : 'text-muted hover:bg-surface-raised hover:text-text'
                          }`}>
                          <span className="flex items-center gap-2">
                            <CurrencyFlag currency={option} />
                            {option}
                          </span>
                          {currency === option && <Check className="h-4 w-4 shrink-0 text-on-accent" strokeWidth={2.5} aria-hidden="true" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {userEmail ? (
            <div ref={profileButtonRef} className="relative z-10 flex h-full">
              <button
                type="button"
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen((open) => !open)
                  setSettingsOpen(false)
                  setCurrencyOpen(false)
                }}
                className="group my-auto h-8 w-8 cursor-pointer overflow-hidden rounded-md border border-outline bg-accent-subtle text-sm font-medium text-accent transition hover:border-muted">
                {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" /> : userEmail[0].toUpperCase()}
              </button>
              {profileOpen && (
                <div
                  ref={profileMenuRef}
                  role="menu"
                  onMouseDown={(event) => event.stopPropagation()}
                  className="ui-surface absolute top-full right-0 z-10 w-54 overflow-hidden">
                  <div className="border-b border-outline px-4 py-3">
                    <p className="label mb-1 flex items-center gap-1.5 text-[10px]!">
                      <Sparkles className="h-3 w-3 text-accent" />
                      Signed in as
                    </p>
                    <p className="truncate text-sm text-text" title={userEmail}>
                      {userEmail}
                    </p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      to="/settings"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="mb-1 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-text transition hover:bg-surface-raised hover:text-text">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-loss transition hover:bg-loss-subtle hover:text-loss"
                      onClick={() => {
                        setProfileOpen(false)
                        onLogout?.()
                      }}>
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
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
