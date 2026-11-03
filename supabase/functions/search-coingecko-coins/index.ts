import { corsHeaders } from '../_shared/cors.ts'

const extendedCorsHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type CoinGeckoSearchResult = {
  id?: unknown
  name?: unknown
  symbol?: unknown
  thumb?: unknown
  market_cap_rank?: unknown
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
    if (!body || typeof body !== 'object' || !('query' in body) || typeof body.query !== 'string') {
      return Response.json({ error: 'A coin search query is required.' }, { status: 400, headers: extendedCorsHeaders })
    }

    const query = body.query.trim()
    if (query.length < 2 || query.length > 64) {
      return Response.json({ error: 'Coin search query must be between 2 and 64 characters.' }, { status: 400, headers: extendedCorsHeaders })
    }

    const apiKey = Deno.env.get('COINGECKO_DEMO_API_KEY')
    if (!apiKey) {
      return Response.json({ error: 'CoinGecko API key is not configured in Supabase.' }, { status: 503, headers: extendedCorsHeaders })
    }

    const url = new URL('https://api.coingecko.com/api/v3/search')
    url.searchParams.set('query', query)
    const response = await fetch(url, { headers: { 'x-cg-demo-api-key': apiKey } })
    if (!response.ok) {
      return Response.json({ error: `CoinGecko search returned HTTP ${response.status}.` }, { status: 502, headers: extendedCorsHeaders })
    }

    const searchResult: unknown = await response.json()
    const coins =
      searchResult && typeof searchResult === 'object' && 'coins' in searchResult && Array.isArray(searchResult.coins)
        ? (searchResult.coins as CoinGeckoSearchResult[])
        : null
    if (!coins) {
      return Response.json({ error: 'CoinGecko returned an invalid search response.' }, { status: 502, headers: extendedCorsHeaders })
    }

    const data = coins
      .filter(
        (coin) => typeof coin.id === 'string' && /^[a-z0-9-]+$/.test(coin.id) && typeof coin.name === 'string' && typeof coin.symbol === 'string',
      )
      .slice(0, 20)
      .map((coin) => ({
        id: coin.id as string,
        name: coin.name as string,
        symbol: (coin.symbol as string).toUpperCase(),
        image: typeof coin.thumb === 'string' ? coin.thumb : '',
        rank: typeof coin.market_cap_rank === 'number' ? coin.market_cap_rank : 0,
      }))

    return Response.json({ data }, { status: 200, headers: extendedCorsHeaders })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to search coins.' }, { status: 500, headers: extendedCorsHeaders })
  }
})
