'use client'

import { useState } from 'react'
import { EnterpriseCompanyProvider } from '@/lib/contexts/enterprise-company-context'
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
    <EnterpriseCompanyProvider>
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile sidebar */}
      <EnterpriseMobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Desktop sidebar — à gauche, hauteur pleine sur md */}
      <div className="hidden md:block md:flex-shrink-0 md:h-screen md:overflow-y-auto">
        <EnterpriseSidebar />
      </div>

      {/* Main content — à droite sur desktop */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
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
    </EnterpriseCompanyProvider>
  )
}
