export const portfolioQueryKeys = {
  user: (userId: string) => ['user', userId, 'portfolio'] as const,
  portfolio: (userId: string) => [...portfolioQueryKeys.user(userId), 'balances'] as const,
  rotations: (userId: string) => [...portfolioQueryKeys.user(userId), 'rotations'] as const,
  rotationSyncStatus: (userId: string) => [...portfolioQueryKeys.user(userId), 'rotation-sync-status'] as const,
  rotationMetadata: (userId: string, assets: string[]) => [...portfolioQueryKeys.user(userId), 'coin-metadata', [...assets].sort()] as const,
  exchangeRates: (userId: string) => [...portfolioQueryKeys.user(userId), 'exchange-rates'] as const,
  history: (userId: string) => [...portfolioQueryKeys.user(userId), 'history'] as const,
  assetTransactions: (userId: string) => [...portfolioQueryKeys.user(userId), 'asset-transactions'] as const,
  binanceConnection: (userId: string) => [...portfolioQueryKeys.user(userId), 'binance-connection'] as const,
}
