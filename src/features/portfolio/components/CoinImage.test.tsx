import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CoinImage } from './CoinImage'

const mocks = vi.hoisted(() => ({
  getCachedCoinImage: vi.fn(() => null),
  getCoinsMetadata: vi.fn(),
}))

vi.mock('@/features/portfolio/api/portfolio.api', () => ({
  getCachedCoinImage: mocks.getCachedCoinImage,
  getCoinsMetadata: mocks.getCoinsMetadata,
}))

describe('CoinImage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCachedCoinImage.mockReturnValue(null)
  })

  it('renders coin imagery as a circular, cropped image', () => {
    render(<CoinImage asset="BTC" image="https://example.com/btc.png" className="h-8 w-8" />)

    expect(screen.getByRole('img', { name: 'BTC' })).toHaveClass('rounded-full', 'object-cover', 'h-8', 'w-8')
  })

  it('renders nothing when no coin image is available', () => {
    render(<CoinImage asset="BTC" image={null} className="h-8 w-8" />)

    expect(screen.getByText('BTC')).toHaveClass('rounded-full', 'h-8', 'w-8')
  })

  it('shows a fixed-size skeleton while the coin image loads', () => {
    render(<CoinImage asset="BTC" image={null} loading className="h-8 w-8" />)

    expect(screen.getByRole('img', { name: 'Loading BTC image' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('img', { name: 'Loading BTC image' })).toHaveClass('animate-pulse', 'rounded-full', 'h-8', 'w-8')
  })

  it('fetches fresh metadata and retries with the returned image URL after an image fails', async () => {
    mocks.getCoinsMetadata.mockResolvedValue({
      BTC: { name: 'Bitcoin', image: 'https://example.com/btc-new.png' },
    })
    render(<CoinImage asset="BTC" image="https://example.com/btc-old.png" />)

    fireEvent.error(screen.getByRole('img', { name: 'BTC' }))

    expect(await screen.findByRole('img', { name: 'BTC' })).toHaveAttribute('src', 'https://example.com/btc-new.png')
    expect(mocks.getCoinsMetadata).toHaveBeenCalledWith(['BTC'], { forceRefresh: true })
  })

  it('retries a failing URL at most twice and then shows the ticker fallback', async () => {
    mocks.getCoinsMetadata.mockResolvedValue({
      BTC: { name: 'Bitcoin', image: 'https://example.com/btc.png' },
    })
    const { rerender } = render(<CoinImage asset="BTC" image="https://example.com/btc.png" />)

    fireEvent.error(screen.getByRole('img', { name: 'BTC' }))
    const firstRetry = await screen.findByRole('img', { name: 'BTC' })
    expect(firstRetry.getAttribute('src')).toContain('__image_retry=')

    fireEvent.error(firstRetry)
    const secondRetry = await screen.findByRole('img', { name: 'BTC' })
    expect(secondRetry.getAttribute('src')).toContain('__image_retry=')

    fireEvent.error(secondRetry)
    await waitFor(() => expect(screen.getByText('BTC')).toBeInTheDocument())
    expect(mocks.getCoinsMetadata).toHaveBeenCalledTimes(2)

    rerender(<CoinImage asset="BTC" image="https://example.com/btc-recovered.png" />)
    expect(await screen.findByRole('img', { name: 'BTC' })).toHaveAttribute('src', 'https://example.com/btc-recovered.png')
  })
})
