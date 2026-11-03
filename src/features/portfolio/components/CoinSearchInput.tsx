import * as Popover from '@radix-ui/react-popover'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { searchCoinGeckoCoins, type CoinGeckoCoin } from '@/features/portfolio/api/coingecko.api'

type CoinSearchInputProps = {
  autoFocus?: boolean
  disabled?: boolean
  value: string
  selectedCoin: CoinGeckoCoin | null
  onValueChange: (value: string) => void
  onSelect: (coin: CoinGeckoCoin) => void
}

const COIN_SEARCH_STALE_TIME = 10 * 60 * 1000

export function CoinSearchInput({ autoFocus = false, disabled = false, value, selectedCoin, onValueChange, onSelect }: CoinSearchInputProps) {
  const [open, setOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const firstOptionRef = useRef<HTMLButtonElement>(null)
  const normalizedValue = value.trim()

  useEffect(() => {
    if (selectedCoin || normalizedValue.length < 2) return

    const timer = window.setTimeout(() => setDebouncedQuery(normalizedValue), 300)
    return () => window.clearTimeout(timer)
  }, [normalizedValue, selectedCoin])

  const searchQuery = !selectedCoin && normalizedValue.length >= 2 && debouncedQuery === normalizedValue ? debouncedQuery : ''
  const coinsQuery = useQuery({
    queryKey: ['coingecko', 'search', normalizedValue, searchQuery],
    queryFn: () => searchCoinGeckoCoins(searchQuery),
    enabled: open && searchQuery.length >= 2,
    staleTime: COIN_SEARCH_STALE_TIME,
    retry: false,
  })

  const displayValue = selectedCoin ? `${selectedCoin.name} (${selectedCoin.symbol})` : value

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onValueChange(event.target.value)
    setOpen(true)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && coinsQuery.data?.length) {
      event.preventDefault()
      firstOptionRef.current?.focus()
    }
    if (event.key === 'Escape') setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <input
          required
          autoFocus={autoFocus}
          autoComplete="off"
          disabled={disabled}
          value={displayValue}
          onFocus={() => {
            if (!selectedCoin) setOpen(true)
          }}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search Bitcoin or enter DOT/USDT"
          aria-label="Coin or trading pair"
          aria-autocomplete="list"
          aria-expanded={open && !selectedCoin}
          className="input mt-1 px-3 py-2"
        />
      </Popover.Anchor>
      {!selectedCoin && open && normalizedValue.length >= 2 && (
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={4}
            collisionPadding={12}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={() => setOpen(false)}
            className="ui-surface z-60 max-h-72 w-(--radix-popover-trigger-width) min-w-64 overflow-y-auto p-1">
            {coinsQuery.isFetching ? (
              <p className="px-3 py-2 text-sm text-muted" role="status">
                Searching coins…
              </p>
            ) : coinsQuery.error ? (
              <p className="px-3 py-2 text-sm text-error" role="alert">
                {coinsQuery.error instanceof Error ? coinsQuery.error.message : 'Unable to search coins.'}
              </p>
            ) : coinsQuery.data?.length ? (
              <div role="listbox" aria-label="Coin search results">
                {coinsQuery.data.map((coin, index) => (
                  <button
                    key={coin.id}
                    ref={index === 0 ? firstOptionRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onSelect(coin)
                      setOpen(false)
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-surface-raised">
                    <img
                      src={coin.image}
                      alt=""
                      loading="lazy"
                      className="h-7 w-7 rounded-full bg-surface object-cover"
                      onError={(event) => {
                        event.currentTarget.hidden = true
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{coin.name}</span>
                      <span className="block text-xs text-muted">{coin.symbol}</span>
                    </span>
                    {coin.rank > 0 && <span className="text-xs text-muted tabular-nums">#{coin.rank}</span>}
                  </button>
                ))}
              </div>
            ) : coinsQuery.isSuccess ? (
              <p className="px-3 py-2 text-sm text-muted">No coins found. You can enter a pair manually.</p>
            ) : (
              <p className="px-3 py-2 text-sm text-muted">Type to search the coin catalog.</p>
            )}
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  )
}
