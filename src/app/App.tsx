import { useState, useEffect, type ReactNode } from 'react'
import { CURRENCY_OPTIONS, type Currency } from '@/features/portfolio/portfolio.types'
import { Header } from './components/Header'
import type { Session } from '@supabase/supabase-js'
import { Dashboard } from '@/pages/Dashboard'
import { AuthPage } from '@/features/auth/pages/AuthPage'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { Home } from '@/pages/Home'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { Spinner } from '@/shared/components/Spinner'
import { signOut } from '@/features/auth/api/auth.api'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage'
import { EmailConfirmedPage } from '@/features/auth/pages/EmailConfirmedPage'
import { getAvatarUrl } from '@/services/avatar'

function getStoredCurrency(): Currency {
  const storedCurrency = localStorage.getItem('currency')
  return CURRENCY_OPTIONS.includes(storedCurrency as Currency) ? (storedCurrency as Currency) : 'USD'
}

function ProtectedRoute({ session, children }: { session: Session | null; children: ReactNode }) {
  if (!session) return <Navigate to="/auth" replace />
  return <>{children}</>
}

function PublicRoute({ session, children }: { session: Session | null; children: ReactNode }) {
  if (session) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function App() {
  const [currency, setCurrency] = useState<Currency>(getStoredCurrency())
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { session, loading: authLoading } = useAuth()

  async function handleLogout() {
    await signOut()
  }

  useEffect(() => {
    localStorage.setItem('currency', currency)
  }, [currency])

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
        <Spinner className="size-10 border-6 border-white/10 border-t-emerald-400 " />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Header userEmail={session?.user.email} onLogout={handleLogout} currency={currency} setCurrency={setCurrency} avatarUrl={avatarUrl} />

      <Routes>
        <Route path="/home" element={<Home />} />
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
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              <Dashboard currency={currency} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute session={session}>
              <SettingsPage userEmail={session?.user.email ?? ''} session={session} avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
