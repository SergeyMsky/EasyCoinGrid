import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          setError(exchangeError.message)
          return
        }
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setError('Unable to confirm your email.')
          return
        }
      }

      navigate('/auth/confirm', { replace: true })
    }

    void handleCallback()
  }, [navigate, searchParams])

  if (error) {
    return (
      <main className="flex min-h-[calc(100vh-67px)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg ui-surface p-6 shadow-xl shadow-black/50 sm:p-8 text-center">
          <h1 className="text-2xl font-semibold">Confirmation failed</h1>
          <p className="mt-2 text-red-400">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-[calc(100vh-67px)] items-center justify-center px-4 py-10">
      <p>Confirming your email...</p>
    </main>
  )
}
