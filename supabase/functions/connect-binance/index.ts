import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

async function encrypt(value: string, encryptionKey: string) {
  const key = await crypto.subtle.importKey('raw', fromBase64(encryptionKey), { name: 'AES-GCM' }, false, ['encrypt'])

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value))

  return `${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`
}

async function createBinanceSignature(query: string, apiSecret: string) {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(query))

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authorization = req.headers.get('Authorization')

    if (!authorization) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
    }

    const { apiKey, apiSecret } = await req.json()

    if (typeof apiKey !== 'string' || typeof apiSecret !== 'string' || !apiKey.trim() || !apiSecret.trim()) {
      return Response.json({ error: 'API key and API secret are required.' }, { status: 400, headers: corsHeaders })
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

    const timestamp = Date.now().toString()
    const query = new URLSearchParams({
      timestamp,
      recvWindow: '5000',
    }).toString()

    const signature = await createBinanceSignature(query, apiSecret.trim())

    const binanceResponse = await fetch(`https://api.binance.com/api/v3/account?${query}&signature=${signature}`, {
      headers: {
        'X-MBX-APIKEY': apiKey.trim(),
      },
    })

    if (!binanceResponse.ok) {
      const binanceError = await binanceResponse.json()

      const message =
        binanceError.code === -2014
          ? 'API key has an invalid format.'
          : binanceError.code === -2015
            ? 'Invalid API key, secret, IP restriction, or permissions.'
            : binanceError.msg || 'Failed to validate Binance credentials.'

      return Response.json(
        { error: message },
        {
          status: 400,
          headers: corsHeaders,
        },
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { error: databaseError } = await supabaseAdmin.from('exchange_connections').upsert(
      {
        user_id: user.id,
        exchange: 'binance',
        api_key_encrypted: await encrypt(apiKey.trim(), encryptionKey),
        api_secret_encrypted: await encrypt(apiSecret.trim(), encryptionKey),
        status: 'connected',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,exchange' },
    )

    if (databaseError) {
      throw databaseError
    }

    return Response.json({ connected: true }, { headers: corsHeaders })
  } catch (error) {
    console.error(error)

    return Response.json({ error: 'Unable to connect Binance. Please try again.' }, { status: 500, headers: corsHeaders })
  }
})
