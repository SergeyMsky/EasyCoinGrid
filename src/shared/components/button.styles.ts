import { twMerge } from 'tailwind-merge'

export const baseButtonStyles = 'inline-flex items-center justify-center gap-2 rounded-md border outline-none backdrop-blur-md cursor-pointer transition duration-200 disabled:cursor-not-allowed'

export const buttonVariants = {
  default:
    'font-medium text-white border-emerald-400/20 bg-emerald-400/10 hover:bg-emerald-400/20 hover:text-emerald-200 hover:border-emerald-400 hover:-translate-y-px hover:shadow-[0_0_0_1px_#34d3991a,0_8px_24px_#34d3991f] disabled:bg-emerald-400/10 disabled:text-white disabled:border-emerald-400/20 disabled:-translate-y-0 disabled:shadow-none',

  filled:
    'font-medium text-black border-emerald-400/20 bg-emerald-400 hover:bg-emerald-400/20 hover:text-emerald-200 hover:border-emerald-400 hover:-translate-y-px hover:shadow-[0_0_0_1px_#34d3991a,0_8px_24px_#34d3991f] disabled:bg-emerald-400/10 disabled:text-white disabled:border-emerald-400/20 disabled:-translate-y-0 disabled:shadow-none',

  dashboard:
    'p-2 border-white/10 bg-black/10 text-gray-500 hover:border-emerald-400 hover:text-emerald-400 hover:bg-white/5 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-black/10 disabled:text-gray-500',
}

export const buttonSizes = {
  default: 'px-4 py-3',
  sm: 'px-3 py-2',
}

export function getButtonStyles({ variant = 'default', size = 'default', className }: { variant?: keyof typeof buttonVariants; size?: keyof typeof buttonSizes; className?: string }) {
  return twMerge(baseButtonStyles, buttonVariants[variant], variant !== 'dashboard' && buttonSizes[size], className)
}
