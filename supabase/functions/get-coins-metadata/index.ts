import { corsHeaders } from '../_shared/cors.ts'

const extendedCorsHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const specialAssets: Record<string, { name: string; image: string | null }> = {
  LDUSDT: {
    name: 'LDUSDT',
    image: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  LDUSDC: {
    name: 'LDUSDC',
    image: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
}

const MAX_CONCURRENT_SEARCHES = 3
const MAX_SEARCH_ATTEMPTS = 3

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function getRetryDelay(response: Response, attempt: number) {
  const retryAfterSeconds = Number(response.headers.get('Retry-After'))
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 3000)
  }
  return 500 * 2 ** attempt
}

async function getCoinMetadata(asset: string): Promise<{ name: string; image: string | null }> {
  const specialAsset = specialAssets[asset]
  if (specialAsset) return specialAsset

  const symbol = asset.toLowerCase()

  for (let attempt = 0; attempt < MAX_SEARCH_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`)
      if (!response.ok) {
        const shouldRetry = response.status === 429 || response.status >= 500
        if (shouldRetry && attempt < MAX_SEARCH_ATTEMPTS - 1) {
          await wait(getRetryDelay(response, attempt))
          continue
        }
        break
      }

      const result = await response.json()
      const coin = result.coins?.find((item: { symbol?: string }) => item.symbol?.toLowerCase() === symbol)
      return {
        name: coin?.name ?? asset,
        image: coin?.large ?? coin?.thumb ?? null,
      }
    } catch (error) {
      if (attempt === MAX_SEARCH_ATTEMPTS - 1) {
        console.warn(`CoinGecko metadata unavailable for ${asset}:`, error)
        break
      }
      await wait(500 * 2 ** attempt)
    }
  }

  return { name: asset, image: null }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: extendedCorsHeaders,
    })
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: extendedCorsHeaders })
  }

  try {
    const { assets } = await request.json()

    if (!Array.isArray(assets)) {
      return Response.json({ error: 'Assets must be an array.' }, { status: 400, headers: extendedCorsHeaders })
    }

    const normalizedAssets = [...new Set(assets.map((asset: unknown) => String(asset).trim().toUpperCase()).filter(Boolean))]

    const metadataEntries: Array<[string, { name: string; image: string | null }]> = []
    let nextAssetIndex = 0
    const workerCount = Math.min(MAX_CONCURRENT_SEARCHES, normalizedAssets.length)
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextAssetIndex < normalizedAssets.length) {
          const asset = normalizedAssets[nextAssetIndex]
          nextAssetIndex += 1
          metadataEntries.push([asset, await getCoinMetadata(asset)])
        }
      }),
    )

    const metadata = Object.fromEntries(metadataEntries)
    return Response.json({ data: metadata }, { status: 200, headers: extendedCorsHeaders })
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: extendedCorsHeaders },
    )
  }
})
