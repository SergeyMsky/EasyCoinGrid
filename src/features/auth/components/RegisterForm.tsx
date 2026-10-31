import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { validatePassword } from '@/shared/utils/validate-password'
import { Button } from '@/shared/components/Button'
import { SuccessMessage } from '@/shared/components/SuccessMessage'
import { Spinner } from '@/shared/components/Spinner'
import { Link } from 'react-router-dom'

export function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const registrationCompleted = Boolean(success)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const passwordError = validatePassword(password)

    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    if (!data.session) {
      setPassword('')
      setSuccess('Check your email to confirm your account.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-max-sm m-auto flex flex-col">
      <label className="flex flex-col gap-2">
        <span className="label">Email</span>
        <input
          className="input h-13 px-4 py-2"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="user@example.com"
          disabled={registrationCompleted || loading}
          required
        />
      </label>
      <label className="mt-4 flex flex-col gap-2">
        <span className="label">Password</span>
        <div className="relative">
          <input
            className="input h-13 px-4 py-2 pr-11"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            disabled={registrationCompleted || loading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted hover:text-text">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>
      <p className="mt-2 text-xs text-muted">Use at least 8 characters with uppercase, lowercase, number, and special character.</p>
      <SuccessMessage message={success} />
      <ErrorMessage message={error} />
      <Button variant="filled" className="mt-4" type="submit" disabled={registrationCompleted || loading}>
        {loading ? (
          <>
            <Spinner />
            Creating account...
          </>
        ) : registrationCompleted ? (
          'Email confirmation required'
        ) : (
          'Sign up'
        )}
      </Button>
      <p className="mt-4 text-center text-xs text-muted">
        Read our{' '}
        <Link to="/privacy" className="text-accent underline underline-offset-2 hover:text-text">
          Privacy policy
        </Link>
        .
      </p>
    </form>
  )
}
