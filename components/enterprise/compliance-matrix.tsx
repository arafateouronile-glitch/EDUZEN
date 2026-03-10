'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PieChart, Pie, Cell, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Download,
  Plus,
  FileText,
  Shield,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ComplianceStatus = 'expired' | 'warning' | 'valid'

interface ComplianceRecord {
  id: string
  company_employee_id: string
  diploma_type_id: string
  diploma_name: string
  diploma_color: string
  first_name: string
  last_name: string
  email: string
  department: string | null
  job_title: string | null
  expiry_date: string
  issued_at: string | null
  days_until_expiry: number
  status: ComplianceStatus
  document_url: string | null
}

interface ComplianceStats {
  total: number
  expired: number
  warning: number
  valid: number
}

interface DiplomaType {
  id: string
  name: string
  color: string
  default_validity_months: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ComplianceStatus, {
  label: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
  chart: string
}> = {
  expired: {
    label: 'Expiré',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <XCircle className="w-4 h-4" />,
    chart: '#EF4444',
  },
  warning: {
    label: 'À renouveler',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <AlertTriangle className="w-4 h-4" />,
    chart: '#F59E0B',
  },
  valid: {
    label: 'Valide',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: <CheckCircle2 className="w-4 h-4" />,
    chart: '#10B981',
  },
}

function StatusBadge({ status }: { status: ComplianceStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function exportCSV(records: ComplianceRecord[]) {
  const header = ['Prénom', 'Nom', 'Email', 'Service', 'Poste', 'Habilitation', "Date d'expiration", 'Statut', 'Jours restants']
  const rows = records.map(r => [
    r.first_name,
    r.last_name,
    r.email,
    r.department || '',
    r.job_title || '',
    r.diploma_name,
    r.expiry_date,
    STATUS_CONFIG[r.status].label,
    r.days_until_expiry.toString(),
  ])
  const csv = [header, ...rows].map(row => row.map(v => `"${v}"`).join(';')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `conformite_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Ring Chart ───────────────────────────────────────────────────────────────

function ComplianceRingChart({ stats }: { stats: ComplianceStats }) {
  const pct = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0
  const data = [
    { name: 'Expirés',    value: stats.expired, color: STATUS_CONFIG.expired.chart },
    { name: 'À renouveler', value: stats.warning, color: STATUS_CONFIG.warning.chart },
    { name: 'Valides',    value: stats.valid,   color: STATUS_CONFIG.valid.chart },
  ].filter(d => d.value > 0)

  return (
    <div className="relative flex flex-col items-center justify-center w-[160px] h-[160px]">
      <PieChart width={160} height={160}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={72}
          startAngle={90}
          endAngle={-270}
          strokeWidth={0}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [value, name]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
      </PieChart>
      <div className="absolute flex flex-col items-center justify-center pointer-events-none inset-0">
        <span className="text-3xl font-bold text-gray-900">{pct}%</span>
        <span className="text-xs text-gray-500 mt-0.5">conformes</span>
      </div>
    </div>
  )
}

// ─── Add Diploma Dialog ────────────────────────────────────────────────────────

function AddDiplomaDialog({
  companyId,
  employees,
  diplomaTypes,
  onSuccess,
}: {
  companyId: string
  employees: { id: string; first_name: string; last_name: string }[]
  diplomaTypes: DiplomaType[]
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    company_employee_id: '',
    diploma_type_id: '',
    expiry_date: '',
    issued_at: '',
    notes: '',
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/enterprise/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, company_id: companyId }),
      })
      if (!res.ok) throw new Error(await res.text())
    },
    onSuccess: () => {
      setOpen(false)
      setForm({ company_employee_id: '', diploma_type_id: '', expiry_date: '', issued_at: '', notes: '' })
      onSuccess()
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 bg-[#274472] hover:bg-[#1d3556]">
          <Plus className="w-4 h-4" />
          Ajouter une habilitation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle habilitation</DialogTitle>
          <DialogDescription className="sr-only">
            Formulaire pour enregistrer une nouvelle habilitation ou certification pour un salarié.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Salarié</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.company_employee_id}
              onChange={e => setForm(f => ({ ...f, company_employee_id: e.target.value }))}
            >
              <option value="">Sélectionner un salarié…</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Type d&apos;habilitation</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.diploma_type_id}
              onChange={e => setForm(f => ({ ...f, diploma_type_id: e.target.value }))}
            >
              <option value="">Sélectionner une habilitation…</option>
              {diplomaTypes.map(dt => (
                <option key={dt.id} value={dt.id}>{dt.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Date d&apos;obtention</label>
              <Input type="date" value={form.issued_at} onChange={e => setForm(f => ({ ...f, issued_at: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Date d&apos;expiration *</label>
              <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optionnel…" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              className="bg-[#274472] hover:bg-[#1d3556]"
              disabled={!form.company_employee_id || !form.diploma_type_id || !form.expiry_date || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
          {mutation.isError && (
            <p className="text-sm text-red-600">Erreur lors de l&apos;enregistrement.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main ComplianceMatrix ─────────────────────────────────────────────────────

interface ComplianceMatrixProps {
  companyId: string
  employees?: { id: string; first_name: string; last_name: string }[]
}

export function ComplianceMatrix({ companyId, employees = [] }: ComplianceMatrixProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<ComplianceStatus | 'all'>('all')

  // Fetch conformité
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['compliance', companyId, activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ company_id: companyId })
      if (activeFilter !== 'all') params.set('status', activeFilter)
      const res = await fetch(`/api/enterprise/compliance?${params}`)
      if (!res.ok) throw new Error('Erreur chargement conformité')
      return res.json() as Promise<{ records: ComplianceRecord[]; stats: ComplianceStats }>
    },
    enabled: !!companyId,
  })

  // Fetch types d'habilitations
  const { data: diplomaTypes = [] } = useQuery<DiplomaType[]>({
    queryKey: ['diploma-types'],
    queryFn: async () => {
      const res = await fetch('/api/enterprise/diploma-types')
      if (!res.ok) return []
      return res.json()
    },
  })

  // Suppression
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/enterprise/compliance?id=${id}`, { method: 'DELETE' })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['compliance', companyId] }),
  })

  // Filtrage client (recherche)
  const filtered = useMemo(() => {
    if (!data?.records) return []
    if (!search) return data.records
    const q = search.toLowerCase()
    return data.records.filter(r =>
      `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
      r.diploma_name.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q)
    )
  }, [data?.records, search])

  const stats = data?.stats ?? { total: 0, expired: 0, warning: 0, valid: 0 }
  const conformityPct = stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0

  const handleRefresh = useCallback(() => { refetch() }, [refetch])

  // ── Stat cards ────────────────────────────────────────────────────────────

  const statCards: { key: ComplianceStatus | 'all'; label: string; count: number; color: string; bg: string; border: string }[] = [
    { key: 'all',     label: 'Total',         count: stats.total,   color: 'text-gray-700', bg: 'bg-gray-50',   border: 'border-gray-200' },
    { key: 'expired', label: 'Expirés',        count: stats.expired, color: 'text-red-700',  bg: 'bg-red-50',    border: 'border-red-200' },
    { key: 'warning', label: 'À renouveler',   count: stats.warning, color: 'text-amber-700',bg: 'bg-amber-50',  border: 'border-amber-200' },
    { key: 'valid',   label: 'Valides',        count: stats.valid,   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  ]

  return (
    <div className="space-y-6">

      {/* ── En-tête + actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#274472]" />
            Validité des diplômes & habilitations
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Suivi des habilitations, certifications et recyclages des collaborateurs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={filtered.length === 0}
            onClick={() => exportCSV(filtered)}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <AddDiplomaDialog
            companyId={companyId}
            employees={employees}
            diplomaTypes={diplomaTypes}
            onSuccess={handleRefresh}
          />
        </div>
      </div>

      {/* ── Synthèse : Ring + Stat Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Ring chart */}
        <Card className="lg:col-span-2 flex items-center justify-center py-4">
          <CardContent className="pt-0 flex flex-col items-center gap-3 w-full">
            <ComplianceRingChart stats={stats} />
            <div className="w-full px-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Taux de conformité global</span>
                <span className="font-semibold text-gray-800">{conformityPct}%</span>
              </div>
              <Progress
                value={conformityPct}
                className="h-2"
              />
            </div>
            <div className="flex gap-4 text-xs">
              {(['expired', 'warning', 'valid'] as ComplianceStatus[]).map(s => (
                <div key={s} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_CONFIG[s].chart }} />
                  <span className="text-gray-600">{STATUS_CONFIG[s].label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stat cards cliquables */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-3">
          {statCards.map(card => (
            <button
              key={card.key}
              onClick={() => setActiveFilter(card.key)}
              className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left ${
                activeFilter === card.key
                  ? `${card.border} ${card.bg} shadow-sm ring-2 ring-offset-1 ring-current`
                  : `border-gray-100 bg-white hover:${card.bg} hover:${card.border}`
              } ${card.color}`}
            >
              <span className="text-3xl font-bold">{card.count}</span>
              <span className="text-sm font-medium mt-0.5">{card.label}</span>
              {card.key === 'expired' && card.count > 0 && (
                <span className="text-xs mt-1 opacity-75">Action requise</span>
              )}
              {card.key === 'warning' && card.count > 0 && (
                <span className="text-xs mt-1 opacity-75">&lt; 6 mois</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tableau ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold text-gray-800">
              Détail des habilitations
              {activeFilter !== 'all' && (
                <Badge className="ml-2 text-xs" variant="secondary">
                  {STATUS_CONFIG[activeFilter].label}
                </Badge>
              )}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Rechercher un salarié ou habilitation…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Shield className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Aucune habilitation trouvée</p>
              <p className="text-xs mt-1">Ajoutez des certifications via le bouton ci-dessus</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Salarié</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Habilitation</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Service</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Expiration</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Statut</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50/60 transition-colors group">
                      {/* Salarié */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#274472]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-[#274472]">
                              {record.first_name?.[0]}{record.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{record.first_name} {record.last_name}</p>
                            <p className="text-xs text-gray-500">{record.job_title || record.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Habilitation */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: record.diploma_color || '#274472' }}
                          />
                          <span className="font-medium text-gray-800">{record.diploma_name}</span>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="px-4 py-3 text-gray-600">
                        {record.department || <span className="text-gray-300">—</span>}
                      </td>

                      {/* Expiration */}
                      <td className="px-4 py-3">
                        <div>
                          <p className={`font-medium ${record.status === 'expired' ? 'text-red-700' : record.status === 'warning' ? 'text-amber-700' : 'text-gray-700'}`}>
                            {formatDate(record.expiry_date)}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {record.days_until_expiry < 0
                              ? `Expiré il y a ${Math.abs(record.days_until_expiry)} j`
                              : `${record.days_until_expiry} j restants`}
                          </p>
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3">
                        <StatusBadge status={record.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {record.document_url && (
                            <a
                              href={record.document_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Voir le document"
                            >
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <FileText className="w-4 h-4 text-gray-500" />
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm('Supprimer cette habilitation ?')) {
                                deleteMutation.mutate(record.id)
                              }
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
