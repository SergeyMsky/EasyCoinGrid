export type BinanceLedgerTransaction = {
  user_id: string
  source: 'BINANCE_SIMPLE_EARN' | 'BINANCE_CONVERT' | 'BINANCE_SPOT_TRADE'
  external_id: string
  group_id: string
  event_type: 'EARN_SUBSCRIPTION' | 'EARN_REDEMPTION' | 'EARN_REWARD' | 'CONVERT' | 'SPOT_TRADE' | 'SPOT_TRADE_FEE'
  direction: 'IN' | 'OUT'
  asset: string
  related_asset: string | null
  amount: string
  fee_amount: string
  fee_asset: string | null
  occurred_at: string
  status: string
  network: null
  transaction_id: string | null
  source_wallet: string
  target_wallet: string
  updated_at: string
}

export type EarnRecordKind =
  'FLEXIBLE_SUBSCRIPTION' | 'FLEXIBLE_REDEMPTION' | 'FLEXIBLE_REWARD' | 'LOCKED_SUBSCRIPTION' | 'LOCKED_REDEMPTION' | 'LOCKED_REWARD'

export type BinanceSpotTradePair = {
  symbol: string
  baseAsset: string
  quoteAsset: string
}

export const BINANCE_EARN_HISTORY_ENDPOINTS = [
  { kind: 'FLEXIBLE_SUBSCRIPTION', path: '/sapi/v1/simple-earn/flexible/history/subscriptionRecord' },
  { kind: 'FLEXIBLE_REDEMPTION', path: '/sapi/v1/simple-earn/flexible/history/redemptionRecord' },
  { kind: 'FLEXIBLE_REWARD', path: '/sapi/v1/simple-earn/flexible/history/rewardsRecord', queryParams: { type: 'ALL' } },
  { kind: 'LOCKED_SUBSCRIPTION', path: '/sapi/v1/simple-earn/locked/history/subscriptionRecord' },
  { kind: 'LOCKED_REDEMPTION', path: '/sapi/v1/simple-earn/locked/history/redemptionRecord' },
  { kind: 'LOCKED_REWARD', path: '/sapi/v1/simple-earn/locked/history/rewardsRecord' },
] as const satisfies ReadonlyArray<{ kind: EarnRecordKind; path: string; queryParams?: Readonly<Record<string, string>> }>

export function getBinanceHttpError(status: number, responseBody: string) {
  let detail = ''

  try {
    const parsed: unknown = JSON.parse(responseBody)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const payload = parsed as { code?: unknown; msg?: unknown; message?: unknown }
      const message = payload.msg ?? payload.message
      const code = payload.code
      if (typeof message === 'string' && message.trim()) {
        detail = `${typeof code === 'number' || typeof code === 'string' ? `[${code}] ` : ''}${message.trim()}`
      }
    }
  } catch {
    detail = ''
  }

  if (!detail && responseBody.trim()) {
    detail = responseBody.trim().replace(/\s+/g, ' ').slice(0, 300)
  }

  return `Binance rejected an asset history request (HTTP ${status})${detail ? `: ${detail}` : '.'}`
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`Binance returned an invalid ${label}.`)
  }

  const result = String(value).trim()
  if (!result) throw new Error(`Binance returned an invalid ${label}.`)

  return result
}

function requiredAsset(value: unknown) {
  const asset = requiredString(value, 'asset').toUpperCase()
  if (!/^[A-Z0-9]{1,20}$/.test(asset)) throw new Error('Binance returned an invalid asset.')
  return asset
}

function requiredAmount(value: unknown, label: string, allowZero = false) {
  const amount = requiredString(value, label)
  const parsed = Number(amount)
  if (!/^\d+(?:\.\d+)?$/.test(amount) || !Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw new Error(`Binance returned an invalid ${label}.`)
  }

  return amount
}

function multiplyAmounts(leftValue: unknown, rightValue: unknown, label: string) {
  const left = requiredAmount(leftValue, label)
  const right = requiredAmount(rightValue, label)
  const toParts = (amount: string) => {
    const [whole, fraction = ''] = amount.split('.')
    return { value: BigInt(`${whole}${fraction}`), scale: fraction.length }
  }
  const leftParts = toParts(left)
  const rightParts = toParts(right)
  const product = (leftParts.value * rightParts.value).toString()
  const scale = leftParts.scale + rightParts.scale

  if (scale === 0) return product

  const padded = product.padStart(scale + 1, '0')
  const whole = padded.slice(0, -scale)
  const fraction = padded.slice(-scale).replace(/0+$/, '')

  return fraction ? `${whole}.${fraction}` : whole
}

function requiredTime(value: unknown, label: string) {
  const timestamp = typeof value === 'number' ? value : Date.parse(String(value))
  if (!Number.isFinite(timestamp) || timestamp <= 0) throw new Error(`Binance returned an invalid ${label}.`)
  return new Date(timestamp).toISOString()
}

function optionalStatus(record: Record<string, unknown>, fallback: string) {
  const status = record.status ?? record.orderStatus ?? record.type ?? record.rewardType
  return typeof status === 'string' && status.trim() ? status.trim().toUpperCase() : fallback
}

function firstPresent(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') return record[key]
  }

  return undefined
}

export function normalizeEarnRecord(userId: string, kind: EarnRecordKind, record: Record<string, unknown>): BinanceLedgerTransaction {
  const isLocked = kind.startsWith('LOCKED_')
  const product = isLocked ? 'LOCKED' : 'FLEXIBLE'
  const isSubscription = kind.endsWith('SUBSCRIPTION')
  const isRedemption = kind.endsWith('REDEMPTION')
  const eventType = isSubscription ? 'EARN_SUBSCRIPTION' : isRedemption ? 'EARN_REDEMPTION' : 'EARN_REWARD'
  const direction = isSubscription ? 'OUT' : 'IN'
  const asset = requiredAsset(firstPresent(record, ['asset', 'coin', 'rewardAsset']))
  const amount = requiredAmount(firstPresent(record, ['amount', 'redeemAmount', 'purchaseAmount', 'rewardAmount', 'rewards']), 'Earn amount')
  const occurredAt = requiredTime(firstPresent(record, ['purchaseTime', 'redeemTime', 'time', 'createTime', 'eventTime']), 'Earn transaction time')
  const rawId = isSubscription
    ? firstPresent(record, ['purchaseId', 'id'])
    : isRedemption
      ? firstPresent(record, ['redeemId', 'id'])
      : firstPresent(record, ['rewardId', 'id', 'tranId'])
  const positionId = firstPresent(record, ['positionId'])
  const rewardType = isSubscription || isRedemption ? undefined : firstPresent(record, ['type', 'rewardType'])
  const projectId = isSubscription || isRedemption ? undefined : firstPresent(record, ['projectId'])
  const id =
    rawId === undefined
      ? `${positionId === undefined ? '' : `${requiredString(positionId, 'Earn position ID')}:`}${asset}:${amount}:${occurredAt}${projectId === undefined ? '' : `:${requiredString(projectId, 'Earn project ID')}`}${rewardType === undefined ? '' : `:${requiredString(rewardType, 'Earn reward type')}`}`
      : requiredString(rawId, 'Earn record ID')
  const wallet = `SIMPLE_EARN_${product}`

  return {
    user_id: userId,
    source: 'BINANCE_SIMPLE_EARN',
    external_id: `${kind}:${id}`,
    group_id: id,
    event_type: eventType,
    direction,
    asset,
    related_asset: null,
    amount,
    fee_amount: '0',
    fee_asset: null,
    occurred_at: occurredAt,
    status: optionalStatus(record, 'COMPLETED'),
    network: null,
    transaction_id: null,
    source_wallet: direction === 'OUT' ? 'SPOT' : wallet,
    target_wallet: direction === 'OUT' ? wallet : 'SPOT',
    updated_at: new Date().toISOString(),
  }
}

export function normalizeSpotTradeRecord(userId: string, record: Record<string, unknown>, pair: BinanceSpotTradePair): BinanceLedgerTransaction[] {
  const id = requiredString(record.id, 'Spot trade ID')
  const orderId = requiredString(record.orderId, 'Spot order ID')
  const price = requiredAmount(record.price, 'Spot trade price')
  const baseAmount = requiredAmount(record.qty, 'Spot trade quantity')
  const quoteAmount = multiplyAmounts(price, baseAmount, 'Spot trade')
  const commission = requiredAmount(record.commission, 'Spot trade commission', true)
  const time = requiredTime(record.time, 'Spot trade time')

  if (typeof record.isBuyer !== 'boolean') throw new Error('Binance returned an invalid Spot trade side.')

  const baseAsset = requiredAsset(pair.baseAsset)
  const quoteAsset = requiredAsset(pair.quoteAsset)
  const groupId = `${pair.symbol}:${id}`
  if (record.symbol !== undefined && record.symbol !== pair.symbol) throw new Error('Binance returned a Spot trade for the wrong symbol.')
  const common = {
    user_id: userId,
    source: 'BINANCE_SPOT_TRADE' as const,
    group_id: groupId,
    event_type: 'SPOT_TRADE' as const,
    occurred_at: time,
    status: 'COMPLETED',
    network: null,
    transaction_id: orderId,
    source_wallet: 'SPOT',
    target_wallet: 'SPOT',
    updated_at: new Date().toISOString(),
  }
  const baseLeg: BinanceLedgerTransaction = {
    ...common,
    external_id: `${groupId}:BASE`,
    direction: record.isBuyer ? 'IN' : 'OUT',
    asset: baseAsset,
    related_asset: quoteAsset,
    amount: baseAmount,
    fee_amount: '0',
    fee_asset: null,
  }
  const quoteLeg: BinanceLedgerTransaction = {
    ...common,
    external_id: `${groupId}:QUOTE`,
    direction: record.isBuyer ? 'OUT' : 'IN',
    asset: quoteAsset,
    related_asset: baseAsset,
    amount: quoteAmount,
    fee_amount: '0',
    fee_asset: null,
  }
  const transactions = [baseLeg, quoteLeg]

  if (commission.replace(/[.0]/g, '')) {
    const feeAsset = requiredAsset(record.commissionAsset)
    transactions.push({
      ...common,
      external_id: `${groupId}:FEE`,
      event_type: 'SPOT_TRADE_FEE',
      direction: 'OUT',
      asset: feeAsset,
      related_asset: null,
      amount: commission,
      fee_amount: '0',
      fee_asset: null,
    })
  }

  return transactions
}

export function normalizeConvertRecord(userId: string, record: Record<string, unknown>): BinanceLedgerTransaction[] {
  const fromAsset = requiredAsset(record.fromAsset)
  const toAsset = requiredAsset(record.toAsset)
  const fromAmount = requiredAmount(record.fromAmount, 'Convert input amount')
  const toAmount = requiredAmount(record.toAmount, 'Convert output amount')
  const occurredAt = requiredTime(firstPresent(record, ['createTime', 'orderTime', 'time']), 'Convert trade time')
  const rawId = firstPresent(record, ['orderId', 'quoteId', 'id'])
  const id = rawId === undefined ? `${occurredAt}:${fromAsset}:${fromAmount}:${toAsset}:${toAmount}` : requiredString(rawId, 'Convert trade ID')
  const feeRaw = firstPresent(record, ['fee', 'feeAmount'])
  const feeAmount = feeRaw === undefined ? '0' : requiredAmount(feeRaw, 'Convert fee', true)
  const feeAssetRaw = firstPresent(record, ['feeAsset', 'feeCoin'])
  const feeAsset = feeAmount === '0' ? null : requiredAsset(feeAssetRaw)
  const common = {
    user_id: userId,
    source: 'BINANCE_CONVERT' as const,
    group_id: id,
    event_type: 'CONVERT' as const,
    occurred_at: occurredAt,
    status: optionalStatus(record, 'COMPLETED'),
    network: null,
    updated_at: new Date().toISOString(),
  }

  return [
    {
      ...common,
      external_id: `${id}:OUT`,
      direction: 'OUT',
      asset: fromAsset,
      related_asset: toAsset,
      amount: fromAmount,
      fee_amount: feeAmount,
      fee_asset: feeAsset,
      transaction_id: id,
      source_wallet: 'SPOT',
      target_wallet: 'CONVERT',
    },
    {
      ...common,
      external_id: `${id}:IN`,
      direction: 'IN',
      asset: toAsset,
      related_asset: fromAsset,
      amount: toAmount,
      fee_amount: '0',
      fee_asset: null,
      transaction_id: id,
      source_wallet: 'CONVERT',
      target_wallet: 'SPOT',
    },
  ]
}

export function getBinanceHistoryRows(response: unknown, label: string): Record<string, unknown>[] {
  if (Array.isArray(response)) {
    return response.map((row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Binance returned an invalid ${label} record.`)
      }

      return row as Record<string, unknown>
    })
  }
  if (!response || typeof response !== 'object') {
    throw new Error(`Binance returned an invalid ${label} response.`)
  }

  const payload = response as { rows?: unknown; list?: unknown; total?: unknown }
  const rows = payload.rows ?? payload.list
  if (rows === undefined || rows === null) {
    if (payload.total === 0) return []
    throw new Error(`Binance returned an invalid ${label} response.`)
  }
  if (!Array.isArray(rows)) throw new Error(`Binance returned an invalid ${label} response.`)

  return rows.map((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Binance returned an invalid ${label} record.`)
    }

    return row as Record<string, unknown>
  })
}
