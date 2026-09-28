type ErrorMessageProps = {
  message: string | null
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null

  return (
    <p role="alert" className="w-full mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400 backdrop-blur-md">
      {message}
    </p>
  )
}
