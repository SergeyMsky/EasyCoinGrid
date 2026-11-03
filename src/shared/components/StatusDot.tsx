import { twMerge } from 'tailwind-merge'

type StatusDotProps = {
  className?: string
}

export function StatusDot({ className = '' }: StatusDotProps) {
  return (
    <span aria-hidden="true" className={twMerge('inline-flex size-3.5 shrink-0 items-center justify-center rounded-full bg-profit/20', className)}>
      <span className="size-1.5 rounded-full bg-profit" />
    </span>
  )
}
