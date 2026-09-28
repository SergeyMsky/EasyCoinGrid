import { supabase } from '@/shared/lib/supabase'

export async function updateEmail(email: string) {
  return supabase.auth.updateUser({
    email,
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
