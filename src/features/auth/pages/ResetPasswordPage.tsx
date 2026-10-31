import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { SuccessMessage } from '@/shared/components/SuccessMessage'
import { EyeOff, Eye } from 'lucide-react'
import { validatePassword } from '@/shared/utils/validate-password'
import { Button } from '@/shared/components/Button'
import { Spinner } from '@/shared/components/Spinner'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!success) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      navigate('/dashboard')
    }, 1500)

    return () => window.clearTimeout(timeoutId)
  }, [success, navigate])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const passwordError = validatePassword(password)

    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Password updated. Redirecting...')
  }

  return (
    <main className="flex min-h-[calc(100vh-67px)] items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit} className="ui-surface w-full max-w-lg p-6 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="mt-2 text-sm text-muted">Choose a strong password to secure your account.</p>
        </div>
        <label className="flex flex-col gap-2">
          <span className="label">New password</span>
          <div className="relative">
            <input
              className="input px-4 py-3 pr-11"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted hover:text-text">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <p className="mt-2 text-xs text-muted">Use at least 8 characters with uppercase, lowercase, number, and special character.</p>
        <label className="mt-4 flex flex-col gap-2">
          <span className="label">Confirm new password</span>
          <div className="relative">
            <input
              className="input px-4 py-3 pr-11"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              onClick={() => setShowConfirmPassword((visible) => !visible)}
              className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted hover:text-text">
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <ErrorMessage message={error} />
        <SuccessMessage message={success} />
        <Button variant="filled" className="mt-5 w-full" type="submit" disabled={loading}>
          {loading && <Spinner />}
          {loading ? 'Updating...' : 'Update password'}
        </Button>
        <button
          type="button"
          onClick={() => navigate('/auth')}
          className="mx-auto mt-4 block cursor-pointer text-center text-sm text-muted hover:text-text">
          Back to login
        </button>
      </form>
    </main>
  )
}
