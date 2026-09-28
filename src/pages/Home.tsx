import { ArrowRight, BarChart3, Eye, ShieldCheck, WalletCards } from 'lucide-react'
import { ButtonLink } from '@/shared/components/Link'
import dashboardPreview from '@/assets/dashboard-preview.png'

const features = [
  {
    icon: WalletCards,
    title: 'One clear overview',
    text: 'See your balances and assets in one simple dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Track performance',
    text: 'Understand allocation, changes, and portfolio growth.',
  },
  {
    icon: ShieldCheck,
    title: 'Read-only access',
    text: 'Connect your exchange without trading or withdrawal permissions.',
  },
]

export function Home() {
  return (
    <main className="overflow-hidden flex min-h-[calc(100vh-67px)] flex-col">
      <section className="relative w-full mx-auto max-w-7xl px-4 pb-20 pt-20 sm:pt-30">
        <div className="relative grid gap-10 lg:gap-16 lg:grid-cols-[1fr_550px]">
          <div className="max-w-2xl">
            <p className="mb-5 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              <span className="text-white">Easy</span>CoinGrid
            </p>
            <h1 className="text-4xl sm:text-6xl font-semibold leading-tight tracking-tight mb-6">
              Your crypto portfolio,
              <span className="block text-gray-500">without the noise.</span>
            </h1>
            <p className="mb-9 max-w-xl text-md sm:text-lg leading-8 text-gray-400">Connect your exchange, track your assets, and understand your portfolio from one clean and focused dashboard.</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/auth?mode=register" variant="filled">
                Get started
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink to="/auth?mode=login">Sign in</ButtonLink>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-gray-500">
              <Eye className="h-4 w-4 text-emerald-400" />
              Read-only exchange access
            </div>
          </div>
          <img src={dashboardPreview} alt="EasyCoinGrid dashboard preview" className="w-full max-w-xl m-auto sm:ml-0 ui-surface shadow-[0_12px_40px_rgb(52_211_153/0.10)]" />
        </div>
      </section>
      <section className="mt-auto mx-auto grid max-w-7xl gap-4 px-4 pb-20 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <article key={title} className="ui-surface p-5 bg-white/5!">
            <div className="flex flex-row items-center gap-4 mb-3">
              <Icon className="h-7 w-7 text-emerald-400" />
              <h2 className="font-medium">{title}</h2>
            </div>
            <p className="text-sm leading-6 text-gray-500">{text}</p>
          </article>
        ))}
      </section>
      <section className="border-t border-white/10 bg-black/5">
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-semibold">Ready to see your portfolio clearly?</h2>
            <p className="text-gray-500">Start with a read-only connection in a few minutes.</p>
          </div>
          <ButtonLink to="/auth?mode=register" variant="filled">
            Create account
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>
    </main>
  )
}
