import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthMock, fakeSession, primeAuthMock, profile } from '@/test/auth-mock'

const { auth, apiFetch } = vi.hoisted(() => ({
  auth: {} as ReturnType<typeof createAuthMock>,
  apiFetch: vi.fn(),
}))
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiFetch,
}))

import { AuthProvider } from '@/auth/AuthProvider'
import { LoginPage } from '@/pages/LoginPage'

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<p>dashboard home</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    Object.assign(auth, createAuthMock())
    apiFetch.mockReset()
  })

  it('shows required-field messages when submitted empty', async () => {
    primeAuthMock(auth, null)
    renderLogin()

    await userEvent.click(await screen.findByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('rejects an invalid email', async () => {
    primeAuthMock(auth, null)
    renderLogin()

    await userEvent.type(await screen.findByLabelText('Email'), 'not-an-email')
    await userEvent.type(screen.getByLabelText('Password'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
  })

  it('shows a friendly message for wrong credentials', async () => {
    primeAuthMock(auth, null)
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', status: 400, message: 'Invalid login credentials' },
    })
    renderLogin()

    await userEvent.type(await screen.findByLabelText('Email'), 'asha@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('Wrong email or password')).toBeInTheDocument()
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'asha@example.com',
      password: 'wrong',
    })
  })

  it('tells a non-admin they are not authorized', async () => {
    primeAuthMock(auth, fakeSession)
    apiFetch.mockResolvedValue(profile({ role: 'student' }))

    renderLogin()

    expect(await screen.findByText(/Not authorized/)).toBeInTheDocument()
  })

  it('sends an admin to the dashboard', async () => {
    primeAuthMock(auth, fakeSession)
    apiFetch.mockResolvedValue(profile({ role: 'admin' }))

    renderLogin()

    expect(await screen.findByText('dashboard home')).toBeInTheDocument()
  })
})
