import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import SignIn from './SignIn'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe('SignIn Page', () => {
  it('should render sign in page with all elements', () => {
    renderWithRouter(<SignIn />)
    
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should display application features', () => {
    renderWithRouter(<SignIn />)
    
    expect(screen.getByText(/Przeglądarka projektu/i)).toBeInTheDocument()
    expect(screen.getByText(/Odczyt plików IFC/i)).toBeInTheDocument()
    expect(screen.getByText(/Kalkulator kosztów/i)).toBeInTheDocument()
    expect(screen.getByText(/Weryfikacja konstrukcji/i)).toBeInTheDocument()
  })

  it('should display ODS logo', () => {
    renderWithRouter(<SignIn />)
    
    const logo = screen.getByAltText(/ODS Logo/i)
    expect(logo).toBeInTheDocument()
  })

  it('should have link to sign up page', () => {
    renderWithRouter(<SignIn />)
    
    const signUpLink = screen.getByRole('link', { name: /sign up/i })
    expect(signUpLink).toBeInTheDocument()
    expect(signUpLink).toHaveAttribute('href', '/signup')
  })

  it('should have help link to ODS website', () => {
    renderWithRouter(<SignIn />)
    
    const helpLink = screen.getByRole('link', { name: /pomoc/i })
    expect(helpLink).toBeInTheDocument()
    expect(helpLink).toHaveAttribute('href', 'https://www.ods-projekt.pl/')
    expect(helpLink).toHaveAttribute('target', '_blank')
  })

  it('should handle form submission with valid data', async () => {
    const user = userEvent.setup()
    const consoleLogSpy = vi.spyOn(console, 'log')
    
    renderWithRouter(<SignIn />)
    
    const emailInput = screen.getByPlaceholderText(/email address/i)
    const passwordInput = screen.getByPlaceholderText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    expect(consoleLogSpy).toHaveBeenCalledWith('Sign in attempt:', {
      email: 'test@example.com',
      password: 'password123',
    })
    expect(mockNavigate).toHaveBeenCalledWith('/viewer')
  })

  it('should update email input value', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SignIn />)
    
    const emailInput = screen.getByPlaceholderText(/email address/i)
    await user.type(emailInput, 'user@test.com')
    
    expect(emailInput).toHaveValue('user@test.com')
  })

  it('should update password input value', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SignIn />)
    
    const passwordInput = screen.getByPlaceholderText(/password/i)
    await user.type(passwordInput, 'secretpass')
    
    expect(passwordInput).toHaveValue('secretpass')
  })

  it('should have required fields', () => {
    renderWithRouter(<SignIn />)
    
    const emailInput = screen.getByPlaceholderText(/email address/i)
    const passwordInput = screen.getByPlaceholderText(/password/i)
    
    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })

  it('should display security notice', () => {
    renderWithRouter(<SignIn />)
    
    expect(screen.getByText(/This site is protected by reCAPTCHA/i)).toBeInTheDocument()
  })
})

