import { twMerge } from 'tailwind-merge'

type SpinnerProps = {
  className?: string
}

export function Spinner({ className }: SpinnerProps) {
  return <span className={twMerge('size-4 animate-spin rounded-full border-2 border-gray-500 border-t-current', className)} aria-hidden="true" />
}
