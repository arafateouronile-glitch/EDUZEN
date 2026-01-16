'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  User,
  BookOpen,
  ClipboardList,
  FileText,
  CreditCard,
  MessageSquare,
  Calendar,
  LogOut,
  BookMarked,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

const parentNavigation = [
  { name: 'Dashboard', href: '/portal', icon: LayoutDashboard },
  { name: 'Enfants', href: '/portal/children', icon: User },
  { name: 'Emploi du temps', href: '/portal/schedule', icon: Calendar },
  { name: 'Présences', href: '/portal/attendance', icon: ClipboardList },
  { name: 'Notes', href: '/portal/grades', icon: BookOpen },
  { name: 'Documents', href: '/portal/documents', icon: FileText },
  { name: 'Paiements', href: '/portal/payments', icon: CreditCard },
  { name: 'Messages', href: '/portal/messages', icon: MessageSquare },
]

const studentNavigation = [
  { name: 'Dashboard', href: '/portal', icon: LayoutDashboard },
  { name: 'Profil', href: '/portal/profile', icon: User },
  { name: 'Emploi du temps', href: '/portal/schedule', icon: Calendar },
  { name: 'Présences', href: '/portal/attendance', icon: ClipboardList },
  { name: 'Notes', href: '/portal/grades', icon: BookOpen },
  { name: 'Livrets d\'apprentissage', href: '/portal/portfolios', icon: BookMarked },
  { name: 'Documents', href: '/portal/documents', icon: FileText },
  { name: 'Paiements', href: '/portal/payments', icon: CreditCard },
  { name: 'Messages', href: '/portal/messages', icon: MessageSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  
  const navigation = user?.role === 'parent' ? parentNavigation : studentNavigation

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <h1 className="text-2xl font-bold text-primary">eduzen</h1>
          </div>
          <div className="mt-5 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center px-3 py-3 text-sm font-medium rounded-lg min-touch-target touch-manipulation transition-colors',
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 flex-shrink-0 h-6 w-6',
                        isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
            <div className="px-2 mt-auto">
              <button
                onClick={() => logout()}
                className="group flex items-center w-full px-3 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 min-touch-target touch-manipulation"
              >
                <LogOut className="mr-3 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

