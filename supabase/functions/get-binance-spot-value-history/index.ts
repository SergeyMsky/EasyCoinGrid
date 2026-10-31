import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const responseHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const DAY_MS = 24 * 60 * 60 * 1000
const BINANCE_SNAPSHOT_LOOKBACK_DAYS = 30

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: responseHeaders })
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function parseEncryptedValue(value: string) {
  const [iv, encrypted] = value.split('.')

  if (!iv || !encrypted) throw new Error('Invalid encrypted credential format.')

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

type BinanceSnapshot = {
  data: { totalAssetOfBtc: string }
  updateTime: number
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return json({ error: 'Unauthorized.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const encryptionKey = Deno.env.get('BINANCE_ENCRYPTION_KEY')
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !encryptionKey) {
      throw new Error('Required environment variables are missing.')
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } })
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser()
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

    const { data: lastSnapshot, error: snapshotError } = await supabaseAdmin
      .from('spot_portfolio_snapshots')
      .select('snapshot_at')
      .eq('user_id', user.id)
      .eq('source', 'BINANCE_DAILY')
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (snapshotError) throw snapshotError

    if (lastSnapshot && Date.now() - Date.parse(lastSnapshot.snapshot_at) < DAY_MS) {
      return json({ snapshots: [], skipped: true })
    }

    const apiKey = await decrypt(connection.api_key_encrypted, encryptionKey)
    const apiSecret = await decrypt(connection.api_secret_encrypted, encryptionKey)
    const endTime = Date.now()
    const startTime = endTime - BINANCE_SNAPSHOT_LOOKBACK_DAYS * DAY_MS
    const priceStartTime = Math.floor(startTime / DAY_MS) * DAY_MS
    const params = new URLSearchParams({
      type: 'SPOT',
      startTime: startTime.toString(),
      endTime: endTime.toString(),
      limit: '30',
      timestamp: Date.now().toString(),
      recvWindow: '5000',
    })
    const query = params.toString()
    const signature = await createBinanceSignature(query, apiSecret)
    const response = await fetch(`https://api.binance.com/sapi/v1/accountSnapshot?${query}&signature=${signature}`, {
      headers: { 'X-MBX-APIKEY': apiKey },
    })
    const result = await response.json()

    if (!response.ok) {
      console.error('Binance accountSnapshot error:', result)
      return json({ error: result?.msg || 'Unable to fetch Binance Spot account snapshots.' }, 400)
    }

    const snapshots = result?.snapshotVos
    if (!Array.isArray(snapshots)) throw new Error('Binance returned an invalid account snapshot response.')
    if (snapshots.length === 0) return json({ snapshots: [], skipped: false })

    const klinesResponse = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${priceStartTime}&endTime=${endTime}&limit=1000`,
    )
    const klines = await klinesResponse.json()
    if (!klinesResponse.ok || !Array.isArray(klines)) {
      throw new Error('Unable to fetch historical BTC prices to value Binance account snapshots.')
    }

    const dailyBtcPrices = new Map<number, number>(
      klines.map((kline: [number, string, string, string, string]) => [Math.floor(Number(kline[0]) / DAY_MS) * DAY_MS, Number(kline[4])]),
    )
    const orderedPriceDays = [...dailyBtcPrices.keys()].sort((a, b) => a - b)
    const rows = snapshots.map((snapshot: BinanceSnapshot) => {
      const snapshotTime = Number(snapshot.updateTime)
      const btcValue = Number(snapshot.data?.totalAssetOfBtc)
      if (!Number.isFinite(snapshotTime) || !Number.isFinite(btcValue) || btcValue < 0) {
        throw new Error('Binance returned an invalid Spot snapshot value.')
      }

      const snapshotDay = Math.floor(snapshotTime / DAY_MS) * DAY_MS
      const priceDay = [...orderedPriceDays].reverse().find((day) => day <= snapshotDay)
      const btcUsd = priceDay === undefined ? undefined : dailyBtcPrices.get(priceDay)
      if (!btcUsd || !Number.isFinite(btcUsd) || btcUsd <= 0) {
        throw new Error(`Unable to find a BTC/USDT price for account snapshot ${new Date(snapshotTime).toISOString()}.`)
      }

      return {
        user_id: user.id,
        snapshot_at: new Date(snapshotTime).toISOString(),
        total_value_usd: btcValue * btcUsd,
        source: 'BINANCE_DAILY',
        source_snapshot_id: String(snapshotTime),
      }
    })

    const { error: saveError } = await supabaseAdmin.from('spot_portfolio_snapshots').upsert(rows, { onConflict: 'user_id,source_snapshot_id' })
    if (saveError) throw saveError

    return json({
      snapshots: rows.map(({ snapshot_at, total_value_usd, source, source_snapshot_id }) => ({
        snapshot_at,
        total_value_usd,
        source,
        source_snapshot_id,
      })),
      skipped: false,
    })
  } catch (error) {
    console.error('get-binance-spot-value-history error:', error)
    return json({ error: error instanceof Error ? error.message : 'Unable to load Binance Spot account history.' }, 500)
  }
})
