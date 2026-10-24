import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthMock, fakeSession, primeAuthMock } from '@/test/auth-mock'

const { auth } = vi.hoisted(() => ({ auth: {} as ReturnType<typeof createAuthMock> }))
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }))

import { ApiError, apiFetch } from '@/lib/api'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiFetch', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    Object.assign(auth, createAuthMock())
    primeAuthMock(auth, fakeSession)
    vi.stubEnv('VITE_API_URL', 'http://api.test')
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('sends the Supabase access token as a bearer header', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }))

    const result = await apiFetch<{ ok: boolean }>('/v1/me')

    expect(result).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://api.test/v1/me')
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-123')
  })

  it('throws ApiError carrying the server error code and message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: { code: 'ALREADY_ENROLLED', message: 'Already enrolled' } }),
    )

    await expect(apiFetch('/v1/orders', { method: 'POST' })).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_ENROLLED',
      message: 'Already enrolled',
    })
  })

  it('falls back to HTTP_ERROR when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('Bad Gateway', { status: 502 }))

    const error = await apiFetch('/v1/me').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 502, code: 'HTTP_ERROR' })
  })
})
