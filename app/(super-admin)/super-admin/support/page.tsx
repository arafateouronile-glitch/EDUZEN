'use client'

import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { PlatformAdminGuard } from '@/components/super-admin/platform-admin-guard'
import { StatsCard } from '@/components/super-admin/dashboard/stats-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-shadcn'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, AlertCircle, Clock, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

type Ticket = {
  id: string
  ticket_number: string
  subject: string
  description: string
  status: string
  priority: string
  created_at: string
  organization_id: string
  user?: { full_name?: string; email?: string }
  assigned_user?: { full_name?: string; email?: string } | null
  category?: { name?: string } | null
  organization?: { id: string; name?: string } | null
}

const statusLabels: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  waiting_customer: 'En attente client',
  resolved: 'Résolu',
  closed: 'Fermé',
}

const priorityLabels: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Élevée',
  urgent: 'Urgente',
}

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_customer: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
}

export default function SuperAdminSupportPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const { data: tickets = [], isLoading, refetch } = useQuery<Ticket[]>({
    queryKey: ['super-admin-support-tickets', statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      const res = await fetch(`/api/super-admin/support/tickets?${params}`)
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
  })

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length,
  }

  return (
    <PlatformAdminGuard>
      <div className="space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-bold">Support client</h1>
          <p className="text-muted-foreground">
            Consulter et gérer les tickets de support de toutes les organisations
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard title="Total" value={stats.total} icon={<MessageSquare className="h-4 w-4" />} />
          <StatsCard title="Ouverts" value={stats.open} icon={<AlertCircle className="h-4 w-4" />} />
          <StatsCard title="En cours" value={stats.inProgress} icon={<Clock className="h-4 w-4" />} />
          <StatsCard title="Résolus / Fermés" value={stats.resolved} icon={<CheckCircle className="h-4 w-4" />} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Tickets</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Aucun ticket trouvé
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Sujet</TableHead>
                    <TableHead>Demandeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-sm">
                        {ticket.ticket_number}
                      </TableCell>
                      <TableCell>
                        {(ticket.organization as { name?: string })?.name || ticket.organization_id?.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{ticket.subject}</span>
                        {ticket.category?.name && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({ticket.category.name})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {ticket.user?.full_name || ticket.user?.email || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[ticket.status] || ''}>
                          {statusLabels[ticket.status] || ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityColors[ticket.priority] || ''}>
                          {priorityLabels[ticket.priority] || ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(ticket.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/super-admin/support/${ticket.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformAdminGuard>
  )
}
