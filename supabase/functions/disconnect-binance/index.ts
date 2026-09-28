import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
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
      return Response.json({ error: 'Unauthorized.' }, { status: 401, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { error: databaseError } = await supabaseAdmin.from('exchange_connections').delete().eq('user_id', user.id).eq('exchange', 'binance')

    if (databaseError) {
      throw databaseError
    }

    return Response.json({ connected: false }, { headers: corsHeaders })
  } catch (error) {
    console.error(error)

    return Response.json(
      {
        error: 'Unable to disconnect Binance. Please try again.',
      },
      {
        status: 500,
        headers: corsHeaders,
      },
    )
  }
})
