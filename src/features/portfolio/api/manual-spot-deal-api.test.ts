import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CreateSpotRotationInput } from '@/features/portfolio/portfolio.types'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
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
    mocks.from.mockReset().mockReturnValue({ insert: mocks.insert, delete: mocks.delete })
    mocks.insert.mockReset().mockResolvedValue({ error: null })
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
