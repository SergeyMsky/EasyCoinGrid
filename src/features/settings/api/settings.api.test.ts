import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteAccount, updateEmail } from './settings.api'

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  invoke: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: mocks.updateUser,
      signOut: mocks.signOut,
    },
    functions: {
      invoke: mocks.invoke,
    },
  },
}))

describe('updateEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signOut.mockResolvedValue({ error: null })
  })

  it('redirects email confirmations to the auth callback', async () => {
    mocks.updateUser.mockResolvedValue({ error: null })

    await updateEmail('new@example.com')

    expect(mocks.updateUser).toHaveBeenCalledWith(
      { email: 'new@example.com' },
      { emailRedirectTo: `${window.location.origin}/auth/callback` },
    )
  })

  it('calls the server deletion function and clears the local session only after confirmation', async () => {
    mocks.invoke.mockResolvedValue({ data: { deleted: true }, error: null })

    await deleteAccount('correct-password')

    expect(mocks.invoke).toHaveBeenCalledWith('delete-account', { body: { password: 'correct-password' } })
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('does not clear the local session if the server does not confirm deletion', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new Error('Request failed') })

    await expect(deleteAccount('correct-password')).rejects.toThrow('Request failed')
    expect(mocks.signOut).not.toHaveBeenCalled()
  })
})
