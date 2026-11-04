import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/Button'

type PortfolioErrorStateProps = {
  onRetry: () => void
  loading: boolean
  message: string
}

export function PortfolioErrorState({ onRetry, loading, message }: PortfolioErrorStateProps) {
  return (
    <section className="mt-4" role="alert">
      <div className="ui-surface overflow-hidden">
        <div className="flex flex-col gap-6 p-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-loss-outline bg-loss-subtle">
              <AlertTriangle className="h-6 w-6 text-loss" aria-hidden="true" />
            </div>
            <div className="max-w-xl">
              <h1 className="text-xl font-semibold sm:text-2xl">We couldn't load your portfolio</h1>
              <p className="mt-2 leading-6 text-muted">{message}</p>
            </div>
          </div>
          <Button onClick={onRetry} disabled={loading} className="shrink-0 md:self-start">
            Try again
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  )
}
