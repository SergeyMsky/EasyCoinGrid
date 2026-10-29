import { supabase } from '@/shared/lib/supabase'
import type { CloseRotationInput, CreateSpotRotationInput, SpotRotation } from '@/features/portfolio/portfolio.types'

export async function getSpotRotations(): Promise<SpotRotation[]> {
  const { data, error } = await supabase.from('spot_rotations').select('*').order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Unable to load spot rotations: ${error.message}`)
  }

  return data as SpotRotation[]
}

export async function createSpotRotation(input: CreateSpotRotationInput): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(`Unable to verify your account: ${userError.message}`)
  }
  if (!user) {
    throw new Error('Sign in before creating a spot rotation.')
  }

  const { error } = await supabase.from('spot_rotations').insert({
    user_id: user.id,
    symbol: input.symbol,
    buy_order_id: input.buyOrderId || null,
    buy_trade_id: input.buyTradeId || null,
    buy_time: input.buyTime,
    buy_price: input.buyPrice,
    buy_qty: input.buyQty,
    status: 'OPEN',
    sell_order_id: null,
    sell_trade_id: null,
    sell_time: null,
    sell_price: null,
    sold_qty: 0,
    fee_amount: input.feeAmountUsd,
    realized_pnl_usd: null,
    realized_pnl_percent: null,
    match_type: 'MANUAL',
  })

  if (error) {
    throw new Error(`Unable to create spot rotation: ${error.message}`)
  }
}

export async function closeSpotRotation(rotationId: string, input: CloseRotationInput): Promise<void> {
  const { error } = await supabase.rpc('close_spot_rotation', {
    p_rotation_id: rotationId,
    p_sell_price: input.sellPrice,
    p_sold_qty: input.soldQty,
    p_sell_fee_usd: input.sellFeeAmountUsd,
    p_sell_trade_id: input.sellTradeId || null,
    p_sell_time: input.sellTime,
  })

  if (error) {
    throw new Error(`Unable to close spot rotation: ${error.message}`)
  }
}
