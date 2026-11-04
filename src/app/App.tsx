import { lazy, Suspense, useState, useEffect, useRef, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CURRENCY_OPTIONS, type Currency } from '@/features/portfolio/portfolio.types'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import type { Session } from '@supabase/supabase-js'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '@/shared/components/Spinner'
import { signOut } from '@/features/auth/api/auth.api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getAvatarUrl } from '@/services/avatar'

const Dashboard = lazy(() => import('@/pages/Dashboard').then(({ Dashboard: page }) => ({ default: page })))
const RotationsPage = lazy(() => import('@/pages/RotationsPage').then(({ RotationsPage: page }) => ({ default: page })))
const AssetHistoryPage = lazy(() => import('@/pages/AssetHistoryPage').then(({ AssetHistoryPage: page }) => ({ default: page })))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then(({ SettingsPage: page }) => ({ default: page })))
const AuthPage = lazy(() => import('@/features/auth/pages/AuthPage').then(({ AuthPage: page }) => ({ default: page })))
const Home = lazy(() => import('@/pages/Home').then(({ Home: page }) => ({ default: page })))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage').then(({ ResetPasswordPage: page }) => ({ default: page })))
const AuthCallbackPage = lazy(() => import('@/features/auth/pages/AuthCallbackPage').then(({ AuthCallbackPage: page }) => ({ default: page })))
const EmailConfirmedPage = lazy(() => import('@/features/auth/pages/EmailConfirmedPage').then(({ EmailConfirmedPage: page }) => ({ default: page })))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage').then(({ PrivacyPage: page }) => ({ default: page })))

function getStoredCurrency(): Currency {
  const storedCurrency = localStorage.getItem('currency')
  return CURRENCY_OPTIONS.includes(storedCurrency as Currency) ? (storedCurrency as Currency) : 'USD'
}

function ProtectedRoute({ session, children }: { session: Session | null; children: (session: Session) => ReactNode }) {
  if (!session) return <Navigate to="/auth" replace />
  return <>{children(session)}</>
}

function PublicRoute({ session, children }: { session: Session | null; children: ReactNode }) {
  if (session) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

type AppLayoutProps = {
  children: ReactNode
  session: Session
  navigationOpen: boolean
  sidebarCollapsed: boolean
  currency: Currency
  avatarUrl: string | null
  onLogout: () => void
  setCurrency: (value: Currency) => void
  onNavigate: () => void
  onToggleMobile: () => void
  onToggleCollapsed: () => void
}

function AppLayout({
  children,
  session,
  navigationOpen,
  sidebarCollapsed,
  currency,
  avatarUrl,
  onLogout,
  setCurrency,
  onNavigate,
  onToggleMobile,
  onToggleCollapsed,
}: AppLayoutProps) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        mobileOpen={navigationOpen}
        collapsed={sidebarCollapsed}
        userEmail={session.user.email ?? ''}
        currency={currency}
        avatarUrl={avatarUrl}
        onLogout={onLogout}
        setCurrency={setCurrency}
        onNavigate={onNavigate}
        onToggleMobile={onToggleMobile}
        onToggleCollapsed={onToggleCollapsed}
      />
      <main className="m-2 min-h-0 min-w-0 flex-1 overflow-y-auto rounded-xl border border-outline bg-app">{children}</main>
    </div>
  )
}

function App() {
  const [currency, setCurrency] = useState<Currency>(getStoredCurrency())
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { session, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const previousUserId = useRef<string | null>(null)
  const userId = session?.user.id ?? null

  async function handleLogout() {
    await signOut()
  }

  function renderAppPage(authenticatedSession: Session, children: ReactNode) {
    return (
      <AppLayout
        session={authenticatedSession}
        navigationOpen={navigationOpen}
        sidebarCollapsed={sidebarCollapsed}
        currency={currency}
        avatarUrl={avatarUrl}
        onLogout={handleLogout}
        setCurrency={setCurrency}
        onNavigate={() => setNavigationOpen(false)}
        onToggleMobile={() => setNavigationOpen((open) => !open)}
        onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}>
        {children}
      </AppLayout>
    )
  }

  useEffect(() => {
    localStorage.setItem('currency', currency)
  }, [currency])

  useEffect(() => {
    const previousId = previousUserId.current
    if (previousId && previousId !== userId) {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === 'user' && query.queryKey[1] === previousId })
    }
    previousUserId.current = userId
  }, [queryClient, userId])

  useEffect(() => {
    let cancelled = false

    async function loadAvatar() {
      const userId = session?.user.id

      if (!userId) {
        setAvatarUrl(null)
        return
      }

      const url = await getAvatarUrl(userId)

      if (!cancelled) {
        setAvatarUrl(url)
      }
    }

    void loadAvatar()

    return () => {
      cancelled = true
    }
  }, [session?.user.id])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-5">
        <Spinner className="size-10 border-6 border-outline border-t-accent" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      {!session && <Header />}

      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center p-5">
            <Spinner className="size-10 border-6 border-outline border-t-accent" />
          </div>
        }>
        <Routes>
          <Route
            path="/home"
            element={
              <PublicRoute session={session}>
                <Home />
              </PublicRoute>
            }
          />
          <Route path="/" element={<Navigate to={session ? '/dashboard' : '/home'} replace />} />
          <Route
            path="/auth"
            element={
              <PublicRoute session={session}>
                <AuthPage />
              </PublicRoute>
            }
          />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/auth/confirm" element={<EmailConfirmedPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={session ? renderAppPage(session, <PrivacyPage />) : <PrivacyPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute session={session}>
                {(authenticatedSession) =>
                  renderAppPage(authenticatedSession, <Dashboard currency={currency} userId={authenticatedSession.user.id} />)
                }
              </ProtectedRoute>
            }
          />
          <Route
            path="/rotations"
            element={
              <ProtectedRoute session={session}>
                {(authenticatedSession) =>
                  renderAppPage(authenticatedSession, <RotationsPage currency={currency} userId={authenticatedSession.user.id} />)
                }
              </ProtectedRoute>
            }
          />
          <Route
            path="/asset-history"
            element={
              <ProtectedRoute session={session}>
                {(authenticatedSession) => renderAppPage(authenticatedSession, <AssetHistoryPage userId={authenticatedSession.user.id} />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute session={session}>
                {(authenticatedSession) =>
                  renderAppPage(
                    authenticatedSession,
                    <SettingsPage
                      userEmail={authenticatedSession.user.email ?? ''}
                      session={authenticatedSession}
                      avatarUrl={avatarUrl}
                      setAvatarUrl={setAvatarUrl}
                    />,
                  )
                }
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
