import type { Asset } from '@/features/portfolio/portfolio.types'

export const mockPortfolio: Asset[] = [
  {
    asset: 'BTC',
    free: '0.5',
    locked: '0',
    price: 65000,
    avgBuy: 50000,
    change24h: 2.5,
    change24hPercent: 2.5,
    name: 'Bitcoin',
    image: null,
  },
  {
    asset: 'ETH',
    free: '2',
    locked: '0',
    price: 4000,
    avgBuy: 3000,
    change24h: -48,
    change24hPercent: -1.2,
    name: 'Ethereum',
    image: null,
  },
  {
    asset: 'SOL',
    free: '10',
    locked: '0',
    price: 150,
    avgBuy: 180,
    change24h: 4.5,
    change24hPercent: 3.1,
    name: 'Solana',
    image: null,
  },
]
