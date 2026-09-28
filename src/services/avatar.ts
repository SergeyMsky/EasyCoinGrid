import { supabase } from '@/shared/lib/supabase'

export async function uploadAvatar(file: File, userId: string) {
  if (!file) {
    throw new Error('No file provided for upload')
  }

  const { error } = await supabase.storage.from('avatars').upload(`${userId}/avatar`, file, {
    upsert: true,
  })

  if (error) {
    throw new Error(error.message || 'Failed to upload avatar')
  }
}

export async function getAvatarUrl(userId: string): Promise<string | null> {
  const { data: files, error } = await supabase.storage.from('avatars').list(userId, { search: 'avatar', limit: 1 })

  if (error || !files?.some((file) => file.name === 'avatar')) {
    return null
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(`${userId}/avatar`)

  return `${data.publicUrl}?v=${Date.now()}`
}
