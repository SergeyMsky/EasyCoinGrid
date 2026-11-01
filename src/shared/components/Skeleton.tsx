import { twMerge } from 'tailwind-merge'

type SkeletonProps = {
  className: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <span aria-hidden="true" className={twMerge('block animate-pulse rounded bg-surface-raised motion-reduce:animate-none', className)} />
}
