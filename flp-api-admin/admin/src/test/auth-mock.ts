import type { Session } from '@supabase/supabase-js'
import { vi, type Mock } from 'vitest'
import type { ProfileDto } from '@/lib/api'

type Listener = (event: string, session: Session | null) => void

export interface AuthMock {
  onAuthStateChange: Mock
  getSession: Mock
  signInWithPassword: Mock
  signOut: Mock
}

export function createAuthMock(): AuthMock {
  return {
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  }
}

// Behaves like supabase-js: emits INITIAL_SESSION on subscribe and SIGNED_OUT after signOut().
export function primeAuthMock(auth: AuthMock, session: Session | null) {
  let listener: Listener | undefined
  auth.onAuthStateChange.mockImplementation((cb: Listener) => {
    listener = cb
    cb('INITIAL_SESSION', session)
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  })
  auth.getSession.mockResolvedValue({ data: { session }, error: null })
  auth.signOut.mockImplementation(async () => {
    listener?.('SIGNED_OUT', null)
    return { error: null }
  })
  auth.signInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null })
  return { emit: (event: string, next: Session | null) => listener?.(event, next) }
}

export const fakeSession = {
  access_token: 'token-123',
  user: { id: '6f1c2a4e-0000-4000-8000-000000000001' },
} as unknown as Session

export function profile(overrides: Partial<ProfileDto> = {}): ProfileDto {
  return {
    id: '6f1c2a4e-0000-4000-8000-000000000001',
    role: 'admin',
    fullName: 'Asha Admin',
    phone: null,
    email: 'asha@example.com',
    status: 'active',
    ...overrides,
  }
}
