import { act, render, screen, waitFor } from '@testing-library/react'
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
import { ApiError, type ProfileDto } from '@/lib/api'

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

  it('is unavailable, not signed out, when /v1/me cannot be reached', async () => {
    primeAuthMock(auth, fakeSession)
    apiFetch.mockRejectedValue(new TypeError('Failed to fetch'))

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unavailable'))
    expect(auth.signOut).not.toHaveBeenCalled()
  })

  it('signs out when the API rejects the session', async () => {
    primeAuthMock(auth, fakeSession)
    apiFetch.mockRejectedValue(new ApiError(401, 'UNAUTHENTICATED', 'Please log in again'))

    renderProvider()

    await waitFor(() => expect(auth.signOut).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('status')).toHaveTextContent('signedOut')
  })

  it('does not refetch when Supabase re-emits SIGNED_IN for the same admin', async () => {
    const { emit } = primeAuthMock(auth, fakeSession)
    apiFetch.mockResolvedValue(profile({ role: 'admin' }))
    renderProvider()
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('admin'))

    act(() => emit('SIGNED_IN', fakeSession))
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('status')).toHaveTextContent('admin')
  })

  it('ignores a slow /v1/me answer that arrives after sign-out', async () => {
    const { emit } = primeAuthMock(auth, fakeSession)
    let answer: (value: ProfileDto) => void = () => {}
    apiFetch.mockReturnValue(new Promise<ProfileDto>((resolve) => (answer = resolve)))
    renderProvider()
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1))

    act(() => emit('SIGNED_OUT', null))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signedOut'))
    await act(async () => answer(profile({ role: 'admin' })))

    expect(screen.getByTestId('status')).toHaveTextContent('signedOut')
  })
})
