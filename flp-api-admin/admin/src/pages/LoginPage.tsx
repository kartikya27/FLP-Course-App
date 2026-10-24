import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router'
import { z } from 'zod'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
  password: z.string().min(1, 'Password is required'),
})

export function LoginPage() {
  const { status, signIn } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) })

  if (status === 'admin') return <Navigate to="/" replace />

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not log in. Please try again.')
    }
  })

  return (
    <main className="bg-muted flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>FLP Admin</CardTitle>
          <CardDescription>Log in to manage courses, classes and students.</CardDescription>
        </CardHeader>
        <CardContent>
          {status === 'loading' ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              {status === 'notAuthorized' && (
                <p role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                  Not authorized. This account does not have admin access.
                </p>
              )}
              {formError && (
                <p role="alert" className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
                  {formError}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={errors.email ? true : undefined}
                  {...register('email')}
                />
                {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? true : undefined}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-destructive text-sm">{errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Log in
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
