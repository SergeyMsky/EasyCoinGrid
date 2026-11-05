import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { SettingsPage } from './SettingsPage'

const mocks = vi.hoisted(() => ({
  connectBinance: vi.fn(),
  deleteAccount: vi.fn(),
  disconnectBinance: vi.fn(),
  getBinanceConnectionStatus: vi.fn(),
  updateEmail: vi.fn(),
  updatePassword: vi.fn(),
  verifyCurrentPassword: vi.fn(),
  getAvatarUrl: vi.fn(),
  uploadAvatar: vi.fn(),
}))

vi.mock('@/features/settings/api/settings.api', () => ({
  connectBinance: mocks.connectBinance,
  deleteAccount: mocks.deleteAccount,
  disconnectBinance: mocks.disconnectBinance,
  getBinanceConnectionStatus: mocks.getBinanceConnectionStatus,
  updateEmail: mocks.updateEmail,
  updatePassword: mocks.updatePassword,
  verifyCurrentPassword: mocks.verifyCurrentPassword,
}))

vi.mock('@/services/avatar', () => ({
  getAvatarUrl: mocks.getAvatarUrl,
  uploadAvatar: mocks.uploadAvatar,
}))

function renderSettings(initialEntry = '/settings', session: Session | null = null) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <SettingsPage userEmail="user@example.com" session={session} avatarUrl={null} setAvatarUrl={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getBinanceConnectionStatus.mockResolvedValue(false)
    mocks.getAvatarUrl.mockResolvedValue(null)
    mocks.verifyCurrentPassword.mockResolvedValue({ error: null })
    mocks.updateEmail.mockResolvedValue({ error: null })
    mocks.deleteAccount.mockResolvedValue(undefined)
  })

  it('keeps the previous profile tab URL working and requires password confirmation for email changes', async () => {
    const user = userEvent.setup()
    renderSettings('/settings?tab=profile')

    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Current password to confirm')).toBeRequired()

    await user.clear(screen.getByLabelText('Email address'))
    await user.type(screen.getByLabelText('Email address'), 'new@example.com')
    await user.type(screen.getByLabelText('Current password to confirm'), 'correct-password')
    await user.click(screen.getByRole('button', { name: 'Update email' }))

    expect(mocks.verifyCurrentPassword).toHaveBeenCalledWith('user@example.com', 'correct-password')
    expect(mocks.updateEmail).toHaveBeenCalledWith('new@example.com')
    expect(
      await screen.findByText(
        'Your current email stays active until you confirm the change. Check your new email and follow the confirmation link. If asked, also confirm from your current email.',
      ),
    ).toBeInTheDocument()
  })

  it('updates the email field when the authenticated email changes', () => {
    const { rerender } = renderSettings()

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/settings']}>
          <SettingsPage userEmail="updated@example.com" session={null} avatarUrl={null} setAvatarUrl={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByLabelText('Email address')).toHaveValue('updated@example.com')
  })

  it('does not update email if current password verification fails', async () => {
    const user = userEvent.setup()
    mocks.verifyCurrentPassword.mockResolvedValue({
      error: new Error('Invalid login credentials'),
    })
    renderSettings()

    await user.clear(screen.getByLabelText('Email address'))
    await user.type(screen.getByLabelText('Email address'), 'new@example.com')
    await user.type(screen.getByLabelText('Current password to confirm'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Update email' }))

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument()
    expect(mocks.updateEmail).not.toHaveBeenCalled()
  })

  it('requires the exact deletion phrase and current password before requesting account deletion', async () => {
    const user = userEvent.setup()
    renderSettings('/settings', { user: { id: 'user-id' } } as Session)

    expect(screen.queryByLabelText('Current password', { selector: 'input[name="delete-account-password"]' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    const deleteButton = screen.getByRole('button', { name: 'Delete permanently' })
    expect(deleteButton).toBeDisabled()

    await user.type(screen.getByLabelText('Current password', { selector: 'input[name="delete-account-password"]' }), 'current-password')
    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'delete')
    expect(deleteButton).toBeDisabled()

    await user.clear(screen.getByLabelText('Type DELETE to confirm'))
    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE')
    expect(deleteButton).toBeEnabled()

    await user.click(deleteButton)
    expect(mocks.deleteAccount).toHaveBeenCalledWith('current-password')
  })

  it('closes the account deletion dialog from the cancel button', async () => {
    const user = userEvent.setup()
    renderSettings('/settings', { user: { id: 'user-id' } } as Session)

    await user.click(screen.getByRole('button', { name: 'Delete account' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('toggles email confirmation password visibility independently', async () => {
    const user = userEvent.setup()
    renderSettings()

    const passwordInput = screen.getByLabelText('Current password to confirm') as HTMLInputElement
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show current password' }))
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide current password' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Security' }))
    expect(screen.getByLabelText('Current password')).toHaveAttribute('type', 'password')
  })

  it('shows Binance disconnect confirmation using the warning style', async () => {
    const user = userEvent.setup()
    mocks.getBinanceConnectionStatus.mockResolvedValue(true)
    renderSettings('/settings?tab=exchanges')

    expect(screen.getByRole('button', { name: 'Exchanges' })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Disconnect Binance' }))

    const warning = screen.getByRole('status')
    expect(warning).toHaveClass('bg-warning-subtle', 'text-warning')
    expect(warning).toHaveTextContent('Are you sure you want to disconnect Binance?')
    expect(warning).toHaveTextContent('Your portfolio data will no longer be synced.')
  })
})
