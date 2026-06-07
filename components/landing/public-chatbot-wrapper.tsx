'use client'

import { usePathname } from 'next/navigation'
import { SalesChatbot } from './sales-chatbot'

const PUBLIC_PREFIXES = ['/', '/pricing', '/blog', '/formations', '/programmes']

export function PublicChatbotWrapper() {
  const pathname = usePathname()
  const isPublic = PUBLIC_PREFIXES.some(prefix =>
    prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(prefix + '/')
  )
  if (!isPublic) return null
  return <SalesChatbot />
}
