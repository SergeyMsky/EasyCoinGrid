import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CoinImage } from './CoinImage'

describe('CoinImage', () => {
  it('renders coin imagery as a circular, cropped image', () => {
    render(<CoinImage asset="BTC" image="https://example.com/btc.png" className="h-8 w-8" />)

    expect(screen.getByRole('img', { name: 'BTC' })).toHaveClass('rounded-full', 'object-cover', 'h-8', 'w-8')
  })

  it('renders nothing when no coin image is available', () => {
    const { container } = render(<CoinImage asset="BTC" image={null} className="h-8 w-8" />)

    expect(container).toBeEmptyDOMElement()
  })
})
