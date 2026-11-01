import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  BINANCE_EARN_HISTORY_ENDPOINTS,
  getBinanceHistoryRows,
  getBinanceHttpError,
  normalizeConvertRecord,
  normalizeEarnRecord,
  normalizeSpotTradeRecord,
  type BinanceSpotTradePair,
  type BinanceLedgerTransaction,
} from '../_shared/binance-additional-history.ts'
import { getBinanceTransferRows } from '../_shared/binance-transfer-history.ts'
import { BINANCE_TRANSFER_TYPES } from '../_shared/binance-transfer-types.ts'
import { corsHeaders } from '../_shared/cors.ts'

const responseHeaders = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
const PAGE_LIMIT = 1000
const MAX_PAGES = 100
const MAX_SPOT_TRADE_PAGES = 1000
const EARN_PAGE_SIZE = 100
const CONVERT_PAGE_SIZE = 1000
const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const HISTORY_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000

type AssetTransaction = {
  user_id: string
  source: 'BINANCE_DEPOSIT' | 'BINANCE_WITHDRAWAL' | 'BINANCE_TRANSFER' | 'BINANCE_SIMPLE_EARN' | 'BINANCE_CONVERT' | 'BINANCE_SPOT_TRADE'
  external_id: string
  group_id: string
  event_type:
    'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'EARN_SUBSCRIPTION' | 'EARN_REDEMPTION' | 'EARN_REWARD' | 'CONVERT' | 'SPOT_TRADE' | 'SPOT_TRADE_FEE'
  direction: 'IN' | 'OUT' | 'INTERNAL'
  asset: string
  related_asset: string | null
  amount: string
  fee_amount: string
  fee_asset: string | null
  occurred_at: string
  status: string
  network: string | null
  transaction_id: string | null
  source_wallet: string | null
  target_wallet: string | null
  updated_at: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: responseHeaders })
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function parseEncryptedValue(value: string) {
  const [iv, encrypted] = value.split('.')

  if (!iv || !encrypted) throw new Error('Invalid encrypted credential format.')

  return { iv: fromBase64(iv), encrypted: fromBase64(encrypted) }
}

async function decrypt(value: string, encryptionKey: string) {
  const key = await crypto.subtle.importKey('raw', fromBase64(encryptionKey), { name: 'AES-GCM' }, false, ['decrypt'])
  const { iv, encrypted } = parseEncryptedValue(value)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)

  return new TextDecoder().decode(decrypted)
}

async function createBinanceSignature(query: string, apiSecret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(query))

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function signedBinanceGet(path: string, params: URLSearchParams, apiKey: string, apiSecret: string) {
  params.set('timestamp', Date.now().toString())
  params.set('recvWindow', '5000')
  const query = params.toString()
  const signature = await createBinanceSignature(query, apiSecret)
  const response = await fetch(`https://api.binance.com${path}?${query}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  })
  const responseBody = await response.text()
  let result: unknown

  try {
    result = JSON.parse(responseBody)
  } catch {
    if (!response.ok) throw new Error(getBinanceHttpError(response.status, responseBody))
    throw new Error(`Binance returned a non-JSON response for ${path}.`)
  }

  if (!response.ok) {
    throw new Error(getBinanceHttpError(response.status, responseBody))
  }

  return result
}

function numericValue(value: unknown, label: string, allowZero = false) {
  const raw = String(value)
  const parsed = Number(value)

  if (!/^\d+(?:\.\d+)?$/.test(raw) || !Number.isFinite(parsed) || (allowZero ? parsed < 0 : parsed <= 0)) {
    throw new Error(`Binance returned an invalid ${label}.`)
  }

  return raw
}

function createTransaction(userId: string, values: Omit<AssetTransaction, 'user_id' | 'updated_at'>): AssetTransaction {
  return {
    ...values,
    user_id: userId,
    updated_at: new Date().toISOString(),
  }
}

async function fetchPagedArray(path: string, baseParams: Record<string, string>, apiKey: string, apiSecret: string) {
  const results: Record<string, unknown>[] = []

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ ...baseParams, offset: String(page * PAGE_LIMIT), limit: String(PAGE_LIMIT) })
    const result = await signedBinanceGet(path, params, apiKey, apiSecret)

    if (!Array.isArray(result)) throw new Error('Binance returned an invalid asset history response.')
    results.push(...(result as Record<string, unknown>[]))
    if (result.length < PAGE_LIMIT) return results
  }

  throw new Error('Binance asset history exceeded the supported pagination limit.')
}

function requireTimestamp(value: unknown, label: string) {
  const timestamp = typeof value === 'number' ? value : Date.parse(String(value))

  if (!Number.isFinite(timestamp) || timestamp <= 0) throw new Error(`Binance returned an invalid ${label}.`)

  return new Date(timestamp).toISOString()
}

async function loadDeposits(userId: string, apiKey: string, apiSecret: string) {
  const deposits = await fetchPagedArray('/sapi/v1/capital/deposit/hisrec', {}, apiKey, apiSecret)

  return deposits.map((deposit) => {
    const id = String(deposit.id ?? '')
    const asset = String(deposit.coin ?? '')
      .trim()
      .toUpperCase()

    if (!id || !/^[A-Z0-9]{1,20}$/.test(asset)) throw new Error('Binance returned an invalid deposit record.')

    return createTransaction(userId, {
      source: 'BINANCE_DEPOSIT',
      external_id: id,
      group_id: id,
      event_type: 'DEPOSIT',
      direction: 'IN',
      asset,
      related_asset: null,
      amount: numericValue(deposit.amount, 'deposit amount'),
      fee_amount: '0',
      fee_asset: null,
      occurred_at: requireTimestamp(deposit.insertTime, 'deposit time'),
      status: String(deposit.status ?? 'UNKNOWN'),
      network: typeof deposit.network === 'string' ? deposit.network : null,
      transaction_id: typeof deposit.txId === 'string' && deposit.txId ? deposit.txId : null,
      source_wallet: null,
      target_wallet: typeof deposit.walletType === 'number' ? String(deposit.walletType) : null,
    })
  })
}

async function loadWithdrawals(userId: string, apiKey: string, apiSecret: string) {
  const withdrawals = await fetchPagedArray('/sapi/v1/capital/withdraw/history', {}, apiKey, apiSecret)

  return withdrawals.map((withdrawal) => {
    const id = String(withdrawal.id ?? '')
    const asset = String(withdrawal.coin ?? '')
      .trim()
      .toUpperCase()
    const feeAmount = numericValue(withdrawal.transactionFee ?? 0, 'withdrawal fee', true)

    if (!id || !/^[A-Z0-9]{1,20}$/.test(asset)) throw new Error('Binance returned an invalid withdrawal record.')

    return createTransaction(userId, {
      source: 'BINANCE_WITHDRAWAL',
      external_id: id,
      group_id: id,
      event_type: 'WITHDRAWAL',
      direction: 'OUT',
      asset,
      related_asset: null,
      amount: numericValue(withdrawal.amount, 'withdrawal amount'),
      fee_amount: feeAmount,
      fee_asset: Number(feeAmount) > 0 ? asset : null,
      occurred_at: requireTimestamp(withdrawal.applyTime, 'withdrawal time'),
      status: String(withdrawal.status ?? 'UNKNOWN'),
      network: typeof withdrawal.network === 'string' ? withdrawal.network : null,
      transaction_id: typeof withdrawal.txId === 'string' && withdrawal.txId ? withdrawal.txId : null,
      source_wallet: typeof withdrawal.walletType === 'number' ? String(withdrawal.walletType) : 'SPOT',
      target_wallet: null,
    })
  })
}

async function loadTransfers(userId: string, apiKey: string, apiSecret: string) {
  const transactions: AssetTransaction[] = []

  for (const { type: transferType, source, target } of BINANCE_TRANSFER_TYPES) {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const params = new URLSearchParams({ type: transferType, current: String(page), size: '100' })
      let result: unknown

      try {
        result = await signedBinanceGet('/sapi/v1/asset/transfer', params, apiKey, apiSecret)
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown Binance error.'
        throw new Error(`Binance transfer history request failed for ${transferType}: ${detail}`, { cause: error })
      }

      const rows = getBinanceTransferRows(result, transferType, page, 100)
      if (rows.length === 0) break

      for (const transfer of rows) {
        const id = String(transfer.tranId ?? '')
        const asset = String(transfer.asset ?? '')
          .trim()
          .toUpperCase()
        if (!id || !/^[A-Z0-9]{1,20}$/.test(asset)) throw new Error('Binance returned an invalid transfer record.')

        transactions.push(
          createTransaction(userId, {
            source: 'BINANCE_TRANSFER',
            external_id: `${transferType}:${id}`,
            group_id: id,
            event_type: 'TRANSFER',
            direction: 'INTERNAL',
            asset,
            related_asset: null,
            amount: numericValue(transfer.amount, 'transfer amount'),
            fee_amount: '0',
            fee_asset: null,
            occurred_at: requireTimestamp(transfer.timestamp, 'transfer time'),
            status: String(transfer.status ?? 'UNKNOWN'),
            network: null,
            transaction_id: id,
            source_wallet: source,
            target_wallet: target,
          }),
        )
      }

      if (rows.length < 100) break
      if (page === MAX_PAGES) throw new Error(`Binance transfer history exceeded the supported pagination limit for ${transferType}.`)
    }
  }

  return transactions
}

function getHistoryWindows(startTime: number, endTime: number) {
  const windows: Array<{ startTime: number; endTime: number }> = []

  for (let windowStart = startTime; windowStart <= endTime; windowStart += HISTORY_WINDOW_MS) {
    windows.push({
      startTime: windowStart,
      endTime: Math.min(endTime, windowStart + HISTORY_WINDOW_MS - 1),
    })
  }

  return windows
}

async function loadSimpleEarnHistory(userId: string, apiKey: string, apiSecret: string, startTime: number, endTime: number) {
  const transactions: BinanceLedgerTransaction[] = []

  for (const { kind, path, queryParams = {} } of BINANCE_EARN_HISTORY_ENDPOINTS) {
    for (const window of getHistoryWindows(startTime, endTime)) {
      for (let current = 1; current <= MAX_PAGES; current += 1) {
        const params = new URLSearchParams({
          ...queryParams,
          startTime: String(window.startTime),
          endTime: String(window.endTime),
          current: String(current),
          size: String(EARN_PAGE_SIZE),
        })
        let response: unknown

        try {
          response = await signedBinanceGet(path, params, apiKey, apiSecret)
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Unknown Binance error.'
          throw new Error(`Binance ${kind.toLowerCase().replaceAll('_', ' ')} history request failed: ${detail}`, { cause: error })
        }

        const rows = getBinanceHistoryRows(response, `${kind.toLowerCase().replaceAll('_', ' ')} history`)
        transactions.push(...rows.map((row) => normalizeEarnRecord(userId, kind, row)))
        if (rows.length < EARN_PAGE_SIZE) break
        if (current === MAX_PAGES) throw new Error(`Binance ${kind.toLowerCase().replaceAll('_', ' ')} history exceeded the pagination limit.`)
      }
    }
  }

  return transactions
}

async function loadConvertHistory(userId: string, apiKey: string, apiSecret: string, startTime: number, endTime: number) {
  const transactions: BinanceLedgerTransaction[] = []
  let tradeCount = 0

  async function loadWindow(windowStart: number, windowEnd: number, depth = 0): Promise<void> {
    const params = new URLSearchParams({
      startTime: String(windowStart),
      endTime: String(windowEnd),
      limit: String(CONVERT_PAGE_SIZE),
    })
    let response: unknown

    try {
      response = await signedBinanceGet('/sapi/v1/convert/tradeFlow', params, apiKey, apiSecret)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown Binance error.'
      throw new Error(`Binance Convert history request failed: ${detail}`, { cause: error })
    }

    const rows = getBinanceHistoryRows(response, 'Convert history')
    if (rows.length === CONVERT_PAGE_SIZE) {
      if (windowEnd - windowStart <= 1 || depth >= 32) {
        throw new Error('Binance Convert history contains too many trades in the smallest supported time range.')
      }

      const midpoint = Math.floor((windowStart + windowEnd) / 2)
      await loadWindow(windowStart, midpoint, depth + 1)
      await loadWindow(midpoint + 1, windowEnd, depth + 1)
      return
    }

    tradeCount += rows.length
    transactions.push(...rows.flatMap((row) => normalizeConvertRecord(userId, row)))
  }

  for (const window of getHistoryWindows(startTime, endTime)) {
    await loadWindow(window.startTime, window.endTime)
  }

  return { transactions, tradeCount }
}

async function loadSpotTradeHistory(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  apiKey: string,
  apiSecret: string,
  assets: string[],
) {
  const { data: existingRotations, error: rotationsError } = await supabaseAdmin
    .from('spot_rotations')
    .select('symbol')
    .eq('user_id', userId)
    .eq('match_type', 'AUTO_API')

  if (rotationsError) throw rotationsError

  const supportedQuoteAssets = new Set(['USDT', 'USDC', 'FDUSD', 'TUSD', 'USDP', 'DAI'])
  const assetSet = new Set(assets)
  const pairsBySymbol = new Map<string, BinanceSpotTradePair>()
  const exchangeInfoResponse = await fetch('https://api.binance.com/api/v3/exchangeInfo')
  const exchangeInfo: unknown = await exchangeInfoResponse.json()

  if (
    !exchangeInfoResponse.ok ||
    !exchangeInfo ||
    typeof exchangeInfo !== 'object' ||
    !Array.isArray((exchangeInfo as { symbols?: unknown }).symbols)
  ) {
    throw new Error('Unable to load Binance Spot symbols for asset history.')
  }

  for (const value of (exchangeInfo as { symbols: unknown[] }).symbols) {
    if (!value || typeof value !== 'object') continue
    const symbol = value as { status?: unknown; isSpotTradingAllowed?: unknown; baseAsset?: unknown; quoteAsset?: unknown; symbol?: unknown }
    if (
      symbol.status === 'TRADING' &&
      symbol.isSpotTradingAllowed === true &&
      typeof symbol.baseAsset === 'string' &&
      typeof symbol.quoteAsset === 'string' &&
      typeof symbol.symbol === 'string' &&
      assetSet.has(symbol.baseAsset) &&
      supportedQuoteAssets.has(symbol.quoteAsset)
    ) {
      pairsBySymbol.set(symbol.symbol, { symbol: symbol.symbol, baseAsset: symbol.baseAsset, quoteAsset: symbol.quoteAsset })
    }
  }

  for (const rotation of existingRotations ?? []) {
    const symbol = String(rotation.symbol).trim().toUpperCase()
    const quoteAsset = [...supportedQuoteAssets].find((quote) => symbol.endsWith(quote) && symbol.length > quote.length)
    if (!quoteAsset) continue
    const baseAsset = symbol.slice(0, -quoteAsset.length)
    pairsBySymbol.set(symbol, { symbol, baseAsset, quoteAsset })
  }

  const pairs = [...pairsBySymbol.values()].sort((left, right) => left.symbol.localeCompare(right.symbol))
  if (pairs.length > 100) {
    throw new Error(`Found ${pairs.length} eligible trading pairs; Spot history sync is limited to 100 pairs per run.`)
  }

  const transactions: BinanceLedgerTransaction[] = []
  let tradeCount = 0

  for (const pair of pairs) {
    let fromId = 0
    let pages = 0

    while (true) {
      if (pages >= MAX_SPOT_TRADE_PAGES) {
        throw new Error(`Binance Spot trade history for ${pair.symbol} exceeded the pagination limit.`)
      }

      const params = new URLSearchParams({ symbol: pair.symbol, fromId: String(fromId), limit: '1000' })
      let response: unknown

      try {
        response = await signedBinanceGet('/api/v3/myTrades', params, apiKey, apiSecret)
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown Binance error.'
        throw new Error(`Binance Spot trade history request failed for ${pair.symbol}: ${detail}`, { cause: error })
      }

      const rows = getBinanceHistoryRows(response, `${pair.symbol} Spot trade history`)
      transactions.push(...rows.flatMap((row) => normalizeSpotTradeRecord(userId, row, pair)))
      tradeCount += rows.length
      pages += 1

      if (rows.length < 1000) break
      const lastId = Number(rows[rows.length - 1].id)
      if (!Number.isSafeInteger(lastId) || lastId < 0 || lastId < fromId) {
        throw new Error(`Binance returned an invalid pagination cursor for ${pair.symbol} Spot trade history.`)
      }
      fromId = lastId + 1
    }
  }

  return { transactions, tradeCount }
}

async function upsertTransactions(supabaseAdmin: ReturnType<typeof createClient>, transactions: Array<AssetTransaction | BinanceLedgerTransaction>) {
  for (let offset = 0; offset < transactions.length; offset += 500) {
    const batch = transactions.slice(offset, offset + 500)
    const { error } = await supabaseAdmin.from('asset_transactions').upsert(batch, {
      onConflict: 'user_id,source,external_id',
    })

    if (error) throw error
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: responseHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) return json({ error: 'Unauthorized.' }, 401)

    const body = await request.json()
    if (!body || typeof body !== 'object' || !Array.isArray(body.assets) || body.assets.length > 100) {
      return json({ error: 'Provide up to 100 Binance Spot assets.' }, 400)
    }
    const assets = [...new Set(body.assets.map((asset: unknown) => String(asset).trim().toUpperCase()))]
    if (assets.some((asset) => !/^[A-Z0-9]{1,20}$/.test(asset))) return json({ error: 'Invalid Binance Spot asset.' }, 400)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const encryptionKey = Deno.env.get('BINANCE_ENCRYPTION_KEY')
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !encryptionKey) {
      throw new Error('Required environment variables are missing.')
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authorization } } })
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser()
    if (userError || !user) return json({ error: 'Unauthorized.' }, 401)

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('exchange_connections')
      .select('api_key_encrypted, api_secret_encrypted')
      .eq('user_id', user.id)
      .eq('exchange', 'binance')
      .eq('status', 'connected')
      .maybeSingle()
    if (connectionError) throw connectionError
    if (!connection) return json({ error: 'Binance is not connected.' }, 404)

    const apiKey = await decrypt(connection.api_key_encrypted, encryptionKey)
    const apiSecret = await decrypt(connection.api_secret_encrypted, encryptionKey)
    const endTime = Date.now()
    const startTime = endTime - HISTORY_LOOKBACK_MS
    const [deposits, withdrawals, transfers, simpleEarnTransactions, convertHistory, spotTradeHistory] = await Promise.all([
      loadDeposits(user.id, apiKey, apiSecret),
      loadWithdrawals(user.id, apiKey, apiSecret),
      loadTransfers(user.id, apiKey, apiSecret),
      loadSimpleEarnHistory(user.id, apiKey, apiSecret, startTime, endTime),
      loadConvertHistory(user.id, apiKey, apiSecret, startTime, endTime),
      loadSpotTradeHistory(supabaseAdmin, user.id, apiKey, apiSecret, assets),
    ])
    const transactions = [
      ...deposits,
      ...withdrawals,
      ...transfers,
      ...simpleEarnTransactions,
      ...convertHistory.transactions,
      ...spotTradeHistory.transactions,
    ]
    await upsertTransactions(supabaseAdmin, transactions)

    const range = transactions.reduce<{ oldest: number | null; newest: number | null }>(
      (current, transaction) => {
        const timestamp = Date.parse(transaction.occurred_at)
        return {
          oldest: current.oldest === null ? timestamp : Math.min(current.oldest, timestamp),
          newest: current.newest === null ? timestamp : Math.max(current.newest, timestamp),
        }
      },
      { oldest: null, newest: null },
    )

    return json({
      syncedAt: new Date().toISOString(),
      depositsImported: deposits.length,
      withdrawalsImported: withdrawals.length,
      transfersImported: transfers.length,
      simpleEarnRecordsImported: simpleEarnTransactions.length,
      convertTradesImported: convertHistory.tradeCount,
      spotTradesImported: spotTradeHistory.tradeCount,
      oldestTransactionTime: range.oldest,
      newestTransactionTime: range.newest,
    })
  } catch (error) {
    console.error('sync-binance-asset-history error:', error)
    return json({ error: error instanceof Error ? error.message : 'Unable to sync Binance asset history.' }, 500)
  }
})
