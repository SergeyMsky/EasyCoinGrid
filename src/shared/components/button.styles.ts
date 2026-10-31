import { twMerge } from 'tailwind-merge'

export const baseButtonStyles =
  'inline-flex items-center justify-center gap-2 rounded-lg border outline-none cursor-pointer transition duration-300 disabled:cursor-not-allowed'

export const buttonVariants = {
  default:
    'font-medium text-text border-accent-outline bg-accent-subtle hover:bg-accent-subtle hover:-translate-y-px hover:text-accent hover:border-accent disabled:bg-surface-raised disabled:text-muted disabled:border-outline disabled:-translate-y-0',

  filled:
    'font-semibold text-on-accent border-accent bg-accent hover:text-accent hover:bg-accent-subtle hover:-translate-y-px hover:border-accent-strong disabled:bg-accent-disabled disabled:text-on-accent disabled:border-accent-disabled disabled:-translate-y-0',

  dashboard:
    'p-2 border-outline bg-app text-muted hover:border-accent-outline hover:text-accent hover:bg-accent-subtle disabled:cursor-not-allowed disabled:border-outline disabled:bg-app disabled:text-muted',
}

export const buttonSizes = {
  default: 'px-4 py-2.5',
  sm: 'px-3 py-2',
}

export function getButtonStyles({
  variant = 'default',
  size = 'default',
  className,
}: {
  variant?: keyof typeof buttonVariants
  size?: keyof typeof buttonSizes
  className?: string
}) {
  return twMerge(baseButtonStyles, buttonVariants[variant], variant !== 'dashboard' && buttonSizes[size], className)
}
