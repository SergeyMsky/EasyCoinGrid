import { Activity, ArrowRight, Check, Clock3, Image, LockKeyhole, ShieldCheck, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ButtonLink } from '@/shared/components/Link'

const productViews = [
  {
    number: '01',
    eyebrow: 'Portfolio',
    title: 'The whole wallet, in context.',
    description: 'See exchange balances, asset allocation, and profit and loss together instead of piecing them together coin by coin.',
    screenshot: 'Portfolio overview: summary and asset table',
    filename: 'portfolio-overview.png',
    icon: WalletCards,
    tone: 'orange',
  },
  {
    number: '02',
    eyebrow: 'Performance',
    title: 'See how value changes.',
    description: 'Follow portfolio snapshots over time and compare the shape of your balance across different periods.',
    screenshot: 'Portfolio performance: value chart and period controls',
    filename: 'portfolio-performance.png',
    icon: Activity,
    tone: 'green',
  },
  {
    number: '03',
    eyebrow: 'Trade journal',
    title: 'Give every buy its own record.',
    description: 'Keep separate spot rotations with entry price, quantity, fees, open estimates, and realized results.',
    screenshot: 'Spot rotations: open and closed deals with P/L',
    filename: 'spot-rotations.png',
    icon: Clock3,
    tone: 'blue',
  },
]

function ScreenshotPlaceholder({ title, filename, className = '' }: { title: string; filename: string; className?: string }) {
  return (
    <div
      role="img"
      aria-label={`Screenshot placeholder: ${title}. Replace with ${filename}`}
      className={`group relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-outline bg-app px-5 py-8 text-center sm:min-h-60 ${className}`}>
      <span className="relative mb-4 grid size-11 place-items-center rounded-xl border border-outline bg-surface text-accent">
        <Image className="size-5" aria-hidden="true" />
      </span>
      <span className="relative text-xs font-semibold tracking-wide text-text">Screenshot goes here</span>
      <span className="relative mt-2 max-w-xs text-sm leading-5 text-muted">{title}</span>
      <code className="relative mt-4 rounded-md border border-outline bg-surface px-2.5 py-1 text-[11px] text-subtle">{filename}</code>
    </div>
  )
}

export function Home() {
  return (
    <main className="overflow-hidden bg-app text-text">
      <section className="relative border-b border-outline">
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:py-24 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14 lg:py-24">
          <div className="max-w-xl">
            <p className="ui-surface mb-5 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              Binance portfolio &amp; spot trade journal
            </p>
            <h1 className="text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl xl:text-6xl">
              One wallet view.
              <span className="mt-1 block text-accent">Every buy, separate.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Follow your Binance spot balances, portfolio history, and individual trade results in one place—without blending each buy into an
              average.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink to="/auth?mode=register" variant="filled" className="justify-center gap-2">
                Start your trade journal
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <a
                href="#product"
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted transition hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                Explore the product
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-muted sm:text-sm">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-profit" aria-hidden="true" />
              Binance connection is read-only. No trading or withdrawal permissions.
            </p>
          </div>

          <div className="ui-surface rounded-b-md p-2">
            <div className="flex items-center gap-2 px-2 pb-3">
              <span className="size-2 rounded-full bg-outline"></span>
              <span className="size-2 rounded-full bg-outline"></span>
              <span className="size-2 rounded-full bg-outline"></span>
            </div>
            <ScreenshotPlaceholder
              title="Dashboard overview with portfolio summary and asset table"
              filename="dashboard-overview.png"
              className="min-h-64 sm:min-h-80"
            />
          </div>
        </div>
      </section>

      <section id="product" className="border-b border-outline">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
          <div className="mb-10 sm:mb-14">
            <p className="sign">A portfolio, beyond the balance</p>
            <h2 className="title">Different views. One clearer picture.</h2>
            <p className="subtitle">Move from your current holdings to their history, then into the individual spot trades behind the numbers.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {productViews.map(({ number, eyebrow, title, description, screenshot, filename, icon: Icon, tone }) => (
              <article
                key={number}
                className="group ui-surface flex min-w-0 flex-col p-3 transition-colors duration-300 hover:border-accent-outline sm:p-4">
                <ScreenshotPlaceholder title={screenshot} filename={filename} className="min-h-52 flex-1 sm:min-h-60" />
                <div className="flex items-start gap-3 px-1 pt-5 pb-1">
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg border ${
                      tone === 'orange'
                        ? 'border-accent-outline bg-accent-subtle text-accent'
                        : tone === 'green'
                          ? 'border-profit-outline bg-profit-subtle text-profit'
                          : 'border-outline bg-app text-muted'
                    }`}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="label">{eyebrow}</p>
                    <h3 className="mt-1 text-lg leading-snug font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <article className="ui-surface mt-4 grid overflow-hidden md:grid-cols-[1fr_1.1fr]">
            <div className="flex flex-col justify-center p-5 sm:p-8">
              <p className="sign">Imported activity</p>
              <h3 className="text-2xl leading-tight font-semibold">The details behind your balances.</h3>
              <p className="mt-3 text-sm leading-6 text-muted">
                Sync Binance spot trades and other supported account history, then filter transactions by asset, type, or date.
              </p>
              <p className="mt-5 flex items-center gap-2 text-xs text-muted">
                <Check className="size-4 text-profit" aria-hidden="true" />
                Imported records are separate from manually tracked rotations.
              </p>
            </div>
            <div className="p-3 sm:p-4">
              <ScreenshotPlaceholder
                title="Asset history table with transaction filters and date range"
                filename="asset-history.png"
                className="min-h-56 sm:min-h-72"
              />
            </div>
          </article>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-outline bg-surface">
        <div className="mx-auto max-w-7xl border-x border-outline px-4 py-16 sm:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div className="max-w-md">
              <p className="sign">How rotations work</p>
              <h2 className="title">From buy to result, without the blend.</h2>
              <p className="subtitle">
                Each manual rotation follows one buy through its own open and closed states. Portfolio-wide average buy prices remain a separate view.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="ui-surface bg-app p-4 sm:p-6">
                <span className="text-[10px] text-accent">01 / OPEN</span>
                <h3 className="mt-5 font-semibold">Record the buy</h3>
                <p className="mt-2 text-sm leading-6 text-muted">Set the entry price, quantity, time, and fee for this deal.</p>
              </article>
              <article className="ui-surface bg-app p-4 sm:p-6">
                <span className="text-[10px] text-accent">02 / TRACK</span>
                <h3 className="mt-5 font-semibold">Watch the estimate</h3>
                <p className="mt-2 text-sm leading-6 text-muted">Current value and floating P/L use market estimates, not a completed sale.</p>
              </article>
              <article className="ui-surface bg-app p-4 sm:p-6">
                <span className="text-[10px] text-accent">03 / CLOSED</span>
                <h3 className="mt-5 font-semibold">Record the sale</h3>
                <p className="mt-2 text-sm leading-6 text-muted">Review realized P/L after the sale and the fees you recorded.</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-24">
        <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
          <article className="ui-surface p-4 sm:p-8">
            <span className="grid size-10 place-items-center rounded-lg border border-profit-outline bg-profit-subtle text-profit">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold">Read-only by design.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Connect Binance with an API key that can read account data. EasyCoinGrid cannot place trades or withdraw funds. Keep those permissions
              disabled when creating your key.
            </p>
            <Link to="/privacy" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-text underline underline-offset-4">
              Read the privacy policy
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
          <article className="flex flex-col justify-between rounded-lg border border-accent-outline bg-accent-subtle p-4 sm:p-8">
            <div>
              <p className="sign">Ready when you are</p>
              <h2 className="mt-4 text-2xl leading-tight font-semibold">Start with your portfolio. Add the story behind it.</h2>
              <p className="mt-3 text-sm leading-6 text-muted">Create an account to connect Binance and start tracking your spot activity.</p>
            </div>
            <ButtonLink to="/auth?mode=register" variant="filled" className="mt-7 justify-center gap-2 self-start">
              Create your account
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </article>
        </div>
      </section>

      <footer className="border-t border-outline">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-x border-outline px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>EasyCoinGrid — a clearer view of your crypto portfolio.</p>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a
              href="https://github.com/SergeyMsky/EasyCoinGrid"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 transition hover:text-text">
              <svg
                version="1.0"
                xmlns="http://www.w3.org/2000/svg"
                width="240.000000pt"
                height="240.000000pt"
                viewBox="0 0 240.000000 240.000000"
                preserveAspectRatio="xMidYMid meet"
                className="size-4 shrink-0 fill-current">
                <g transform="translate(0.000000,240.000000) scale(0.100000,-0.100000)" stroke="none">
                  <path
                    d="M970 2301 c-305 -68 -555 -237 -727 -493 -301 -451 -241 -1056 143
-1442 115 -116 290 -228 422 -271 49 -16 55 -16 77 -1 24 16 25 20 25 135 l0
118 -88 -5 c-103 -5 -183 13 -231 54 -17 14 -50 62 -73 106 -38 74 -66 108
-144 177 -26 23 -27 24 -9 37 43 32 130 1 185 -65 96 -117 133 -148 188 -160
49 -10 94 -6 162 14 9 3 21 24 27 48 6 23 22 58 35 77 l24 35 -81 16 c-170 35
-275 96 -344 200 -64 96 -85 179 -86 334 0 146 16 206 79 288 28 36 31 47 23
68 -15 36 -11 188 5 234 13 34 20 40 47 43 45 5 129 -24 214 -72 l73 -42 64
15 c91 21 364 20 446 0 l62 -16 58 35 c77 46 175 82 224 82 39 0 39 -1 55 -52
17 -59 20 -166 5 -217 -8 -30 -6 -39 16 -68 109 -144 121 -383 29 -579 -62
-129 -193 -219 -369 -252 l-84 -16 31 -55 32 -56 3 -223 4 -223 25 -16 c23
-15 28 -15 76 2 80 27 217 101 292 158 446 334 590 933 343 1431 -145 293
-419 518 -733 602 -137 36 -395 44 -525 15z"
                  />
                </g>
              </svg>
              View on GitHub
            </a>
            <Link to="/privacy" className="transition hover:text-text">
              Read the privacy policy
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}
