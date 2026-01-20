'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Plus,
  Tag,
  FileText,
  UserPlus,
  Gift,
  Download,
  RefreshCw,
  Settings,
  Mail,
} from 'lucide-react'
import Link from 'next/link'

interface QuickAction {
  label: string
  description: string
  icon: React.ReactNode
  href: string
  color: string
}

interface QuickActionsProps {
  className?: string
}

const quickActions: QuickAction[] = [
  {
    label: 'Créer un code promo',
    description: 'Nouveau code promotionnel',
    icon: <Tag className="h-5 w-5" />,
    href: '/super-admin/marketing/promo-codes/new',
    color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
  },
  {
    label: 'Nouvel article',
    description: 'Rédiger un article de blog',
    icon: <FileText className="h-5 w-5" />,
    href: '/super-admin/blog/new',
    color: 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20',
  },
  {
    label: 'Inviter un admin',
    description: 'Ajouter un administrateur',
    icon: <UserPlus className="h-5 w-5" />,
    href: '/super-admin/team/invite',
    color: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
  },
  {
    label: 'Exporter les données',
    description: 'Export CSV des métriques',
    icon: <Download className="h-5 w-5" />,
    href: '/super-admin/analytics/export',
    color: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
  },
]

export function QuickActions({ className }: QuickActionsProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Actions rapides</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              asChild
              className={cn(
                'h-auto flex-col items-start gap-2 p-4 justify-start',
                action.color
              )}
            >
              <Link href={action.href}>
                <div className="flex items-center gap-2 w-full">
                  {action.icon}
                  <span className="font-medium text-sm">{action.label}</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">
                  {action.description}
                </span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
