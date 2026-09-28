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

    const metadata = Object.fromEntries(
      await Promise.all(
        normalizedAssets.map(async (asset) => {
          const specialAsset = specialAssets[asset]

          if (specialAsset) {
            return [asset, specialAsset]
          }

          const symbol = asset.toLowerCase()

          try {
            const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`)

            if (!response.ok) {
              return [
                asset,
                {
                  name: asset,
                  image: null,
                },
              ]
            }

            const result = await response.json()

            const coin = result.coins?.find((item: { symbol?: string }) => item.symbol?.toLowerCase() === symbol)

            return [
              asset,
              {
                name: coin?.name ?? asset,
                image: coin?.large ?? coin?.thumb ?? null,
              },
            ]
          } catch {
            return [
              asset,
              {
                name: asset,
                image: null,
              },
            ]
          }
        }),
      ),
    )

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
