import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Check,
  ChevronRight,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftOpen,
  PanelRightOpen,
  Repeat2,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import type { Currency } from '@/features/portfolio/portfolio.types'
import { SORTED_CURRENCY_OPTIONS } from '@/features/portfolio/portfolio.types'
import logo from '@/assets/logo.svg'

type SidebarProps = {
  mobileOpen: boolean
  collapsed: boolean
  userEmail: string
  currency: Currency
  avatarUrl: string | null
  onLogout: () => void
  setCurrency: (value: Currency) => void
  onNavigate: () => void
  onToggleMobile: () => void
  onToggleCollapsed: () => void
}

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rotations', label: 'Spot rotations', icon: Repeat2 },
  { to: '/asset-history', label: 'Asset history', icon: History },
]

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

function Brand({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  return (
    <Link to="/dashboard" aria-label="CoinBilka dashboard" onClick={onNavigate} className="group relative flex min-w-0 items-center gap-1.5">
      <img className="h-8.5 w-8.5 shrink-0" src={logo} alt={logo} aria-hidden="true" />
      <span
        className={`truncate text-lg font-bold tracking-wider text-accent uppercase lg:absolute lg:left-10 lg:whitespace-nowrap lg:transition-opacity lg:duration-150 ${
          compact ? 'lg:pointer-events-none lg:opacity-0' : 'lg:opacity-100 lg:delay-300'
        }`}>
        <span className="text-text">Coin</span>Bilka
      </span>
    </Link>
  )
}

export function Sidebar({
  mobileOpen,
  collapsed,
  userEmail,
  currency,
  avatarUrl,
  onLogout,
  setCurrency,
  onNavigate,
  onToggleMobile,
  onToggleCollapsed,
}: SidebarProps) {
  const accountButtonClass = `relative flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md py-2 text-left transition hover:bg-surface-raised ${
    collapsed ? 'lg:py-2' : ''
  }`

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-outline bg-app px-4 lg:hidden">
        <Brand onNavigate={onNavigate} />
        <button
          type="button"
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          aria-controls="app-sidebar"
          onClick={onToggleMobile}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted transition hover:bg-surface-raised hover:text-text">
          {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </header>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Dismiss navigation overlay"
          className="fixed inset-x-0 top-14 bottom-0 z-20 bg-overlay lg:hidden"
          onClick={onNavigate}
        />
      )}
      <aside
        id="app-sidebar"
        className={`group fixed top-14 bottom-0 left-0 z-30 -ml-2 flex min-w-0 shrink-0 flex-col overflow-x-clip bg-surface px-2 py-4 transition-[transform,width] duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          collapsed ? 'lg:w-12.5' : 'lg:w-64'
        } ${mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible lg:translate-x-0'}`}>
        <div className="flex items-center gap-2 pb-4">
          <div className="relative flex min-w-0 flex-1 items-center justify-between">
            <div
              className={
                collapsed
                  ? 'lg:transition-opacity lg:duration-0 lg:group-hover:opacity-0 lg:group-hover:delay-300 lg:has-focus-visible:opacity-0'
                  : ''
              }>
              <Brand compact={collapsed} onNavigate={onNavigate} />
            </div>
            <div
              className={`hidden h-8.5 w-8.5 shrink-0 items-center justify-center lg:flex ${
                collapsed
                  ? 'pointer-events-none absolute inset-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-0 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:delay-300 has-focus-visible:pointer-events-auto has-focus-visible:opacity-100'
                  : ''
              }`}>
              <button
                type="button"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-pressed={collapsed}
                onClick={onToggleCollapsed}
                className="z-1 flex h-8.5 w-8.5 shrink-0 cursor-pointer items-center justify-center rounded-md bg-surface text-muted transition-[background-color,color] duration-200 hover:bg-surface-raised hover:text-text">
                {collapsed ? (
                  <PanelLeftOpen className="h-4.5 w-4.5" aria-hidden="true" />
                ) : (
                  <PanelRightOpen className="h-4.5 w-4.5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 border-b border-outline pb-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" aria-label={`Open profile menu for ${userEmail}`} className={accountButtonClass}>
                <span className="h-8.5 w-8.5 shrink-0 items-center justify-center overflow-hidden rounded-md border border-outline bg-accent-subtle text-sm font-semibold text-accent">
                  {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : (userEmail[0]?.toUpperCase() ?? '?')}
                </span>
                <span
                  className={`absolute top-1/2 left-12 min-w-0 -translate-y-1/2 truncate whitespace-nowrap transition-opacity duration-150 ${
                    collapsed ? 'lg:pointer-events-none lg:opacity-0' : 'lg:opacity-100 lg:delay-300'
                  }`}>
                  <span className="label block text-[10px]">Signed in as</span>
                  <span className="block truncate text-sm font-medium text-text">{userEmail}</span>
                </span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content side="right" align="start" sideOffset={6} className="ui-surface z-50 w-56 overflow-hidden">
                <DropdownMenu.Label className="block px-4 py-3">
                  <p className="label mb-1 flex items-center gap-1.5 text-[10px]">
                    <Sparkles className="h-3 w-3 text-accent" aria-hidden="true" />
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
                      className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-text transition outline-none hover:bg-surface-raised data-highlighted:bg-surface-raised data-[state=open]:bg-surface-raised">
                      <span>Currency</span>
                      <span className="flex items-center gap-1">
                        <span className="rounded-md border border-accent-outline bg-accent-subtle px-2 py-1 text-xs font-semibold text-accent">
                          <span className="flex items-center gap-1.5">
                            <CurrencyFlag currency={currency} />
                            {currency}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-4 w-4 text-muted transition group-hover:text-accent group-data-[state=open]:translate-x-1 group-data-[state=open]:text-accent"
                          aria-hidden="true"
                        />
                      </span>
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.SubContent sideOffset={8} className="ui-surface z-50 min-w-36 overflow-hidden p-1.5">
                        <DropdownMenu.RadioGroup value={currency} className="space-y-1">
                          {SORTED_CURRENCY_OPTIONS.map((option) => (
                            <DropdownMenu.RadioItem
                              key={option}
                              value={option}
                              onSelect={() => setCurrency(option)}
                              className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-xs font-medium text-muted transition outline-none hover:bg-surface-raised hover:text-text data-highlighted:bg-surface-raised data-highlighted:text-text data-[state=checked]:bg-accent data-[state=checked]:text-on-accent">
                              <span className="flex items-center gap-2">
                                <CurrencyFlag currency={option} />
                                {option}
                              </span>
                              <DropdownMenu.ItemIndicator>
                                <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
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
                      onClick={onNavigate}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-text transition outline-none hover:bg-surface-raised data-highlighted:bg-surface-raised">
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      Settings
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => {
                      onNavigate()
                      onLogout()
                    }}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-loss transition outline-none hover:bg-loss-subtle data-highlighted:bg-loss-subtle">
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Log out
                  </DropdownMenu.Item>
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <nav aria-label="Main navigation" className="flex-1">
          <ul className="space-y-1">
            {navigationItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  aria-label={label}
                  className={({ isActive }) =>
                    `relative flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md p-2 text-left text-sm font-medium transition ${isActive ? 'bg-accent text-on-accent' : 'text-muted hover:bg-surface-raised hover:text-text'}`
                  }>
                  <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                  <span
                    className={`absolute top-1/2 left-10 -translate-y-1/2 truncate whitespace-nowrap transition-opacity duration-150 ${
                      collapsed ? 'lg:pointer-events-none lg:opacity-0' : 'lg:opacity-100 lg:delay-300'
                    }`}>
                    {label}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal navigation" className="mt-auto border-t border-outline pt-2">
          <NavLink
            to="/privacy"
            onClick={onNavigate}
            title={collapsed ? 'Privacy policy' : undefined}
            aria-label="Privacy policy"
            className={({ isActive }) =>
              `relative flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md p-2 text-left text-sm font-medium transition ${isActive ? 'bg-accent text-on-accent' : 'text-muted hover:bg-surface-raised hover:text-text'}`
            }>
            <FileText className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            <span
              className={`absolute top-1/2 left-10 -translate-y-1/2 truncate whitespace-nowrap transition-opacity duration-150 ${
                collapsed ? 'lg:pointer-events-none lg:opacity-0' : 'lg:opacity-100 lg:delay-300'
              }`}>
              Privacy policy
            </span>
          </NavLink>
        </nav>
      </aside>
    </>
  )
}
