'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  Share2,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

const navigation = [
  { name: 'Tableau de bord', href: '/enterprise', icon: LayoutDashboard },
  { name: 'Collaborateurs', href: '/enterprise/employees', icon: Users },
  { name: 'Formations', href: '/enterprise/trainings', icon: GraduationCap },
  { name: 'Documents', href: '/enterprise/documents', icon: FileText },
  { name: 'Facturation', href: '/enterprise/billing', icon: CreditCard },
  { name: 'Statistiques', href: '/enterprise/analytics', icon: BarChart3 },
  { name: 'Partage OPCO', href: '/enterprise/opco-share', icon: Share2 },
]

const secondaryNavigation = [
  { name: 'Paramètres', href: '/enterprise/settings', icon: Settings },
]

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function EnterpriseMobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const { logout } = useAuth()

  if (!isOpen) return null

  return (
    <div className="relative z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-full max-w-xs">
        <div className="flex h-full flex-col bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#274472] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#274472]">eduzen</span>
            </div>
            <button
              type="button"
              className="rounded-md p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              onClick={onClose}
            >
              <span className="sr-only">Fermer</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="px-4 py-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Espace Entreprise
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            <div className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/enterprise' && pathname?.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'group flex items-center px-3 py-3 text-sm font-medium rounded-lg',
                      isActive
                        ? 'bg-[#274472] text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 flex-shrink-0 h-5 w-5',
                        isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="space-y-1">
                {secondaryNavigation.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href)
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex items-center px-3 py-3 text-sm font-medium rounded-lg',
                        isActive
                          ? 'bg-[#274472] text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'mr-3 flex-shrink-0 h-5 w-5',
                          isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'
                        )}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* Logout */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={() => {
                onClose()
                logout()
              }}
              className="group flex items-center w-full px-3 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900"
            >
              <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
