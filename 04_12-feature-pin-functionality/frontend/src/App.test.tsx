import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Routes, Route, Navigate, MemoryRouter } from 'react-router-dom'

// Mock the pages to avoid complex component dependencies
vi.mock('./pages/SignIn', () => ({
  default: () => <div data-testid="signin-page">SignIn Page</div>,
}))

vi.mock('./pages/SignUp', () => ({
  default: () => <div data-testid="signup-page">SignUp Page</div>,
}))

vi.mock('./pages/Viewer', () => ({
  default: () => <div data-testid="viewer-page">Viewer Page</div>,
}))

// Import mocked components
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Viewer from './pages/Viewer'

// Create a test component with the same routing logic as App
function TestApp() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/viewer" element={<Viewer />} />
    </Routes>
  )
}

describe('App Routing', () => {
  it('should redirect root path to /signin', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TestApp />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('signin-page')).toBeInTheDocument()
  })

  it('should render SignIn page on /signin route', () => {
    render(
      <MemoryRouter initialEntries={['/signin']}>
        <TestApp />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('signin-page')).toBeInTheDocument()
    expect(screen.getByText('SignIn Page')).toBeInTheDocument()
  })

  it('should render SignUp page on /signup route', () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <TestApp />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('signup-page')).toBeInTheDocument()
    expect(screen.getByText('SignUp Page')).toBeInTheDocument()
  })

  it('should render Viewer page on /viewer route', () => {
    render(
      <MemoryRouter initialEntries={['/viewer']}>
        <TestApp />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('viewer-page')).toBeInTheDocument()
    expect(screen.getByText('Viewer Page')).toBeInTheDocument()
  })

  it('should handle multiple route navigations', () => {
    const { unmount: unmount1 } = render(
      <MemoryRouter initialEntries={['/signin']}>
        <TestApp />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('signin-page')).toBeInTheDocument()
    unmount1()
    
    const { unmount: unmount2 } = render(
      <MemoryRouter initialEntries={['/signup']}>
        <TestApp />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('signup-page')).toBeInTheDocument()
    unmount2()
    
    render(
      <MemoryRouter initialEntries={['/viewer']}>
        <TestApp />
      </MemoryRouter>
    )
    
    expect(screen.getByTestId('viewer-page')).toBeInTheDocument()
  })
})

