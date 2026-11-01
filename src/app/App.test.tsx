import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}))

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: mocks.useAuth,
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ removeQueries: vi.fn() }),
}))

vi.mock('./components/Header', () => ({
  Header: () => <header />,
}))

vi.mock('./components/Sidebar', () => ({
  Sidebar: () => <aside />,
}))

vi.mock('@/features/auth/pages/AuthPage', () => ({
  AuthPage: () => <p>Sign in page</p>,
}))

describe('App', () => {
  beforeEach(() => {
    mocks.useAuth.mockReturnValue({ session: null, loading: false })
    window.history.replaceState({}, '', '/dashboard')
  })

  it('redirects an unauthenticated user from a protected page without crashing', async () => {
    render(<App />)

    expect(await screen.findByText('Sign in page')).toBeInTheDocument()
  })
})
