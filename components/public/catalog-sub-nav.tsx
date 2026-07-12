'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { BookOpen, MessageSquare, Mail, Calendar, Accessibility, type LucideIcon } from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  message: MessageSquare,
  mail: Mail,
  calendar: Calendar,
  accessibility: Accessibility,
}

export interface SubNavLink {
  href: string
  label: string
  /** Clé texte plutôt que le composant icône lui-même : un Server Component ne peut
   * pas transmettre une référence de fonction/composant à un Client Component. */
  iconKey: keyof typeof ICONS
}

interface CatalogSubNavProps {
  primaryColor: string
  hasNavbar: boolean
  hasTestimonials: boolean
  links?: SubNavLink[]
}

export function CatalogSubNav({ primaryColor, hasNavbar, hasTestimonials, links: linksProp }: CatalogSubNavProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 560)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const links: SubNavLink[] = linksProp ?? [
    { href: '#programmes', label: 'Programmes', iconKey: 'book' },
    ...(hasTestimonials ? [{ href: '#avis', label: 'Avis', iconKey: 'message' as const }] : []),
    { href: '#contact', label: 'Contact', iconKey: 'mail' },
  ]

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed left-0 right-0 z-50 ${hasNavbar ? 'top-20' : 'top-0'} bg-white/90 backdrop-blur-xl border-b border-gray-200/60 shadow-sm`}
        >
          <div className="container mx-auto px-6 lg:px-8">
            <div className="flex items-center gap-1 h-12">
              {links.map((link) => {
                const Icon = ICONS[link.iconKey]
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-colors"
                  >
                    <Icon
                      className="w-3.5 h-3.5 text-gray-400 group-hover:text-[var(--subnav-accent)] transition-colors"
                      style={{ '--subnav-accent': primaryColor } as React.CSSProperties}
                    />
                    {link.label}
                  </a>
                )
              })}
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
