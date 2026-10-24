import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'

export function RequireAdmin() {
  const { status } = useAuth()

  if (status === 'loading') {
    return <p className="text-muted-foreground p-8 text-sm">Loading…</p>
  }
  if (status !== 'admin') return <Navigate to="/login" replace />
  return <Outlet />
}
