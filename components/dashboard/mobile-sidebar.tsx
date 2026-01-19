'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  FileText,
  ClipboardList,
  Settings,
  LogOut,
  Library,
  GraduationCap,
  FileCheck,
  ChevronDown,
  ChevronRight,
  BookMarked,
  Calendar,
  Sparkles,
  X,
  Menu,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'

type NavigationItem =
  | {
      name: string
      href: string
      icon: React.ComponentType<{ className?: string }>
    }
  | {
      name: string
      icon: React.ComponentType<{ className?: string }>
      children: Array<{
        name: string
        href: string
        icon: React.ComponentType<{ className?: string }>
      }>
    }

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Élèves', href: '/dashboard/students', icon: Users },
  {
    name: 'Bibliothèque',
    icon: Library,
    children: [
      { name: 'Programmes', href: '/dashboard/programs', icon: BookOpen },
      { name: 'Formations', href: '/dashboard/formations', icon: BookMarked },
      { name: 'Sessions', href: '/dashboard/sessions', icon: Calendar },
      { name: 'E-learning', href: '/dashboard/elearning', icon: GraduationCap },
      { name: 'Évaluations', href: '/dashboard/evaluations', icon: FileCheck },
    ],
  },
  { name: 'Paiements', href: '/dashboard/payments', icon: CreditCard },
  { name: 'Émargement', href: '/dashboard/attendance', icon: ClipboardList },
  { name: 'Documents', href: '/dashboard/documents', icon: FileText },
  { name: 'Paramètres', href: '/dashboard/settings', icon: Settings },
]

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    if (pathname?.startsWith('/dashboard/programs') || 
        pathname?.startsWith('/dashboard/formations') ||
        pathname?.startsWith('/dashboard/sessions') ||
        pathname?.startsWith('/dashboard/elearning') || 
        pathname?.startsWith('/dashboard/evaluations')) {
      return ['Bibliothèque']
    }
    return []
  })

  // Close sidebar when route changes
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuName)
        ? prev.filter((name) => name !== menuName)
        : [...prev, menuName]
    )
  }

  const isMenuExpanded = (menuName: string) => expandedMenus.includes(menuName)

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  const hasActiveChild = (children: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }> | undefined) => {
    if (!children) return false
    return children.some((child: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }) => {
      return 'href' in child && isActive(child.href)
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl md:hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                  <Sparkles className="h-6 w-6 text-primary relative z-10" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  eduzen
                </h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              {navigation.map((item, index) => {
                if ('children' in item && item.children) {
                  const hasActive = hasActiveChild(item.children)
                  const isExpanded = isMenuExpanded(item.name)
                  
                  return (
                    <div key={item.name}>
                      <button
                        onClick={() => toggleMenu(item.name)}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                          hasActive
                            ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/25'
                            : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <item.icon className="h-5 w-5" />
                          <span>{item.name}</span>
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 mt-2 space-y-1">
                              {item.children.map((child) => (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className={cn(
                                    'flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200',
                                    isActive(child.href)
                                      ? 'bg-primary/10 text-primary font-medium'
                                      : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                                  )}
                                >
                                  <child.icon className="h-4 w-4" />
                                  <span>{child.name}</span>
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                }

                if ('href' in item) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive(item.href)
                          ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/25'
                          : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                }
                return null
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 space-y-2">
              {user && (
                <div className="px-4 py-2 text-sm text-gray-600">
                  <p className="font-medium">{user.email}</p>
                </div>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  logout()
                  onClose()
                }}
                className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

