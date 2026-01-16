'use client'

import { useState, useEffect } from 'react'
import { motion } from '@/components/ui/motion'

interface CatalogNavbarProps {
  organizationName: string
  logoUrl?: string | null
  primaryColor?: string
}

export function CatalogNavbar({ organizationName, logoUrl, primaryColor = '#274472' }: CatalogNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-xl border-b border-gray-200/80 shadow-lg shadow-black/5'
          : 'bg-white/80 backdrop-blur-md border-b border-gray-200/50'
      }`}
    >
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <motion.div
            className="flex items-center gap-4"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            {logoUrl && (
              <motion.img
                src={logoUrl}
                alt={organizationName}
                className="h-12 w-auto object-contain"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            )}
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: primaryColor }}
            >
              {organizationName}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  )
}
