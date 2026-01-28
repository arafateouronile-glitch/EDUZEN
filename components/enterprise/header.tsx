'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Bell, Menu, X, ChevronDown, Building2, User, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Company, CompanyManager } from '@/lib/services/enterprise-portal.service'

interface EnterpriseHeaderProps {
  onMenuClick?: () => void
}

export function EnterpriseHeader({ onMenuClick }: EnterpriseHeaderProps) {
  const { user, logout } = useAuth()
  const supabase = createClient()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Fetch company and manager info
  const { data: managerData } = useQuery({
    queryKey: ['company-manager', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const { data: manager } = await (supabase
        .from('company_managers' as any)
        .select(`
          *,
          company:companies (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single() as any)

      return manager as (CompanyManager & { company: Company }) | null
    },
    enabled: !!user?.id,
  })

  const companyName = managerData?.company?.name || 'Mon Entreprise'
  const managerName = managerData ? `${managerData.first_name} ${managerData.last_name}` : user?.email || ''
  const managerRole = managerData?.role || 'manager'

  const roleLabels: Record<string, string> = {
    director: 'Directeur',
    hr_manager: 'Responsable RH',
    manager: 'Responsable Formation',
    viewer: 'Consultant',
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden -m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            onClick={onMenuClick}
          >
            <span className="sr-only">Ouvrir le menu</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Company info (mobile) */}
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#274472] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-[#274472] truncate max-w-[120px]">
              {companyName}
            </span>
          </div>

          {/* Company info (desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {managerData?.company?.logo_url ? (
              <img
                src={managerData.company.logo_url}
                alt={companyName}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#274472]/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#274472]" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{companyName}</h2>
              <p className="text-sm text-gray-500">Espace Entreprise</p>
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button
              type="button"
              className="relative rounded-full p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span className="sr-only">Notifications</span>
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#274472] flex items-center justify-center text-white font-medium">
                  {managerName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="font-medium text-gray-900 truncate max-w-[120px]">{managerName}</p>
                  <p className="text-xs text-gray-500">{roleLabels[managerRole]}</p>
                </div>
                <ChevronDown className={cn(
                  'h-4 w-4 text-gray-500 transition-transform',
                  isProfileOpen && 'rotate-180'
                )} />
              </button>

              {/* Dropdown menu */}
              {isProfileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsProfileOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                    <div className="p-2">
                      <div className="px-3 py-2 border-b border-gray-100 mb-2">
                        <p className="text-sm font-medium text-gray-900">{managerName}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <Link
                        href="/enterprise/profile"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Mon profil
                      </Link>
                      <Link
                        href="/enterprise/settings"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Paramètres
                      </Link>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false)
                          logout()
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
