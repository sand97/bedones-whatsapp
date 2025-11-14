import {
  type RouteConfig,
  index,
  route,
  layout,
} from '@react-router/dev/routes'

export default [
  index('routes/home.tsx'),
  layout('layout/auth-layout.tsx', [route('login', 'routes/login.tsx')]),
] satisfies RouteConfig
