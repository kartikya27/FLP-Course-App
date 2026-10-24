import { render, screen, waitFor } from '@testing-library/react'
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

import { AuthProvider, useAuth } from '@/auth/AuthProvider'

function Probe() {
  const { status } = useAuth()
  return <p data-testid="status">{status}</p>
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    Object.assign(auth, createAuthMock())
    apiFetch.mockReset()
  })

  it('is admin when the session belongs to an active admin', async () => {
    primeAuthMock(auth, fakeSession)
    apiFetch.mockResolvedValue(profile({ role: 'admin' }))

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('admin'))
  })

  it('refuses a student: notAuthorized, signs out once, requests nothing but /v1/me', async () => {
    primeAuthMock(auth, fakeSession)
    apiFetch.mockResolvedValue(profile({ role: 'student' }))

    renderProvider()

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('status')).toHaveTextContent('notAuthorized')
    expect(apiFetch.mock.calls).toEqual([['/v1/me']])
  })

  it('refuses a blocked admin', async () => {
    primeAuthMock(auth, fakeSession)
    apiFetch.mockResolvedValue(profile({ role: 'admin', status: 'blocked' }))

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('notAuthorized'))
  })

  it('is signedOut without a session and does not call the API', async () => {
    primeAuthMock(auth, null)

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'))
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('is signedOut when /v1/me fails', async () => {
    primeAuthMock(auth, fakeSession)
    apiFetch.mockRejectedValue(new Error('network down'))

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'))
  })
})
