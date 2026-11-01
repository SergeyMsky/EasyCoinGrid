import { useState } from 'react'
import type { ChangeEventHandler } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type PasswordFieldProps = {
  label: string
  name?: string
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  autoComplete?: string
  disabled?: boolean
  required?: boolean
  placeholder?: string
  className?: string
  visibilityLabel?: string
}

export function PasswordField({
  label,
  name,
  value,
  onChange,
  autoComplete,
  disabled,
  required,
  placeholder = '••••••••',
  className = 'flex flex-col gap-2',
  visibilityLabel = 'password',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <label className={className}>
      <span className="label">{label}</span>
      <span className="relative">
        <input
          className="input h-13 px-4 py-2 pr-11"
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
        />
        <button
          type="button"
          aria-label={`${visible ? 'Hide' : 'Show'} ${visibilityLabel}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted hover:text-text disabled:cursor-not-allowed">
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </span>
    </label>
  )
}
