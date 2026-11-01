import { twMerge } from 'tailwind-merge'

type WarningMessageProps = {
  message: string | null
  className?: string
}

export function WarningMessage({ message, className }: WarningMessageProps) {
  if (!message) return null

  return (
    <p
      role="status"
      className={twMerge('mt-4 w-full rounded-lg border border-warning-outline bg-warning-subtle px-3 py-2 text-sm text-warning', className)}>
      {message}
    </p>
  )
}
