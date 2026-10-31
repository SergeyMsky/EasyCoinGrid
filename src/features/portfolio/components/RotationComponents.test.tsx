import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SpotRotation } from '@/features/portfolio/portfolio.types'
import { CloseRotationModal } from './CloseRotationModal'
import { ClosedRotationsTable } from './ClosedRotationsTable'
import { CreateRotationModal } from './CreateRotationModal'

const rotation: SpotRotation = {
  id: 'rotation-1',
  user_id: 'user-1',
  symbol: 'BTCUSDT',
  buy_order_id: 'buy-1',
  buy_trade_id: 'buy-trade-1',
  buy_time: '2026-10-29T12:00:00.000Z',
  buy_price: 100,
  buy_qty: 2,
  status: 'OPEN',
  sell_order_id: null,
  sell_trade_id: null,
  sell_time: null,
  sell_price: null,
  sold_qty: 0,
  fee_amount: 2,
  realized_pnl_usd: null,
  realized_pnl_percent: null,
  match_type: 'MANUAL',
}

describe('spot rotation modals', () => {
  it('shows execution dates and trade/order IDs in closed rotation history', () => {
    render(
      <ClosedRotationsTable
        rotations={[
          {
            ...rotation,
            status: 'CLOSED',
            sell_order_id: 'sell-1',
            sell_trade_id: 'sell-trade-1',
            sell_time: '2026-10-29T13:00:00.000Z',
            sell_price: 110,
            sold_qty: 2,
            realized_pnl_usd: 18,
            realized_pnl_percent: 9,
          },
        ]}
        assetMetadata={{}}
        currency="USD"
        currencyRate={1}
      />,
    )

    expect(screen.getByText('Buy trade ID: buy-trade-1')).toBeInTheDocument()
    expect(screen.getByText('Buy order ID: buy-1')).toBeInTheDocument()
    expect(screen.getByText('Sell trade ID: sell-trade-1')).toBeInTheDocument()
    expect(screen.getByText('Sell order ID: sell-1')).toBeInTheDocument()
    expect(screen.getAllByText(/2026/)).toHaveLength(2)
    expect(screen.getAllByText(/29 Oct 2026/)).toHaveLength(2)
  })

  it('records a full close with the calculated net realized PnL', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<CloseRotationModal rotation={rotation} onCancel={vi.fn()} onClose={onClose} />)

    await user.type(screen.getByLabelText('Execution price (USD)'), '120')
    await user.type(screen.getByLabelText('Sell fee (USD)'), '1')
    await user.click(screen.getByRole('button', { name: 'Close 2 BTCUSDT' }))

    expect(onClose).toHaveBeenCalledWith({
      sellPrice: 120,
      soldQty: 2,
      sellFeeAmountUsd: 1,
      sellTradeId: undefined,
      sellTime: expect.any(String),
      realizedPnlUsd: 37,
      realizedPnlPercent: 18.5,
    })
  })

  it('creates a manual open rotation from the entered buy trade', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(<CreateRotationModal onCancel={vi.fn()} onCreate={onCreate} />)

    await user.type(screen.getByLabelText('Trading symbol'), 'ethusdt')
    await user.type(screen.getByLabelText('Buy price (USD)'), '3000')
    await user.type(screen.getByLabelText('Quantity'), '0.5')
    await user.type(screen.getByLabelText('Buy fee (USD)'), '0.75')
    await user.type(screen.getByLabelText('Buy order ID (optional)'), 'order-123')
    await user.type(screen.getByLabelText('Buy trade ID (optional)'), 'trade-456')
    await user.click(screen.getByRole('button', { name: 'Add rotation' }))

    expect(onCreate).toHaveBeenCalledWith({
      symbol: 'ETHUSDT',
      buyPrice: 3000,
      buyQty: 0.5,
      feeAmountUsd: 0.75,
      buyOrderId: 'order-123',
      buyTradeId: 'trade-456',
      buyTime: expect.any(String),
    })
  })
})
