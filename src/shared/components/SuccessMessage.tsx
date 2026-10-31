type SuccessMessageProps = {
  message: string | null
}

export function SuccessMessage({ message }: SuccessMessageProps) {
  if (!message) return null

  return (
    <p role="status" className="mt-4 w-full rounded-lg border border-profit-outline bg-profit-subtle px-3 py-2 text-sm text-success">
      {message}
    </p>
  )
}
