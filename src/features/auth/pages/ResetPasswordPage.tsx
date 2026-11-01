import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { SuccessMessage } from '@/shared/components/SuccessMessage'
import { validatePassword } from '@/shared/utils/validate-password'
import { Button } from '@/shared/components/Button'
import { Spinner } from '@/shared/components/Spinner'
import { PasswordField } from '@/shared/components/PasswordField'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
        <div className="grid gap-4">
          <PasswordField
            label="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            visibilityLabel="password confirmation"
            required
          />
        </div>
        <p className="mt-2 text-xs text-muted">Use at least 8 characters with uppercase, lowercase, number, and special character.</p>
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
