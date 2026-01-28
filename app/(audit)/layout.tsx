/**
 * Layout pour le portail auditeur public
 * Ne nécessite pas d'authentification - accès via token
 */

import { Inter } from 'next/font/google'
import '@/app/globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Portail Auditeur - EDUZEN',
  description: 'Accès auditeur externe à la conformité Qualiopi',
  robots: 'noindex, nofollow', // Ne pas indexer les pages d'audit
}

export default function AuditLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={inter.className}>
      <body className="min-h-screen bg-[#F9FAFB] antialiased">
        {children}
      </body>
    </html>
  )
}
