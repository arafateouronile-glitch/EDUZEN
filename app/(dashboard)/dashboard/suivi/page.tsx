'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlassCard } from '@/components/ui/glass-card'
import {
  Send,
  FileText,
  Search,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Download,
  Eye,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'

type EmailLog = {
  id: string
  recipient: string
  subject: string
  status: string
  template_type: string | null
  resend_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  organization_id: string | null
}

type GeneratedDocument = {
  id: string
  type: string
  format: string
  file_name: string
  file_url: string
  related_entity_type: string | null
  related_entity_id: string | null
  generated_by: string | null
  metadata: Record<string, unknown> | null
  page_count: number | null
  created_at: string | null
  organization_id: string
}

const EMAIL_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-700', icon: <Send className="h-3 w-3" /> },
  delivered: { label: 'Livré', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="h-3 w-3" /> },
  opened: { label: 'Ouvert', color: 'bg-purple-100 text-purple-700', icon: <Eye className="h-3 w-3" /> },
  clicked: { label: 'Cliqué', color: 'bg-indigo-100 text-indigo-700', icon: <Eye className="h-3 w-3" /> },
  bounced: { label: 'Rejeté', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
  complained: { label: 'Spam', color: 'bg-orange-100 text-orange-700', icon: <AlertCircle className="h-3 w-3" /> },
  pending: { label: 'En attente', color: 'bg-gray-100 text-gray-600', icon: <Clock className="h-3 w-3" /> },
}

const DOC_TYPE_LABELS: Record<string, string> = {
  convention: 'Convention',
  facture: 'Facture',
  devis: 'Devis',
  convocation: 'Convocation',
  contrat: 'Contrat',
  attestation: 'Attestation',
  attestation_reussite: 'Attestation réussite',
  certificat_realisation: 'Certificat réalisation',
  attestation_assiduite: 'Attestation assiduité',
  emargement: 'Émargement',
  programme: 'Programme',
  reglement_interieur: 'Règlement intérieur',
  cgv: 'CGV',
  livret_accueil: "Livret d'accueil",
}

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  session_reminder: 'Convocation session',
  convention: 'Convention',
  contrat: 'Contrat',
  facture: 'Facture',
  devis: 'Devis',
  attestation: 'Attestation',
  custom: 'Personnalisé',
}

const DATE_RANGES = [
  { label: '7 derniers jours', days: 7 },
  { label: '30 derniers jours', days: 30 },
  { label: '90 derniers jours', days: 90 },
  { label: 'Tout', days: 0 },
]

export default function CommunicationsPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'emails' | 'documents'>('emails')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateRange, setDateRange] = useState(30)

  const since = dateRange > 0 ? subDays(new Date(), dateRange).toISOString() : null

  const { data: emailLogs, isLoading: loadingEmails, refetch: refetchEmails } = useQuery<EmailLog[]>({
    queryKey: ['email-logs', user?.organization_id, dateRange],
    queryFn: async () => {
      if (!user?.organization_id) return []
      let q = supabase
        .from('email_logs')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false })
        .limit(500)
      if (since) q = q.gte('created_at', since)
      const { data, error } = await q
      if (error) throw error
      return (data || []) as EmailLog[]
    },
    enabled: !!user?.organization_id,
  })

  const { data: generatedDocs, isLoading: loadingDocs, refetch: refetchDocs } = useQuery<GeneratedDocument[]>({
    queryKey: ['generated-documents', user?.organization_id, dateRange],
    queryFn: async () => {
      if (!user?.organization_id) return []
      let q = supabase
        .from('generated_documents')
        .select('*')
        .eq('organization_id', user.organization_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500)
      if (since) q = q.gte('created_at', since)
      const { data, error } = await q
      if (error) throw error
      return (data || []) as GeneratedDocument[]
    },
    enabled: !!user?.organization_id,
  })

  const filteredEmails = useMemo(() => {
    if (!emailLogs) return []
    return emailLogs.filter(e => {
      if (statusFilter && e.status !== statusFilter) return false
      if (typeFilter && e.template_type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return e.recipient.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q)
      }
      return true
    })
  }, [emailLogs, statusFilter, typeFilter, search])

  const filteredDocs = useMemo(() => {
    if (!generatedDocs) return []
    return generatedDocs.filter(d => {
      if (typeFilter && d.type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return d.file_name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q)
      }
      return true
    })
  }, [generatedDocs, typeFilter, search])

  // Stats
  const stats = useMemo(() => {
    const emails = emailLogs || []
    const docs = generatedDocs || []
    const delivered = emails.filter(e => e.status === 'delivered' || e.status === 'opened' || e.status === 'clicked').length
    const opened = emails.filter(e => e.status === 'opened' || e.status === 'clicked').length
    const bounced = emails.filter(e => e.status === 'bounced' || e.status === 'failed').length
    const deliveryRate = emails.length > 0 ? Math.round((delivered / emails.length) * 100) : 0
    const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0
    return { totalEmails: emails.length, totalDocs: docs.length, delivered, opened, bounced, deliveryRate, openRate }
  }, [emailLogs, generatedDocs])

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    try { return format(parseISO(d), 'dd MMM yyyy HH:mm', { locale: fr }) } catch { return d }
  }

  const uniqueEmailTypes = useMemo(() => {
    const types = new Set((emailLogs || []).map(e => e.template_type).filter(Boolean) as string[])
    return Array.from(types)
  }, [emailLogs])

  const uniqueDocTypes = useMemo(() => {
    const types = new Set((generatedDocs || []).map(d => d.type))
    return Array.from(types)
  }, [generatedDocs])

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Send className="h-6 w-6 text-brand-blue" />
            Communications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Historique de tous les emails envoyés et documents générés
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { refetchEmails(); refetchDocs() }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <GlassCard variant="premium" className="p-4">
          <p className="text-xs text-gray-500 mb-1">Emails envoyés</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalEmails}</p>
        </GlassCard>
        <GlassCard variant="premium" className="p-4">
          <p className="text-xs text-gray-500 mb-1">Livrés</p>
          <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
          <p className="text-xs text-gray-400">{stats.deliveryRate}% taux</p>
        </GlassCard>
        <GlassCard variant="premium" className="p-4">
          <p className="text-xs text-gray-500 mb-1">Ouverts</p>
          <p className="text-2xl font-bold text-purple-600">{stats.opened}</p>
          <p className="text-xs text-gray-400">{stats.openRate}% taux</p>
        </GlassCard>
        <GlassCard variant="premium" className="p-4">
          <p className="text-xs text-gray-500 mb-1">Rejetés / Échoués</p>
          <p className="text-2xl font-bold text-red-500">{stats.bounced}</p>
        </GlassCard>
        <GlassCard variant="premium" className="p-4">
          <p className="text-xs text-gray-500 mb-1">Documents générés</p>
          <p className="text-2xl font-bold text-brand-blue">{stats.totalDocs}</p>
        </GlassCard>
      </div>

      {/* Tabs + Filters */}
      <GlassCard variant="premium" className="p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-100 pb-3">
          <button
            onClick={() => { setActiveTab('emails'); setTypeFilter(''); setStatusFilter('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'emails'
                ? 'bg-brand-blue text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Mail className="h-4 w-4 inline mr-2" />
            Emails envoyés
          </button>
          <button
            onClick={() => { setActiveTab('documents'); setTypeFilter(''); setStatusFilter('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'documents'
                ? 'bg-brand-blue text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-2" />
            Documents générés
          </button>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={activeTab === 'emails' ? 'Rechercher par destinataire, sujet...' : 'Rechercher par nom de fichier...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            {activeTab === 'emails' ? (
              <>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  <option value="">Tous les statuts</option>
                  {Object.entries(EMAIL_STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  <option value="">Tous les types</option>
                  {uniqueEmailTypes.map(t => (
                    <option key={t} value={t}>{TEMPLATE_TYPE_LABELS[t] || t}</option>
                  ))}
                </select>
              </>
            ) : (
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              >
                <option value="">Tous les types</option>
                {uniqueDocTypes.map(t => (
                  <option key={t} value={t}>{DOC_TYPE_LABELS[t] || t}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-1">
            {DATE_RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => setDateRange(r.days)}
                className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                  dateRange === r.days
                    ? 'bg-brand-blue text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Table emails */}
      {activeTab === 'emails' && (
        <GlassCard variant="default" className="overflow-hidden">
          {loadingEmails ? (
            <div className="p-12 text-center text-gray-400 text-sm">Chargement...</div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="h-12 w-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 text-sm">Aucun email trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Destinataire</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Sujet</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEmails.map(email => {
                    const statusCfg = EMAIL_STATUS_CONFIG[email.status] || EMAIL_STATUS_CONFIG.pending
                    return (
                      <tr key={email.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {formatDate(email.created_at)}
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-medium max-w-[200px] truncate">
                          {email.recipient}
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-[280px] truncate">
                          {email.subject}
                        </td>
                        <td className="px-4 py-3">
                          {email.template_type ? (
                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                              {TEMPLATE_TYPE_LABELS[email.template_type] || email.template_type}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                            {statusCfg.icon}
                            {statusCfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 text-right">
                {filteredEmails.length} email{filteredEmails.length > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Table documents */}
      {activeTab === 'documents' && (
        <GlassCard variant="default" className="overflow-hidden">
          {loadingDocs ? (
            <div className="p-12 text-center text-gray-400 text-sm">Chargement...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-500 text-sm">Aucun document trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Fichier</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Format</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Entité</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Pages</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDocs.map(doc => {
                    const meta = doc.metadata as Record<string, unknown> | null
                    const studentName = (meta?.student_name || meta?.studentName || meta?.etudiant_nom_complet) as string | undefined
                    const sessionName = (meta?.session_name || meta?.sessionName) as string | undefined
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                            {DOC_TYPE_LABELS[doc.type] || doc.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-[220px] truncate text-xs">
                          {doc.file_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs uppercase font-mono">
                            {doc.format}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate">
                          {studentName || sessionName || (doc.related_entity_type ? `${doc.related_entity_type}` : '—')}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {doc.page_count ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            Ouvrir
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 text-right">
                {filteredDocs.length} document{filteredDocs.length > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  )
}
