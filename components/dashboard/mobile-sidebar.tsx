'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useVocabulary } from '@/lib/hooks/use-vocabulary'
import { getVocabulary } from '@/lib/utils/vocabulary'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  BookOpen,
  CreditCard,
  FileText,
  ClipboardList,
  Settings,
  LogOut,
  GraduationCap,
  FileCheck,
  ChevronDown,
  BookMarked,
  Calendar,
  Sparkles,
  BarChart3,
  HelpCircle,
  Shield,
  Folder,
  Building2,
  Award,
  Lock,
  BookOpenCheck,
  LifeBuoy,
  Video,
  Activity,
  FileDown,
  Accessibility,
  Globe,
  MapPin,
  Badge,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'

type NavigationItem = {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  allowedRoles?: string[]
  children?: Array<{
    name: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    allowedRoles?: string[]
  }>
}

type NavigationSection = {
  title: string
  items: NavigationItem[]
  allowedRoles?: string[]
}

// Rôles avec accès administratif complet
const ADMIN_ROLES = ['super_admin', 'admin', 'secretary', 'accountant']
// Rôles avec accès aux finances (incluant secrétaire)
const FINANCE_ROLES = ['super_admin', 'admin', 'secretary', 'accountant']
// Rôles avec accès à la gestion des formations
const FORMATION_MANAGEMENT_ROLES = ['super_admin', 'admin', 'secretary']

// Fonction pour générer la navigation avec le vocabulaire adaptatif et les traductions
const getNavigation = (vocab: ReturnType<typeof useVocabulary>, t: (key: string) => string): NavigationSection[] => [
  {
    title: t('navigation.main'),
    items: [
      { name: t('common.dashboard'), href: '/dashboard', icon: LayoutDashboard },
      { name: t('navigation.calendar'), href: '/dashboard/calendar', icon: Calendar },
      { name: t('common.messages'), href: '/dashboard/messages', icon: MessageSquare },
    ],
  },
  {
    title: t('navigation.pedagogy'),
    items: [
      { name: vocab.students, href: '/dashboard/students', icon: Users, allowedRoles: ADMIN_ROLES },
      { name: t('navigation.myStudents'), href: '/dashboard/my-students', icon: Users, allowedRoles: ['teacher'] },
      { name: 'Entreprises & Organismes', href: '/dashboard/entities', icon: Building2, allowedRoles: ADMIN_ROLES },
      {
        name: t('navigation.pedagogy'),
        icon: BookMarked,
        allowedRoles: FORMATION_MANAGEMENT_ROLES,
        children: [
          { name: t('common.programs'), href: '/dashboard/programs', icon: BookOpen },
          { name: t('common.sessions'), href: '/dashboard/sessions', icon: Calendar },
          { name: t('common.formations'), href: '/dashboard/formations', icon: BookMarked },
          { name: t('navigation.elearning'), href: '/dashboard/elearning', icon: GraduationCap },
          { name: 'Catalogue Public', href: '/dashboard/catalog', icon: Globe },
          { name: t('navigation.resources'), href: '/dashboard/resources', icon: Folder },
        ],
      },
      {
        name: t('navigation.tracking'),
        icon: ClipboardList,
        children: [
          { name: vocab.attendance, href: '/dashboard/attendance', icon: ClipboardList },
          { name: vocab.evaluations, href: '/dashboard/evaluations', icon: FileCheck },
          { name: t('navigation.learningPortfolios'), href: '/dashboard/evaluations/portfolios', icon: BookMarked },
          { name: 'Rapports & Analytics', href: '/dashboard/reports', icon: BarChart3 },
        ],
      },
    ],
  },
  {
    title: t('navigation.management'),
    allowedRoles: ADMIN_ROLES,
    items: [
      {
        name: t('navigation.finances'),
        icon: CreditCard,
        allowedRoles: FINANCE_ROLES,
        children: [
          { name: vocab.payments, href: '/dashboard/payments', icon: CreditCard },
          { name: t('navigation.financialReports'), href: '/dashboard/financial-reports', icon: BarChart3 },
          { name: 'Bilan Pédagogique Financier', href: '/dashboard/bpf', icon: BarChart3 },
        ],
      },
      { name: t('navigation.documents'), href: '/dashboard/documents', icon: FileText },
      { name: 'Sites et Antennes', href: '/dashboard/sites', icon: MapPin },
    ],
  },
  {
    title: t('navigation.compliance'),
    allowedRoles: ADMIN_ROLES,
    items: [
      {
        name: t('navigation.qualityRegulation'),
        icon: Shield,
        children: [
          { name: t('navigation.qualiopi'), href: '/dashboard/qualiopi', icon: Award },
          { name: 'Accessibilité Handicap', href: '/dashboard/accessibility', icon: Accessibility },
          { name: t('navigation.cpf'), href: '/dashboard/cpf', icon: GraduationCap },
          { name: 'Certifications RNCP/RS', href: '/dashboard/certifications', icon: Badge },
          { name: t('navigation.opco'), href: '/dashboard/opco', icon: Building2 },
          { name: t('navigation.gdpr'), href: '/dashboard/gdpr', icon: Lock },
          { name: t('navigation.compliance'), href: '/dashboard/compliance', icon: Shield },
          { name: t('navigation.systemHealth'), href: '/dashboard/admin/health', icon: Activity, allowedRoles: ADMIN_ROLES },
          { name: t('navigation.exportHistory'), href: '/dashboard/admin/exports', icon: FileDown, allowedRoles: ADMIN_ROLES },
        ],
      },
    ],
  },
  {
    title: t('navigation.help'),
    items: [
      {
        name: t('navigation.helpCenter'),
        icon: HelpCircle,
        children: [
          { name: t('navigation.videoTutorials'), href: '/dashboard/tutorials', icon: Video },
          { name: t('navigation.documentation'), href: '/dashboard/documentation', icon: BookOpenCheck },
          { name: t('navigation.knowledgeBase'), href: '/dashboard/knowledge-base', icon: BookOpen },
          { name: t('navigation.support'), href: '/dashboard/support', icon: LifeBuoy },
        ],
      },
    ],
  },
]

// Fonction pour filtrer la navigation en fonction du rôle
const filterNavigationByRole = (navigation: NavigationSection[], userRole: string | undefined): NavigationSection[] => {
  if (!userRole) return navigation
  
  return navigation
    .filter(section => {
      if (section.allowedRoles && !section.allowedRoles.includes(userRole)) {
        return false
      }
      return true
    })
    .map(section => ({
      ...section,
      items: section.items
        .filter(item => {
          if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
            return false
          }
          return true
        })
        .map(item => ({
          ...item,
          children: item.children?.filter(child => {
            if (child.allowedRoles && !child.allowedRoles.includes(userRole)) {
              return false
            }
            return true
          }),
        })),
    }))
    .filter(section => section.items.length > 0)
}

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const vocab = useVocabulary() || getVocabulary('school')
  const t = useTranslations()
  const [mounted, setMounted] = useState(false)
  const [clientPathname, setClientPathname] = useState<string | null>(null)

  // Calculer les menus développés
  const getExpandedMenus = (): string[] => {
    if (!mounted || !clientPathname) return []
    
    const expanded: string[] = []
    
    if (clientPathname.startsWith('/dashboard/programs') || 
        clientPathname.startsWith('/dashboard/formations') ||
        clientPathname.startsWith('/dashboard/sessions') ||
        clientPathname.startsWith('/dashboard/elearning') ||
        clientPathname.startsWith('/dashboard/catalog')) {
      expanded.push(t('navigation.pedagogy'))
    }
    
    if (clientPathname.startsWith('/dashboard/attendance') ||
        clientPathname.startsWith('/dashboard/evaluations')) {
      expanded.push(t('navigation.tracking'))
    }
    
    if (clientPathname.startsWith('/dashboard/payments') ||
        clientPathname.startsWith('/dashboard/financial-reports') ||
        clientPathname.startsWith('/dashboard/bpf')) {
      expanded.push(t('navigation.finances'))
    }
    
    if (clientPathname.startsWith('/dashboard/qualiopi') ||
        clientPathname.startsWith('/dashboard/cpf') ||
        clientPathname.startsWith('/dashboard/certifications') ||
        clientPathname.startsWith('/dashboard/opco') ||
        clientPathname.startsWith('/dashboard/gdpr') ||
        clientPathname.startsWith('/dashboard/compliance') ||
        clientPathname.startsWith('/dashboard/accessibility') ||
        clientPathname.startsWith('/dashboard/admin')) {
      expanded.push(t('navigation.qualityRegulation'))
    }
    
    if (clientPathname.startsWith('/dashboard/tutorials') ||
        clientPathname.startsWith('/dashboard/documentation') ||
        clientPathname.startsWith('/dashboard/knowledge-base') ||
        clientPathname.startsWith('/dashboard/support')) {
      expanded.push(t('navigation.helpCenter'))
    }
    
    return expanded
  }
  
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  useEffect(() => {
    setMounted(true)
    setClientPathname(pathname || null)
  }, [pathname])

  useEffect(() => {
    if (!mounted || !clientPathname) {
      setExpandedMenus([])
      return
    }
    
    const expanded = getExpandedMenus()
    setExpandedMenus(expanded)
  }, [clientPathname, mounted, t])

  // Close sidebar when route changes
  useEffect(() => {
    if (isOpen) {
      onClose()
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const isMenuExpanded = (menuName: string) => {
    if (!mounted) return false
    return expandedMenus.includes(menuName)
  }

  const isActive = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  const hasActiveChild = (children?: NavigationItem['children']) => {
    if (!children) return false
    return children.some((child) => {
      return pathname === child.href || pathname?.startsWith(child.href + '/')
    })
  }

  // Filtrer la navigation en fonction du rôle de l'utilisateur
  const fullNavigation = getNavigation(vocab, t)
  const navigation = mounted && user?.role
    ? filterNavigationByRole(fullNavigation, user.role)
    : fullNavigation

  if (!mounted) return null

  const sidebarContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-[110] w-72 bg-white shadow-2xl md:hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
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
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
              {navigation.map((section, sectionIndex) => (
                <div key={section.title}>
                  {/* Section Title */}
                  <div className="px-3 mb-3">
                    <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                      {section.title}
                    </h3>
                  </div>
                  
                  {/* Section Items */}
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      if (item.children) {
                        // Menu avec sous-menu
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
                                    {item.children.map((child) => {
                                      if (!child.href) return null
                                      const isChildActive = isActive(child.href)
                                      return (
                                        <Link
                                          key={child.href}
                                          href={child.href}
                                          className={cn(
                                            'flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200',
                                            isChildActive
                                              ? 'bg-primary/10 text-primary font-medium'
                                              : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                                          )}
                                        >
                                          <child.icon className="h-4 w-4" />
                                          <span>{child.name}</span>
                                        </Link>
                                      )
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      } else if (item.href) {
                        // Menu simple sans sous-menu
                        const isItemActive = isActive(item.href)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                              isItemActive
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
                  </div>
                </div>
              ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 space-y-2">
              {/* Masquer les paramètres pour les enseignants */}
              {user?.role !== 'teacher' && (
                <Link
                  href="/dashboard/settings"
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    pathname?.startsWith('/dashboard/settings')
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  )}
                  onClick={onClose}
                >
                  <Settings className="h-5 w-5" />
                  <span>{t('common.settings')}</span>
                </Link>
              )}
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
                {t('common.logout')}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(sidebarContent, document.body)
}
