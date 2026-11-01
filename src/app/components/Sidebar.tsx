import { FileText, History, LayoutDashboard, Repeat2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'

type SidebarProps = {
  mobileOpen: boolean
  onNavigate: () => void
}

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rotations', label: 'Spot rotations', icon: Repeat2 },
  { to: '/asset-history', label: 'Asset history', icon: History },
]

export function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-x-0 top-15.25 bottom-0 z-20 bg-overlay lg:hidden"
          onClick={onNavigate}
        />
      )}
      <aside
        className={`fixed top-15.25 bottom-0 left-0 z-30 flex w-64 flex-col border-r border-outline bg-app px-4 pt-10 pb-4 transition-transform duration-300 lg:sticky lg:top-15.25 lg:z-0 lg:h-[calc(100vh-61px)] lg:w-60 lg:shrink-0 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
        <nav aria-label="Main navigation" className="flex-1">
          <ul className="space-y-1">
            {navigationItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                      isActive ? 'bg-accent text-on-accent' : 'text-muted hover:bg-surface-raised hover:text-text'
                    }`
                  }>
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal navigation" className="mt-auto border-t border-outline pt-4">
          <NavLink
            to="/privacy"
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                isActive ? 'bg-accent text-on-accent' : 'text-muted hover:bg-surface-raised hover:text-text'
              }`
            }>
            <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
            Privacy policy
          </NavLink>
        </nav>
      </aside>
    </>
  )
}
