import { UserRole } from '@apps/common'

import type { Route } from './+types/home'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Monorepo' },
    { name: 'description', content: 'Modern project management platform' },
  ]
}

export default function Home() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <header className='text-center mb-12'>
          <h1 className='text-4xl font-bold text-gray-900 mb-4'>
            Monorepo
          </h1>
          <p className='text-xl text-gray-600 mb-8'>
            A modern project management platform built with React Router v7 and
            NestJS
          </p>

          <div className='flex gap-4 justify-center'>
            <a
              href='/login'
              className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors'
            >
              Login
            </a>
            <a
              href='/projects'
              className='bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors'
            >
              View Projects
            </a>
            <a
              href='/tasks'
              className='bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors'
            >
              Manage Tasks
            </a>
          </div>
        </header>

        {/* Features Grid */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mb-12'>
          <div className='bg-white p-6 rounded-lg shadow-sm border'>
            <h3 className='text-xl font-semibold mb-3'>Project Management</h3>
            <p className='text-gray-600'>
              Create, manage, and track your engineering projects with ease.
              Organize tasks, assign team members, and monitor progress.
            </p>
          </div>

          <div className='bg-white p-6 rounded-lg shadow-sm border'>
            <h3 className='text-xl font-semibold mb-3'>Team Collaboration</h3>
            <p className='text-gray-600'>
              Work together with your team members in real-time. Share updates,
              communicate effectively, and stay synchronized.
            </p>
          </div>

          <div className='bg-white p-6 rounded-lg shadow-sm border'>
            <h3 className='text-xl font-semibold mb-3'>Analytics & Reports</h3>
            <p className='text-gray-600'>
              Get insights into your project performance with detailed analytics
              and comprehensive reporting tools.
            </p>
          </div>
        </div>

        {/* Demo Section */}
        <div className='text-center'>
          <h2 className='text-2xl font-bold mb-4'>Getting Started</h2>
          <p className='text-gray-600 mb-6'>
            This application demonstrates the integration of shared types and
            constants from the{' '}
            <code className='bg-gray-200 px-2 py-1 rounded'>
              @apps/common
            </code>{' '}
            package.
          </p>

          <div className='bg-white p-6 rounded-lg shadow-sm border max-w-2xl mx-auto'>
            <h4 className='text-lg font-semibold mb-3'>
              Available User Roles:
            </h4>
            <ul className='text-left space-y-1 mb-4'>
              <li>
                <strong>Admin:</strong>{' '}
                <span className='text-blue-600'>{UserRole.ADMIN}</span>
              </li>
              <li>
                <strong>User:</strong>{' '}
                <span className='text-blue-600'>{UserRole.USER}</span>
              </li>
              <li>
                <strong>Moderator:</strong>{' '}
                <span className='text-blue-600'>{UserRole.MODERATOR}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
