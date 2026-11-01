import { useState } from 'react'
import { ArrowUpRight, History } from 'lucide-react'
import type { Asset, CloseRotationInput, CreateSpotRotationInput, Currency, SpotRotation } from '@/features/portfolio/portfolio.types'
import { ActiveRotationsTable } from '@/features/portfolio/components/ActiveRotationsTable'
import { ClosedRotationsTable } from '@/features/portfolio/components/ClosedRotationsTable'
import { Skeleton } from '@/shared/components/Skeleton'

type RotationView = 'open' | 'closed'

type RotationViewsProps = {
  openRotations: SpotRotation[]
  closedRotations: SpotRotation[]
  assetMetadata: Record<string, Pick<Asset, 'name' | 'image'>>
  currency: Currency
  currencyRate: number
  loading: boolean
  onCreateRotation: (input: CreateSpotRotationInput) => void | Promise<void>
  onCloseRotation: (rotation: SpotRotation, input: CloseRotationInput) => void | Promise<void>
}

function RotationTableSkeleton({ activeTab, currency }: { activeTab: RotationView; currency: Currency }) {
  const isOpen = activeTab === 'open'
  const columns = isOpen
    ? ['Symbol', 'Buy execution', `Buy price (${currency})`, 'Remaining quantity', `Buy fee (${currency})`, 'Action']
    : [
        'Symbol',
        'Buy execution',
        `Buy price (${currency})`,
        'Sell execution',
        `Sell price (${currency})`,
        'Quantity',
        `Realized PnL (${currency})`,
        'Realized PnL (%)',
      ]
  const columnWidths = isOpen
    ? ['w-[20%]', 'w-[16%]', 'w-[16%]', 'w-[16%]', 'w-[16%]', 'w-[16%]']
    : ['w-[18%]', 'w-[16%]', 'w-[9%]', 'w-[16%]', 'w-[9%]', 'w-[9%]', 'w-[12%]', 'w-[11%]']

  return (
    <section className="ui-surface mt-4 overflow-hidden" aria-busy="true">
      <div className="flex min-h-13.75 items-center justify-between border-b border-outline px-4 py-2">
        <h2 className="text-sm font-semibold">{isOpen ? 'Open rotations' : 'Closed history'}</h2>
        {isOpen && <Skeleton className="h-9.5 w-28.75" />}
      </div>
      <div className="overflow-x-auto">
        <table
          className={`w-full ${isOpen ? 'min-w-225' : 'min-w-275'} table-fixed text-left`}
          aria-label={`Loading ${isOpen ? 'open' : 'closed'} rotations`}>
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={index} className={width} />
            ))}
          </colgroup>
          <thead className="label border-b border-outline bg-surface-raised normal-case">
            <tr>
              {columns.map((column, index) => (
                <th key={column} className={`px-3 py-2 ${(isOpen ? index >= 2 : index === 2 || index >= 4) ? 'text-right' : ''}`} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-t border-outline">
                {columns.map((column, columnIndex) => (
                  <td
                    key={column}
                    className={`h-19.25 px-3 py-2 ${(isOpen ? columnIndex >= 2 : columnIndex === 2 || columnIndex >= 4) ? 'text-right' : ''}`}>
                    <Skeleton
                      className={`ml-auto h-5 ${
                        columnIndex === 0
                          ? 'mr-auto ml-0! w-20'
                          : column.includes('execution')
                            ? 'mr-auto ml-0! h-5 w-32'
                            : columnIndex === columns.length - 1 && isOpen
                              ? 'h-4! w-24'
                              : 'w-20'
                      }`}
                    />
                    {column.includes('execution') && (
                      <div className="mt-1 space-y-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function RotationViews({
  openRotations,
  closedRotations,
  assetMetadata,
  currency,
  currencyRate,
  loading,
  onCreateRotation,
  onCloseRotation,
}: RotationViewsProps) {
  const [activeTab, setActiveTab] = useState<RotationView>('open')

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4 border-b border-outline">
        <div role="tablist" aria-label="Spot rotation views" className="flex gap-6">
          <button
            type="button"
            role="tab"
            id="open-rotations-tab"
            aria-selected={activeTab === 'open'}
            aria-controls="open-rotations-panel"
            aria-label={`Open orders ${openRotations.length}`}
            onClick={() => setActiveTab('open')}
            className={`-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 pb-3 text-sm transition ${
              activeTab === 'open' ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'
            }`}>
            <ArrowUpRight className={`h-4 w-4 ${activeTab === 'open' ? 'text-accent' : 'text-muted'}`} aria-hidden="true" />
            Open orders
            <span className={activeTab === 'open' ? 'text-accent' : 'text-muted'}>{openRotations.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            id="closed-rotations-tab"
            aria-selected={activeTab === 'closed'}
            aria-controls="closed-rotations-panel"
            aria-label={`Closed trades ${closedRotations.length}`}
            onClick={() => setActiveTab('closed')}
            className={`-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 pb-3 text-sm transition ${
              activeTab === 'closed' ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'
            }`}>
            <History className={`h-4 w-4 ${activeTab === 'closed' ? 'text-accent' : 'text-muted'}`} aria-hidden="true" />
            Closed trades
            <span className={activeTab === 'closed' ? 'text-accent' : 'text-muted'}>{closedRotations.length}</span>
          </button>
        </div>
        <span className="hidden pb-3 text-xs text-muted sm:inline">All amounts in {currency}</span>
      </div>
      <div
        role="tabpanel"
        id={activeTab === 'open' ? 'open-rotations-panel' : 'closed-rotations-panel'}
        aria-labelledby={activeTab === 'open' ? 'open-rotations-tab' : 'closed-rotations-tab'}
        aria-busy={loading}
        tabIndex={0}>
        {loading ? (
          <RotationTableSkeleton activeTab={activeTab} currency={currency} />
        ) : activeTab === 'open' ? (
          <div id="open-rotations">
            <ActiveRotationsTable
              rotations={openRotations}
              assetMetadata={assetMetadata}
              currency={currency}
              currencyRate={currencyRate}
              onCreateRotation={onCreateRotation}
              onCloseRotation={onCloseRotation}
            />
          </div>
        ) : (
          <div id="rotation-history">
            <ClosedRotationsTable rotations={closedRotations} assetMetadata={assetMetadata} currency={currency} currencyRate={currencyRate} />
          </div>
        )}
      </div>
    </section>
  )
}
