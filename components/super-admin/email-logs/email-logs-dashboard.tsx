'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Mail,
  RefreshCw,
  Search,
  Send,
  CheckCheck,
  Eye,
  MousePointerClick,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { getEmailLogs } from '@/lib/actions/email-logs-actions'
import type { EmailLog, EmailLogStatus } from '@/lib/actions/email-logs-actions'
import { formatDate } from '@/lib/utils'

// ─── Config statuts ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<EmailLogStatus, {
  label: string
  className: string
  icon: React.ReactNode
}> = {
  sent: {
    label: 'Envoyé',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Clock className="h-3 w-3" />,
  },
  delivered: {
    label: 'Délivré',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: <CheckCheck className="h-3 w-3" />,
  },
  opened: {
    label: 'Ouvert',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: <Eye className="h-3 w-3" />,
  },
  clicked: {
    label: 'Cliqué',
    className: 'bg-green-100 text-green-800 border-green-200',
    icon: <MousePointerClick className="h-3 w-3" />,
  },
  bounced: {
    label: 'Rejeté',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="h-3 w-3" />,
  },
  complained: {
    label: 'Spam',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  failed: {
    label: 'Échec',
    className: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="h-3 w-3" />,
  },
}

function StatusBadge({ status }: { status: EmailLogStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.sent
  return (
    <Badge
      variant="outline"
      className={`flex items-center gap-1 font-medium ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </Badge>
  )
}

// ─── Carte de stat ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  colorClass,
}: {
  label: string
  value: number
  icon: React.ReactNode
  colorClass: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg p-2 ${colorClass}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Dashboard principal ────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export function EmailLogsDashboard() {
  const [statusFilter, setStatusFilter] = useState<EmailLogStatus | 'all'>('all')
  const [search, setSearch]             = useState('')
  const [searchInput, setSearchInput]   = useState('')
  const [page, setPage]                 = useState(0)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['email-logs', statusFilter, search, page],
    queryFn: () =>
      getEmailLogs({
        status: statusFilter,
        search,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  })

  const logs  = data?.logs  ?? []
  const total = data?.total ?? 0
  const stats = data?.stats ?? { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complained: 0, failed: 0 }

  const totalPages   = Math.ceil(total / PAGE_SIZE)
  const deliveryRate = total > 0
    ? Math.round(((stats.delivered + stats.opened + stats.clicked) / total) * 100)
    : 0
  const openRate = (stats.delivered + stats.opened + stats.clicked) > 0
    ? Math.round(((stats.opened + stats.clicked) / (stats.delivered + stats.opened + stats.clicked)) * 100)
    : 0

  function handleSearch() {
    setSearch(searchInput.trim())
    setPage(0)
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard
          label="Envoyés"
          value={stats.sent}
          icon={<Send className="h-4 w-4 text-yellow-600" />}
          colorClass="bg-yellow-50"
        />
        <StatCard
          label="Délivrés"
          value={stats.delivered}
          icon={<CheckCheck className="h-4 w-4 text-blue-600" />}
          colorClass="bg-blue-50"
        />
        <StatCard
          label="Ouverts"
          value={stats.opened}
          icon={<Eye className="h-4 w-4 text-green-600" />}
          colorClass="bg-green-50"
        />
        <StatCard
          label="Cliqués"
          value={stats.clicked}
          icon={<MousePointerClick className="h-4 w-4 text-green-600" />}
          colorClass="bg-green-50"
        />
        <StatCard
          label="Rejetés"
          value={stats.bounced}
          icon={<XCircle className="h-4 w-4 text-red-600" />}
          colorClass="bg-red-50"
        />
        <StatCard
          label="Spam"
          value={stats.complained}
          icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
          colorClass="bg-red-50"
        />
        <StatCard
          label="Échecs"
          value={stats.failed}
          icon={<XCircle className="h-4 w-4 text-red-600" />}
          colorClass="bg-red-50"
        />
      </div>

      {/* ── Taux synthèse ── */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Taux de délivraison</p>
              <p className="text-3xl font-bold text-blue-600">{deliveryRate}%</p>
            </div>
            <CheckCheck className="h-8 w-8 text-blue-200" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-muted-foreground">Taux d&apos;ouverture</p>
              <p className="text-3xl font-bold text-green-600">{openRate}%</p>
            </div>
            <Eye className="h-8 w-8 text-green-200" />
          </CardContent>
        </Card>
      </div>

      {/* ── Filtres ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Logs d&apos;emails
              <span className="text-sm font-normal text-muted-foreground">
                ({total.toLocaleString('fr-FR')} au total)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barre de recherche + filtre statut */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un destinataire (jean.dupont@gmail.com)…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              Chercher
            </Button>
            <Select
              value={statusFilter}
              onValueChange={v => { setStatusFilter(v as EmailLogStatus | 'all'); setPage(0) }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="sent">🟡 Envoyé</SelectItem>
                <SelectItem value="delivered">🔵 Délivré</SelectItem>
                <SelectItem value="opened">🟢 Ouvert</SelectItem>
                <SelectItem value="clicked">🟢 Cliqué</SelectItem>
                <SelectItem value="bounced">🔴 Rejeté</SelectItem>
                <SelectItem value="complained">🔴 Spam</SelectItem>
                <SelectItem value="failed">🔴 Échec</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Chargement…</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Mail className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p>Aucun email trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date envoi</TableHead>
                  <TableHead>Mise à jour</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: EmailLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.recipient}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm" title={log.subject}>
                      {log.subject}
                    </TableCell>
                    <TableCell>
                      {log.template_type ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          {log.template_type}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.organization?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.updated_at !== log.created_at ? formatDate(log.updated_at) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} / {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
