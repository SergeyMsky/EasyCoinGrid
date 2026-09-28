import { supabase } from '@/shared/lib/supabase'

export async function signOut() {
  return supabase.auth.signOut()
}
