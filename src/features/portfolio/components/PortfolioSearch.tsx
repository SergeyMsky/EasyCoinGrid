import { Search } from 'lucide-react'

type PortfolioSearchProps = {
  value: string
  onChange: (value: string) => void
}

export function PortfolioSearch({ value, onChange }: PortfolioSearchProps) {
  return (
    <div className="relative w-full max-w-3xs">
      <Search className="w-5 h-5 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 stroke-gray-500" />
      <input
        id="portfolio-search"
        name="portfolio-search"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search in Your Assets"
        className="text-sm px-4 py-2 pr-12 input"
      />
    </div>
  )
}
