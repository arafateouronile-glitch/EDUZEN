'use client'

import { useState } from 'react'
import { EnterpriseSidebar } from '@/components/enterprise/sidebar'
import { EnterpriseHeader } from '@/components/enterprise/header'
import { EnterpriseMobileSidebar } from '@/components/enterprise/mobile-sidebar'

export default function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <EnterpriseMobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Desktop sidebar */}
      <EnterpriseSidebar />

      {/* Main content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        <EnterpriseHeader onMenuClick={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-gray-500 text-center">
              Espace Entreprise EDUZEN - Suivi de vos formations professionnelles
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
