import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/Button'
import { ArrowRight } from 'lucide-react'

export function EmailConfirmedPage() {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-[calc(100vh-67px)] items-center justify-center px-4 py-10">
      <div className="ui-surface w-full max-w-lg p-6 text-center sm:p-8">
        <h1 className="text-2xl font-semibold">Email confirmed</h1>
        <p className="mt-2 text-muted">Your account has been successfully verified.</p>
        <Button variant="filled" className="mt-5 w-full" onClick={() => navigate('/dashboard')}>
          Continue to dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </main>
  )
}
