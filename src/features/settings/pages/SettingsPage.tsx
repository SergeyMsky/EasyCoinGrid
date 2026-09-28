import { useState, useEffect, useRef } from 'react'
import { AlertCircle, Camera, CheckCircle2, Eye, EyeOff, Network, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react'
import { connectBinance, disconnectBinance, getBinanceConnectionStatus, updateEmail, updatePassword, verifyCurrentPassword } from '@/features/settings/api/settings.api'
import { useSearchParams } from 'react-router-dom'
import { ErrorMessage } from '@/shared/components/ErrorMessage'
import { SuccessMessage } from '@/shared/components/SuccessMessage'
import { validatePassword } from '@/shared/utils/validate-password'
import binance from '@/assets/binance.svg'
import { Spinner } from '@/shared/components/Spinner'
import { Button } from '@/shared/components/Button'
import type { Session } from '@supabase/supabase-js'
import { getAvatarUrl, uploadAvatar } from '@/services/avatar'

type SettingsTab = 'profile' | 'security' | 'connections'

const tabs: Array<{ value: SettingsTab; label: string; icon: LucideIcon }> = [
  { value: 'profile', label: 'Profile', icon: UserRound },
  { value: 'security', label: 'Security', icon: ShieldCheck },
  { value: 'connections', label: 'Connections', icon: Network },
]

type SettingsProps = {
  userEmail?: string
  session?: Session | null
  avatarUrl: string | null
  setAvatarUrl: (url: string | null) => void
}

export function SettingsPage({ userEmail, session, avatarUrl, setAvatarUrl }: SettingsProps) {
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const [email, setEmail] = useState(userEmail || '')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const [password, setPassword] = useState({ current: '', new: '', confirm: '' })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
  const activeTab: SettingsTab = queryTab === 'security' || queryTab === 'connections' ? queryTab : 'profile'

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

    const { error: updateError } = await updateEmail(nextEmail)

    setEmailLoading(false)

    if (updateError) {
      setEmailError(updateError.message)
      return
    }

    setEmail(nextEmail)
    setEmailSuccess('Check your new email to confirm the change.')
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
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <p className="label mb-2">Account</p>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-sm text-gray-500">Manage your profile, security, and connected exchanges.</p>
      </div>
      <div className="grid gap-4 max-w-4xl md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="h-fit ui-surface bg-black/10 p-2">
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSearchParams({ tab: tab.value })}
                className={`flex items-center gap-2 cursor-pointer rounded-md px-3 py-2 text-left text-sm transition font-medium ${activeTab === tab.value ? 'bg-emerald-400 text-black' : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}
              >
                <tab.icon className="inline-block h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>
        {activeTab === 'profile' && (
          <section className="ui-surface bg-black/10 p-6">
            <h2 className="text-lg font-semibold mb-1">Profile</h2>
            <p className="text-sm text-gray-500">Your public account information.</p>
            {userEmail && (
              <>
                <div className="mt-6 flex gap-4">
                  <div className="flex h-15 w-15 items-center justify-center rounded-md text-emerald-400 bg-emerald-400/20 text-2xl font-medium overflow-hidden">
                    {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" /> : userEmail[0].toUpperCase()}
                  </div>
                  <div>
                    <input ref={profilePhotoInputRef} type="file" name="profilePhoto" id="profilePhoto" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                    <Button type="button" size="sm" className="text-sm" onClick={() => profilePhotoInputRef.current?.click()} disabled={avatarLoading}>
                      {avatarLoading ? <Spinner /> : <Camera className="h-4 w-4" />}
                      {avatarLoading ? 'Uploading...' : 'Change photo'}
                    </Button>
                    <p className="mt-1.5 text-xs text-gray-500">JPG, PNG, or WebP. Max 2 MB.</p>
                  </div>
                </div>
                <ErrorMessage message={avatarError} />
              </>
            )}
            <form onSubmit={handleEmailSubmit} className="mt-6">
              <label className="flex flex-1 flex-col gap-2">
                <span className="label">Email address</span>
                <input className="input px-4 py-3" type="email" name="email" id="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <ErrorMessage message={emailError} />
              <SuccessMessage message={emailSuccess} />
              <Button type="submit" variant="filled" className="mt-5" disabled={emailLoading}>
                {emailLoading && <Spinner />}
                {emailLoading ? 'Updating...' : 'Update email'}
              </Button>
            </form>
          </section>
        )}
        {activeTab === 'security' && (
          <section className="ui-surface bg-black/10 p-6">
            <h2 className="text-lg font-semibold mb-1">Password</h2>
            <p className="text-sm text-gray-500">Use a strong, unique password for your account.</p>
            <form onSubmit={handlePasswordSubmit} className="mt-6">
              <div className="grid gap-4">
                <label className="flex flex-col gap-2">
                  <span className="label">Current password</span>
                  <div className="relative">
                    <input
                      value={password.current}
                      onChange={(event) => setPassword({ ...password, current: event.target.value })}
                      className="input px-4 py-3 pr-11"
                      type={showCurrentPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label">New password</span>
                  <div className="relative">
                    <input
                      value={password.new}
                      onChange={(event) => setPassword({ ...password, new: event.target.value })}
                      className="input px-4 py-3 pr-11"
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label">Confirm new password</span>
                  <div className="relative">
                    <input
                      value={password.confirm}
                      onChange={(event) => setPassword({ ...password, confirm: event.target.value })}
                      className="input px-4 py-3 pr-11"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
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
        {activeTab === 'connections' && (
          <section className="ui-surface bg-black/10 p-6">
            <div className="mb-6 flex items-start justify-between gap-y-4 gap-x-10 flex-col sm:flex-row">
              <div>
                <h2 className="text-lg font-semibold mb-1">Exchange connections</h2>
                <p className="text-sm text-gray-500">Link accounts to sync balances and portfolio performance.</p>
              </div>
              <div className="flex flex-col items-center gap-2 whitespace-nowrap self-end sm:self-start order-first sm:order-0">
                {connectionStatusLoading ? (
                  <span className="inline-flex items-center justify-center gap-1.5 ui-surface border-blue-500/20! bg-blue-500/10! px-2 py-1 text-xs text-blue-400">
                    <Spinner className="size-3.5" />
                    Connecting...
                  </span>
                ) : isBinanceConnected ? (
                  <span className="inline-flex items-center justify-center gap-1.5 ui-surface border-green-500/20! bg-green-500/10! px-2 py-1 text-xs text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-1.5 ui-surface border-yellow-500/20! bg-yellow-500/10! px-2 py-1 text-xs text-yellow-400">
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
                <div className="ui-surface bg-white/1! p-4">
                  <div className="flex items-center gap-3">
                    <img src={binance} alt="Binance" className="h-8 w-8" />
                    <div>
                      <h3 className="text-sm font-medium">Binance</h3>
                      <p className="text-xs text-gray-500">Your account is connected and ready to sync.</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-gray-400">
                    easycoingrid can securely read your Binance balances and market data using your read-only API credentials. Trading and withdrawals are not available.
                  </p>
                </div>
                <ErrorMessage message={connectionError} />
                <SuccessMessage message={connectionSuccess} />
                {isConfirmingDisconnect ? (
                  <>
                    <div className="mt-5 flex gap-2">
                      <Button type="button" size="sm" onClick={() => setIsConfirmingDisconnect(false)} className="border-green-500/20 bg-green-500/10 text-green-400">
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
                        className="border-red-500/20 bg-red-500/10 text-red-400"
                        disabled={connectionLoading}
                      >
                        {connectionLoading && <Spinner />}
                        {connectionLoading ? 'Disconnecting...' : 'Disconnect Binance'}
                      </Button>
                    </div>
                    <p className="mt-5 text-sm text-gray-300">
                      Are you sure you want to disconnect Binance? <br /> Your portfolio data will no longer be synced.
                    </p>
                  </>
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
                    <input className="input px-4 py-3" onChange={(event) => setApiKey(event.target.value)} value={apiKey} autoComplete="off" placeholder="Enter Binance API key" required />
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
                <p className="mt-4 text-xs text-gray-500">
                  In Binance, enable <span className="text-green-400">Read</span> permission only. Leave trading and withdrawals disabled.
                </p>
                <ErrorMessage message={connectionError} />
                <SuccessMessage message={connectionSuccess} />
                <Button type="submit" variant="filled" className="mt-5" disabled={connectionLoading}>
                  {connectionLoading && <Spinner />}
                  {connectionLoading ? 'Connecting...' : 'Connect Binance'}
                </Button>
              </form>
            )}
            <div className="mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
              <div className="ui-surface p-4 bg-white/1!">
                <h3 className="text-sm font-medium mb-2">Read-only access</h3>
                <p className="text-xs leading-5 text-gray-400">easycoingrid only reads balances and market data. It cannot trade or withdraw funds.</p>
              </div>
              <div className="ui-surface p-4 bg-white/1!">
                <h3 className="text-sm font-medium mb-2">You stay in control</h3>
                <p className="text-xs leading-5 text-gray-400">Disconnect Binance whenever you want from this page or revoke the key in Binance.</p>
              </div>
              <div className="ui-surface p-4 bg-white/1!">
                <h3 className="text-sm font-medium mb-2">Encrypted connection</h3>
                <p className="text-xs leading-5 text-gray-400">Your credentials are sent through a secure connection.</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
