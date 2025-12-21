// import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import LayoutSidebar from '@app/assets/LayoutSidebar.svg?react'
import { useLayout } from '@app/contexts/LayoutContext'
import { Button } from 'antd'
import type { ReactNode } from 'react'

interface DashboardHeaderProps {
  title?: ReactNode
  right?: ReactNode
}

export function DashboardHeader({ title, right }: DashboardHeaderProps) {
  const { collapsed, toggleCollapsed } = useLayout()

  return (
    <div className='flex items-center justify-between pr-6 pl-4 border-b border-gray-200 bg-white sticky top-0 z-10 rounded-t-2xl'>
      <div className='flex items-center gap-4'>
        <span className={'border-r border-gray-200 pr-2 mr-2'}>
          <Button
            type='text'
            icon={
              collapsed ? (
                <LayoutSidebar width={20} />
              ) : (
                <LayoutSidebar width={20} />
              )
            }
            onClick={toggleCollapsed}
          />
        </span>

        {title && (
          <span className={'flex gap-2 text-sm font-semibold'}>{title}</span>
        )}
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}
