'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  CreditCard,
  UserPlus,
  FileText,
  ArrowRight,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'

interface Activity {
  id: string
  type: 'subscription' | 'registration' | 'blog' | 'payment' | 'churn'
  title: string
  description: string
  timestamp: string
  organization?: {
    name: string
    logo?: string
  }
  metadata?: {
    plan?: string
    amount?: number
    status?: 'success' | 'warning' | 'error'
  }
}

interface RecentActivityProps {
  activities?: Activity[]
  loading?: boolean
  className?: string
}

const sampleActivities: Activity[] = [
  {
    id: '1',
    type: 'subscription',
    title: 'Nouvel abonnement Pro',
    description: 'Formation Excellence a souscrit au plan Pro',
    timestamp: 'il y a 5 min',
    organization: { name: 'Formation Excellence' },
    metadata: { plan: 'Pro', status: 'success' },
  },
  {
    id: '2',
    type: 'registration',
    title: 'Nouvelle organisation',
    description: 'Centre Pédagogique Alpha a créé un compte',
    timestamp: 'il y a 23 min',
    organization: { name: 'Centre Pédagogique Alpha' },
    metadata: { plan: 'Essai', status: 'success' },
  },
  {
    id: '3',
    type: 'payment',
    title: 'Paiement échoué',
    description: 'Institut Digital - Tentative de paiement refusée',
    timestamp: 'il y a 1h',
    organization: { name: 'Institut Digital' },
    metadata: { amount: 99, status: 'error' },
  },
  {
    id: '4',
    type: 'churn',
    title: 'Annulation d\'abonnement',
    description: 'Académie Web a annulé son abonnement Premium',
    timestamp: 'il y a 2h',
    organization: { name: 'Académie Web' },
    metadata: { plan: 'Premium', status: 'warning' },
  },
  {
    id: '5',
    type: 'blog',
    title: 'Article publié',
    description: '"Guide complet Qualiopi 2024" est maintenant en ligne',
    timestamp: 'il y a 3h',
    metadata: { status: 'success' },
  },
]

export function RecentActivity({
  activities = sampleActivities,
  loading = false,
  className,
}: RecentActivityProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'subscription':
        return <CreditCard className="h-4 w-4" />
      case 'registration':
        return <UserPlus className="h-4 w-4" />
      case 'blog':
        return <FileText className="h-4 w-4" />
      case 'payment':
        return <CreditCard className="h-4 w-4" />
      case 'churn':
        return <Building2 className="h-4 w-4" />
      default:
        return <CheckCircle2 className="h-4 w-4" />
    }
  }

  const getStatusIcon = (status?: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      case 'warning':
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      case 'error':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />
      default:
        return null
    }
  }

  const getIconBgColor = (type: Activity['type'], status?: string) => {
    if (status === 'error') return 'bg-red-100 text-red-600 dark:bg-red-950/50'
    if (status === 'warning') return 'bg-amber-100 text-amber-600 dark:bg-amber-950/50'

    switch (type) {
      case 'subscription':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50'
      case 'registration':
        return 'bg-brand-blue/10 text-brand-blue'
      case 'blog':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-950/50'
      case 'payment':
        return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50'
      case 'churn':
        return 'bg-red-100 text-red-600 dark:bg-red-950/50'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold">Activité récente</CardTitle>
          <Skeleton className="h-8 w-20" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Activité récente</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/super-admin/activity" className="flex items-center gap-1 text-sm">
            Voir tout
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0',
                  getIconBgColor(activity.type, activity.metadata?.status)
                )}
              >
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{activity.title}</p>
                  {getStatusIcon(activity.metadata?.status)}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </span>
                  {activity.metadata?.plan && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {activity.metadata.plan}
                    </Badge>
                  )}
                  {activity.metadata?.amount && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {activity.metadata.amount}€
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
