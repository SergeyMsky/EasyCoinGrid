import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CoinSearchInput } from './CoinSearchInput'
import type { CoinGeckoCoin } from '@/features/portfolio/api/coingecko.api'

const mocks = vi.hoisted(() => ({
  searchCoinGeckoCoins: vi.fn(),
}))

vi.mock('@/features/portfolio/api/coingecko.api', () => ({
  searchCoinGeckoCoins: mocks.searchCoinGeckoCoins,
}))

const bitcoin: CoinGeckoCoin = {
  id: 'bitcoin',
  name: 'Bitcoin',
  symbol: 'BTC',
  image: 'https://example.com/bitcoin.png',
  rank: 1,
}

function CoinSearchHarness() {
  const [value, setValue] = useState('')
  const [selectedCoin, setSelectedCoin] = useState<CoinGeckoCoin | null>(null)

  return (
    <CoinSearchInput
      value={value}
      selectedCoin={selectedCoin}
      onValueChange={(nextValue) => {
        setValue(nextValue)
        setSelectedCoin(null)
      }}
      onSelect={(coin) => {
        setSelectedCoin(coin)
        setValue(`${coin.symbol}/USDT`)
      }}
    />
  )
}

describe('CoinSearchInput', () => {
  beforeEach(() => {
    mocks.searchCoinGeckoCoins.mockReset().mockResolvedValue([bitcoin])
  })

  it('searches the catalog and selects the coin', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <CoinSearchHarness />
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByRole('textbox', { name: 'Coin or trading pair' }), { target: { value: 'bit' } })

    const option = await screen.findByRole('option')
    fireEvent.click(option)

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Coin or trading pair' })).toHaveValue('Bitcoin (BTC)'))
    expect(mocks.searchCoinGeckoCoins).toHaveBeenCalledWith('bit')
  })
})
