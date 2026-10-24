import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch, type ProfileDto } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export type AuthStatus = 'loading' | 'signedOut' | 'admin' | 'notAuthorized'

interface AuthContextValue {
  status: AuthStatus
  profile: ProfileDto | null
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [profile, setProfile] = useState<ProfileDto | null>(null)

  useEffect(() => {
    let active = true

    async function resolve(session: Session | null) {
      if (!session) {
        setProfile(null)
        // Keep "not authorized" on screen after we sign a non-admin out.
        setStatus((prev) => (prev === 'notAuthorized' ? prev : 'signedOut'))
        return
      }
      try {
        const me = await apiFetch<ProfileDto>('/v1/me')
        if (!active) return
        if (me.role === 'admin' && me.status === 'active') {
          setProfile(me)
          setStatus('admin')
        } else {
          setProfile(null)
          setStatus('notAuthorized')
          await supabase.auth.signOut()
        }
      } catch {
        if (!active) return
        setProfile(null)
        setStatus('signedOut')
      }
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return
      // supabase-js can deadlock if another auth call runs inside this callback, so defer it.
      setTimeout(() => void resolve(session), 0)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(
        error.message === 'Invalid login credentials'
          ? 'Wrong email or password'
          : 'Could not log in. Please try again.',
      )
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({ status, profile, signIn, signOut }),
    [status, profile, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
