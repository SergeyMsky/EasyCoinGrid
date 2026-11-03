import { supabase } from '@/shared/lib/supabase'
import type { CloseRotationInput, CreateSpotRotationInput, EditSpotRotationInput, SpotRotation } from '@/features/portfolio/portfolio.types'
import { calculateNetRealizedPnl } from '@/features/portfolio/utils/rotationMatching'

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

  const closedInput = input.sellPrice !== undefined ? input : null
  const totalFeeUsd = input.feeAmountUsd + (closedInput?.sellFeeAmountUsd ?? 0)
  const realized = closedInput
    ? calculateNetRealizedPnl({
        buyPrice: input.buyPrice,
        soldQty: input.buyQty,
        sellPrice: closedInput.sellPrice,
        feeAmountUsd: totalFeeUsd,
      })
    : null

  const { error } = await supabase.from('spot_rotations').insert({
    user_id: user.id,
    symbol: input.symbol,
    coinpaprika_id: null,
    coingecko_id: input.coinGeckoId ?? null,
    buy_order_id: input.buyOrderId || null,
    buy_trade_id: input.buyTradeId || null,
    buy_time: input.buyTime,
    buy_price: input.buyPrice,
    buy_qty: input.buyQty,
    invested_amount: input.investedAmountUsd,
    status: closedInput ? 'CLOSED' : 'OPEN',
    sell_order_id: null,
    sell_trade_id: null,
    sell_time: closedInput?.sellTime ?? null,
    sell_price: closedInput?.sellPrice ?? null,
    sold_qty: closedInput ? input.buyQty : 0,
    fee_amount: totalFeeUsd,
    realized_pnl_usd: realized?.realizedPnlUsd ?? null,
    realized_pnl_percent: realized?.realizedPnlPercent ?? null,
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

export async function updateSpotRotation(rotation: SpotRotation, input: EditSpotRotationInput): Promise<void> {
  if (rotation.match_type !== 'MANUAL') {
    throw new Error('Only manual spot deals can be edited.')
  }
  if (rotation.status !== input.status) {
    throw new Error('The deal status cannot be changed while editing.')
  }

  const realized =
    input.status === 'CLOSED'
      ? calculateNetRealizedPnl({
          buyPrice: input.buyPrice,
          soldQty: input.buyQty,
          sellPrice: input.sellPrice,
          feeAmountUsd: input.feeAmountUsd,
        })
      : null

  const { data, error } = await supabase
    .from('spot_rotations')
    .update({
      symbol: input.symbol,
      coingecko_id: input.coinGeckoId,
      buy_time: input.buyTime,
      buy_price: input.buyPrice,
      buy_qty: input.buyQty,
      invested_amount: input.investedAmountUsd,
      status: input.status,
      sell_time: input.status === 'CLOSED' ? input.sellTime : null,
      sell_price: input.status === 'CLOSED' ? input.sellPrice : null,
      sold_qty: input.status === 'CLOSED' ? input.buyQty : 0,
      fee_amount: input.feeAmountUsd,
      realized_pnl_usd: realized?.realizedPnlUsd ?? null,
      realized_pnl_percent: realized?.realizedPnlPercent ?? null,
    })
    .eq('id', rotation.id)
    .eq('match_type', 'MANUAL')
    .select('id')

  if (error) {
    throw new Error(`Unable to update spot deal: ${error.message}`)
  }
  if (!data.length) {
    throw new Error('This spot deal could not be found or cannot be edited.')
  }
}

export async function deleteSpotRotation(rotationId: string): Promise<void> {
  const { data, error } = await supabase.from('spot_rotations').delete().eq('id', rotationId).eq('match_type', 'MANUAL').select('id')

  if (error) {
    throw new Error(`Unable to delete spot deal: ${error.message}`)
  }
  if (!data.length) {
    throw new Error('This spot deal could not be found or cannot be deleted.')
  }
}
