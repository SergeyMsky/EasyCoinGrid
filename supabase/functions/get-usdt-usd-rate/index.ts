import { corsHeaders } from '../_shared/cors.ts'

const responseHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

type KrakenTicker = {
  a?: string[]
  b?: string[]
}

type KrakenTickerResponse = {
  error?: string[]
  result?: Record<string, KrakenTicker>
}

const stablecoins = ['USDT', 'USDC'] as const

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: responseHeaders })
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: responseHeaders })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  try {
    const response = await fetch('https://api.kraken.com/0/public/Ticker?pair=USDTUSD,USDCUSD', {
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      throw new Error(`Kraken returned HTTP ${response.status}.`)
    }

    const result = (await response.json()) as KrakenTickerResponse

    if (result.error?.length) {
      throw new Error(`Kraken ticker error: ${result.error.join(', ')}`)
    }

    const tickers = result.result ?? {}
    const rates = Object.fromEntries(
      stablecoins.map((stablecoin) => {
        const tickerEntry = Object.entries(tickers).find(([pair]) => pair.startsWith(stablecoin))
        const ticker = tickerEntry?.[1]
        const bid = Number(ticker?.b?.[0])
        const ask = Number(ticker?.a?.[0])
        const rate = (bid + ask) / 2

        if (!Number.isFinite(rate) || rate <= 0) {
          throw new Error(`Kraken returned an invalid ${stablecoin}/USD rate.`)
        }

        return [stablecoin, rate]
      }),
    )

    return json({
      rates,
      source: 'Kraken',
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Unable to fetch stablecoin/USD rates from Kraken:', error)
    return json({ error: 'Unable to load the current USDT/USD and USDC/USD rates.' }, 503)
  }
})
