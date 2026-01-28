'use client'

/**
 * AuditorPortal.tsx
 * Interface "Vue Auditeur" pour EDUZEN
 * Design: Chirurgical & Zen - Lecture seule, transparence totale
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Search,
  Download,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Eye,
  Lock,
  Sparkles,
  Calendar,
  User,
  Building2,
  Filter,
  RefreshCw,
  BadgeCheck,
  FileCheck,
  Database,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  AuditorPortalData,
  ComplianceEvidenceAutomated,
  QualiopiCriterion,
} from '@/lib/services/auditor-portal.service'

// ============================================================================
// Types
// ============================================================================

interface AuditorPortalProps {
  data: AuditorPortalData
  onSearch?: (term: string) => Promise<ComplianceEvidenceAutomated[]>
  onExportPdf?: () => void
  onViewDocument?: (url: string) => void
}

// ============================================================================
// Constantes
// ============================================================================

const STATUS_CONFIG = {
  compliant: {
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
    label: 'Conforme',
  },
  in_progress: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: RefreshCw,
    label: 'En cours',
  },
  non_compliant: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    label: 'Non conforme',
  },
  needs_improvement: {
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: AlertCircle,
    label: 'À améliorer',
  },
  not_started: {
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: Clock,
    label: 'Non démarré',
  },
} as const

const SOURCE_CONFIG = {
  system: {
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Database,
    label: 'Système EDUZEN',
    description: 'Preuve générée automatiquement - Immuable',
  },
  automated_detection: {
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Sparkles,
    label: 'Détection Auto',
    description: 'Détecté automatiquement par le système',
  },
  manual_upload: {
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: FileText,
    label: 'Upload Manuel',
    description: 'Document téléversé manuellement',
  },
  integration: {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: ExternalLink,
    label: 'Intégration',
    description: 'Importé depuis un système externe',
  },
} as const

// ============================================================================
// Sous-composants
// ============================================================================

/**
 * Badge de source avec tooltip explicatif
 */
function SourceBadge({ source }: { source: ComplianceEvidenceAutomated['source'] }) {
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.manual_upload
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`${config.color} flex items-center gap-1 text-xs font-medium cursor-help`}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Badge de statut d'indicateur
 */
function StatusBadge({ status }: { status: keyof typeof STATUS_CONFIG }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_started
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

/**
 * Badge de comptage de preuves
 */
function EvidenceCountBadge({
  total,
  auto,
}: {
  total: number
  auto: number
}) {
  const autoPercentage = total > 0 ? Math.round((auto / total) * 100) : 0

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={`flex items-center gap-1 text-xs ${
              total > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-500'
            }`}
          >
            <FileCheck className="h-3 w-3" />
            {total} preuve{total > 1 ? 's' : ''}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p>{auto} automatique{auto > 1 ? 's' : ''} ({autoPercentage}%)</p>
            <p>{total - auto} manuelle{total - auto > 1 ? 's' : ''}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Indicateur dans la sidebar
 */
function IndicatorItem({
  indicator,
  isSelected,
  onClick,
}: {
  indicator: AuditorPortalData['indicators'][0]
  isSelected: boolean
  onClick: () => void
}) {
  const status = indicator.status as keyof typeof STATUS_CONFIG
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_started

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all ${
        isSelected
          ? 'bg-slate-100 border-l-4 border-l-blue-600'
          : 'hover:bg-slate-50 border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-slate-600">
              {indicator.indicator_code}
            </span>
            {indicator.evidence_count > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </div>
          <p className="text-sm text-slate-700 mt-1 line-clamp-2">
            {indicator.indicator_name}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <config.icon className={`h-4 w-4 ${config.color.split(' ')[1]}`} />
          {indicator.evidence_count > 0 && (
            <span className="text-xs text-slate-500">
              {indicator.evidence_count}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

/**
 * Ligne de preuve dans le tableau
 */
function EvidenceRow({
  evidence,
  onView,
}: {
  evidence: ComplianceEvidenceAutomated
  onView?: (url: string) => void
}) {
  const date = new Date(evidence.event_date)
  const formattedDate = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <TableRow className="hover:bg-slate-50/50">
      <TableCell className="font-medium">
        <div className="flex flex-col gap-1">
          <span className="text-sm">{evidence.title}</span>
          {evidence.entity_name && (
            <span className="text-xs text-slate-500">{evidence.entity_name}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <SourceBadge source={evidence.source} />
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {evidence.evidence_type}
        </Badge>
      </TableCell>
      <TableCell className="text-slate-600">
        <div className="flex flex-col">
          <span className="text-sm">{formattedDate}</span>
          <span className="text-xs text-slate-400">{formattedTime}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <div
            className={`h-2 w-2 rounded-full ${
              evidence.confidence_score === 100
                ? 'bg-emerald-500'
                : evidence.confidence_score >= 80
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-slate-600">{evidence.confidence_score}%</span>
        </div>
      </TableCell>
      <TableCell>
        {evidence.file_url ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => onView?.(evidence.file_url!)}
          >
            <Eye className="h-4 w-4 mr-1" />
            Voir
          </Button>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )}
      </TableCell>
    </TableRow>
  )
}

// ============================================================================
// Composant Principal
// ============================================================================

export function AuditorPortal({
  data,
  onSearch,
  onExportPdf,
  onViewDocument,
}: AuditorPortalProps) {
  // État local
  const [selectedCriterion, setSelectedCriterion] = useState<number | null>(1)
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ComplianceEvidenceAutomated[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [expandedCriteria, setExpandedCriteria] = useState<string[]>(['criterion-1'])

  // Données dérivées
  const indicatorsByNumber = useMemo(() => {
    const map = new Map<number, AuditorPortalData['indicators'][0]>()
    data.indicators.forEach((ind) => {
      const num = parseInt(ind.indicator_code, 10)
      if (!isNaN(num)) {
        map.set(num, ind)
      }
    })
    return map
  }, [data.indicators])

  const selectedIndicatorData = useMemo(() => {
    if (!selectedIndicator) return null
    return data.indicators.find((i) => i.id === selectedIndicator)
  }, [data.indicators, selectedIndicator])

  const evidenceForIndicator = useMemo(() => {
    if (!selectedIndicatorData) return []
    const indicatorNum = parseInt(selectedIndicatorData.indicator_code, 10)
    return data.evidence.filter((e) => e.indicator_number === indicatorNum)
  }, [data.evidence, selectedIndicatorData])

  // Gestionnaires
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim() || searchTerm.length < 2) return
    if (!onSearch) return

    setIsSearching(true)
    try {
      const results = await onSearch(searchTerm)
      setSearchResults(results)
    } finally {
      setIsSearching(false)
    }
  }, [searchTerm, onSearch])

  const handleClearSearch = useCallback(() => {
    setSearchTerm('')
    setSearchResults(null)
  }, [])

  const expiresAt = new Date(data.link.expires_at)
  const isExpiringSoon = expiresAt.getTime() - Date.now() < 2 * 60 * 60 * 1000 // 2h

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo et badge */}
            <div className="flex items-center gap-4">
              {data.organization.logo_url ? (
                <img
                  src={data.organization.logo_url}
                  alt={data.organization.name}
                  className="h-10 w-auto"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-slate-900">
                  {data.organization.name}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                  >
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    Certifié Conforme par EDUZEN Audit Engine
                  </Badge>
                </div>
              </div>
            </div>

            {/* Infos auditeur et actions */}
            <div className="flex items-center gap-6">
              {/* Infos auditeur */}
              <div className="text-right text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="h-4 w-4" />
                  <span>{data.link.auditor_name}</span>
                </div>
                {data.link.auditor_organization && (
                  <div className="flex items-center gap-2 text-slate-500 mt-0.5">
                    <Building2 className="h-3 w-3" />
                    <span className="text-xs">{data.link.auditor_organization}</span>
                  </div>
                )}
                <div
                  className={`flex items-center gap-1 mt-1 text-xs ${
                    isExpiringSoon ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  Expire le {expiresAt.toLocaleDateString('fr-FR')} à{' '}
                  {expiresAt.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <Separator orientation="vertical" className="h-10" />

              {/* Export PDF */}
              {data.link.permissions.export_pdf && onExportPdf && (
                <Button onClick={onExportPdf} className="bg-slate-900 hover:bg-slate-800">
                  <Download className="h-4 w-4 mr-2" />
                  Exporter le journal (PDF)
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Barre de statistiques */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="grid grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">
                {data.stats.compliance_rate}%
              </div>
              <div className="text-sm text-slate-500 mt-1">Taux de conformité</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">
                {data.stats.compliant_indicators}
              </div>
              <div className="text-sm text-slate-500 mt-1">Indicateurs conformes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">
                {data.stats.total_indicators}
              </div>
              <div className="text-sm text-slate-500 mt-1">Indicateurs total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {data.stats.total_evidence}
              </div>
              <div className="text-sm text-slate-500 mt-1">Preuves documentées</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">
                {data.stats.auto_evidence_percentage}%
              </div>
              <div className="text-sm text-slate-500 mt-1">Preuves automatiques</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Échantillonnage */}
      {data.link.permissions.sampling_mode && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="max-w-[1800px] mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Mode Échantillonnage</span>
                <Badge className="bg-blue-600 text-white text-xs">Premium</Badge>
              </div>
              <div className="flex-1 max-w-xl">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher par stagiaire, session, formateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 pr-20 bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                  />
                  {searchTerm && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-24 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || searchTerm.length < 2}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
                    size="sm"
                  >
                    {isSearching ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      'Rechercher'
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-blue-700">
                Filtrez toutes les preuves liées à un échantillon sur les 32 indicateurs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Référentiel */}
          <aside className="w-80 flex-shrink-0">
            <Card className="sticky top-28">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Référentiel Qualiopi
                </CardTitle>
                <CardDescription>
                  7 critères · 32 indicateurs
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <Accordion
                    type="multiple"
                    value={expandedCriteria}
                    onValueChange={(value) => setExpandedCriteria(Array.isArray(value) ? value : [value])}
                    className="px-2 pb-2"
                  >
                    {data.criteria.map((criterion) => {
                      const criterionIndicators = criterion.indicators
                        .map((ind) => indicatorsByNumber.get(ind.number))
                        .filter(Boolean)
                      const compliantCount = criterionIndicators.filter(
                        (ind) => ind?.status === 'compliant'
                      ).length

                      return (
                        <AccordionItem
                          key={criterion.number}
                          value={`criterion-${criterion.number}`}
                          className="border-b-0"
                        >
                          <AccordionTrigger
                            className={`px-3 py-3 rounded-lg hover:no-underline ${
                              selectedCriterion === criterion.number
                                ? 'bg-blue-50'
                                : 'hover:bg-slate-50'
                            }`}
                            value={`criterion-${criterion.number}`}
                          >
                            <div className="flex items-center gap-3 text-left">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                  compliantCount === criterion.indicators.length
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {criterion.number}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm text-slate-900 line-clamp-1">
                                  {criterion.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {compliantCount}/{criterion.indicators.length} conformes
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-1 pb-2">
                            <div className="space-y-1 pl-2">
                              {criterion.indicators.map((indDef) => {
                                const indicator = indicatorsByNumber.get(indDef.number)
                                if (!indicator) return null

                                return (
                                  <IndicatorItem
                                    key={indicator.id}
                                    indicator={indicator}
                                    isSelected={selectedIndicator === indicator.id}
                                    onClick={() => setSelectedIndicator(indicator.id)}
                                  />
                                )
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* Panneau central - Flux de preuves */}
          <main className="flex-1 min-w-0">
            {/* Résultats de recherche */}
            {searchResults !== null ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-blue-600" />
                        Résultats de recherche
                      </CardTitle>
                      <CardDescription>
                        {searchResults.length} preuve{searchResults.length > 1 ? 's' : ''}{' '}
                        trouvée{searchResults.length > 1 ? 's' : ''} pour "{searchTerm}"
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={handleClearSearch}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Effacer la recherche
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {searchResults.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="font-semibold">Preuve</TableHead>
                            <TableHead className="font-semibold">Source</TableHead>
                            <TableHead className="font-semibold">Type</TableHead>
                            <TableHead className="font-semibold">Indicateur</TableHead>
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="font-semibold w-20">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {searchResults.map((evidence) => (
                            <TableRow key={evidence.id} className="hover:bg-slate-50/50">
                              <TableCell className="font-medium">
                                <div className="flex flex-col gap-1">
                                  <span className="text-sm">{evidence.title}</span>
                                  {evidence.entity_name && (
                                    <span className="text-xs text-slate-500">
                                      {evidence.entity_name}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <SourceBadge source={evidence.source} />
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {evidence.evidence_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono">
                                  {evidence.indicator_number}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-600 text-sm">
                                {new Date(evidence.event_date).toLocaleDateString('fr-FR')}
                              </TableCell>
                              <TableCell>
                                {evidence.file_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-blue-600"
                                    onClick={() => onViewDocument?.(evidence.file_url!)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Aucune preuve trouvée pour cette recherche</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : selectedIndicatorData ? (
              /* Détail d'un indicateur */
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-bold text-blue-600">
                          Indicateur {selectedIndicatorData.indicator_code}
                        </span>
                        <StatusBadge
                          status={selectedIndicatorData.status as keyof typeof STATUS_CONFIG}
                        />
                      </div>
                      <CardTitle className="mt-2 text-xl">
                        {selectedIndicatorData.indicator_name}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Catégorie: {selectedIndicatorData.category.replace(/_/g, ' ')}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-slate-900">
                        {selectedIndicatorData.compliance_rate}%
                      </div>
                      <div className="text-sm text-slate-500">Conformité</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Statistiques de l'indicateur */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-slate-900">
                        {selectedIndicatorData.evidence_count}
                      </div>
                      <div className="text-sm text-slate-500">Preuves totales</div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-600">
                        {selectedIndicatorData.auto_evidence_count}
                      </div>
                      <div className="text-sm text-emerald-700">Automatiques</div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {selectedIndicatorData.manual_evidence_count}
                      </div>
                      <div className="text-sm text-amber-700">Manuelles</div>
                    </div>
                  </div>

                  {/* Liste des preuves */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">Preuves documentées</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Lock className="h-4 w-4" />
                      Lecture seule - Données immuables
                    </div>
                  </div>

                  {evidenceForIndicator.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="font-semibold">Preuve</TableHead>
                            <TableHead className="font-semibold">Source</TableHead>
                            <TableHead className="font-semibold">Type</TableHead>
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="font-semibold">Confiance</TableHead>
                            <TableHead className="font-semibold w-20">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {evidenceForIndicator.map((evidence) => (
                            <EvidenceRow
                              key={evidence.id}
                              evidence={evidence}
                              onView={onViewDocument}
                            />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-lg">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                      <p className="text-slate-500">Aucune preuve documentée pour cet indicateur</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* État initial - Aucun indicateur sélectionné */
              <Card>
                <CardContent className="py-16">
                  <div className="text-center">
                    <Shield className="h-16 w-16 mx-auto mb-6 text-slate-200" />
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                      Bienvenue dans le Portail Auditeur EDUZEN
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-6">
                      Sélectionnez un indicateur dans le référentiel à gauche pour consulter
                      les preuves documentées et vérifier la conformité.
                    </p>
                    {data.link.permissions.sampling_mode && (
                      <p className="text-sm text-blue-600">
                        Utilisez le mode échantillonnage ci-dessus pour rechercher un
                        stagiaire ou une session spécifique.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <div className="flex items-center gap-4">
              <span>Portail Auditeur EDUZEN</span>
              <Separator orientation="vertical" className="h-4" />
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Interface en lecture seule
              </span>
            </div>
            <div className="flex items-center gap-1">
              <BadgeCheck className="h-4 w-4 text-emerald-600" />
              <span>Données certifiées conformes par EDUZEN Audit Engine</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default AuditorPortal
