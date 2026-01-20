'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { SuperAdminSidebar } from '@/components/super-admin/sidebar'
import { SuperAdminHeader } from '@/components/super-admin/header'
import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { Toaster } from '@/components/ui/sonner'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Sync with localStorage
  useEffect(() => {
    const saved = localStorage.getItem('super-admin-sidebar-collapsed')
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
    }

    // Listen for changes
    const handleStorage = () => {
      const saved = localStorage.getItem('super-admin-sidebar-collapsed')
      if (saved !== null) {
        setSidebarCollapsed(saved === 'true')
      }
    }

    window.addEventListener('storage', handleStorage)

    // Also listen for custom events (for same-tab updates)
    const observer = new MutationObserver(() => {
      const saved = localStorage.getItem('super-admin-sidebar-collapsed')
      if (saved !== null) {
        setSidebarCollapsed(saved === 'true')
      }
    })

    return () => {
      window.removeEventListener('storage', handleStorage)
      observer.disconnect()
    }
  }, [])

  // Poll for sidebar state changes (simple solution)
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
    <PlatformAdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Sidebar */}
        <SuperAdminSidebar />

        {/* Main Content */}
        <div
          className={cn(
            'flex flex-col min-h-screen transition-all duration-300',
            sidebarCollapsed ? 'ml-20' : 'ml-[280px]'
          )}
        >
          {/* Header */}
          <SuperAdminHeader sidebarCollapsed={sidebarCollapsed} />

          {/* Page Content */}
          <main className="flex-1 p-6">
            {children}
          </main>

          {/* Footer */}
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
    </PlatformAdminGuard>
  )
}
