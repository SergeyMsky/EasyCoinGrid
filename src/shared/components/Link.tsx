import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom'

import { getButtonStyles } from './button.styles'

type ButtonLinkProps = RouterLinkProps & {
  variant?: 'default' | 'filled' | 'dashboard'
  size?: 'default' | 'sm'
  className?: string
}

export function ButtonLink({ variant = 'default', size = 'default', className, children, ...props }: ButtonLinkProps) {
  return (
    <RouterLink className={getButtonStyles({ variant, size, className })} {...props}>
      {children}
    </RouterLink>
  )
}
