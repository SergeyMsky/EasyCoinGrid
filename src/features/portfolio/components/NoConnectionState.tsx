import { ArrowRight, PieChart, WalletCards, WifiOff, Activity } from 'lucide-react'
import { ButtonLink } from '@/shared/components/Link'

const features = [
  { icon: WalletCards, text: 'Track balances' },
  { icon: Activity, text: 'Monitor performance' },
  { icon: PieChart, text: 'View allocation' },
]

export function NoConnectionState() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <div className="ui-surface px-4 py-8 sm:p-8 text-center">
        <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-yellow-500/20 bg-yellow-500/10">
          <WifiOff className="h-7 w-7 text-yellow-400" />
        </div>
        <h1 className="mb-3 text-2xl sm:text-3xl font-semibold">No portfolio connected yet</h1>
        <p className="mb-6 text-gray-500">Connect Binance to see balances, performance, and allocation in one place.</p>
        <div className="flex justify-center">
          <ButtonLink to="/settings?tab=connections">
            Connect Binance
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
        <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
          {features.map(({ icon: Icon, text }) => (
            <div className="flex gap-3 items-center ui-surface bg-white/5! p-4" key={text}>
              <Icon className="h-5 w-5 text-emerald-400 shrink-0" />
              <p className="font-medium text-gray-300">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
