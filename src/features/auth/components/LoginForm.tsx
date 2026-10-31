import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { Button } from '@/shared/components/Button'

export function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
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
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={onForgotPassword} className="cursor-pointer text-accent transition hover:text-text">
          Forgot password?
        </button>
      </div>
      <ErrorMessage message={error} />
      <Button variant="filled" className="mt-4" type="submit">
        Sign in
      </Button>
    </form>
  )
}
