'use client'

import { useState, useEffect } from 'react'
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
  PlayCircle,
  Shield,
  Folder,
  Building2,
  Award,
  Briefcase,
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
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { motion, AnimatePresence } from '@/components/ui/motion'

type NavigationItem = {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  // Rôles autorisés à voir cet élément (si non défini, visible par tous)
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
  // Rôles autorisés à voir cette section (si non défini, visible par tous)
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
          {
            name: t('navigation.admin'),
            icon: Shield,
            allowedRoles: ADMIN_ROLES,
            children: [
              { name: t('navigation.systemHealth'), href: '/dashboard/admin/health', icon: Activity },
              { name: t('navigation.exportHistory'), href: '/dashboard/admin/exports', icon: FileDown },
            ],
          },
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
  // Si le rôle n'est pas encore chargé, retourner la navigation complète pour éviter les problèmes d'hydratation
  if (!userRole) return navigation
  
  return navigation
    .filter(section => {
      // Si la section a des rôles autorisés, vérifier si l'utilisateur a accès
      if (section.allowedRoles && !section.allowedRoles.includes(userRole)) {
        return false
      }
      return true
    })
    .map(section => ({
      ...section,
      items: section.items
        .filter(item => {
          // Si l'élément a des rôles autorisés, vérifier si l'utilisateur a accès
          if (item.allowedRoles && !item.allowedRoles.includes(userRole)) {
            return false
          }
          return true
        })
        .map(item => ({
          ...item,
          // Filtrer également les enfants si présents
          children: item.children?.filter(child => {
            if (child.allowedRoles && !child.allowedRoles.includes(userRole)) {
              return false
            }
            return true
          }),
        })),
    }))
    // Supprimer les sections vides
    .filter(section => section.items.length > 0)
}

export function Sidebar() {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const vocab = useVocabulary() || getVocabulary('school')
  const t = useTranslations()
  const [mounted, setMounted] = useState(false)
  // Utiliser un état pour pathname pour éviter les différences serveur/client
  const [clientPathname, setClientPathname] = useState<string | null>(null)
  
  // Calculer les menus développés de manière synchrone pour éviter les problèmes d'hydratation
  const getExpandedMenus = (): string[] => {
    if (!mounted || !clientPathname) return []
    
    const expanded: string[] = []
    
    // Pédagogie
    if (clientPathname.startsWith('/dashboard/programs') || 
        clientPathname.startsWith('/dashboard/formations') ||
        clientPathname.startsWith('/dashboard/sessions') ||
        clientPathname.startsWith('/dashboard/elearning') ||
        clientPathname.startsWith('/dashboard/catalog')) {
      expanded.push(t('navigation.pedagogy'))
    }
    
    // Suivi
    if (clientPathname.startsWith('/dashboard/attendance') ||
        clientPathname.startsWith('/dashboard/evaluations')) {
      expanded.push(t('navigation.tracking'))
    }
    
    // Finances
    if (clientPathname.startsWith('/dashboard/payments') ||
        clientPathname.startsWith('/dashboard/financial-reports') ||
        clientPathname.startsWith('/dashboard/bpf')) {
      expanded.push(t('navigation.finances'))
    }
    
    // Qualité & Réglementation
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
    
    // Centre d'aide
    if (clientPathname.startsWith('/dashboard/tutorials') ||
        clientPathname.startsWith('/dashboard/documentation') ||
        clientPathname.startsWith('/dashboard/knowledge-base') ||
        clientPathname.startsWith('/dashboard/support')) {
      expanded.push(t('navigation.helpCenter'))
    }
    
    return expanded
  }
  
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  
  // Marquer le composant comme monté après l'hydratation et capturer le pathname côté client
  useEffect(() => {
    setMounted(true)
    setClientPathname(pathname || null)
  }, [pathname])
  
  // Développer automatiquement les menus si l'utilisateur est sur une de leurs pages
  // Utiliser useEffect pour éviter les problèmes d'hydratation
  useEffect(() => {
    if (!mounted || !clientPathname) {
      setExpandedMenus([])
      return
    }
    
    const expanded = getExpandedMenus()
    setExpandedMenus(expanded)
  }, [clientPathname, mounted])

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuName)
        ? prev.filter((name) => name !== menuName)
        : [...prev, menuName]
    )
  }

  const isMenuExpanded = (menuName: string) => {
    if (!mounted) return false // Toujours fermé pendant l'hydratation
    return expandedMenus.includes(menuName)
  }

  const hasActiveChild = (children?: NavigationItem['children']) => {
    if (!children) return false
    return children.some((child) => {
      return pathname === child.href || pathname?.startsWith(child.href + '/')
    })
  }

  // Filtrer la navigation en fonction du rôle de l'utilisateur
  // Ne filtrer qu'après l'hydratation pour éviter les différences serveur/client
  const fullNavigation = getNavigation(vocab, t)
  // Toujours retourner la navigation complète pendant l'hydratation pour éviter les différences
  const navigation = mounted && user?.role
    ? filterNavigationByRole(fullNavigation, user.role)
    : fullNavigation

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-72">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex flex-col flex-grow bg-gradient-to-b from-white via-gray-50/50 to-white backdrop-blur-xl border-r-2 border-gray-200/50 pt-8 pb-6 overflow-y-auto shadow-2xl shadow-gray-900/5"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(249,250,251,0.95), rgba(255,255,255,0.98))',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Animated gradient overlay */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-b from-brand-blue/[0.02] via-transparent to-brand-cyan/[0.02] pointer-events-none"
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />

          {/* Logo Ultra-Premium */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              delay: 0.2,
              type: "spring",
              stiffness: 400,
              damping: 20
            }}
            className="relative flex items-center flex-shrink-0 px-6 mb-8"
          >
            <div className="flex items-center gap-3 group cursor-pointer">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue to-brand-cyan blur-2xl opacity-40 rounded-full animate-pulse" />
                <div className="relative p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-xl shadow-brand-blue/30">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
              </motion.div>
              <div>
                <h1 className="text-2xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-cyan to-brand-blue tracking-tight">
                  eduzen
                </h1>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Premium LMS</p>
              </div>
            </div>
          </motion.div>

          <div className="flex-1 flex flex-col overflow-y-auto relative z-10">
            <nav className="flex-1 px-4 space-y-8">
              {navigation.map((section, sectionIndex) => (
                <div key={section.title}>
                  {/* Section Title Ultra-Premium */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: sectionIndex * 0.08 + 0.3,
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    className="px-3 mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="h-1 w-1 rounded-full bg-gradient-to-r from-brand-blue to-brand-cyan shadow-sm"
                        animate={{
                          scale: [1, 1.3, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: sectionIndex * 0.2
                        }}
                      />
                      <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                        {section.title}
                      </h3>
                    </div>
                  </motion.div>
                  
                  {/* Section Items */}
                  <div className="space-y-1">
                    {section.items.map((item, itemIndex) => {
                      if (item.children) {
                        // Menu avec sous-menu
                        const hasActive = hasActiveChild(item.children)
                        const isExpanded = isMenuExpanded(item.name)
                        
                        return (
                          <motion.div
                            key={item.name}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: sectionIndex * 0.1 + itemIndex * 0.04,
                              duration: 0.4,
                              ease: [0.16, 1, 0.3, 1]
                            }}
                            whileHover={{ x: 4 }}
                          >
                            <motion.button
                              onClick={() => toggleMenu(item.name)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                'group relative flex items-center justify-between w-full px-4 py-3 text-sm font-semibold rounded-xl overflow-hidden',
                                'transition-all duration-300 ease-out',
                                hasActive
                                  ? 'bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-xl shadow-brand-blue/30'
                                  : 'text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-lg'
                              )}
                            >
                              {/* Shine effect */}
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                initial={{ x: '-100%' }}
                                whileHover={{ x: '100%' }}
                                transition={{ duration: 0.6, ease: "easeInOut" }}
                              />

                              <div className="flex items-center relative z-10">
                                <motion.div
                                  className={cn(
                                    'p-1.5 rounded-lg mr-3',
                                    hasActive
                                      ? 'bg-white/20'
                                      : 'bg-gray-100 group-hover:bg-brand-blue/10'
                                  )}
                                  whileHover={{ rotate: 5, scale: 1.1 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                >
                                  <item.icon
                                    className={cn(
                                      'flex-shrink-0 h-4 w-4 transition-colors',
                                      hasActive ? 'text-white' : 'text-gray-500 group-hover:text-brand-blue'
                                    )}
                                  />
                                </motion.div>
                                <span className="tracking-tight">{item.name}</span>
                              </div>
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.3, type: "spring", stiffness: 400, damping: 20 }}
                                className="relative z-10"
                              >
                                <ChevronDown
                                  className={cn(
                                    'h-4 w-4 flex-shrink-0 transition-colors',
                                    hasActive ? 'text-white/90' : 'text-gray-400 group-hover:text-gray-600'
                                  )}
                                />
                              </motion.div>

                              {/* Glow effect for active */}
                              {hasActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/20 to-brand-cyan/20 blur-xl opacity-50" />
                              )}
                            </motion.button>
                            
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                  className="overflow-hidden"
                                >
                                  <div className="ml-4 mt-2 space-y-1 pl-4 border-l-2 border-gradient-to-b from-brand-blue/30 to-brand-cyan/30">
                                    {item.children.map((child, childIndex) => {
                                      if (!child.href) return null
                                      const isChildActive = pathname === child.href || pathname?.startsWith(child.href + '/')
                                      return (
                                        <motion.div
                                          key={child.name}
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{
                                            delay: childIndex * 0.05,
                                            duration: 0.3,
                                            ease: [0.16, 1, 0.3, 1]
                                          }}
                                          whileHover={{ x: 4 }}
                                        >
                                          <Link
                                            href={child.href}
                                            className={cn(
                                              'group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg overflow-hidden',
                                              'transition-all duration-300',
                                              isChildActive
                                                ? 'bg-gradient-to-r from-brand-blue/10 to-brand-cyan/10 text-brand-blue shadow-md'
                                                : 'text-gray-600 hover:bg-white/80 hover:text-gray-900 hover:shadow-sm'
                                            )}
                                          >
                                            {/* Shine effect on child items */}
                                            {!isChildActive && (
                                              <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                                initial={{ x: '-100%' }}
                                                whileHover={{ x: '100%' }}
                                                transition={{ duration: 0.5 }}
                                              />
                                            )}

                                            <motion.div
                                              className={cn(
                                                'p-1 rounded-md mr-3 relative z-10',
                                                isChildActive
                                                  ? 'bg-brand-blue/10'
                                                  : 'bg-gray-100 group-hover:bg-brand-blue/5'
                                              )}
                                              whileHover={{ rotate: 8, scale: 1.1 }}
                                              transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                            >
                                              <child.icon
                                                className={cn(
                                                  'flex-shrink-0 h-3.5 w-3.5 transition-colors',
                                                  isChildActive
                                                    ? 'text-brand-blue'
                                                    : 'text-gray-400 group-hover:text-brand-cyan'
                                                )}
                                              />
                                            </motion.div>
                                            <span className="relative z-10 tracking-tight">{child.name}</span>

                                            {/* Active indicator */}
                                            {isChildActive && (
                                              <motion.div
                                                layoutId={`activeChild-${item.name}`}
                                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-gradient-to-b from-brand-blue to-brand-cyan rounded-r-full"
                                                transition={{
                                                  type: "spring",
                                                  stiffness: 500,
                                                  damping: 30
                                                }}
                                              />
                                            )}
                                          </Link>
                                        </motion.div>
                                      )
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      } else if (item.href) {
                        // Menu simple sans sous-menu
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                        return (
                          <motion.div
                            key={item.name}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: sectionIndex * 0.1 + itemIndex * 0.04,
                              duration: 0.4,
                              ease: [0.16, 1, 0.3, 1]
                            }}
                            whileHover={{ x: 4 }}
                          >
                            <Link
                              href={item.href}
                              className={cn(
                                'group relative flex items-center px-4 py-3 text-sm font-semibold rounded-xl overflow-hidden',
                                'transition-all duration-300 ease-out',
                                isActive
                                  ? 'bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-xl shadow-brand-blue/30'
                                  : 'text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-lg'
                              )}
                            >
                              {/* Shine effect */}
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                initial={{ x: '-100%' }}
                                whileHover={{ x: '100%' }}
                                transition={{ duration: 0.6, ease: "easeInOut" }}
                              />

                              <motion.div
                                className={cn(
                                  'p-1.5 rounded-lg mr-3 relative z-10',
                                  isActive
                                    ? 'bg-white/20'
                                    : 'bg-gray-100 group-hover:bg-brand-blue/10'
                                )}
                                whileHover={{ rotate: 5, scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                              >
                                <item.icon
                                  className={cn(
                                    'flex-shrink-0 h-4 w-4 transition-colors',
                                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-brand-blue'
                                  )}
                                />
                              </motion.div>
                              <span className="relative z-10 tracking-tight">{item.name}</span>

                              {/* Active indicator */}
                              {isActive && (
                                <motion.div
                                  layoutId="activeSidebarItem"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/40 rounded-r-full shadow-lg"
                                  transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 30
                                  }}
                                />
                              )}

                              {/* Glow effect for active */}
                              {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/20 to-brand-cyan/20 blur-xl opacity-50" />
                              )}
                            </Link>
                          </motion.div>
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              ))}
            </nav>
            
            {/* Système (Paramètres & Déconnexion) Ultra-Premium */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 px-4 mt-auto pt-6 space-y-2"
            >
              {/* Séparateur décoratif */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                </div>
                <div className="relative flex justify-center">
                  <motion.div
                    className="px-3 bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full p-0.5"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <div className="bg-white px-2 py-0.5 rounded-full">
                      <span className="text-[9px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-cyan uppercase tracking-widest">Système</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              <motion.div whileHover={{ x: 4 }}>
                <Link
                  href="/dashboard/settings"
                  className={cn(
                    'group relative flex items-center px-4 py-3 text-sm font-semibold rounded-xl overflow-hidden',
                    'transition-all duration-300',
                    pathname?.startsWith('/dashboard/settings')
                      ? 'bg-gradient-to-br from-gray-700 to-gray-800 text-white shadow-xl shadow-gray-700/30'
                      : 'text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-lg'
                  )}
                >
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />

                  <motion.div
                    className={cn(
                      'p-1.5 rounded-lg mr-3 relative z-10',
                      pathname?.startsWith('/dashboard/settings')
                        ? 'bg-white/20'
                        : 'bg-gray-100 group-hover:bg-gray-200'
                    )}
                    whileHover={{ rotate: 90, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Settings
                      className={cn(
                        'flex-shrink-0 h-4 w-4 transition-colors',
                        pathname?.startsWith('/dashboard/settings')
                          ? 'text-white'
                          : 'text-gray-500 group-hover:text-gray-700'
                      )}
                    />
                  </motion.div>
                  <span className="relative z-10 tracking-tight">{t('common.settings')}</span>
                </Link>
              </motion.div>

              <motion.div whileHover={{ x: 4 }}>
                <motion.button
                  onClick={() => logout()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative flex items-center w-full px-4 py-3 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gradient-to-br hover:from-red-50 hover:to-red-100 hover:text-red-600 hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                  />

                  <motion.div
                    className="p-1.5 rounded-lg mr-3 bg-gray-100 group-hover:bg-red-100 transition-colors relative z-10"
                    whileHover={{ rotate: -15, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <LogOut className="flex-shrink-0 h-4 w-4 text-gray-500 group-hover:text-red-500 transition-colors" />
                  </motion.div>
                  <span className="relative z-10 tracking-tight">{t('common.logout')}</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

