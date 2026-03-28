'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { SuperAdminSidebar } from '@/components/super-admin/sidebar'
import { SuperAdminHeader } from '@/components/super-admin/header'
import { Toaster } from '@/components/ui/sonner'

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('super-admin-sidebar-collapsed')
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
    }

    const handleStorage = () => {
      const saved = localStorage.getItem('super-admin-sidebar-collapsed')
      if (saved !== null) {
        setSidebarCollapsed(saved === 'true')
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const saved = localStorage.getItem('super-admin-sidebar-collapsed')
      if (saved !== null && (saved === 'true') !== sidebarCollapsed) {
        setSidebarCollapsed(saved === 'true')
      }
    }, 100)

    return () => clearInterval(interval)
  }, [sidebarCollapsed])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <SuperAdminSidebar />
      <div
        className={cn(
          'flex flex-col min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'ml-20' : 'ml-[280px]'
        )}
      >
        <SuperAdminHeader sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 p-6">
          {children}
        </main>
        <footer className="border-t bg-card/50 py-4 px-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>EDUZEN Super Admin v1.0.0</p>
            <p>
              Construit avec{' '}
              <span className="text-red-500">♥</span>
              {' '}pour les organismes de formation
            </p>
          </div>
        </footer>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}
