import {
  HomeOutlined,
  BarChartOutlined,
  ShoppingCartOutlined,
  SettingOutlined,
  ShopOutlined,
  NotificationOutlined,
  CustomerServiceOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { useAuth } from '@app/hooks/useAuth'
import { Avatar, Spin } from 'antd'
import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router'

interface MenuItem {
  key: string
  label: string
  icon: React.ReactNode
  path: string
}

const menuSections = [
  {
    title: 'Compte',
    items: [
      { key: 'home', label: 'Accueil', icon: <HomeOutlined />, path: '/dashboard' },
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

export default function DashboardLayout() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth/login')
    }
  }, [isLoading, isAuthenticated, navigate])

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + '/')
    )
  }

  const renderMenuItem = (item: MenuItem) => (
    <button
      key={item.key}
      onClick={() => navigate(item.path)}
      type='button'
      className={`
        flex items-center gap-[10px] px-4 py-2 rounded-xl cursor-pointer w-full text-left bg-transparent border-none
        ${
          isActive(item.path)
            ? 'shadow-[0px_0px_1px_0px_rgba(0,0,0,0.4)] bg-white font-medium'
            : 'hover:bg-white hover:shadow-[0px_0px_1px_0px_rgba(0,0,0,0.2)]'
        }
      `}
    >
      <span className='text-lg'>{item.icon}</span>
      <span className='text-base text-primary-text leading-4'>
        {item.label}
      </span>
    </button>
  )

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-[#fdfdfd]'>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect via useEffect
  }

  console.log('user', user)

  return (
    <div className='min-h-screen flex max-w-[1290px] mx-auto'>
      {/* Sidebar */}
      <aside className='w-[296px] h-screen overflow-y-auto px-4 py-20 flex flex-col gap-12'>
        {/* User Profile */}
        <div className='flex items-center gap-2'>
          <Avatar
            size={40}
            src={user?.businessInfo?.avatar_url}
            icon={!user?.businessInfo?.avatar_url && <UserOutlined />}
            className='bg-[#bfbfbf] flex-shrink-0'
          />
          <div className='flex flex-col gap-2'>
            <div className='flex items-center gap-2.5'>
              {user?.whatsappProfile?.pushname && (
                <span className='font-medium text-base text-black leading-4 tracking-[0.35px]'>
                  {user?.whatsappProfile?.pushname}
                </span>
              )}
              <span className='bg-[#af52de] text-white text-xs px-2 py-1 rounded leading-3 tracking-[0.35px]'>
                Free
              </span>
            </div>
            <span className='text-sm text-[#494949] leading-[14px] tracking-[0.35px]'>
              {user?.phoneNumber}
            </span>
          </div>
        </div>

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <div key={section.title} className='flex flex-col gap-3'>
            <div className='px-4'>
              <span className='text-sm text-[#494949] leading-4 tracking-[0.35px]'>
                {section.title}
              </span>
            </div>
            {section.items.map(renderMenuItem)}
          </div>
        ))}
      </aside>

      {/* Main Content */}
      <main className='flex-1 py-12 px-2 h-screen overflow-y-auto'>
        <Outlet />
      </main>
    </div>
  )
}
