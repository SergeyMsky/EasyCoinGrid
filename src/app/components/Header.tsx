import { Check, ChevronRight, Cog, LogOut, Settings, Sparkles } from 'lucide-react'
import { SORTED_CURRENCY_OPTIONS, type Currency } from '@/features/portfolio/portfolio.types'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import logo from '@/assets/logo.png'
import { ButtonLink } from '@/shared/components/Link'

type HeaderProps = {
  onLogout?: () => void
  userEmail?: string
  currency: Currency
  setCurrency: (value: Currency) => void
  avatarUrl: string | null
}

export function Header({ onLogout, userEmail, currency, setCurrency, avatarUrl }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)

  const profileButtonRef = useRef<HTMLDivElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const settingsButtonRef = useRef<HTMLDivElement>(null)
  const settingsMenuRef = useRef<HTMLDivElement>(null)
  const currencyMenuRef = useRef<HTMLDivElement>(null)

  const navClass = ({ isActive }: { isActive: boolean }) => `transition font-medium tracking-wider ${isActive ? 'text-white' : 'text-gray-500 hover:text-white'}`

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
    <header className="relative z-10 bg-black/30 border-b border-white/10 before:absolute before:top-0 before:left-1/2 before:-z-10 before:h-full before:w-screen before:-translate-x-1/2 before:backdrop-blur-md">
      <div className="mx-auto max-w-7xl flex items-center px-4 py-3 gap-10 justify-between">
        <div className="flex items-center gap-4 sm:gap-10">
          <Link to="/home" className="flex items-center gap-1 sm:gap-2 group">
            <img className="h-6 w-6 sm:h-8 sm:w-8" src={logo} alt="EasyCoinGrid Logo" />
            <span className="text-md sm:text-lg font-bold tracking-wider uppercase text-emerald-400 translate-y-px">
              <span className="text-white">Easy</span>CoinGrid
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-5 ">
            <NavLink to="/home" className={navClass}>
              Home
            </NavLink>
            {userEmail && (
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div ref={settingsButtonRef} className="relative z-10">
            <button
              type="button"
              aria-label="Open settings menu"
              aria-expanded={settingsOpen}
              onClick={() => {
                setSettingsOpen((open) => !open)
                setProfileOpen(false)
                setCurrencyOpen(false)
              }}
              className="cursor-pointer flex p-1.5 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-500 transition hover:border-white/20! hover:bg-black/5! hover:text-white!"
            >
              <Cog className="h-5 w-5" />
            </button>
            {settingsOpen && (
              <div
                ref={settingsMenuRef}
                role="menu"
                onMouseDown={(event) => event.stopPropagation()}
                className="absolute right-0 top-[54px] z-10 w-44 overflow-hidden ui-surface shadow-md shadow-black/50"
              >
                <div className="p-1.5 space-y-1">
                  <button
                    type="button"
                    onClick={() => setCurrencyOpen((open) => !open)}
                    aria-expanded={currencyOpen}
                    className="group cursor-pointer flex items-center justify-between gap-2 w-full rounded-md px-2.5 py-2 pr-1 text-left text-sm font-medium transition text-gray-300 hover:bg-white/10 hover:text-white"
                  >
                    <span>Currency</span>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 border border-emerald-400/20 rounded-md bg-emerald-400/10 text-emerald-400 text-xs font-semibold">{currency}</span>
                      <ChevronRight className={`h-4 w-4 text-gray-500 transition ${currencyOpen ? 'rotate-90 text-emerald-400' : 'group-hover:translate-x-0.5 group-hover:text-emerald-400'}`} />
                    </div>
                  </button>
                  {currencyOpen && (
                    <div ref={currencyMenuRef} role="group" onMouseDown={(event) => event.stopPropagation()} className="mt-1 space-y-1 border-t border-white/10 pt-1">
                      {SORTED_CURRENCY_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setCurrency(option)
                            setCurrencyOpen(false)
                          }}
                          className={`cursor-pointer flex items-center justify-between gap-2 w-full rounded-md px-2.5 py-2 text-left text-xs font-medium transition ${
                            currency === option ? 'bg-emerald-400 text-black' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span>{option}</span>
                          {currency === option && <Check className="h-4 w-4 shrink-0 text-black" strokeWidth={2.5} aria-hidden="true" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {userEmail ? (
            <div ref={profileButtonRef} className="relative z-10">
              <button
                type="button"
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen((open) => !open)
                  setSettingsOpen(false)
                  setCurrencyOpen(false)
                }}
                className="group cursor-pointer flex items-center gap-1 ui-surface p-1.5 transition hover:border-white/20! hover:bg-black/5!"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-400/20 text-sm font-medium text-emerald-400 overflow-hidden">
                  {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" /> : userEmail[0].toUpperCase()}
                </div>
                <ChevronRight className={`h-4 w-4 text-gray-500 transition ${profileOpen ? 'rotate-90 text-emerald-400' : 'group-hover:translate-x-0.5 group-hover:text-emerald-400'}`} />
              </button>
              {profileOpen && (
                <div
                  ref={profileMenuRef}
                  role="menu"
                  onMouseDown={(event) => event.stopPropagation()}
                  className="absolute right-0 top-[58px] z-10 w-44 overflow-hidden ui-surface shadow-md shadow-black/50"
                >
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="flex items-center gap-1.5 mb-1 text-[10px]! label">
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      Signed in as
                    </p>
                    <p className="truncate text-sm text-gray-300" title={userEmail}>
                      {userEmail}
                    </p>
                  </div>
                  <div className="p-1.5">
                    <div className="space-y-1 mb-1 sm:hidden">
                      <NavLink
                        to="/home"
                        onClick={() => setProfileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center rounded-md px-2.5 py-2 text-sm font-medium transition ${isActive ? 'bg-emerald-400 text-black' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`
                        }
                      >
                        Home
                      </NavLink>
                      <NavLink
                        to="/dashboard"
                        onClick={() => setProfileOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center rounded-md px-2.5 py-2 text-sm font-medium transition ${isActive ? 'bg-emerald-400 text-black' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`
                        }
                      >
                        Dashboard
                      </NavLink>
                    </div>
                    <Link
                      to="/settings"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 mb-1 rounded-md font-medium px-2.5 py-2 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      className="cursor-pointer flex items-center gap-2 w-full rounded-md font-medium px-2.5 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => {
                        setProfileOpen(false)
                        onLogout?.()
                      }}
                    >
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
