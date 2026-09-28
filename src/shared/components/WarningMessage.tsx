type WarningMessageProps = {
  message: string | null
}

export function WarningMessage({ message }: WarningMessageProps) {
  if (!message) return null

  return (
    <p role="status" className="w-full mt-4 rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-400 backdrop-blur-md">
      {message}
    </p>
  )
}
