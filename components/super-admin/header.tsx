'use client'

import { useState } from 'react'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { usePlatformAdmin } from '@/lib/hooks/use-platform-admin'
import { useAuth } from '@/lib/hooks/use-auth'
import { useTheme } from '@/lib/hooks/use-theme'
import {
  Bell,
  Search,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface SuperAdminHeaderProps {
  sidebarCollapsed?: boolean
}

const routeNames: Record<string, string> = {
  '/super-admin': 'Dashboard',
  '/super-admin/analytics': 'Analytiques',
  '/super-admin/subscriptions': 'Abonnements',
  '/super-admin/subscriptions/plans': 'Plans',
  '/super-admin/subscriptions/invoices': 'Facturation',
  '/super-admin/marketing': 'Marketing',
  '/super-admin/marketing/promo-codes': 'Codes Promo',
  '/super-admin/marketing/referrals': 'Parrainages',
  '/super-admin/blog': 'Blog',
  '/super-admin/blog/categories': 'Catégories',
  '/super-admin/blog/tags': 'Tags',
  '/super-admin/blog/comments': 'Commentaires',
  '/super-admin/team': 'Équipe',
  '/super-admin/settings': 'Paramètres',
}

export function SuperAdminHeader({ sidebarCollapsed = false }: SuperAdminHeaderProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { roleLabel } = usePlatformAdmin()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')

  // Generate breadcrumbs from pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs: { name: string; href: string }[] = []

    let currentPath = ''
    for (const path of paths) {
      currentPath += `/${path}`
      const name = routeNames[currentPath] || path.charAt(0).toUpperCase() + path.slice(1)
      breadcrumbs.push({ name, href: currentPath })
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/80 backdrop-blur-sm px-6',
        'transition-all duration-300',
        sidebarCollapsed ? 'ml-20' : 'ml-[280px]'
      )}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {index < breadcrumbs.length - 1 ? (
                    <BreadcrumbLink asChild>
                      <Link
                        href={crumb.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {crumb.name}
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-sm font-medium">
                      {crumb.name}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher organisations, utilisateurs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* System Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Activity className="h-5 w-5 text-emerald-500" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center justify-between">
              Statut du Système
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Opérationnel
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">API</span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  En ligne
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Base de données</span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  En ligne
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paiements</span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  En ligne
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/super-admin/settings/health" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Voir détails
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                3
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-brand-blue">
                Tout marquer lu
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              <DropdownMenuItem className="flex-col items-start gap-1 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-brand-blue" />
                  <span className="font-medium text-sm">Nouvel abonnement Pro</span>
                </div>
                <p className="text-xs text-muted-foreground pl-4">
                  Formation Excellence a souscrit au plan Pro
                </p>
                <span className="text-[10px] text-muted-foreground pl-4">il y a 5 min</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex-col items-start gap-1 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                  <span className="font-medium text-sm">Alerte paiement</span>
                </div>
                <p className="text-xs text-muted-foreground pl-4">
                  3 paiements en attente depuis plus de 7 jours
                </p>
                <span className="text-[10px] text-muted-foreground pl-4">il y a 1h</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex-col items-start gap-1 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-sm">Article publié</span>
                </div>
                <p className="text-xs text-muted-foreground pl-4">
                  "Guide Qualiopi 2024" est maintenant en ligne
                </p>
                <span className="text-[10px] text-muted-foreground pl-4">il y a 2h</span>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center">
              <Link href="/super-admin/notifications" className="text-sm text-brand-blue">
                Voir toutes les notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              {resolvedTheme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" />
              Clair
              {theme === 'light' && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" />
              Sombre
              {theme === 'dark' && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="mr-2 h-4 w-4" />
              Système
              {theme === 'system' && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Links */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden lg:inline">Liens rapides</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/" target="_blank" className="flex items-center gap-2">
                Site public
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                Dashboard OF
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="https://supabase.com/dashboard"
                target="_blank"
                className="flex items-center gap-2"
              >
                Supabase
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="https://dashboard.stripe.com"
                target="_blank"
                className="flex items-center gap-2"
              >
                Stripe
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
