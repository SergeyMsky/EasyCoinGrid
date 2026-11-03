import { corsHeaders } from '../_shared/cors.ts'

const extendedCorsHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type CoinGeckoCurrentPrice = {
  usd?: unknown
  usd_24h_change?: unknown
  last_updated_at?: unknown
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: extendedCorsHeaders })
  }
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: extendedCorsHeaders })
  }

  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || !('coinIds' in body) || !Array.isArray(body.coinIds)) {
      return Response.json({ error: 'A list of coin IDs is required.' }, { status: 400, headers: extendedCorsHeaders })
    }

    const coinIds = [...new Set(body.coinIds)]
    if (coinIds.length > 100 || coinIds.some((coinId) => typeof coinId !== 'string' || !/^[a-z0-9-]{1,128}$/.test(coinId))) {
      return Response.json({ error: 'Coin IDs must be valid and contain no more than 100 entries.' }, { status: 400, headers: extendedCorsHeaders })
    }
    if (!coinIds.length) {
      return Response.json({ data: [] }, { status: 200, headers: extendedCorsHeaders })
    }

    const apiKey = Deno.env.get('COINGECKO_DEMO_API_KEY')
    if (!apiKey) {
      return Response.json({ error: 'CoinGecko API key is not configured in Supabase.' }, { status: 503, headers: extendedCorsHeaders })
    }

    const url = new URL('https://api.coingecko.com/api/v3/simple/price')
    url.searchParams.set('ids', coinIds.join(','))
    url.searchParams.set('vs_currencies', 'usd')
    url.searchParams.set('include_24hr_change', 'true')
    url.searchParams.set('include_last_updated_at', 'true')

    const response = await fetch(url, { headers: { 'x-cg-demo-api-key': apiKey } })
    if (!response.ok) {
      return Response.json({ error: `CoinGecko current prices returned HTTP ${response.status}.` }, { status: 502, headers: extendedCorsHeaders })
    }

    const result: unknown = await response.json()
    if (!result || typeof result !== 'object') {
      return Response.json({ error: 'CoinGecko returned an invalid current price response.' }, { status: 502, headers: extendedCorsHeaders })
    }

    const data = coinIds.flatMap((coinId) => {
      const quote = (result as Record<string, CoinGeckoCurrentPrice>)[coinId]
      if (!quote || typeof quote.usd !== 'number' || !Number.isFinite(quote.usd) || quote.usd <= 0) return []
      if (typeof quote.last_updated_at !== 'number' || !Number.isFinite(quote.last_updated_at) || quote.last_updated_at <= 0) return []

      return [
        {
          coinId,
          price: quote.usd,
          change24hPercent:
            typeof quote.usd_24h_change === 'number' && Number.isFinite(quote.usd_24h_change) ? quote.usd_24h_change : null,
          timestamp: new Date(quote.last_updated_at * 1000).toISOString(),
        },
      ]
    })

    return Response.json({ data }, { status: 200, headers: extendedCorsHeaders })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load current coin prices.' },
      { status: 500, headers: extendedCorsHeaders },
    )
  }
})
