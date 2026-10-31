const QUOTE_ASSETS = ['USDT', 'USDC', 'FDUSD', 'TUSD', 'USDP', 'DAI', 'BUSD']

export function getSpotRotationBaseAsset(symbol: string): string {
  const normalizedSymbol = symbol.trim().toUpperCase()
  const quoteAsset = QUOTE_ASSETS.find((quote) => normalizedSymbol.endsWith(quote) && normalizedSymbol.length > quote.length)

  return quoteAsset ? normalizedSymbol.slice(0, -quoteAsset.length) : normalizedSymbol
}
