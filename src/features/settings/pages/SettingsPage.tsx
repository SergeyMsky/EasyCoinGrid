import * as Dialog from '@radix-ui/react-dialog'
import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Camera, CheckCircle2, Network, ShieldCheck, Trash2, UserRound, type LucideIcon } from 'lucide-react'
import {
  connectBinance,
  deleteAccount,
  disconnectBinance,
  getBinanceConnectionStatus,
  updateEmail,
  updatePassword,
  verifyCurrentPassword,
} from '@/features/settings/api/settings.api'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { SuccessMessage } from '@/shared/components/SuccessMessage'
import { validatePassword } from '@/shared/utils/validate-password'
import binance from '@/assets/binance.svg'
import { Spinner } from '@/shared/components/Spinner'
import { Button } from '@/shared/components/Button'
import { PasswordField } from '@/shared/components/PasswordField'
import type { Session } from '@supabase/supabase-js'
import { getAvatarUrl, uploadAvatar } from '@/services/avatar'
import { portfolioQueryKeys } from '@/features/portfolio/api/portfolio-query-keys'
import { BrandName } from '@/shared/constants/brand'

type SettingsTab = 'account' | 'security' | 'exchanges'

const tabs: Array<{ value: SettingsTab; label: string; icon: LucideIcon }> = [
  { value: 'account', label: 'Account', icon: UserRound },
  { value: 'security', label: 'Security', icon: ShieldCheck },
  { value: 'exchanges', label: 'Exchanges', icon: Network },
]

type SettingsProps = {
  userEmail?: string
  session?: Session | null
  avatarUrl: string | null
  setAvatarUrl: (url: string | null) => void
}

export function SettingsPage({ userEmail, session, avatarUrl, setAvatarUrl }: SettingsProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const [emailDraft, setEmailDraft] = useState<{ userEmail: string | undefined; value: string } | null>(null)
  const email = emailDraft && emailDraft.userEmail === userEmail ? emailDraft.value : (userEmail ?? '')
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false)
  const [accountDeletePassword, setAccountDeletePassword] = useState('')
  const [accountDeleteConfirmation, setAccountDeleteConfirmation] = useState('')
  const [accountDeleteError, setAccountDeleteError] = useState<string | null>(null)
  const [accountDeleteLoading, setAccountDeleteLoading] = useState(false)

  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionSuccess, setConnectionSuccess] = useState<string | null>(null)
  const [connectionLoading, setConnectionLoading] = useState(false)
  const [connectionStatusLoading, setConnectionStatusLoading] = useState(true)

  const [isBinanceConnected, setIsBinanceConnected] = useState(false)

  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()
  const queryTab = searchParams.get('tab')
  const activeTab: SettingsTab = queryTab === 'security' ? queryTab : queryTab === 'exchanges' || queryTab === 'connections' ? 'exchanges' : 'account'

  useEffect(() => {
    async function fetchConnectionStatus() {
      try {
        const status = await getBinanceConnectionStatus()
        setIsBinanceConnected(status)
      } catch (error) {
        console.error(error)
      } finally {
        setConnectionStatusLoading(false)
      }
    }
    fetchConnectionStatus()
  }, [])

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEmailError(null)
    setEmailSuccess(null)

    if (!userEmail) {
      setEmailError('Unable to identify the current user.')
      return
    }

    const nextEmail = email.trim()
    const currentEmail = userEmail.trim()

    if (!nextEmail) {
      setEmailError('Email cannot be empty.')
      return
    }

    if (nextEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setEmailError('New email cannot be the same as the current email.')
      return
    }

    setEmailLoading(true)
    try {
      const { error: passwordError } = await verifyCurrentPassword(userEmail, emailCurrentPassword)

      if (passwordError) {
        setEmailError('Current password is incorrect.')
        return
      }

      const { error: updateError } = await updateEmail(nextEmail)

      if (updateError) {
        setEmailError(updateError.message)
        return
      }

      setEmailCurrentPassword('')
      setEmailSuccess(
        'Your current email stays active until you confirm the change. Check your new email and follow the confirmation link. If asked, also confirm from your current email.',
      )
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Unable to update email.')
    } finally {
      setEmailLoading(false)
    }
  }

  async function handleAccountDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAccountDeleteError(null)

    if (!userEmail || !session?.user.id) {
      setAccountDeleteError('Unable to identify the current account.')
      return
    }

    if (accountDeleteConfirmation !== 'DELETE') {
      setAccountDeleteError('Type DELETE exactly to confirm account deletion.')
      return
    }

    setAccountDeleteLoading(true)

    try {
      await deleteAccount(accountDeletePassword)
      queryClient.clear()
      setAvatarUrl(null)
      setAccountDeleteOpen(false)
      navigate('/auth', { replace: true })
    } catch (error) {
      setAccountDeleteError(error instanceof Error ? error.message : 'Unable to delete your account.')
    } finally {
      setAccountDeleteLoading(false)
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (!userEmail) {
      setPasswordError('Unable to identify the current user.')
      return
    }
    const passwordError = validatePassword(password.new)
    if (passwordError) {
      setPasswordError(passwordError)
      return
    }
    if (password.new !== password.confirm) {
      setPasswordError('New password and confirmation do not match.')
      return
    }

    setPasswordLoading(true)

    const { error: signInError } = await verifyCurrentPassword(userEmail, password.current)

    if (signInError) {
      setPasswordError('Current password is incorrect.')
      setPasswordLoading(false)
      return
    }

    const { error: updateError } = await updatePassword(password.new)

    if (updateError) {
      setPasswordError(updateError.message)
      setPasswordLoading(false)
      return
    }
    setPassword({
      current: '',
      new: '',
      confirm: '',
    })
    setPasswordLoading(false)
    setPasswordSuccess('Password updated successfully.')
  }

  async function handleApiConnectionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextApiKey = apiKey.trim()
    const nextApiSecret = apiSecret.trim()

    setConnectionError(null)
    setConnectionSuccess(null)

    if (!nextApiKey) {
      setConnectionError('API key cannot be empty.')
      return
    }

    if (!nextApiSecret) {
      setConnectionError('API secret cannot be empty.')
      return
    }

    setConnectionLoading(true)

    try {
      const { data, error } = await connectBinance(nextApiKey, nextApiSecret)

      if (error) {
        const context = 'context' in error ? error.context : null
        const responseBody = context instanceof Response ? await context.json().catch(() => null) : null

        throw new Error(responseBody?.error || error.message || 'Failed to connect Binance')
      }

      if (!data?.connected) {
        setConnectionError('Binance did not confirm the connection.')
        return
      }

      setApiKey('')
      setApiSecret('')
      setConnectionSuccess('Binance connected successfully.')
      setIsBinanceConnected(true)
      if (session?.user.id) {
        await queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.user(session.user.id) })
      }
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect Binance.')
    } finally {
      setConnectionLoading(false)
    }
  }

  async function handleDisconnectBinance() {
    setConnectionError(null)
    setConnectionSuccess(null)
    setConnectionLoading(true)

    try {
      const connected = await disconnectBinance()

      if (connected) {
        setConnectionError('Binance did not confirm the disconnection.')
        return
      }

      setApiKey('')
      setApiSecret('')
      setConnectionSuccess('Binance disconnected successfully.')
      setIsBinanceConnected(false)
      if (session?.user.id) {
        await queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.user(session.user.id) })
      }
      return true
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Failed to disconnect Binance.')
      return false
    } finally {
      setConnectionLoading(false)
    }
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file || !session?.user.id) {
      return
    }

    setAvatarError(null)

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Please choose a JPG, PNG, or WebP image.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('File size must not exceed 2 MB.')
      return
    }

    setAvatarLoading(true)

    try {
      await uploadAvatar(file, session.user.id)
      setAvatarUrl(await getAvatarUrl(session.user.id))
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : 'Failed to upload avatar.')
    } finally {
      setAvatarLoading(false)
    }
  }

  return (
    <main className="page-container">
      <div className="mb-8">
        <p className="label mb-2">Account</p>
        <h1 className="mb-2 text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted">Manage your account, security, and connected exchanges.</p>
      </div>
      <div className="grid max-w-4xl gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="ui-surface h-fit p-2">
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSearchParams({ tab: tab.value })}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition ${activeTab === tab.value ? 'bg-accent text-on-accent' : 'text-muted hover:bg-surface-raised hover:text-text'}`}>
                <tab.icon className="inline-block h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>
        {activeTab === 'account' && (
          <section className="ui-surface p-4 sm:p-6">
            <h2 className="mb-1 text-lg font-semibold">Account</h2>
            <p className="text-sm text-muted">Manage your account details and profile photo.</p>
            {userEmail && (
              <>
                <div className="mt-6 flex gap-4">
                  <div className="flex h-15 w-15 items-center justify-center overflow-hidden rounded-md border border-outline bg-accent-subtle text-2xl font-medium text-accent">
                    {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" /> : userEmail[0].toUpperCase()}
                  </div>
                  <div>
                    <input
                      ref={profilePhotoInputRef}
                      type="file"
                      name="profilePhoto"
                      id="profilePhoto"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="text-sm"
                      onClick={() => profilePhotoInputRef.current?.click()}
                      disabled={avatarLoading}>
                      {avatarLoading ? <Spinner /> : <Camera className="h-4 w-4" />}
                      {avatarLoading ? 'Uploading...' : 'Change photo'}
                    </Button>
                    <p className="mt-1.5 text-xs text-muted">JPG, PNG, or WebP. Max 2 MB.</p>
                  </div>
                </div>
                <ErrorMessage message={avatarError} />
              </>
            )}
            <form onSubmit={handleEmailSubmit} className="mt-6">
              <div className="grid gap-4">
                <label className="flex flex-col gap-2">
                  <span className="label">Email address</span>
                  <input
                    className="input px-4 py-3"
                    type="email"
                    name="email"
                    id="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmailDraft({ userEmail, value: e.target.value })}
                    required
                  />
                </label>
                <PasswordField
                  label="Current password to confirm"
                  name="email-current-password"
                  value={emailCurrentPassword}
                  onChange={(event) => setEmailCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  visibilityLabel="current password"
                  required
                />
              </div>
              <ErrorMessage message={emailError} />
              <SuccessMessage message={emailSuccess} />
              <Button type="submit" variant="filled" className="mt-5" disabled={emailLoading}>
                {emailLoading && <Spinner />}
                {emailLoading ? 'Updating...' : 'Update email'}
              </Button>
            </form>
            <section aria-labelledby="danger-zone-heading" className="mt-8 border-t border-outline pt-6">
              <div className="ui-surface bg-surface-raised p-4">
                <h2 id="danger-zone-heading" className="mb-1 text-lg font-semibold">
                  Danger zone
                </h2>
                <p className="mb-4 text-sm text-muted">Permanently remove your account and its data.</p>
                <Dialog.Root
                  open={accountDeleteOpen}
                  onOpenChange={(open) => {
                    if (accountDeleteLoading) return
                    setAccountDeleteOpen(open)
                    if (!open) {
                      setAccountDeletePassword('')
                      setAccountDeleteConfirmation('')
                      setAccountDeleteError(null)
                    }
                  }}>
                  <Dialog.Trigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      className="shrink-0 border-loss-outline bg-loss-subtle hover:border-loss hover:bg-loss-subtle hover:text-loss">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete account
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
                    <Dialog.Content
                      onEscapeKeyDown={(event) => {
                        if (accountDeleteLoading) event.preventDefault()
                      }}
                      onPointerDownOutside={(event) => {
                        if (accountDeleteLoading) event.preventDefault()
                      }}
                      className="ui-surface fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-5">
                      <Dialog.Title className="text-lg font-semibold text-loss">Delete your account?</Dialog.Title>
                      <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted">
                        This permanently deletes your Binance connection, portfolio history, spot deals, and profile photo. This action cannot be
                        undone.
                      </Dialog.Description>
                      <form onSubmit={handleAccountDelete} className="mt-5">
                        <div className="grid gap-4">
                          <PasswordField
                            label="Current password"
                            name="delete-account-password"
                            value={accountDeletePassword}
                            onChange={(event) => setAccountDeletePassword(event.target.value)}
                            autoComplete="current-password"
                            disabled={accountDeleteLoading}
                            required
                          />
                          <label className="flex flex-col gap-2">
                            <span className="label">Type DELETE to confirm</span>
                            <input
                              className="input px-4 py-3"
                              name="delete-account-confirmation"
                              value={accountDeleteConfirmation}
                              onChange={(event) => setAccountDeleteConfirmation(event.target.value)}
                              autoComplete="off"
                              disabled={accountDeleteLoading}
                              required
                            />
                          </label>
                        </div>
                        <ErrorMessage message={accountDeleteError} />
                        <div className="mt-5 flex justify-end gap-2">
                          <Button type="button" variant="dashboard" disabled={accountDeleteLoading} onClick={() => setAccountDeleteOpen(false)}>
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            variant="filled"
                            disabled={accountDeleteLoading || accountDeleteConfirmation !== 'DELETE'}
                            className="border-loss bg-loss hover:border-loss hover:bg-loss-subtle hover:text-loss">
                            {accountDeleteLoading ? <Spinner /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                            {accountDeleteLoading ? 'Deleting...' : 'Delete permanently'}
                          </Button>
                        </div>
                      </form>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
              </div>
            </section>
          </section>
        )}
        {activeTab === 'security' && (
          <section className="ui-surface p-4 sm:p-6">
            <h2 className="mb-1 text-lg font-semibold">Password</h2>
            <p className="text-sm text-muted">Use a strong, unique password for your account.</p>
            <form onSubmit={handlePasswordSubmit} className="mt-6">
              <div className="grid gap-4">
                <PasswordField
                  label="Current password"
                  value={password.current}
                  onChange={(event) => setPassword({ ...password, current: event.target.value })}
                  autoComplete="current-password"
                  required
                />
                <PasswordField
                  label="New password"
                  value={password.new}
                  onChange={(event) => setPassword({ ...password, new: event.target.value })}
                  autoComplete="new-password"
                  required
                />
                <PasswordField
                  label="Confirm new password"
                  value={password.confirm}
                  onChange={(event) => setPassword({ ...password, confirm: event.target.value })}
                  autoComplete="new-password"
                  visibilityLabel="password confirmation"
                  required
                />
              </div>
              <ErrorMessage message={passwordError} />
              <SuccessMessage message={passwordSuccess} />
              <Button type="submit" variant="filled" className="mt-5" disabled={passwordLoading}>
                {passwordLoading && <Spinner />}
                {passwordLoading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </section>
        )}
        {activeTab === 'exchanges' && (
          <section className="ui-surface p-4 sm:p-6">
            <div className="mb-6 flex flex-col items-start justify-between gap-x-10 gap-y-4 sm:flex-row">
              <div>
                <h2 className="mb-1 text-lg font-semibold">Exchange connections</h2>
                <p className="text-sm text-muted">Link accounts to sync balances and portfolio performance.</p>
              </div>
              <div className="order-first flex flex-col items-center gap-2 self-end whitespace-nowrap sm:order-0 sm:self-start">
                {connectionStatusLoading ? (
                  <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-accent-outline bg-accent-subtle px-2 py-1 text-xs text-accent">
                    <Spinner className="size-3.5" />
                    Connecting...
                  </span>
                ) : isBinanceConnected ? (
                  <span className="ui-surface inline-flex items-center justify-center gap-1.5 rounded-md border-profit-outline bg-profit-subtle px-2 py-1 text-xs text-profit">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="ui-surface inline-flex items-center justify-center gap-1.5 rounded-md border-warning-outline bg-warning-subtle px-2 py-1 text-xs text-warning">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Not connected
                  </span>
                )}
              </div>
            </div>
            {connectionStatusLoading ? (
              <div className="flex min-h-47 items-center justify-center">
                <Spinner />
              </div>
            ) : isBinanceConnected ? (
              <div>
                <div className="ui-surface bg-surface-raised p-4">
                  <div className="flex items-center gap-3">
                    <img src={binance} alt="Binance" className="h-8 w-8" />
                    <div>
                      <h3 className="text-sm font-medium">Binance</h3>
                      <p className="text-xs text-muted">Your account is connected and ready to sync.</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-muted">
                    <BrandName /> can securely read your Binance balances, market data and account history using your read-only API credentials.
                    Trading and withdrawals are not available.
                  </p>
                </div>
                <ErrorMessage message={connectionError} />
                <SuccessMessage message={connectionSuccess} />
                {isConfirmingDisconnect ? (
                  <div role="status" className="ui-surface mt-5 border-warning-outline bg-warning-subtle p-4 text-sm text-warning">
                    <p>Are you sure you want to disconnect Binance? Your portfolio data will no longer be synced.</p>
                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsConfirmingDisconnect(false)}
                        className="border-profit-outline bg-profit-subtle hover:border-profit hover:bg-profit-subtle hover:text-profit">
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={async () => {
                          const success = await handleDisconnectBinance()
                          if (success) {
                            setIsConfirmingDisconnect(false)
                          }
                        }}
                        className="border-loss-outline bg-loss-subtle hover:border-loss hover:bg-loss-subtle hover:text-loss"
                        disabled={connectionLoading}>
                        {connectionLoading && <Spinner />}
                        {connectionLoading ? 'Disconnecting...' : 'Disconnect Binance'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" size="sm" onClick={() => setIsConfirmingDisconnect(true)} className="mt-5">
                    Disconnect Binance
                  </Button>
                )}
              </div>
            ) : (
              <form onSubmit={handleApiConnectionSubmit}>
                <div className="grid gap-4">
                  <label className="flex flex-col gap-2">
                    <span className="label">API Key</span>
                    <input
                      className="input px-4 py-3"
                      onChange={(event) => setApiKey(event.target.value)}
                      value={apiKey}
                      autoComplete="off"
                      placeholder="Enter Binance API key"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="label">API Secret</span>
                    <input
                      className="input px-4 py-3"
                      type="password"
                      onChange={(event) => setApiSecret(event.target.value)}
                      value={apiSecret}
                      autoComplete="off"
                      placeholder="Enter Binance API secret"
                      required
                    />
                  </label>
                </div>
                <p className="mt-4 text-xs text-muted">
                  In Binance, enable <span className="text-profit">Read</span> permission only. Leave trading and withdrawals disabled.
                </p>
                <ErrorMessage message={connectionError} />
                <SuccessMessage message={connectionSuccess} />
                <Button type="submit" variant="filled" className="mt-5" disabled={connectionLoading}>
                  {connectionLoading && <Spinner />}
                  {connectionLoading ? 'Connecting...' : 'Connect Binance'}
                </Button>
              </form>
            )}
            <div className="mt-8 grid gap-4 border-t border-outline pt-6 sm:grid-cols-3">
              <div className="ui-surface bg-app p-4">
                <h3 className="mb-2 text-sm font-medium">Read-only access</h3>
                <p className="text-xs leading-5 text-muted">
                  <BrandName /> only reads balances and market data. It cannot trade or withdraw funds.
                </p>
              </div>
              <div className="ui-surface bg-app p-4">
                <h3 className="mb-2 text-sm font-medium">You stay in control</h3>
                <p className="text-xs leading-5 text-muted">Disconnect Binance whenever you want from this page or revoke the key in Binance.</p>
              </div>
              <div className="ui-surface bg-app p-4">
                <h3 className="mb-2 text-sm font-medium">Encrypted connection</h3>
                <p className="text-xs leading-5 text-muted">Your credentials are sent through a secure connection.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
