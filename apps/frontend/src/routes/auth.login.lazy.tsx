import AuthLayout from '@app/layout/auth-layout'
import LoginPage from '@app/routes/auth.login'
import { createLazyFileRoute } from '@tanstack/react-router'

function AuthLoginRoutePage() {
  return (
    <AuthLayout>
      <LoginPage />
    </AuthLayout>
  )
}

export const Route = createLazyFileRoute('/auth/login')({
  component: AuthLoginRoutePage,
})
