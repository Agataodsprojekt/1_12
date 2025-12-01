import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import SignUp from './SignUp'

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

describe('SignUp Page', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    vi.clearAllMocks()
  })

  it('should render sign up page with all elements', () => {
    renderWithRouter(<SignUp />)
    
    expect(screen.getByRole('heading', { name: /sign up/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/email address/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/repeat password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('should display application features', () => {
    renderWithRouter(<SignUp />)
    
    expect(screen.getByText(/Przeglądarka projektu/i)).toBeInTheDocument()
    expect(screen.getByText(/Odczyt plików IFC/i)).toBeInTheDocument()
    expect(screen.getByText(/Kalkulator kosztów/i)).toBeInTheDocument()
    expect(screen.getByText(/Weryfikacja konstrukcji/i)).toBeInTheDocument()
  })

  it('should display social sign up buttons', () => {
    renderWithRouter(<SignUp />)
    
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /apple/i })).toBeInTheDocument()
  })

  it('should have link to sign in page', () => {
    renderWithRouter(<SignUp />)
    
    const signInLink = screen.getByRole('link', { name: /sign in/i })
    expect(signInLink).toBeInTheDocument()
    expect(signInLink).toHaveAttribute('href', '/signin')
  })

  it('should handle form submission with matching passwords', async () => {
    const user = userEvent.setup()
    const consoleLogSpy = vi.spyOn(console, 'log')
    
    renderWithRouter(<SignUp />)
    
    const emailInput = screen.getByPlaceholderText(/email address/i)
    const passwordInput = screen.getByPlaceholderText(/^password$/i)
    const repeatPasswordInput = screen.getByPlaceholderText(/repeat password/i)
    const submitButton = screen.getByRole('button', { name: /^sign up$/i })
    
    await user.type(emailInput, 'newuser@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(repeatPasswordInput, 'password123')
    await user.click(submitButton)
    
    expect(consoleLogSpy).toHaveBeenCalledWith('Sign up attempt:', {
      email: 'newuser@example.com',
      password: 'password123',
    })
    expect(mockNavigate).toHaveBeenCalledWith('/viewer')
  })

  it('should show alert when passwords do not match', async () => {
    const user = userEvent.setup()
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    
    renderWithRouter(<SignUp />)
    
    const emailInput = screen.getByPlaceholderText(/email address/i)
    const passwordInput = screen.getByPlaceholderText(/^password$/i)
    const repeatPasswordInput = screen.getByPlaceholderText(/repeat password/i)
    const submitButton = screen.getByRole('button', { name: /^sign up$/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(repeatPasswordInput, 'differentpassword')
    await user.click(submitButton)
    
    expect(alertSpy).toHaveBeenCalledWith('Passwords do not match')
    expect(mockNavigate).not.toHaveBeenCalled()
    
    alertSpy.mockRestore()
  })

  it('should update form inputs correctly', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SignUp />)
    
    const emailInput = screen.getByPlaceholderText(/email address/i)
    const passwordInput = screen.getByPlaceholderText(/^password$/i)
    const repeatPasswordInput = screen.getByPlaceholderText(/repeat password/i)
    
    await user.type(emailInput, 'test@test.com')
    await user.type(passwordInput, 'pass123')
    await user.type(repeatPasswordInput, 'pass123')
    
    expect(emailInput).toHaveValue('test@test.com')
    expect(passwordInput).toHaveValue('pass123')
    expect(repeatPasswordInput).toHaveValue('pass123')
  })

  it('should have required fields', () => {
    renderWithRouter(<SignUp />)
    
    const emailInput = screen.getByPlaceholderText(/email address/i)
    const passwordInput = screen.getByPlaceholderText(/^password$/i)
    const repeatPasswordInput = screen.getByPlaceholderText(/repeat password/i)
    
    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
    expect(repeatPasswordInput).toBeRequired()
  })

  it('should display divider text', () => {
    renderWithRouter(<SignUp />)
    
    expect(screen.getByText(/Or sign up with your email/i)).toBeInTheDocument()
  })

  it('should display security notice', () => {
    renderWithRouter(<SignUp />)
    
    expect(screen.getByText(/This site is protected by reCAPTCHA/i)).toBeInTheDocument()
  })

  it('should have help link to ODS website', () => {
    renderWithRouter(<SignUp />)
    
    const helpLink = screen.getByRole('link', { name: /pomoc/i })
    expect(helpLink).toBeInTheDocument()
    expect(helpLink).toHaveAttribute('href', 'https://www.ods-projekt.pl/')
  })
})

