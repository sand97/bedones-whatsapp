import {
  type RouteConfig,
  index,
  route,
  layout,
} from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),

  // Auth routes (public)
  layout('layout/auth-layout.tsx', [
    route('auth/login', 'routes/auth.login.tsx'),
    route('auth/pairing-code', 'routes/auth.pairing-code.tsx'),
    route('auth/verify-otp', 'routes/auth.verify-otp.tsx'),
  ]),

  // Dashboard routes (with sidebar)
  layout('layout/dashboard-layout.tsx', [
    route('dashboard', 'routes/dashboard.tsx'),
    route('stats', 'routes/stats.tsx'),
    route('catalog', 'routes/catalog.tsx'),
    route('context', 'routes/context.home.tsx'),
    route('context/onboarding', 'routes/context.onboarding.tsx'),
  ]),

  // Legacy onboarding routes
  route('onboarding/import', 'routes/onboarding.import.tsx'),
  route('onboarding/review-products', 'routes/onboarding.review-products.tsx'),
  route('onboarding/business-info', 'routes/onboarding.business-info.tsx'),
  route(
    'onboarding/advanced-options',
    'routes/onboarding.advanced-options.tsx'
  ),
] satisfies RouteConfig
