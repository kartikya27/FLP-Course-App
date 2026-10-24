import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  devAdminProfile,
  endDevAdminSession,
  hasDevAdminSession,
  isDevAdminLogin,
  startDevAdminSession,
} from '@/auth/devAuth'
import { ApiError, apiFetch, type ProfileDto } from '@/lib/api'
import { supabase } from '@/lib/supabase'

// unavailable: logged in to Supabase, but the FLP API could not be reached.
export type AuthStatus = 'loading' | 'signedOut' | 'admin' | 'notAuthorized' | 'unavailable'

interface AuthContextValue {
  status: AuthStatus
  profile: ProfileDto | null
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  retry(): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [startedAsDev] = useState(hasDevAdminSession)
  const [status, setStatus] = useState<AuthStatus>(startedAsDev ? 'admin' : 'loading')
  const [profile, setProfile] = useState<ProfileDto | null>(() =>
    startedAsDev ? devAdminProfile() : null,
  )
  // Only the newest /v1/me answer may change state; older ones are stale.
  const latestRequest = useRef(0)
  const adminId = useRef<string | null>(null)
  // A development login (see devAuth.ts) ignores Supabase entirely.
  const devSession = useRef(startedAsDev)

  const resolve = useCallback(async (session: Session | null) => {
    if (devSession.current) return
    const request = ++latestRequest.current
    if (!session) {
      adminId.current = null
      setProfile(null)
      // Keep "not authorized" on screen after we sign a non-admin out.
      setStatus((prev) => (prev === 'notAuthorized' ? prev : 'signedOut'))
      return
    }
    try {
      const me = await apiFetch<ProfileDto>('/v1/me')
      if (request !== latestRequest.current) return
      if (me.role === 'admin' && me.status === 'active') {
        adminId.current = me.id
        setProfile(me)
        setStatus('admin')
      } else {
        adminId.current = null
        setProfile(null)
        setStatus('notAuthorized')
        await supabase.auth.signOut()
      }
    } catch (err) {
      if (request !== latestRequest.current) return
      adminId.current = null
      setProfile(null)
      if (err instanceof ApiError && err.status === 401) {
        setStatus('signedOut')
        await supabase.auth.signOut()
      } else {
        setStatus('unavailable')
      }
    }
  }, [])

  useEffect(() => {
    const requests = latestRequest
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return
      // supabase-js re-emits SIGNED_IN when the tab becomes visible again; nothing changed.
      if (event === 'SIGNED_IN' && session?.user.id === adminId.current) return
      // supabase-js can deadlock if another auth call runs inside this callback, so defer it.
      setTimeout(() => void resolve(session), 0)
    })

    return () => {
      // Answers to requests made before unmount are ignored.
      requests.current++
      data.subscription.unsubscribe()
    }
  }, [resolve])

  const signIn = useCallback(async (email: string, password: string) => {
    if (isDevAdminLogin(email, password)) {
      devSession.current = true
      latestRequest.current++
      startDevAdminSession()
      setProfile(devAdminProfile())
      setStatus('admin')
      return
    }
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
    if (devSession.current) {
      devSession.current = false
      endDevAdminSession()
      setProfile(null)
      setStatus('signedOut')
      return
    }
    await supabase.auth.signOut()
  }, [])

  const retry = useCallback(async () => {
    setStatus('loading')
    const { data } = await supabase.auth.getSession()
    await resolve(data.session)
  }, [resolve])

  const value = useMemo(
    () => ({ status, profile, signIn, signOut, retry }),
    [status, profile, signIn, signOut, retry],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
