'use client'

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
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useEnterpriseCompany } from '@/lib/contexts/enterprise-company-context'

const navigation = [
  { name: 'Tableau de bord', href: '/enterprise', icon: LayoutDashboard },
  { name: 'Collaborateurs', href: '/enterprise/employees', icon: Users },
  { name: 'Formations', href: '/enterprise/trainings', icon: GraduationCap },
  { name: 'Documents', href: '/enterprise/documents', icon: FileText },
  { name: 'Facturation', href: '/enterprise/billing', icon: CreditCard },
  { name: 'Statistiques', href: '/enterprise/analytics', icon: BarChart3 },
  { name: 'Partage OPCO', href: '/enterprise/opco-share', icon: Share2 },
  { name: 'Diplômes & habilitations', href: '/enterprise/compliance', icon: ShieldCheck },
]

const secondaryNavigation = [
  { name: 'Paramètres', href: '/enterprise/settings', icon: Settings },
]

export function EnterpriseSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const { entityQueryString } = useEnterpriseCompany()

  return (
    <div className="hidden md:flex md:flex-shrink-0 md:h-full">
      <div className="flex flex-col w-64 h-full">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto min-h-0">
          {/* Logo & Company */}
          <div className="flex items-center flex-shrink-0 px-4 mb-2">
            <Link href={`/enterprise${entityQueryString}`} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#274472] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[#274472]">eduzen</span>
            </Link>
          </div>
          <div className="px-4 mb-6">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Espace Entreprise
            </span>
          </div>

          {/* Main Navigation */}
          <div className="mt-2 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const href = `${item.href}${entityQueryString}`
                const isActive = pathname === item.href || (item.href !== '/enterprise' && pathname?.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={href}
                    className={cn(
                      'group flex items-center px-3 py-3 text-sm font-medium rounded-lg min-touch-target touch-manipulation transition-colors',
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
            </nav>

            {/* Secondary Navigation */}
            <div className="px-2 pt-4 mt-4 border-t border-gray-200">
              {secondaryNavigation.map((item) => {
                const href = `${item.href}${entityQueryString}`
                const isActive = pathname === item.href || pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.name}
                    href={href}
                    className={cn(
                      'group flex items-center px-3 py-3 text-sm font-medium rounded-lg min-touch-target touch-manipulation transition-colors',
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

            {/* Logout */}
            <div className="px-2 mt-auto pt-4">
              <button
                onClick={() => logout()}
                className="group flex items-center w-full px-3 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 min-touch-target touch-manipulation"
              >
                <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
