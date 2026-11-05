import { supabase } from '@/shared/lib/supabase'

export async function updateEmail(email: string) {
  return supabase.auth.updateUser({
    email,
  }, {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  })
}

export async function verifyCurrentPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email,
    password,
  })
}

export async function updatePassword(password: string) {
  return supabase.auth.updateUser({
    password,
  })
}

export async function deleteAccount(password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ deleted: boolean }>('delete-account', {
    body: { password },
  })

  if (error) {
    const context = 'context' in error ? error.context : null
    const responseBody = context instanceof Response ? await context.json().catch(() => null) : null
    throw new Error(responseBody?.error || error.message || 'Unable to delete your account.')
  }

  if (data?.deleted !== true) {
    throw new Error('The server did not confirm account deletion.')
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' })

  if (signOutError) {
    throw new Error('Account deleted, but the local session could not be cleared. Please reload the page.')
  }
}

export async function connectBinance(apiKey: string, apiSecret: string) {
  return supabase.functions.invoke('connect-binance', {
    body: {
      apiKey,
      apiSecret,
    },
  })
}

export async function getBinanceConnectionStatus(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('get-binance-connection-status')

  if (error) {
    throw new Error(error.message || 'Failed to load Binance connection status.')
  }

  if (typeof data?.connected !== 'boolean') {
    throw new Error('Invalid connection status response.')
  }

  return data.connected
}

export async function disconnectBinance(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('disconnect-binance')

  if (error) {
    throw new Error(error.message || 'Failed to disconnect Binance.')
  }

  if (typeof data?.connected !== 'boolean') {
    throw new Error('Invalid connection status response.')
  }

  return data.connected
}
