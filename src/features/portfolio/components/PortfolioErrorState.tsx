import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/Button'

type PortfolioErrorStateProps = {
  onRetry: () => void
  loading: boolean
  message: string
}

export function PortfolioErrorState({ onRetry, loading, message }: PortfolioErrorStateProps) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <div className="ui-surface px-4 py-8 text-center sm:p-8">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-loss-outline bg-loss-subtle">
          <AlertTriangle className="h-7 w-7 text-loss" />
        </div>
        <h1 className="mb-3 text-2xl font-semibold sm:text-3xl">Unable to load portfolio</h1>
        <p className="mb-6 text-muted">{message}</p>
        <div className="flex justify-center">
          <Button onClick={onRetry} disabled={loading}>
            Try again
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </section>
  )
}
