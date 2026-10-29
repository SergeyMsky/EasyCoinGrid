import { LayoutDashboard, Repeat2 } from 'lucide-react'
import { NavLink } from 'react-router-dom'

type SidebarProps = {
  mobileOpen: boolean
  onNavigate: () => void
}

const navigationItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rotations', label: 'Spot rotations', icon: Repeat2 },
]

export function Sidebar({ mobileOpen, onNavigate }: SidebarProps) {
  return (
    <>
      {mobileOpen && <button type="button" aria-label="Close navigation menu" className="fixed inset-x-0 bottom-0 top-[61px] z-20 bg-black/60 lg:hidden" onClick={onNavigate} />}
      <aside
        className={`fixed bottom-0 left-0 top-15.25 z-30 w-64 border-r border-white/10 bg-[#0b0e0c] px-4 py-10 transition-transform duration-300 lg:sticky lg:top-[61px] lg:z-0 lg:flex lg:h-[calc(100vh-61px)] lg:w-60 lg:shrink-0 lg:translate-x-0 lg:flex-col lg:bg-transparent ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <nav aria-label="Main navigation">
          <ul className="space-y-1">
            {navigationItems.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-2 cursor-pointer rounded-md px-3 py-2 text-left text-sm transition font-medium ${
                      isActive ? 'bg-emerald-400 text-black' : 'text-gray-500 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}
