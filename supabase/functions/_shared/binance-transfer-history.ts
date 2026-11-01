export function getBinanceTransferRows(response: unknown, transferType: string, currentPage: number, pageSize: number): Record<string, unknown>[] {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error(`Binance returned an invalid transfer history response for ${transferType}.`)
  }

  const { rows, total } = response as { rows?: unknown; total?: unknown }
  if (rows === undefined || rows === null) {
    if (total === 0 || (typeof total === 'number' && currentPage > Math.ceil(total / pageSize))) return []
    throw new Error(`Binance returned an invalid transfer history response for ${transferType}.`)
  }
  if (!Array.isArray(rows)) {
    throw new Error(`Binance returned an invalid transfer history response for ${transferType}.`)
  }

  return rows.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Binance returned an invalid transfer record for ${transferType}.`)
    }

    return row as Record<string, unknown>
  })
}
