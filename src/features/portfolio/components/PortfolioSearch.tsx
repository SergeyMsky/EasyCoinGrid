import { Search } from 'lucide-react'

type PortfolioSearchProps = {
  value: string
  onChange: (value: string) => void
}

export function PortfolioSearch({ value, onChange }: PortfolioSearchProps) {
  return (
    <div className="relative w-full max-w-3xs">
      <Search className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 stroke-muted" />
      <input
        id="portfolio-search"
        name="portfolio-search"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search in Your Assets"
        className="input px-4 py-2 pr-12 text-sm"
      />
    </div>
  )
}
