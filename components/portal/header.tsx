'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { Bell } from 'lucide-react'

export function Header() {
  const { user } = useAuth()

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {user?.role === 'parent' ? 'Espace Parent' : 'Espace Étudiant'}
          </h2>
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 min-touch-target touch-manipulation">
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500">
                {user?.role === 'parent' ? 'Parent' : 'Étudiant'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

