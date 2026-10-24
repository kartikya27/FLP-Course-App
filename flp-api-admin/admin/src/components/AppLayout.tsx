import { NavLink, Outlet } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/courses', label: 'Courses' },
  { to: '/live-classes', label: 'Live classes' },
  { to: '/students', label: 'Students' },
  { to: '/orders', label: 'Orders' },
]

export function AppLayout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-screen">
      <aside className="bg-sidebar flex w-56 shrink-0 flex-col border-r p-4">
        <p className="mb-6 px-3 text-lg font-semibold">FLP Admin</p>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm',
                  isActive ? 'bg-accent font-medium' : 'text-muted-foreground hover:bg-accent',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          <p className="text-muted-foreground truncate px-3 text-xs">{profile?.email}</p>
          <Button variant="outline" className="w-full" onClick={() => void signOut()}>
            Log out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
