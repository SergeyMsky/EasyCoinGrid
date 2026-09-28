import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/shared/components/Button'

type PortfolioErrorStateProps = {
  onRetry: () => void
  loading: boolean
}

export function PortfolioErrorState({ onRetry, loading }: PortfolioErrorStateProps) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <div className="ui-surface px-4 py-8 sm:p-8 text-center">
        <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
          <AlertTriangle className="h-7 w-7 text-red-400" />
        </div>
        <h1 className="mb-3 text-2xl sm:text-3xl font-semibold">Unable to load portfolio</h1>
        <p className="mb-6 text-gray-500">We couldn't load your portfolio data. Please try again.</p>
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
