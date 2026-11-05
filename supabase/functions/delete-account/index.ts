import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const headers = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers })
  }

  try {
    const authorization = req.headers.get('Authorization')

    if (!authorization) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401, headers })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser()

    if (userError || !user?.email) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401, headers })
    }

    const body: unknown = await req.json()

    if (
      typeof body !== 'object' ||
      body === null ||
      !('password' in body) ||
      typeof body.password !== 'string' ||
      !body.password
    ) {
      return Response.json({ error: 'Current password is required.' }, { status: 400, headers })
    }

    const supabaseReauth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: reauthenticated, error: reauthError } = await supabaseReauth.auth.signInWithPassword({
      email: user.email,
      password: body.password,
    })

    if (reauthError || reauthenticated.user?.id !== user.id) {
      return Response.json({ error: 'Current password is incorrect.' }, { status: 403, headers })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error: avatarError } = await supabaseAdmin.storage.from('avatars').remove([`${user.id}/avatar`])

    if (avatarError) {
      throw avatarError
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      throw deleteError
    }

    return Response.json({ deleted: true }, { headers })
  } catch (error) {
    console.error('Account deletion failed:', error)

    return Response.json({ error: 'Unable to delete your account. Please try again.' }, { status: 500, headers })
  }
})
