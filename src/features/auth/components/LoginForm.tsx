import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { Button } from '@/shared/components/Button'
import { PasswordField } from '@/shared/components/PasswordField'

export function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

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
      <PasswordField
        className="mt-4 flex flex-col gap-2"
        label="Password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />
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
