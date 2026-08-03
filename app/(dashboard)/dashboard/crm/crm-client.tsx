'use client'

import { useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LearnerPipeline } from '@/components/dashboard/crm/learner-pipeline'
import type { CrmStatus, LearnerCard, LearnerPipelineData } from '@/lib/actions/learner-crm-actions'
import { COMMERCIAL_STATUS_LABELS, type ProspectCommercialStatus } from '@/lib/constants/crm-commercial-status'

async function fetchPipeline(): Promise<LearnerPipelineData> {
  const res = await fetch('/api/crm/pipeline')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
import { Activity, RefreshCw, Search, SlidersHorizontal, X, AlertTriangle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface Filters {
  search: string
  formation: string
  session: string
  program: string
  programCategory: string
  entityType: 'company' | 'individual' | ''
  commercialStatus: ProspectCommercialStatus | ''
  status: CrmStatus | ''
  dateFrom: string
  dateTo: string
  qualiopiOnly: boolean
}

const EMPTY_FILTERS: Filters = {
  search: '', formation: '', session: '', program: '', programCategory: '', entityType: '', commercialStatus: '',
  status: '', dateFrom: '', dateTo: '', qualiopiOnly: false,
}

const STATUS_LABELS: Record<CrmStatus, string> = {
  prospect: 'Prospects', inscrit: 'Inscrits',
  en_cours: 'En formation', termine: 'Terminés', abandon: 'Abandons',
}

export function CrmClientPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['learner-pipeline'],
    queryFn: fetchPipeline,
    staleTime: 2 * 60 * 1000,
  })

  const [filters, setFilters]        = useState<Filters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const set = (patch: Partial<Filters>) => setFilters(f => ({ ...f, ...patch }))

  const allCards = useMemo<LearnerCard[]>(() => {
    if (!data) return []
    return (Object.values(data) as LearnerCard[][]).flat()
  }, [data])

  const formations = useMemo(() =>
    [...new Set(allCards.map(c => c.formation_name).filter(Boolean) as string[])].sort(),
    [allCards]
  )
  const sessions = useMemo(() =>
    [...new Set(allCards.map(c => c.session_name).filter(Boolean) as string[])].sort(),
    [allCards]
  )
  const programs = useMemo(() =>
    [...new Set(allCards.map(c => c.program_name).filter(Boolean) as string[])].sort(),
    [allCards]
  )
  const programCategories = useMemo(() =>
    [...new Set(allCards.map(c => c.program_category).filter(Boolean) as string[])].sort(),
    [allCards]
  )

  const filteredData = useMemo<LearnerPipelineData>(() => {
    const result: LearnerPipelineData = { prospect: [], inscrit: [], en_cours: [], termine: [], abandon: [] }
    if (!data) return result
    const searchLower = filters.search.toLowerCase()
    const seenIds = new Set<string>()
    for (const card of allCards) {
      if (seenIds.has(card.id)) continue
      if (filters.status && card.crm_status !== filters.status) continue
      if (searchLower && !`${card.first_name} ${card.last_name} ${card.email ?? ''}`.toLowerCase().includes(searchLower)) continue
      if (filters.formation && card.formation_name !== filters.formation) continue
      if (filters.session && card.session_name !== filters.session) continue
      if (filters.program && card.program_name !== filters.program) continue
      if (filters.programCategory && card.program_category !== filters.programCategory) continue
      if (filters.entityType === 'company' && !card.is_company) continue
      if (filters.entityType === 'individual' && card.is_company) continue
      if (filters.commercialStatus && card.commercial_status !== filters.commercialStatus) continue
      if (filters.qualiopiOnly && card.missing_qualiopi.length === 0) continue
      if (filters.dateFrom && card.session_start_date && card.session_start_date < filters.dateFrom) continue
      if (filters.dateTo && card.session_end_date && card.session_end_date > filters.dateTo) continue
      seenIds.add(card.id)
      result[card.crm_status].push(card)
    }
    return result
  }, [data, allCards, filters])

  const activeCount = useMemo(() =>
    Object.values(filters).filter(v => v !== '' && v !== false).length,
    [filters]
  )

  const resetFilters = () => setFilters(EMPTY_FILTERS)

  const totalFiltered = useMemo(
    () => (Object.values(filteredData) as LearnerCard[][]).reduce((s, col) => s + col.length, 0),
    [filteredData]
  )
  const totalAll = allCards.length

  const [isExporting, setIsExporting] = useState(false)

  const exportToExcel = useCallback(async () => {
    setIsExporting(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'EDUZEN'
      wb.created = new Date()
      const ws = wb.addWorksheet('CRM Apprenants')
      ws.columns = [
        { header: 'Prénom',        key: 'first_name',     width: 18 },
        { header: 'Nom',           key: 'last_name',      width: 18 },
        { header: 'Email',         key: 'email',          width: 28 },
        { header: 'Statut CRM',    key: 'crm_status',     width: 16 },
        { header: 'Session',       key: 'session_name',   width: 28 },
        { header: 'Début session', key: 'session_start',  width: 16 },
        { header: 'Fin session',   key: 'session_end',    width: 16 },
        { header: 'Formation',     key: 'formation_name', width: 28 },
        { header: 'Programme',     key: 'program_name',   width: 24 },
      ]
      const headerRow = ws.getRow(1)
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
      })
      headerRow.height = 28
      const STATUS_FR: Record<CrmStatus, string> = {
        prospect: 'Prospect', inscrit: 'Inscrit', en_cours: 'En formation',
        termine: 'Terminé', abandon: 'Abandon',
      }
      const STATUS_COLORS: Record<CrmStatus, string> = {
        prospect: 'FF6B7280', inscrit: 'FF2563EB', en_cours: 'FF0891B2',
        termine: 'FF1E3A8A', abandon: 'FFDC2626',
      }
      const cards = (Object.values(filteredData) as LearnerCard[][]).flat()
      cards.forEach((card, idx) => {
        const row = ws.addRow({
          first_name: card.first_name, last_name: card.last_name,
          email: card.email ?? '', crm_status: STATUS_FR[card.crm_status],
          session_name: card.session_name ?? '',
          session_start: card.session_start_date ?? '', session_end: card.session_end_date ?? '',
          formation_name: card.formation_name ?? '', program_name: card.program_name ?? '',
        })
        row.height = 22
        if (idx % 2 === 1) {
          row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } })
        }
        row.getCell('crm_status').font = { bold: true, color: { argb: STATUS_COLORS[card.crm_status] } }
      })
      ws.autoFilter = { from: 'A1', to: 'I1' }
      ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crm-apprenants-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }, [filteredData])

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand-blue p-2.5">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">CRM Apprenants</h1>
            <p className="text-sm text-muted-foreground">
              Pipeline de formation — suivi du parcours de chaque apprenant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => setShowFilters(v => !v)}
            className={showFilters || activeCount > 0 ? 'border-brand-blue text-brand-blue' : ''}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Filtres
            {activeCount > 0 && (
              <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-brand-blue text-white">{activeCount}</Badge>
            )}
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={exportToExcel}
            disabled={isExporting || !data || totalAll === 0}
          >
            <Download className={`mr-1.5 h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
            {activeCount > 0 ? `Exporter (${totalFiltered})` : 'Exporter'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Barre de filtres */}
      {showFilters && (
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text" placeholder="Nom, prénom, email…" value={filters.search}
                onChange={e => set({ search: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
              />
            </div>
            <select value={filters.formation} onChange={e => set({ formation: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue">
              <option value="">Toutes les formations</option>
              {formations.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select value={filters.program} onChange={e => set({ program: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue">
              <option value="">Tous les programmes</option>
              {programs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filters.session} onChange={e => set({ session: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue">
              <option value="">Toutes les sessions</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filters.programCategory} onChange={e => set({ programCategory: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue">
              <option value="">Toutes les catégories</option>
              {programCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <select value={filters.status} onChange={e => set({ status: e.target.value as CrmStatus | '' })}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue">
              <option value="">Tous les statuts</option>
              {(Object.entries(STATUS_LABELS) as [CrmStatus, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select value={filters.entityType} onChange={e => set({ entityType: e.target.value as Filters['entityType'] })}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue">
              <option value="">Entreprise ou particulier</option>
              <option value="company">Entreprise</option>
              <option value="individual">Particulier</option>
            </select>
            <select value={filters.commercialStatus} onChange={e => set({ commercialStatus: e.target.value as Filters['commercialStatus'] })}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue">
              <option value="">Tous les statuts commerciaux</option>
              {(Object.entries(COMMERCIAL_STATUS_LABELS) as [ProspectCommercialStatus, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Session — début à partir du</label>
              <input type="date" value={filters.dateFrom} onChange={e => set({ dateFrom: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Session — fin avant le</label>
              <input type="date" value={filters.dateTo} onChange={e => set({ dateTo: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue" />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none group h-[38px]">
              <div className="relative shrink-0">
                <input type="checkbox" checked={filters.qualiopiOnly}
                  onChange={e => set({ qualiopiOnly: e.target.checked })} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-red-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
              </div>
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 group-hover:text-red-600 transition-colors">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Alertes Qualiopi uniquement
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-1 border-t">
            <p className="text-xs text-gray-500">
              {activeCount > 0
                ? <>{totalFiltered} / {totalAll} apprenants affichés</>
                : <>{totalAll} apprenants au total</>}
            </p>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs gap-1 text-gray-500">
                <X className="h-3.5 w-3.5" /> Réinitialiser
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Kanban */}
      {isLoading ? (
        <div className="flex gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-1 space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              {[...Array(3)].map((_, j) => <Skeleton key={j} className="h-24 w-full rounded-lg" />)}
            </div>
          ))}
        </div>
      ) : data ? (
        <LearnerPipeline initialData={filteredData} />
      ) : null}
    </div>
  )
}
