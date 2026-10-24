import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthMock, primeAuthMock } from '@/test/auth-mock'

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
import { appRoutes } from '@/routes'

function renderApp(path = '/login') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

async function logIn(email: string, password: string) {
  await userEvent.type(await screen.findByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('development login bypass', () => {
  beforeEach(() => {
    Object.assign(auth, createAuthMock())
    primeAuthMock(auth, null)
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { name: 'AuthApiError', status: 400, message: 'Invalid login credentials' },
    })
    apiFetch.mockReset()
    sessionStorage.clear()
    vi.stubEnv('VITE_DEV_ADMIN_EMAIL', 'admin@flp.example')
    vi.stubEnv('VITE_DEV_ADMIN_PASSWORD', 'dev-pass-123')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('logs the configured dev admin in without Supabase or the API', async () => {
    vi.stubEnv('VITE_DEV_AUTH', 'true')
    renderApp()

    await logIn('admin@flp.example', 'dev-pass-123')

    expect(await screen.findByRole('link', { name: 'Courses' })).toBeInTheDocument()
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('is off unless VITE_DEV_AUTH is "true"', async () => {
    renderApp()

    await logIn('admin@flp.example', 'dev-pass-123')

    expect(await screen.findByText('Wrong email or password')).toBeInTheDocument()
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1)
  })

  it('sends a wrong dev password to Supabase like any other login', async () => {
    vi.stubEnv('VITE_DEV_AUTH', 'true')
    renderApp()

    await logIn('admin@flp.example', 'wrong')

    expect(await screen.findByText('Wrong email or password')).toBeInTheDocument()
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(1)
  })

  it('keeps the dev admin logged in across a reload, until they log out', async () => {
    vi.stubEnv('VITE_DEV_AUTH', 'true')
    const first = renderApp()
    await logIn('admin@flp.example', 'dev-pass-123')
    await screen.findByRole('link', { name: 'Courses' })
    first.unmount()

    renderApp('/students')
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument())
    expect(sessionStorage.length).toBe(0)
    expect(auth.signOut).not.toHaveBeenCalled()
  })
})
