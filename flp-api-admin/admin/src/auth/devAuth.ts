import type { ProfileDto } from '@/lib/api'

// Development-only login that skips Supabase, so the UI can be viewed before a project exists.
// Every check starts with import.meta.env.DEV, which Vite replaces with `false` in production
// builds, so the bypass and its credentials are stripped from them.

const STORAGE_KEY = 'flp.devAdminSession'

function devAuthOn(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_AUTH === 'true'
}

export function isDevAdminLogin(email: string, password: string): boolean {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_DEV_AUTH === 'true' &&
    Boolean(import.meta.env.VITE_DEV_ADMIN_EMAIL) &&
    Boolean(import.meta.env.VITE_DEV_ADMIN_PASSWORD) &&
    email.trim().toLowerCase() === import.meta.env.VITE_DEV_ADMIN_EMAIL?.toLowerCase() &&
    password === import.meta.env.VITE_DEV_ADMIN_PASSWORD
  )
}

export function devAdminProfile(): ProfileDto {
  if (!import.meta.env.DEV) throw new Error('Development login is not available in this build')
  return {
    id: '00000000-0000-4000-8000-00000000a001',
    role: 'admin',
    fullName: 'Dev Admin',
    phone: null,
    email: import.meta.env.VITE_DEV_ADMIN_EMAIL ?? null,
    status: 'active',
  }
}

// Kept in sessionStorage so a page reload keeps you logged in; closing the tab ends it.
export function hasDevAdminSession(): boolean {
  if (!import.meta.env.DEV) return false
  return devAuthOn() && sessionStorage.getItem(STORAGE_KEY) === '1'
}

export function startDevAdminSession(): void {
  if (!import.meta.env.DEV) return
  sessionStorage.setItem(STORAGE_KEY, '1')
}

export function endDevAdminSession(): void {
  if (!import.meta.env.DEV) return
  sessionStorage.removeItem(STORAGE_KEY)
}
