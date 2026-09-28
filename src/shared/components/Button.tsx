import type { ButtonHTMLAttributes } from 'react'
import { getButtonStyles } from './button.styles'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'filled' | 'dashboard'
  size?: 'default' | 'sm'
}

export function Button({ variant = 'default', size = 'default', className, children, ...props }: ButtonProps) {
  return (
    <button className={getButtonStyles({ variant, size, className })} {...props}>
      {children}
    </button>
  )
}
