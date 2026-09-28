import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const extendedCorsHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: extendedCorsHeaders,
  })
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

function parseEncryptedValue(value: string) {
  const [iv, encrypted] = value.split('.')

  if (!iv || !encrypted) {
    throw new Error('Invalid encrypted credential format.')
  }

  return {
    iv: fromBase64(iv),
    encrypted: fromBase64(encrypted),
  }
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

type BinanceTrade = {
  isBuyer: boolean
  qty: string
  quoteQty: string
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: extendedCorsHeaders,
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405)
  }

  try {
    const authorization = request.headers.get('Authorization')

    if (!authorization) {
      return json({ error: 'Unauthorized.' }, 401)
    }

    const { asset } = await request.json()
    const normalizedAsset = String(asset ?? '')
      .trim()
      .toUpperCase()

    if (!/^[A-Z0-9]{1,20}$/.test(normalizedAsset)) {
      return json({ error: 'Invalid asset.' }, 400)
    }

    // У этих активов нет обычной торговой пары для расчёта avgBuy.
    if (normalizedAsset === 'USDT' || normalizedAsset === 'USDC' || normalizedAsset === 'LDUSDT' || normalizedAsset === 'LDUSDC') {
      return json({ data: { avgBuy: null } })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const encryptionKey = Deno.env.get('BINANCE_ENCRYPTION_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !encryptionKey) {
      throw new Error('Required environment variables are missing.')
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return json({ error: 'Unauthorized.' }, 401)
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('exchange_connections')
      .select('api_key_encrypted, api_secret_encrypted, status')
      .eq('user_id', user.id)
      .eq('exchange', 'binance')
      .eq('status', 'connected')
      .maybeSingle()

    if (connectionError) {
      throw connectionError
    }

    if (!connection) {
      return json({ error: 'Binance is not connected.' }, 404)
    }

    const apiKey = await decrypt(connection.api_key_encrypted, encryptionKey)

    const apiSecret = await decrypt(connection.api_secret_encrypted, encryptionKey)

    const symbol = normalizedAsset.endsWith('USDT') ? normalizedAsset : `${normalizedAsset}USDT`

    const params = new URLSearchParams({
      symbol,
      limit: '1000',
      timestamp: Date.now().toString(),
      recvWindow: '5000',
    })

    const query = params.toString()
    const signature = await createBinanceSignature(query, apiSecret)

    const response = await fetch(`https://api.binance.com/api/v3/myTrades?${query}&signature=${signature}`, {
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Binance myTrades error:', result)

      return json({ error: result?.msg || 'Unable to fetch Binance trades.' }, 400)
    }

    const buyTrades = (result as BinanceTrade[]).filter((trade) => trade.isBuyer)

    const totalQuantity = buyTrades.reduce((sum, trade) => sum + Number(trade.qty), 0)

    const totalCost = buyTrades.reduce((sum, trade) => sum + Number(trade.quoteQty), 0)

    const avgBuy = totalQuantity > 0 ? totalCost / totalQuantity : null

    return json({ data: { avgBuy } })
  } catch (error) {
    console.error('get-binance-avg-buy error:', error)

    return json({ error: 'Unable to calculate average buy price.' }, 500)
  }
})
