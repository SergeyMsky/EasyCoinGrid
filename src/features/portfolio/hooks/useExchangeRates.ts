import { useQuery } from '@tanstack/react-query'
import { FALLBACK_RATES, getExchangeRates } from '@/features/portfolio/api/exchange-rates.api'
import { portfolioQueryKeys } from '@/features/portfolio/api/portfolio-query-keys'
import type { Currency } from '@/features/portfolio/portfolio.types'

const EXCHANGE_RATES_STALE_TIME = 30 * 60 * 1000

export function useExchangeRates(userId: string) {
  const query = useQuery({
    queryKey: portfolioQueryKeys.exchangeRates(userId),
    queryFn: getExchangeRates,
    staleTime: EXCHANGE_RATES_STALE_TIME,
    gcTime: 60 * 60 * 1000,
  })

  return {
    rates: {
      ...FALLBACK_RATES,
      ...query.data?.rates,
      USD: 1,
    } as Record<Currency, number>,
  }
}
