import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const responseHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: responseHeaders })
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function parseEncryptedValue(value: string) {
  const [iv, encrypted] = value.split('.')

  if (!iv || !encrypted) {
    throw new Error('Invalid encrypted credential format.')
  }

  return { iv: fromBase64(iv), encrypted: fromBase64(encrypted) }
}

async function decrypt(value: string, encryptionKey: string) {
  const key = await crypto.subtle.importKey('raw', fromBase64(encryptionKey), { name: 'AES-GCM' }, false, ['decrypt'])
  const { iv, encrypted } = parseEncryptedValue(value)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)

  return new TextDecoder().decode(decrypted)
}

async function createBinanceSignature(query: string, apiSecret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(query))

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function signedBinanceGet(path: string, params: URLSearchParams, apiKey: string, apiSecret: string) {
  params.set('timestamp', Date.now().toString())
  params.set('recvWindow', '5000')
  const query = params.toString()
  const signature = await createBinanceSignature(query, apiSecret)
  const response = await fetch(`https://api.binance.com${path}?${query}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  })
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result?.msg || 'Binance rejected a spot trade history request.')
  }

  return result
}

async function publicTickerPrice(symbol: string): Promise<number> {
  const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(symbol)}`)
  const data = await response.json()

  if (!response.ok || !Number.isFinite(Number(data?.price))) {
    throw new Error(`Unable to convert ${symbol} to USD.`)
  }

  return Number(data.price)
}

type RawBinanceTrade = {
  id: number
  orderId: number
  symbol: string
  price: string
  qty: string
  commission: string
  commissionAsset: string
  time: number
  isBuyer: boolean
}

type UsdBinanceTrade = RawBinanceTrade & {
  baseAsset: string
  priceUsd: number
  commissionUsd: number
}

const supportedQuoteAssets = new Set(['USDT', 'USDC', 'FDUSD', 'TUSD', 'USDP', 'DAI'])

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return json({ error: 'Unauthorized.' }, 401)

    const body = await request.json()
    if (!Array.isArray(body?.assets) || body.assets.length > 100) {
      return json({ error: 'Provide up to 100 portfolio assets.' }, 400)
    }
    if (body.knownSymbols !== undefined && (!Array.isArray(body.knownSymbols) || body.knownSymbols.length > 100)) {
      return json({ error: 'Provide up to 100 previously imported Binance symbols.' }, 400)
    }

    const assets = [...new Set(body.assets.map((asset: unknown) => String(asset).trim().toUpperCase()))]
    const knownSymbols = [...new Set((body.knownSymbols ?? []).map((symbol: unknown) => String(symbol).trim().toUpperCase()))]
    if (assets.some((asset) => !/^[A-Z0-9]{1,20}$/.test(asset))) {
      return json({ error: 'Invalid portfolio asset.' }, 400)
    }
    if (knownSymbols.some((symbol) => !/^[A-Z0-9]{1,40}$/.test(symbol))) {
      return json({ error: 'Invalid previously imported Binance symbol.' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const encryptionKey = Deno.env.get('BINANCE_ENCRYPTION_KEY')
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !encryptionKey) {
      throw new Error('Required environment variables are missing.')
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized.' }, 401)

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('exchange_connections')
      .select('api_key_encrypted, api_secret_encrypted')
      .eq('user_id', user.id)
      .eq('exchange', 'binance')
      .eq('status', 'connected')
      .maybeSingle()

    if (connectionError) throw connectionError
    if (!connection) return json({ error: 'Binance is not connected.' }, 404)

    const apiKey = await decrypt(connection.api_key_encrypted, encryptionKey)
    const apiSecret = await decrypt(connection.api_secret_encrypted, encryptionKey)
    const exchangeInfo = await fetch('https://api.binance.com/api/v3/exchangeInfo')
    const exchangeData = await exchangeInfo.json()
    if (!exchangeInfo.ok || !Array.isArray(exchangeData?.symbols)) {
      throw new Error('Unable to load Binance spot symbol information.')
    }

    const assetSet = new Set(assets)
    const symbolAssetsBySymbol = new Map<string, { baseAsset: string; quoteAsset: string; symbol: string }>()
    for (const item of exchangeData.symbols as Array<{ status: string; isSpotTradingAllowed: boolean; baseAsset: string; quoteAsset: string; symbol: string }>) {
      if (
        item.status === 'TRADING'
        && item.isSpotTradingAllowed
        && assetSet.has(item.baseAsset)
        && supportedQuoteAssets.has(item.quoteAsset)
      ) {
        symbolAssetsBySymbol.set(item.symbol, { baseAsset: item.baseAsset, quoteAsset: item.quoteAsset, symbol: item.symbol })
      }
    }
    for (const symbol of knownSymbols) {
      const quoteAsset = [...supportedQuoteAssets].find((quote) => symbol.endsWith(quote) && symbol.length > quote.length)
      if (quoteAsset) {
        symbolAssetsBySymbol.set(symbol, { baseAsset: symbol.slice(0, -quoteAsset.length), quoteAsset, symbol })
      }
    }
    const symbolAssets = [...symbolAssetsBySymbol.values()]
      .sort((a: { baseAsset: string; quoteAsset: string }, b: { baseAsset: string; quoteAsset: string }) =>
        a.baseAsset.localeCompare(b.baseAsset) || a.quoteAsset.localeCompare(b.quoteAsset),
      )
    if (symbolAssets.length > 100) {
      throw new Error(`Found ${symbolAssets.length} eligible trading pairs; automatic sync is limited to 100 pairs per run.`)
    }

    const trades: UsdBinanceTrade[] = []
    const usdPriceCache = new Map<string, number>([['USDT', 1]])

    async function getAssetUsdPrice(asset: string) {
      const cached = usdPriceCache.get(asset)
      if (cached !== undefined) return cached
      const price = await publicTickerPrice(`${asset}USDT`)
      usdPriceCache.set(asset, price)
      return price
    }

    for (const { baseAsset, quoteAsset, symbol } of symbolAssets) {
      const rawTrades: RawBinanceTrade[] = []
      let fromId = 0

      while (true) {
        const params = new URLSearchParams({ symbol, fromId: fromId.toString(), limit: '1000' })
        const page = await signedBinanceGet('/api/v3/myTrades', params, apiKey, apiSecret) as RawBinanceTrade[]

        if (!Array.isArray(page)) throw new Error(`Binance returned invalid trade history for ${symbol}.`)
        rawTrades.push(...page)
        if (page.length < 1000) break

        const lastId = Number(page[page.length - 1]?.id)
        if (!Number.isSafeInteger(lastId) || lastId < 0 || lastId < fromId) {
          throw new Error(`Binance returned an invalid pagination cursor for ${symbol}.`)
        }
        fromId = lastId + 1
      }

      const quoteUsdPrice = await getAssetUsdPrice(quoteAsset)

      for (const trade of rawTrades) {
        const priceUsd = Number(trade.price) * quoteUsdPrice
        const commission = Number(trade.commission)
        if (!Number.isFinite(priceUsd) || priceUsd <= 0 || !Number.isFinite(commission) || commission < 0) {
          throw new Error(`Binance returned invalid trade values for ${symbol}.`)
        }

        let commissionUsd: number
        if (trade.commissionAsset === quoteAsset) {
          commissionUsd = commission * quoteUsdPrice
        } else if (trade.commissionAsset === symbol.slice(0, -quoteAsset.length)) {
          commissionUsd = commission * priceUsd
        } else {
          commissionUsd = commission * await getAssetUsdPrice(trade.commissionAsset)
        }

        trades.push({ ...trade, baseAsset, priceUsd, commissionUsd })
      }
    }

    const tradeRange = trades.reduce<{ oldest: number | null; newest: number | null }>(
      (range, trade) => ({
        oldest: range.oldest === null ? trade.time : Math.min(range.oldest, trade.time),
        newest: range.newest === null ? trade.time : Math.max(range.newest, trade.time),
      }),
      { oldest: null, newest: null },
    )

    return json({
      symbols: symbolAssets.map(({ symbol }) => symbol),
      trades,
      syncedAt: new Date().toISOString(),
      oldestTradeTime: tradeRange.oldest,
      newestTradeTime: tradeRange.newest,
    })
  } catch (error) {
    console.error('get-binance-spot-trades error:', error)
    return json({ error: error instanceof Error ? error.message : 'Unable to load Binance spot trades.' }, 500)
  }
})
