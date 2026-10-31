type WarningMessageProps = {
  message: string | null
}

export function WarningMessage({ message }: WarningMessageProps) {
  if (!message) return null

  return (
    <p role="status" className="mt-4 w-full rounded-lg border border-warning-outline bg-warning-subtle px-3 py-2 text-sm text-warning">
      {message}
    </p>
  )
}
