type SortIndicatorProps = {
  active: boolean
  direction: 'asc' | 'desc'
}

export function SortIndicator({ active, direction }: SortIndicatorProps) {
  return (
    <span className="flex flex-col gap-1 text-xs" aria-hidden="true">
      <svg
        className={`w-1.5 ${active && direction === 'asc' ? 'text-accent' : 'text-muted'}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="6 8 12 6"
        fill="currentColor">
        <path d="M12 8L18 14H6L12 8Z" />
      </svg>
      <svg
        className={`w-1.5 ${active && direction === 'desc' ? 'text-accent' : 'text-muted'}`}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="6 10 12 6"
        fill="currentColor">
        <path d="M12 16L6 10H18L12 16Z" />
      </svg>
    </span>
  )
}
