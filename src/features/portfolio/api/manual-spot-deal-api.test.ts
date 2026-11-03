import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateSpotRotationInput } from '@/features/portfolio/portfolio.types'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  updateEq: vi.fn(),
  updateSelect: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}))

describe('manual spot deal persistence', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mocks.from.mockReset().mockReturnValue({ insert: mocks.insert, update: mocks.update, delete: mocks.delete })
    mocks.insert.mockReset().mockResolvedValue({ error: null })
    mocks.update.mockReset().mockReturnValue({ eq: mocks.updateEq })
    mocks.updateEq.mockReset().mockReturnValue({ eq: mocks.updateEq, select: mocks.updateSelect })
    mocks.updateSelect.mockReset().mockResolvedValue({ data: [{ id: 'deal-1' }], error: null })
    mocks.delete.mockReset().mockReturnValue({ eq: mocks.eq })
    mocks.eq.mockReset().mockReturnValue({ eq: mocks.eq, select: mocks.select })
    mocks.select.mockReset().mockResolvedValue({ data: [{ id: 'deal-1' }], error: null })
    mocks.rpc.mockReset()
  })

  it('saves an open deal with the invested amount and no sale data', async () => {
    const { createSpotRotation } = await import('./spot-rotations.api')
    const input: CreateSpotRotationInput = {
      symbol: 'DOT/USDT',
      buyPrice: 6.712,
      buyQty: 7.42,
      investedAmountUsd: 50,
      feeAmountUsd: 0.1,
      buyTime: '2026-10-29T12:00:00.000Z',
    }

    await createSpotRotation(input)

    expect(mocks.from).toHaveBeenCalledWith('spot_rotations')
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        symbol: 'DOT/USDT',
        coinpaprika_id: null,
        coingecko_id: null,
        buy_price: 6.712,
        buy_qty: 7.42,
        invested_amount: 50,
        status: 'OPEN',
        sell_time: null,
        sell_price: null,
        sold_qty: 0,
        fee_amount: 0.1,
        match_type: 'MANUAL',
      }),
    )
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('saves completed deals atomically as a closed row with fee-adjusted results', async () => {
    const { createSpotRotation } = await import('./spot-rotations.api')

    await createSpotRotation({
      symbol: 'DOT/USDT',
      coinGeckoId: 'polkadot',
      buyPrice: 100,
      buyQty: 2,
      investedAmountUsd: 200,
      feeAmountUsd: 1,
      buyTime: '2026-10-29T12:00:00.000Z',
      sellPrice: 110,
      sellFeeAmountUsd: 1,
      sellTime: '2026-10-30T12:00:00.000Z',
    })

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        coingecko_id: 'polkadot',
        invested_amount: 200,
        status: 'CLOSED',
        sell_time: '2026-10-30T12:00:00.000Z',
        sell_price: 110,
        sold_qty: 2,
        fee_amount: 2,
        realized_pnl_usd: 18,
        realized_pnl_percent: 9,
      }),
    )
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('updates a closed manual deal and recalculates realized P/L from the edited values', async () => {
    const { updateSpotRotation } = await import('./spot-rotations.api')
    const rotation = {
      id: 'deal-1',
      user_id: 'user-1',
      symbol: 'DOT/USDT',
      coinpaprika_id: null,
      coingecko_id: 'polkadot',
      buy_order_id: null,
      buy_trade_id: null,
      buy_time: '2026-10-29T12:00:00.000Z',
      buy_price: 100,
      buy_qty: 2,
      invested_amount: 200,
      status: 'CLOSED' as const,
      sell_order_id: null,
      sell_trade_id: null,
      sell_time: '2026-10-30T12:00:00.000Z',
      sell_price: 110,
      sold_qty: 2,
      fee_amount: 2,
      realized_pnl_usd: 18,
      realized_pnl_percent: 9,
      match_type: 'MANUAL' as const,
    }

    await updateSpotRotation(rotation, {
      symbol: 'BTC/USDT',
      coinGeckoId: 'bitcoin',
      buyPrice: 90,
      buyQty: 3,
      investedAmountUsd: 270,
      feeAmountUsd: 3,
      buyTime: '2026-10-28T12:00:00.000Z',
      status: 'CLOSED',
      sellPrice: 100,
      sellTime: '2026-10-30T12:00:00.000Z',
    })

    expect(mocks.from).toHaveBeenCalledWith('spot_rotations')
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTC/USDT',
        coingecko_id: 'bitcoin',
        buy_price: 90,
        buy_qty: 3,
        invested_amount: 270,
        status: 'CLOSED',
        sell_price: 100,
        sold_qty: 3,
        fee_amount: 3,
        realized_pnl_usd: 27,
        realized_pnl_percent: 10,
      }),
    )
    expect(mocks.updateEq).toHaveBeenNthCalledWith(1, 'id', 'deal-1')
    expect(mocks.updateEq).toHaveBeenNthCalledWith(2, 'match_type', 'MANUAL')
  })

  it('deletes only manual deals and reports when no deal was removed', async () => {
    const { deleteSpotRotation } = await import('./spot-rotations.api')

    await deleteSpotRotation('deal-1')

    expect(mocks.from).toHaveBeenCalledWith('spot_rotations')
    expect(mocks.delete).toHaveBeenCalledOnce()
    expect(mocks.eq).toHaveBeenNthCalledWith(1, 'id', 'deal-1')
    expect(mocks.eq).toHaveBeenNthCalledWith(2, 'match_type', 'MANUAL')
    expect(mocks.select).toHaveBeenCalledWith('id')

    mocks.select.mockResolvedValueOnce({ data: [], error: null })
    await expect(deleteSpotRotation('missing-deal')).rejects.toThrow('This spot deal could not be found or cannot be deleted.')
  })
})
