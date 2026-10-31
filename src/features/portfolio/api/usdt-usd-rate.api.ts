import { supabase } from '@/shared/lib/supabase'

export type StablecoinUsdRates = {
  rates: {
    USDT: number
    USDC: number
  }
  source: 'Kraken'
  updatedAt: string
}

export class StablecoinUsdRatesUnavailableError extends Error {
  constructor(message = 'Unable to load the current USDT/USD and USDC/USD rates.') {
    super(message)
    this.name = 'StablecoinUsdRatesUnavailableError'
  }
}

export async function getStablecoinUsdRates(): Promise<StablecoinUsdRates> {
  const { data, error } = await supabase.functions.invoke('get-usdt-usd-rate')

  if (error) {
    const context = 'context' in error ? error.context : null
    const responseData = context instanceof Response ? await context.json().catch(() => null) : null
    throw new StablecoinUsdRatesUnavailableError(responseData?.error || error.message)
  }

  const usdtRate = Number(data?.rates?.USDT)
  const usdcRate = Number(data?.rates?.USDC)
  const updatedAt = data?.updatedAt

  if (
    !Number.isFinite(usdtRate) ||
    usdtRate <= 0 ||
    !Number.isFinite(usdcRate) ||
    usdcRate <= 0 ||
    data?.source !== 'Kraken' ||
    typeof updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(updatedAt))
  ) {
    throw new StablecoinUsdRatesUnavailableError('Invalid stablecoin/USD rate response.')
  }

  return {
    rates: { USDT: usdtRate, USDC: usdcRate },
    source: 'Kraken',
    updatedAt,
  }
}
