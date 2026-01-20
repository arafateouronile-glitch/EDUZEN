'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  LayoutDashboard,
  CreditCard,
  Users,
  FileText,
  Tag,
  Gift,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Shield,
  TrendingUp,
  Megaphone,
  PenTool,
  FolderOpen,
  MessageSquare,
  UserPlus,
  BarChart3,
  Receipt,
  Percent,
  Share2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuth } from '@/lib/hooks/use-auth'
import { Separator } from '@/components/ui/separator'

type NavItem = {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  badge?: string | number
  children?: NavItem[]
}

type NavSection = {
  title: string
  items: NavItem[]
}

const navigation: NavSection[] = [
  {
    title: 'Principal',
    items: [
      {
        name: 'Dashboard',
        href: '/super-admin',
        icon: LayoutDashboard,
        permission: 'view_dashboard',
      },
      {
        name: 'Analytiques',
        href: '/super-admin/analytics',
        icon: BarChart3,
        permission: 'view_revenue',
      },
    ],
  },
  {
    title: 'Gestion',
    items: [
      {
        name: 'Abonnements',
        icon: CreditCard,
        permission: 'manage_subscriptions',
        children: [
          {
            name: 'Organisations',
            href: '/super-admin/subscriptions',
            icon: Users,
          },
          {
            name: 'Plans',
            href: '/super-admin/subscriptions/plans',
            icon: Sparkles,
          },
          {
            name: 'Facturation',
            href: '/super-admin/subscriptions/invoices',
            icon: Receipt,
            permission: 'manage_invoices',
          },
        ],
      },
      {
        name: 'Marketing',
        icon: Megaphone,
        permission: 'manage_promo_codes',
        children: [
          {
            name: 'Codes Promo',
            href: '/super-admin/marketing/promo-codes',
            icon: Percent,
          },
          {
            name: 'Parrainages',
            href: '/super-admin/marketing/referrals',
            icon: Share2,
            permission: 'manage_referrals',
          },
        ],
      },
    ],
  },
  {
    title: 'Contenu',
    items: [
      {
        name: 'Blog',
        icon: PenTool,
        permission: 'manage_blog',
        children: [
          {
            name: 'Articles',
            href: '/super-admin/blog',
            icon: FileText,
          },
          {
            name: 'Catégories',
            href: '/super-admin/blog/categories',
            icon: FolderOpen,
          },
          {
            name: 'Tags',
            href: '/super-admin/blog/tags',
            icon: Tag,
          },
          {
            name: 'Commentaires',
            href: '/super-admin/blog/comments',
            icon: MessageSquare,
            permission: 'moderate_comments',
          },
        ],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        name: 'Équipe',
        href: '/super-admin/team',
        icon: UserPlus,
        permission: 'manage_team',
      },
      {
        name: 'Paramètres',
        href: '/super-admin/settings',
        icon: Settings,
        permission: 'view_dashboard',
      },
    ],
  },
]

export function SuperAdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['Abonnements', 'Blog'])
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { role, roleLabel, hasPermission, isPlatformAdmin } = usePlatformAdmin()

  // Restore collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('super-admin-sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  // Save collapsed state
  const toggleCollapsed = () => {
    const newValue = !isCollapsed
    setIsCollapsed(newValue)
    localStorage.setItem('super-admin-sidebar-collapsed', String(newValue))
  }

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    )
  }

  const isActiveRoute = (href: string) => {
    if (href === '/super-admin') {
      return pathname === '/super-admin'
    }
    return pathname.startsWith(href)
  }

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasAccess = !item.permission || hasPermission(item.permission as any)
    if (!hasAccess) return null

    const isExpanded = expandedItems.includes(item.name)
    const hasChildren = item.children && item.children.length > 0
    const isActive = item.href ? isActiveRoute(item.href) : false
    const Icon = item.icon

    // Filter children by permission
    const accessibleChildren = item.children?.filter(
      (child) => !child.permission || hasPermission(child.permission as any)
    )

    if (hasChildren && accessibleChildren?.length === 0) return null

    const content = (
      <>
        <div className="flex items-center gap-3">
          <Icon
            className={cn(
              'h-5 w-5 flex-shrink-0 transition-colors',
              isActive
                ? 'text-brand-blue'
                : 'text-muted-foreground group-hover:text-foreground'
            )}
          />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className={cn(
                  'text-sm font-medium whitespace-nowrap',
                  isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                )}
              >
                {item.name}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {!isCollapsed && hasChildren && (
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        )}
        {!isCollapsed && item.badge && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-blue px-1.5 text-[10px] font-semibold text-white">
            {item.badge}
          </span>
        )}
      </>
    )

    const itemClasses = cn(
      'group flex w-full items-center justify-between rounded-lg px-3 py-2.5 transition-all',
      isActive
        ? 'bg-brand-blue/10 text-foreground'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      depth > 0 && 'ml-4 w-[calc(100%-1rem)]'
    )

    return (
      <div key={item.name}>
        {hasChildren ? (
          <>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => toggleExpanded(item.name)}
                    className={itemClasses}
                  >
                    {content}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="font-medium">
                    {item.name}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <AnimatePresence>
              {isExpanded && !isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-1 space-y-1 overflow-hidden"
                >
                  {accessibleChildren?.map((child) => renderNavItem(child, depth + 1))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={item.href!} className={itemClasses}>
                  {content}
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="font-medium">
                  {item.name}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-card',
        'shadow-lg dark:shadow-none'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">EDUZEN</span>
                <span className="text-[10px] font-medium text-brand-blue">Super Admin</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-brand-cyan"
            >
              <Shield className="h-5 w-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="h-8 w-8 rounded-lg"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-6">
          {navigation.map((section) => (
            <div key={section.title}>
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {section.title}
                  </motion.h3>
                )}
              </AnimatePresence>
              <div className="space-y-1">
                {section.items.map((item) => renderNavItem(item))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User Section */}
      <div className="border-t p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted',
            isCollapsed && 'justify-center'
          )}
        >
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback className="bg-brand-blue text-white text-xs font-semibold">
              {user?.full_name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase() || 'SA'}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden"
              >
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.full_name || 'Admin'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {roleLabel || 'Super Admin'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {!isCollapsed && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => logout()}
                    className="h-8 w-8 flex-shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Déconnexion</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
