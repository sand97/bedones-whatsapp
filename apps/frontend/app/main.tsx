import '@app/app.css'
import {
  AuthRouteSkeleton,
  DashboardRouteSkeleton,
  DocumentRouteSkeleton,
  HomeRouteSkeleton,
  OnboardingRouteSkeleton,
} from '@app/components/ui/RouteSkeletons'
import { AuthProvider } from '@app/contexts/AuthContext'
import { antdProviderProps } from '@app/core/theme'
import AuthLayout from '@app/layout/auth-layout'
import DashboardLayout from '@app/layout/dashboard-layout'
import {
  getAnalyticsPageLocation,
  getAnalyticsPagePath,
  initGoogleAnalytics,
  trackPageView,
  trackSiteOpen,
} from '@app/lib/analytics/google-analytics'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AntdApp from 'antd/es/app'
import ConfigProvider from 'antd/es/config-provider'
import frFR from 'antd/es/locale/fr_FR'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import React, {
  Suspense,
  lazy,
  useEffect,
  useRef,
  type ComponentType,
  type ReactNode,
} from 'react'
import ReactDOM from 'react-dom/client'
import {
  Navigate,
  Outlet,
  createBrowserRouter,
  RouterProvider,
  useLocation,
} from 'react-router-dom'

dayjs.locale('fr')

const queryClient = new QueryClient()

function lazyRouteElement(
  loader: () => Promise<{ default: ComponentType<any> }>,
  fallback: ReactNode
) {
  const Component = lazy(loader)

  return (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  )
}

function AnalyticsRouteObserver() {
  const location = useLocation()
  const previousLocationRef = useRef<string | null>(
    typeof document !== 'undefined' && document.referrer
      ? document.referrer
      : null
  )

  useEffect(() => {
    const pageLocation = getAnalyticsPageLocation(location)
    const pagePath = getAnalyticsPagePath(location)

    trackPageView(location, {
      pageReferrer: previousLocationRef.current,
    })
    trackSiteOpen(pagePath)

    previousLocationRef.current = pageLocation
  }, [location])

  return null
}

function RootRoute() {
  return (
    <>
      <AnalyticsRouteObserver />
      <Outlet />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <RootRoute />,
    children: [
      {
        path: '/',
        element: lazyRouteElement(
          () => import('@app/routes/home'),
          <HomeRouteSkeleton />
        ),
      },
      {
        element: <AuthLayout />,
        children: [
          {
            path: 'auth/login',
            element: lazyRouteElement(
              () => import('@app/routes/auth.login'),
              <AuthRouteSkeleton />
            ),
          },
          {
            path: 'auth/pairing-code',
            element: lazyRouteElement(
              () => import('@app/routes/auth.pairing-code'),
              <AuthRouteSkeleton />
            ),
          },
          {
            path: 'auth/provisioning',
            element: lazyRouteElement(
              () => import('@app/routes/auth.provisioning'),
              <AuthRouteSkeleton />
            ),
          },
          {
            path: 'auth/provisioning-debug',
            element: lazyRouteElement(
              () => import('@app/routes/auth.provisioning-debug'),
              <AuthRouteSkeleton />
            ),
          },
          {
            path: 'auth/verify-otp',
            element: lazyRouteElement(
              () => import('@app/routes/auth.verify-otp'),
              <AuthRouteSkeleton />
            ),
          },
          {
            path: 'auth/privacy',
            element: lazyRouteElement(
              () => import('@app/routes/auth.privacy'),
              <DocumentRouteSkeleton />
            ),
          },
          {
            path: 'auth/terms',
            element: lazyRouteElement(
              () => import('@app/routes/auth.terms'),
              <DocumentRouteSkeleton />
            ),
          },
        ],
      },
      {
        element: <DashboardLayout />,
        children: [
          {
            path: 'dashboard',
            element: lazyRouteElement(
              () => import('@app/routes/dashboard'),
              <DashboardRouteSkeleton />
            ),
          },
          {
            path: 'stats',
            element: lazyRouteElement(
              () => import('@app/routes/stats'),
              <DashboardRouteSkeleton />
            ),
          },
          {
            path: 'leads',
            element: lazyRouteElement(
              () => import('@app/routes/leads'),
              <DashboardRouteSkeleton />
            ),
          },
          {
            path: 'orders',
            element: <Navigate to='/leads' replace />,
          },
          {
            path: 'pricing',
            element: lazyRouteElement(
              () => import('@app/routes/pricing'),
              <DashboardRouteSkeleton />
            ),
          },
          {
            path: 'forfaits',
            element: <Navigate to='/pricing' replace />,
          },
          {
            path: 'catalog',
            element: lazyRouteElement(
              () => import('@app/routes/catalog'),
              <DashboardRouteSkeleton />
            ),
          },
          {
            path: 'status-scheduler',
            element: lazyRouteElement(
              () => import('@app/routes/status-scheduler'),
              <DashboardRouteSkeleton />
            ),
          },
          {
            path: 'marketing',
            element: <Navigate to='/status-scheduler' replace />,
          },
          {
            path: 'context',
            element: lazyRouteElement(
              () => import('@app/routes/context.onboarding'),
              <DashboardRouteSkeleton />
            ),
          },
          {
            path: 'support',
            element: lazyRouteElement(
              () => import('@app/routes/support'),
              <DashboardRouteSkeleton />
            ),
          },
          {
            path: 'faq',
            element: lazyRouteElement(
              () => import('@app/routes/faq'),
              <DashboardRouteSkeleton />
            ),
          },
        ],
      },
      {
        path: 'onboarding/import',
        element: lazyRouteElement(
          () => import('@app/routes/onboarding.import'),
          <OnboardingRouteSkeleton />
        ),
      },
      {
        path: 'onboarding/review-products',
        element: lazyRouteElement(
          () => import('@app/routes/onboarding.review-products'),
          <OnboardingRouteSkeleton />
        ),
      },
      {
        path: 'onboarding/business-info',
        element: lazyRouteElement(
          () => import('@app/routes/onboarding.business-info'),
          <OnboardingRouteSkeleton />
        ),
      },
      {
        path: 'onboarding/advanced-options',
        element: lazyRouteElement(
          () => import('@app/routes/onboarding.advanced-options'),
          <OnboardingRouteSkeleton />
        ),
      },
    ],
  },
])

function App() {
  useEffect(() => {
    initGoogleAnalytics()
  }, [])

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider {...antdProviderProps} locale={frFR}>
          <AntdApp>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
          </AntdApp>
        </ConfigProvider>
      </QueryClientProvider>
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
