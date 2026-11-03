import { corsHeaders } from '../_shared/cors.ts'

const extendedCorsHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type CoinGeckoPricePoint = [number, number]

function isCoinGeckoPricePoint(value: unknown): value is CoinGeckoPricePoint {
  return Array.isArray(value) && value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]) && value[1] > 0
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
    if (
      !body ||
      typeof body !== 'object' ||
      !('coinId' in body) ||
      typeof body.coinId !== 'string' ||
      !/^[a-z0-9-]{1,128}$/.test(body.coinId) ||
      !('time' in body) ||
      typeof body.time !== 'string'
    ) {
      return Response.json({ error: 'A valid CoinGecko coin ID and date are required.' }, { status: 400, headers: extendedCorsHeaders })
    }

    const targetTime = Date.parse(body.time)
    const now = Date.now()
    if (!Number.isFinite(targetTime) || targetTime > now) {
      return Response.json({ error: 'Choose a valid date and time that is not in the future.' }, { status: 400, headers: extendedCorsHeaders })
    }
    if (targetTime < now - 365 * 24 * 60 * 60 * 1000) {
      return Response.json(
        { error: 'CoinGecko Demo historical prices are available for the past 365 days only.' },
        { status: 422, headers: extendedCorsHeaders },
      )
    }

    const apiKey = Deno.env.get('COINGECKO_DEMO_API_KEY')
    if (!apiKey) {
      return Response.json({ error: 'CoinGecko API key is not configured in Supabase.' }, { status: 503, headers: extendedCorsHeaders })
    }

    const from = Math.floor((targetTime - 12 * 60 * 60 * 1000) / 1000)
    const to = Math.floor(Math.min(targetTime + 12 * 60 * 60 * 1000, now) / 1000)
    const url = new URL(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(body.coinId)}/market_chart/range`)
    url.searchParams.set('vs_currency', 'usd')
    url.searchParams.set('from', String(from))
    url.searchParams.set('to', String(to))
    const response = await fetch(url, { headers: { 'x-cg-demo-api-key': apiKey } })

    if (!response.ok) {
      return Response.json(
        { error: `CoinGecko historical price request returned HTTP ${response.status}.` },
        { status: 502, headers: extendedCorsHeaders },
      )
    }

    const result: unknown = await response.json()
    const prices =
      result && typeof result === 'object' && 'prices' in result && Array.isArray(result.prices) ? result.prices.filter(isCoinGeckoPricePoint) : []
    if (!prices.length) {
      return Response.json({ error: 'No historical price is available for this coin and date.' }, { status: 404, headers: extendedCorsHeaders })
    }

    const closest = prices.reduce((best, point) => (Math.abs(point[0] - targetTime) < Math.abs(best[0] - targetTime) ? point : best))
    if (Math.abs(closest[0] - targetTime) > 12 * 60 * 60 * 1000) {
      return Response.json({ error: 'No historical price is available close to the selected time.' }, { status: 404, headers: extendedCorsHeaders })
    }

    return Response.json(
      { data: { price: closest[1], timestamp: new Date(closest[0]).toISOString() } },
      { status: 200, headers: extendedCorsHeaders },
    )
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unable to load historical coin price.' },
      { status: 500, headers: extendedCorsHeaders },
    )
  }
})
