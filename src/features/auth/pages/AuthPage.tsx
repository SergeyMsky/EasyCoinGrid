import { BarChart3, ShieldCheck, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm'
import { useSearchParams } from 'react-router-dom'

export function AuthPage() {
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode)
  const isLogin = mode === 'login'

  return (
    <main className="min-h-[calc(100vh-67px)] px-4 py-30 pt-20 sm:pt-30">
      <div className="ui-surface mx-auto grid w-full max-w-5xl overflow-hidden md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-surface-raised p-8 md:flex">
          <div className="mb-12">
            <p className="mb-8 text-sm font-bold tracking-[0.2em] text-accent uppercase">
              <span className="text-text">Easy</span>CoinGrid
            </p>
            <h1 className="mb-5 text-4xl leading-tight font-semibold">
              Your portfolio,
              <span className="block text-muted">under control.</span>
            </h1>
            <p className="max-w-sm leading-7 text-muted">Track your crypto assets and understand your portfolio from one focused dashboard.</p>
          </div>
          <div className="space-y-5">
            {[
              [WalletCards, 'All your assets in one place'],
              [BarChart3, 'Clear portfolio insights'],
              [ShieldCheck, 'Read-only exchange access'],
            ].map(([Icon, text]) => (
              <div key={text as string} className="flex items-center gap-3 text-sm text-muted">
                <Icon className="h-5 w-5 text-accent" />
                <span>{text as string}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="px-4 py-8 sm:p-8">
          <div className="mb-10 sm:mb-15">
            <p className="mb-2 text-sm text-accent">Welcome to easycoingrid</p>
            <h2 className="mb-2 text-3xl font-semibold">
              {mode === 'login' && 'Welcome back'}
              {mode === 'register' && 'Create your account'}
              {mode === 'forgot' && 'Forgot password'}
            </h2>
            <p className="text-sm text-muted">
              {mode === 'login' && 'Sign in to view your portfolio.'}
              {mode === 'register' && 'Start tracking your portfolio in a few minutes.'}
              {mode === 'forgot' && 'Enter your email to reset your password.'}
            </p>
          </div>
          {mode === 'login' && <LoginForm onForgotPassword={() => setMode('forgot')} />}
          {mode === 'register' && <RegisterForm />}
          {mode === 'forgot' && <ForgotPasswordForm onBack={() => setMode('login')} />}
          {mode !== 'forgot' && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-outline" />
                <span>OR</span>
                <span className="h-px flex-1 bg-outline" />
              </div>
              <div className="text-center text-muted">
                {isLogin ? `Don't have an account?` : 'Already have an account?'}{' '}
                <button
                  type="button"
                  className="cursor-pointer text-text transition hover:text-accent"
                  onClick={() => setMode(isLogin ? 'register' : 'login')}>
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
