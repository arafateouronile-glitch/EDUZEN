'use client'

/**
 * Page Actions correctives Qualiopi
 * Liste et gestion des actions correctives liées aux indicateurs.
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { qualiopiService } from '@/lib/services/qualiopi.service.client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Sparkles, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const STATUS_CONFIG = {
  pending: { label: 'À faire', icon: Clock, color: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'En cours', icon: Clock, color: 'bg-[#34B9EE]/10 text-[#34B9EE] border-[#34B9EE]/20' },
  completed: { label: 'Terminée', icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Annulée', icon: XCircle, color: 'bg-slate-100 text-slate-500 border-slate-200' },
}

const PRIORITY_CONFIG = {
  low: { label: 'Basse', color: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Moyenne', color: 'bg-amber-100 text-amber-700' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critique', color: 'bg-red-100 text-red-700' },
}

export default function QualiopiActionsPage() {
  const { user } = useAuth()

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ['qualiopi-corrective-actions', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      try {
        return await qualiopiService.getCorrectiveActions(user.organization_id)
      } catch {
        return []
      }
    },
    enabled: !!user?.organization_id,
  })

  const byStatus = {
    pending: actions.filter((a) => a.status === 'pending'),
    in_progress: actions.filter((a) => a.status === 'in_progress'),
    completed: actions.filter((a) => a.status === 'completed'),
    cancelled: actions.filter((a) => a.status === 'cancelled'),
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/dashboard/qualiopi">
            <Button variant="ghost" size="sm" className="mb-2 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour au dashboard Qualiopi
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-[#274472]" />
            Actions correctives
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Suivez et pilotez les actions correctives liées aux indicateurs Qualiopi.
          </p>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">À faire</p>
            <p className="text-2xl font-bold">{byStatus.pending.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">En cours</p>
            <p className="text-2xl font-bold text-[#34B9EE]">{byStatus.in_progress.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Terminées</p>
            <p className="text-2xl font-bold text-green-600">{byStatus.completed.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{actions.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des actions */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des actions</CardTitle>
          <CardDescription>
            Les actions correctives sont créées à partir du dashboard Qualiopi ou des alertes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Chargement…</p>
          ) : actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">Aucune action corrective</p>
              <p className="text-sm text-slate-500 mt-1">
                Les actions correctives apparaîtront ici lorsqu’elles seront créées depuis le
                dashboard ou les alertes.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/dashboard/qualiopi">Retour au dashboard Qualiopi</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {actions.map((action) => {
                const statusConf = STATUS_CONFIG[action.status] ?? STATUS_CONFIG.pending
                const priorityConf = PRIORITY_CONFIG[action.priority] ?? PRIORITY_CONFIG.medium
                const StatusIcon = statusConf.icon
                return (
                  <li
                    key={action.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800">{action.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                        {action.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className={statusConf.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConf.label}
                        </Badge>
                        <Badge variant="outline" className={priorityConf.color}>
                          {priorityConf.label}
                        </Badge>
                        {action.due_date && (
                          <span className="text-xs text-slate-500">
                            Échéance : {format(new Date(action.due_date), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 shrink-0">
                      Créée le {format(new Date(action.created_at), 'dd MMM yyyy', { locale: fr })}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
