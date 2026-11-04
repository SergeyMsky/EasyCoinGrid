import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '@/shared/components/Link'
import binance from '@/assets/binance.svg'

export function NoConnectionState() {
  return (
    <section className="mt-4">
      <div className="ui-surface overflow-hidden">
        <div className="flex flex-col gap-6 p-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center">
              <img src={binance} alt="Binance" className="h-8 w-8" />
            </div>
            <div className="max-w-xl">
              <h1 className="text-xl font-semibold sm:text-2xl">Connect Binance to see your portfolio</h1>
              <p className="mt-2 leading-6 text-muted">
                Use a read-only API key to load your balances, portfolio history, and spot trade journal. Trading and withdrawal access are not
                needed.
              </p>
            </div>
          </div>
          <ButtonLink to="/settings?tab=connections" className="shrink-0 md:self-start">
            Set up connection
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
