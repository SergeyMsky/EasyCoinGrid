import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { validatePassword } from '@/shared/utils/validate-password'
import { Button } from '@/shared/components/Button'

export function LoginForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const passwordError = validatePassword(password)

    if (passwordError) {
      setError(passwordError)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-max-sm m-auto flex-col">
      <label className="flex flex-col gap-2">
        <span className="label">Email</span>
        <input className="input h-13 py-2 px-4" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" required />
      </label>
      <label className="mt-4 flex flex-col gap-2">
        <span className="label">Password</span>
        <div className="relative">
          <input
            className="input h-13 py-2 px-4 pr-11"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={onForgotPassword} className="text-emerald-400 hover:text-white transition cursor-pointer">
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
