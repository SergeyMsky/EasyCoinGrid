import { supabase } from '@/shared/lib/supabase'
import type { Currency } from '@/features/portfolio/portfolio.types'

type ExchangeRatesResponse = {
  rates: Partial<Record<Currency, number>>
}

export const FALLBACK_RATES: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 144.5,
  CHF: 0.91,
  CAD: 1.34,
  AUD: 1.49,
  UAH: 36.92,
}

export async function getExchangeRates(): Promise<ExchangeRatesResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('get-exchange-rates')

    if (error) throw error

    if (!data?.rates) {
      return { rates: FALLBACK_RATES }
    }

    return {
      rates: {
        ...FALLBACK_RATES,
        ...data.rates,
      } as Partial<Record<Currency, number>>,
    }
  } catch {
    return { rates: FALLBACK_RATES }
  }
}
