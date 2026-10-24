import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
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
import { appRoutes } from '@/routes'

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] })
  return render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

describe('app routes', () => {
  beforeEach(() => {
    Object.assign(auth, createAuthMock())
    apiFetch.mockReset()
  })

  it('sends a signed-out visitor to the login page', async () => {
    primeAuthMock(auth, null)

    renderAt('/students')

    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows the layout with every section link to an admin', async () => {
    primeAuthMock(auth, fakeSession)
    apiFetch.mockResolvedValue(profile({ role: 'admin' }))

    renderAt('/')

    for (const name of ['Dashboard', 'Courses', 'Live classes', 'Students', 'Orders']) {
      expect(await screen.findByRole('link', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })
})
