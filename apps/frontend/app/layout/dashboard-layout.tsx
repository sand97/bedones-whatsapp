import {
  BarChartOutlined,
  CustomerServiceOutlined,
  HomeOutlined,
  LoadingOutlined,
  LogoutOutlined,
  NotificationOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { LayoutProvider, useLayout } from '@app/contexts/LayoutContext'
import { useAuth } from '@app/hooks/useAuth'
import { Avatar, Layout, Menu, Modal, Spin } from 'antd'
import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Sider, Content } = Layout

const menuSections = [
  {
    title: 'Général',
    items: [
      {
        key: 'home',
        label: 'Accueil',
        icon: <HomeOutlined />,
        path: '/dashboard',
      },
      {
        key: 'stats',
        label: 'Statistiques',
        icon: <BarChartOutlined />,
        path: '/stats',
      },
      {
        key: 'orders',
        label: 'Commandes',
        icon: <ShoppingCartOutlined />,
        path: '/orders',
      },
    ],
  },
  {
    title: 'Configuration',
    items: [
      {
        key: 'context',
        label: "Contexte de l'IA",
        icon: <SettingOutlined />,
        path: '/context',
      },
      {
        key: 'catalog',
        label: 'Catalogue',
        icon: <ShopOutlined />,
        path: '/catalog',
      },
      {
        key: 'marketing',
        label: 'Marketing',
        icon: <NotificationOutlined />,
        path: '/marketing',
      },
      {
        key: 'support',
        label: 'Support',
        icon: <CustomerServiceOutlined />,
        path: '/support',
      },
    ],
  },
  {
    title: 'Aides',
    items: [
      {
        key: 'faq',
        label: 'FAQ',
        icon: <QuestionCircleOutlined />,
        path: '/faq',
      },
      {
        key: 'help',
        label: 'Support',
        icon: <QuestionCircleOutlined />,
        path: '/help',
      },
    ],
  },
]

function DashboardLayoutContent() {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const { collapsed } = useLayout()
  const navigate = useNavigate()
  const location = useLocation()
  const [modal, contextHolder] = Modal.useModal()
  const isNavigatingRef = useRef(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isNavigatingRef.current) {
      isNavigatingRef.current = true
      navigate('/auth/login', { replace: true })
    }
    // Reset when authenticated
    if (isAuthenticated) {
      isNavigatingRef.current = false
    }
  }, [isLoading, isAuthenticated, navigate])

  // Redirect to context if score < 80% and trying to access restricted routes
  const contextScore = user?.contextScore
  const hasContextScore = typeof contextScore === 'number'
  useEffect(() => {
    // Only run this check when user is authenticated and loaded
    if (isLoading || !isAuthenticated || !user) return

    const isContextRoute = location.pathname === '/context'

    // Wait until context score is known to avoid redirecting with stale data
    if (!hasContextScore) return

    // If score < 80% and not on context route, redirect to context
    if (contextScore < 80 && !isContextRoute) {
      navigate('/context', { replace: true })
    }
  }, [
    isLoading,
    isAuthenticated,
    user,
    contextScore,
    hasContextScore,
    location.pathname,
    navigate,
  ])

  const handleLogout = () => {
    modal.confirm({
      title: 'Déconnexion',
      content: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      okText: 'Oui, me déconnecter',
      cancelText: 'Annuler',
      okButtonProps: { danger: true },
      onOk: logout,
    })
  }

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + '/')
    )
  }

  // Check if context score is below 80% - only context menu should be active
  const isContextIncomplete = hasContextScore ? contextScore < 80 : false

  // Get currently selected menu key
  const getSelectedKey = () => {
    for (const section of menuSections) {
      for (const item of section.items) {
        if (isActive(item.path)) {
          return [item.key]
        }
      }
    }
    return []
  }

  // Build menu items for Ant Design Menu
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#fdfdfd]'>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </div>
    )
  }

  if (!isAuthenticated) {
    // Show loading while redirect happens via useEffect
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#fdfdfd]'>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </div>
    )
  }

  return (
    <Layout className='min-h-screen'>
      {contextHolder}
      <Sider
        collapsed={collapsed}
        collapsedWidth={80}
        width={280}
        trigger={null}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div className='flex flex-col h-full'>
          {/* User Profile */}
          <div className='brand-name'>
            {!collapsed ? (
              <div className='flex items-center gap-3'>
                <Avatar
                  size={40}
                  src={user?.businessInfo?.avatar_url}
                  icon={!user?.businessInfo?.avatar_url && <UserOutlined />}
                  className='bg-[#bfbfbf] flex-shrink-0'
                />
                <div className='flex flex-col gap-1 flex-1 min-w-0'>
                  <div className='flex items-center gap-2'>
                    {user?.whatsappProfile?.pushname && (
                      <span className='font-medium text-sm text-black truncate'>
                        {user?.whatsappProfile?.pushname}
                      </span>
                    )}
                    <span className='bg-[#af52de] text-white text-xs px-2 py-0.5 rounded'>
                      Free
                    </span>
                  </div>
                  <span className='text-xs text-[#494949] truncate'>
                    {user?.phoneNumber}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <Avatar
                  size={40}
                  src={user?.businessInfo?.avatar_url}
                  icon={!user?.businessInfo?.avatar_url && <UserOutlined />}
                  className='bg-white'
                />
              </div>
            )}
          </div>

          {/* Menu */}
          <div className='flex-1 overflow-auto py-4'>
            <Menu
              mode='inline'
              selectedKeys={getSelectedKey()}
              items={menuSections.map(section => ({
                type: 'group' as const,
                label: section.title,
                children: section.items.map(item => ({
                  key: item.key,
                  icon: item.icon,
                  label: item.label,
                  disabled: isContextIncomplete && item.key !== 'context',
                  onClick: () => navigate(item.path),
                })),
              }))}
              className='border-none'
              inlineCollapsed={collapsed}
            />
          </div>

          {/* Logout Button */}
          <div className='logout-section'>
            <button
              onClick={handleLogout}
              type='button'
              className={`flex items-center gap-3 w-full bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity`}
            >
              <span className='text-lg text-error'>
                <LogoutOutlined />
              </span>
              <span className='text-sm text-error font-medium logout-text'>
                Déconnexion
              </span>
            </button>
          </div>
        </div>
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 80 : 280,
          transition: 'margin-left 0.2s',
        }}
      >
        <Content className='min-h-screen bg-transparent'>
          <div
            className={
              'bg-white m-4 lg:ml-2 rounded-2xl shadow-card min-h-[calc(100vh_-_32px)]'
            }
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default function DashboardLayout() {
  return (
    <LayoutProvider>
      <DashboardLayoutContent />
    </LayoutProvider>
  )
}
