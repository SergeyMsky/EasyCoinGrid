import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders a decorative loading block with shared base styles and custom dimensions', () => {
    const { container } = render(<Skeleton className="h-6 w-20" />)

    const skeleton = container.querySelector('span')
    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
    expect(skeleton).toHaveClass('block', 'animate-pulse', 'rounded', 'bg-surface-raised', 'h-6', 'w-20')
    expect(skeleton).toHaveClass('motion-reduce:animate-none')
  })

  it('allows shapes such as circular placeholders', () => {
    const { container } = render(<Skeleton className="h-8 w-8 rounded-full" />)

    expect(container.querySelector('span')).toHaveClass('rounded-full')
  })
})
