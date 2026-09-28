import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { SuccessMessage } from '@/shared/components/SuccessMessage'
import { Spinner } from '@/shared/components/Spinner'
import { Button } from '@/shared/components/Button'

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess('Password reset link sent. Check your email.')
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-max-sm m-auto flex-col">
      <label className="flex flex-col gap-2">
        <span className="label">Email</span>
        <input className="input h-13 py-2 px-4" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="user@example.com" required />
      </label>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={onBack} className="text-emerald-400 hover:text-white transition cursor-pointer">
          Back to login
        </button>
      </div>
      <ErrorMessage message={error} />
      <SuccessMessage message={success} />
      <Button variant="filled" className="mt-4" type="submit" disabled={loading}>
        {loading && <Spinner />}
        {loading ? 'Sending...' : 'Send reset link'}
      </Button>
    </form>
  )
}
