import { corsHeaders } from '../_shared/cors.ts'

const extendedCorsHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type BinanceTicker = {
  lastPrice?: string
  priceChange?: string
  priceChangePercent?: string
  msg?: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: extendedCorsHeaders,
  })
}

function isBinanceUnavailableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: extendedCorsHeaders })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = await request.json()
    const asset = String(body?.asset ?? '')
      .trim()
      .toUpperCase()

    if (!asset) {
      return json({ error: 'Asset is required' }, 400)
    }

    if (asset.endsWith('USDT') || asset.endsWith('USDC')) {
      return json({
        data: {
          price: 1,
          change24h: 0,
          change24hPercent: 0,
        },
      })
    }

    const symbol = `${asset}USDT`

    let response: Response

    try {
      response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`)
    } catch {
      return json({ error: 'BINANCE_UNAVAILABLE' }, 503)
    }

    const responseText = await response.text()
    let ticker: BinanceTicker | null = null

    try {
      const parsed: unknown = JSON.parse(responseText)

      if (parsed && typeof parsed === 'object') {
        ticker = parsed as BinanceTicker
      }
    } catch {
      if (!response.ok && isBinanceUnavailableStatus(response.status)) {
        return json({ error: 'BINANCE_UNAVAILABLE' }, 503)
      }

      return json({ error: 'Invalid response from Binance' }, 502)
    }

    if (!response.ok) {
      if (isBinanceUnavailableStatus(response.status)) {
        return json({ error: 'BINANCE_UNAVAILABLE' }, 503)
      }

      return json({ error: ticker?.msg || `Trading pair ${symbol} is unavailable` }, 400)
    }

    const result = {
      price: Number(ticker?.lastPrice),
      change24h: Number(ticker?.priceChange),
      change24hPercent: Number(ticker?.priceChangePercent),
    }

    if (!Number.isFinite(result.price) || !Number.isFinite(result.change24h) || !Number.isFinite(result.change24hPercent)) {
      return json({ error: 'Invalid price returned by Binance' }, 502)
    }

    return json({ data: result })
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})
