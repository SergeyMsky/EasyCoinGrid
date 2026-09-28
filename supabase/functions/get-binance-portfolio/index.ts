import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authorization = req.headers.get('Authorization')

    if (!authorization) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const encryptionKey = Deno.env.get('BINANCE_ENCRYPTION_KEY')

    if (!encryptionKey) {
      throw new Error('BINANCE_ENCRYPTION_KEY is not configured.')
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
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
      return Response.json(
        {
          connected: false,
          balances: [],
        },
        {
          status: 200,
          headers: corsHeaders,
        },
      )
    }

    const apiKey = await decrypt(connection.api_key_encrypted, encryptionKey)
    const apiSecret = await decrypt(connection.api_secret_encrypted, encryptionKey)

    const query = new URLSearchParams({
      timestamp: Date.now().toString(),
      recvWindow: '5000',
    }).toString()

    const signature = await createBinanceSignature(query, apiSecret)

    const response = await fetch(`https://api.binance.com/api/v3/account?${query}&signature=${signature}`, {
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
    })

    if (!response.ok) {
      return Response.json({ error: 'Unable to fetch the Binance portfolio.' }, { status: 400, headers: corsHeaders })
    }

    const account = await response.json()

    const balances = account.balances
      .filter((balance: { free: string; locked: string }) => Number(balance.free) > 0 || Number(balance.locked) > 0)
      .map((balance: { asset: string; free: string; locked: string }) => ({
        asset: balance.asset,
        free: balance.free,
        locked: balance.locked,
      }))

    return Response.json(
      {
        connected: true,
        balances,
      },
      {
        status: 200,
        headers: corsHeaders,
      },
    )
  } catch (error) {
    console.error(error)

    return Response.json({ error: 'Unable to load the Binance portfolio.' }, { status: 500, headers: corsHeaders })
  }
})
