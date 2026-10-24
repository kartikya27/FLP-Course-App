import { Navigate, type RouteObject } from 'react-router'
import { AppLayout } from '@/components/AppLayout'
import { RequireAdmin } from '@/components/RequireAdmin'
import { CoursesPage } from '@/pages/CoursesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LiveClassesPage } from '@/pages/LiveClassesPage'
import { LoginPage } from '@/pages/LoginPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { StudentsPage } from '@/pages/StudentsPage'

export const appRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'courses', element: <CoursesPage /> },
          { path: 'live-classes', element: <LiveClassesPage /> },
          { path: 'students', element: <StudentsPage /> },
          { path: 'orders', element: <OrdersPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]
