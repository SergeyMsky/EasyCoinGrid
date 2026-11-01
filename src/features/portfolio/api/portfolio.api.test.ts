import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}))

describe('getCoinsMetadata', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.invoke.mockReset()
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('easycoingrid:coin-metadata:')) localStorage.removeItem(key)
    }
  })

  it('caches successful image metadata and requests only uncached assets', async () => {
    mocks.invoke
      .mockResolvedValueOnce({
        data: { data: { BTC: { name: 'Bitcoin', image: 'https://example.com/btc.png' } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { data: { ETH: { name: 'Ethereum', image: 'https://example.com/eth.png' } } },
        error: null,
      })
    const { getCoinsMetadata } = await import('./portfolio.api')

    await expect(getCoinsMetadata(['btc'])).resolves.toMatchObject({
      BTC: { name: 'Bitcoin', image: 'https://example.com/btc.png' },
    })
    await expect(getCoinsMetadata(['BTC', 'ETH'])).resolves.toMatchObject({
      BTC: { name: 'Bitcoin', image: 'https://example.com/btc.png' },
      ETH: { name: 'Ethereum', image: 'https://example.com/eth.png' },
    })

    expect(mocks.invoke).toHaveBeenNthCalledWith(1, 'get-coins-metadata', { body: { assets: ['BTC'] } })
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, 'get-coins-metadata', { body: { assets: ['ETH'] } })
  })

  it('force refreshes cached metadata after an image fails', async () => {
    mocks.invoke
      .mockResolvedValueOnce({
        data: { data: { BTC: { name: 'Bitcoin', image: 'https://example.com/btc-old.png' } } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { data: { BTC: { name: 'Bitcoin', image: null } } },
        error: null,
      })
    const { getCoinsMetadata } = await import('./portfolio.api')

    await expect(getCoinsMetadata(['BTC'])).resolves.toMatchObject({
      BTC: { image: 'https://example.com/btc-old.png' },
    })
    await expect(getCoinsMetadata(['BTC'], { forceRefresh: true })).resolves.toMatchObject({
      BTC: { image: 'https://example.com/btc-old.png' },
    })
    await expect(getCoinsMetadata(['BTC'])).resolves.toMatchObject({
      BTC: { image: 'https://example.com/btc-old.png' },
    })

    expect(mocks.invoke).toHaveBeenCalledTimes(2)
    expect(mocks.invoke).toHaveBeenNthCalledWith(2, 'get-coins-metadata', { body: { assets: ['BTC'] } })
  })

  it('keeps successful image metadata across a module reload', async () => {
    mocks.invoke.mockResolvedValueOnce({
      data: { data: { BTC: { name: 'Bitcoin', image: 'https://example.com/btc.png' } } },
      error: null,
    })
    let { getCoinsMetadata } = await import('./portfolio.api')
    await getCoinsMetadata(['BTC'])

    vi.resetModules()
    ;({ getCoinsMetadata } = await import('./portfolio.api'))
    await expect(getCoinsMetadata(['BTC'])).resolves.toMatchObject({
      BTC: { image: 'https://example.com/btc.png' },
    })
    expect(mocks.invoke).toHaveBeenCalledOnce()
  })
})
