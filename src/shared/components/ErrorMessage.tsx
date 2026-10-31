type ErrorMessageProps = {
  message: string | null
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null

  return (
    <p role="alert" className="mt-4 w-full rounded-lg border border-loss-outline bg-loss-subtle px-3 py-2 text-sm text-error">
      {message}
    </p>
  )
}
