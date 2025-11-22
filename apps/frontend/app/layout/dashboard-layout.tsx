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
} from '@ant-design/icons'
import { useAuth } from '@app/hooks/useAuth'
import { Avatar } from 'antd'
import { Outlet, useNavigate, useLocation } from 'react-router'

interface MenuItem {
  key: string
  label: string
  icon: React.ReactNode
  path: string
}

const accountMenuItems: MenuItem[] = [
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
]

const configMenuItems: MenuItem[] = [
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
]

const helpMenuItems: MenuItem[] = [
  { key: 'faq', label: 'FAQ', icon: <QuestionCircleOutlined />, path: '/faq' },
  {
    key: 'help',
    label: 'Support',
    icon: <QuestionCircleOutlined />,
    path: '/help',
  },
]

export default function DashboardLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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
            ? 'shadow-[0px_0px_1px_0px_rgba(0,0,0,0.4)] font-medium'
            : 'hover:bg-gray-50'
        }
      `}
    >
      <span className='text-lg'>{item.icon}</span>
      <span className='text-base text-[#111b21] w-[123px] leading-4 tracking-[0.35px]'>
        {item.label}
      </span>
    </button>
  )

  return (
    <div className='min-h-screen bg-[#fdfdfd] flex'>
      {/* Sidebar */}
      <aside className='w-[296px] h-screen overflow-y-auto px-6 py-[88px] pb-[133px] flex flex-col gap-16'>
        {/* User Profile */}
        <div className='flex items-center gap-2'>
          <Avatar
            size={40}
            icon={<UserOutlined />}
            className='bg-[#bfbfbf] flex-shrink-0'
          />
          <div className='flex flex-col gap-2 w-[123px]'>
            <div className='flex items-center gap-[10px]'>
              <span className='font-medium text-base text-black leading-4 tracking-[0.35px]'>
                {user?.whatsappProfile?.pushName || 'Mon Business'}
              </span>
              <span className='bg-[#af52de] text-white text-xs px-2 py-1 rounded leading-3 tracking-[0.35px]'>
                Free
              </span>
            </div>
            <span className='text-sm text-[#494949] leading-[14px] tracking-[0.35px]'>
              {user?.phoneNumber || '+237 657 88 86 90'}
            </span>
          </div>
        </div>

        {/* Account Menu */}
        <div className='flex flex-col gap-6'>
          <div className='px-4'>
            <span className='text-sm text-[#494949] leading-4 tracking-[0.35px]'>
              Compte
            </span>
          </div>
          {accountMenuItems.map(renderMenuItem)}
        </div>

        {/* Configuration Menu */}
        <div className='flex flex-col gap-6'>
          <div className='px-4'>
            <span className='text-sm text-[#494949] leading-4 tracking-[0.35px]'>
              Configuration
            </span>
          </div>
          {configMenuItems.map(renderMenuItem)}
        </div>

        {/* Help Menu */}
        <div className='flex flex-col gap-6'>
          <div className='px-4'>
            <span className='text-sm text-[#494949] leading-4 tracking-[0.35px]'>
              Aides
            </span>
          </div>
          {helpMenuItems.map(renderMenuItem)}
        </div>
      </aside>

      {/* Main Content */}
      <main className='flex-1 py-12 px-0 h-screen overflow-y-auto'>
        <Outlet />
      </main>
    </div>
  )
}
