import { ArrowRight, BarChart3, Eye, ShieldCheck, WalletCards } from 'lucide-react'
import { ButtonLink } from '@/shared/components/Link'
import { Link } from 'react-router-dom'
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
    <main className="flex min-h-[calc(100vh-67px)] flex-col overflow-hidden">
      <section className="relative mx-auto w-full px-4 pt-20 pb-20 sm:pt-30">
        <div className="relative grid gap-10 lg:grid-cols-[1fr_550px] lg:gap-16">
          <div className="max-w-2xl">
            <p className="mb-5 text-xs font-bold tracking-[0.2em] text-accent uppercase sm:text-sm">
              <span className="text-text">Easy</span>CoinGrid
            </p>
            <h1 className="mb-6 text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">
              Your crypto portfolio,
              <span className="block text-muted">without the noise.</span>
            </h1>
            <p className="text-md mb-9 max-w-xl leading-8 text-muted sm:text-lg">
              Connect your exchange, track your assets, and understand your portfolio from one clean and focused dashboard.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink to="/auth?mode=register" variant="filled">
                Get started
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink to="/auth?mode=login">Sign in</ButtonLink>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-muted">
              <Eye className="h-4 w-4 text-accent" />
              Read-only exchange access
            </div>
          </div>
          <img src={dashboardPreview} alt="EasyCoinGrid dashboard preview" className="ui-surface m-auto w-full max-w-xl sm:ml-0" />
        </div>
      </section>
      <section className="mx-auto mt-auto grid gap-4 px-4 pb-20 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <article key={title} className="ui-surface p-5">
            <div className="mb-3 flex flex-row items-center gap-4">
              <Icon className="h-7 w-7 text-accent" />
              <h2 className="font-medium">{title}</h2>
            </div>
            <p className="text-sm leading-6 text-muted">{text}</p>
          </article>
        ))}
      </section>
      <section className="border-t border-outline bg-surface-raised">
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-semibold">Ready to see your portfolio clearly?</h2>
            <p className="text-muted">Start with a read-only connection in a few minutes.</p>
          </div>
          <ButtonLink to="/auth?mode=register" variant="filled">
            Create account
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
        <div className="mx-auto max-w-2xl px-4 pb-6 text-sm text-muted">
          <Link className="underline underline-offset-4 hover:text-text" to="/privacy">
            Privacy policy
          </Link>
        </div>
      </section>
    </main>
  )
}
