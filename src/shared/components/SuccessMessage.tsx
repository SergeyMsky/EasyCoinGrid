type SuccessMessageProps = {
  message: string | null
}

export function SuccessMessage({ message }: SuccessMessageProps) {
  if (!message) return null

  return (
    <p role="status" className="w-full mt-4 rounded-md border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-400 backdrop-blur-md">
      {message}
    </p>
  )
}
