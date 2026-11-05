import { Link } from 'react-router-dom'
import { BrandName } from '@/shared/constants/brand'
import { BRAND_NAME } from '@/shared/constants/brand-name'

const sections = [
  {
    title: 'Information the app uses',
    paragraphs: [
      'Account information such as your email address and account identifier is handled by Supabase Authentication. If you upload an avatar, its image is stored in Supabase Storage. Avatar files are served from a public bucket, so anyone with the image URL may be able to view them; do not upload sensitive images.',
      `When you connect Binance, ${BRAND_NAME} receives your API key and secret and stores encrypted copies in its database. The connection is used to retrieve Spot account balances, market data, and trade history for portfolio and rotation features. Portfolio snapshots and rotation records may also be stored against your account.`,
      'Your selected display currency is saved in this browser’s local storage.',
    ],
  },
  {
    title: 'How information is used',
    paragraphs: [
      'Information is used to authenticate your account, retrieve and display portfolio information, calculate portfolio values and performance, show rotation history, and provide account settings.',
      `${BRAND_NAME} does not provide trading or withdrawal features. When creating a Binance API key, use the least permissions necessary and disable trading and withdrawals.`,
    ],
  },
  {
    title: 'Service providers and external services',
    paragraphs: [
      'Supabase provides authentication, database, file storage, and server-side functions. Binance receives authenticated requests to retrieve the account and market information needed for the app. Current USDT/USD and USDC/USD rates are obtained from Kraken; currency rates are obtained from Frankfurter; coin search, images, historical price estimates, and current open-deal price estimates are obtained from CoinGecko; currency flag images are loaded from FlagCDN.',
      'Binance credentials are encrypted server-side with AES-GCM before being stored. The encryption key is held as a server-side secret, not as a client-side app setting. Database access is scoped to the signed-in user by row-level security policies.',
    ],
  },
  {
    title: 'Retention and controls',
    paragraphs: [
      'You can disconnect Binance in Settings. Disconnecting deletes the stored Binance credentials and stops future syncing, but it does not delete existing rotation records or portfolio snapshots.',
      'The app does not currently offer self-service account or history deletion, and no dedicated privacy contact channel is configured in the app. The service operator should publish a private contact method for deletion requests and privacy questions. Do not send your password, API secret, or other credentials in a support request.',
    ],
  },
]

export function PrivacyPage() {
  return (
    <main className="bg-app">
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:py-24">
        <div className="mb-8">
          <Link to="/home" className="text-accent hover:text-text">
            <BrandName />
          </Link>
          <h1 className="title mt-2">Privacy policy</h1>
          <p className="label mt-2 text-[10px]">Last updated: 31 October 2026</p>
          <p className="mt-5 leading-7 text-muted">
            This page explains what information <BrandName /> uses and how the app handles it when you use the portfolio dashboard.
          </p>
        </div>
        <div className="space-y-4">
          {sections.map(({ title, paragraphs }) => (
            <article key={title} className="ui-surface space-y-3 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">{title}</h2>
              {paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-muted">
                  {paragraph}
                </p>
              ))}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
