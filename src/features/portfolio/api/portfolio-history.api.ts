import { supabase } from '@/shared/lib/supabase'
import type { SpotPortfolioSnapshot } from '@/features/portfolio/portfolio.types'

export async function syncBinanceSpotPortfolioHistory(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('get-binance-spot-value-history')

  if (error) {
    if (error.context instanceof Response) {
      const responseBody = await error.context.text()
      let detail = responseBody || error.message

      try {
        const responseData: unknown = JSON.parse(responseBody)
        if (typeof responseData === 'object' && responseData !== null && 'error' in responseData && typeof responseData.error === 'string') {
          detail = responseData.error
        }
      } catch {
        // Keep the response body as-is when the Edge Function did not return JSON.
      }

      throw new Error(`Unable to load Binance Spot account history (HTTP ${error.context.status}): ${detail}`)
    }

    throw new Error(`Unable to load Binance Spot account history: ${error.message}`)
  }
  if (!Array.isArray(data?.snapshots)) {
    throw new Error('Invalid Binance Spot history response.')
  }
}

export async function recordSpotPortfolioSnapshot(totalValueUsd: number): Promise<void> {
  if (!Number.isFinite(totalValueUsd) || totalValueUsd < 0) {
    throw new RangeError('Portfolio snapshot value must be a non-negative finite number.')
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(`Unable to verify your account: ${userError.message}`)
  }
  if (!user) {
    throw new Error('Sign in before saving a portfolio snapshot.')
  }

  const observedAt = new Date()
  const { error } = await supabase.from('spot_portfolio_snapshots').upsert(
    {
      user_id: user.id,
      snapshot_at: observedAt.toISOString(),
      total_value_usd: totalValueUsd,
      source: 'APP_OBSERVED',
      source_snapshot_id: `app:${observedAt.toISOString().slice(0, 13)}`,
    },
    { onConflict: 'user_id,source_snapshot_id' },
  )

  if (error) {
    throw new Error(`Unable to save portfolio snapshot: ${error.message}`)
  }
}

export async function getSpotPortfolioHistory(): Promise<SpotPortfolioSnapshot[]> {
  const snapshots: SpotPortfolioSnapshot[] = []
  const pageSize = 1000

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('spot_portfolio_snapshots')
      .select('id, snapshot_at, total_value_usd, source')
      .order('snapshot_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Unable to load portfolio history: ${error.message}`)
    }

    snapshots.push(...(data as SpotPortfolioSnapshot[]))
    if (data.length < pageSize || offset >= 49_000) break
  }

  return snapshots.reverse()
}
