'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Download,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Filter,
  ChevronDown,
  ChevronUp,
  FileDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface Submission {
  id: string
  submitted_at: string
  status: 'pending' | 'student_created' | 'error'
  form_data: Record<string, unknown>
  documents: Array<{ field_id: string; storage_path: string; filename: string }>
  students: { id: string; first_name: string; last_name: string; email: string | null } | null
  sessions: { id: string; name: string } | null
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', icon: Clock, className: 'bg-amber-100 text-amber-700 border-0' },
  student_created: { label: 'Apprenant créé', icon: CheckCircle2, className: 'bg-green-100 text-green-700 border-0' },
  error: { label: 'Erreur', icon: AlertCircle, className: 'bg-red-100 text-red-700 border-0' },
}

async function fetchSubmissions(templateId: string, filters: { session?: string; status?: string }) {
  const params = new URLSearchParams({ template_id: templateId })
  if (filters.session) params.set('session_id', filters.session)
  if (filters.status) params.set('status', filters.status)

  const res = await fetch(`/api/enrollment-forms/submissions?${params}`)
  if (!res.ok) throw new Error('Erreur chargement')
  const data = await res.json()
  return { submissions: data.submissions as Submission[], labelMap: (data.labelMap ?? {}) as Record<string, string> }
}

async function fetchTemplate(id: string) {
  const res = await fetch(`/api/enrollment-forms/templates/${id}`)
  if (!res.ok) throw new Error('Introuvable')
  const data = await res.json()
  return data.template
}

export default function SubmissionsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [filterStatus, setFilterStatus] = useState('')
  const [filterSession, setFilterSession] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const downloadPdf = async (submissionId: string, studentName: string) => {
    setDownloadingId(submissionId)
    try {
      const res = await fetch(`/api/enrollment-forms/submissions/${submissionId}/pdf`)
      if (!res.ok) throw new Error('Erreur génération PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inscription_${studentName.replace(/\s+/g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Impossible de générer le PDF.')
    } finally {
      setDownloadingId(null)
    }
  }

  const { data: template } = useQuery({
    queryKey: ['enrollment-form-template', id],
    queryFn: () => fetchTemplate(id),
    enabled: !!id,
  })

  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['enrollment-form-submissions', id, filterStatus, filterSession],
    queryFn: () => fetchSubmissions(id, { status: filterStatus, session: filterSession }),
    enabled: !!id,
  })
  const submissions = submissionsData?.submissions
  const labelMap = submissionsData?.labelMap ?? {}

  const exportCsv = () => {
    if (!submissions?.length) return

    const headers = ['Date', 'Prénom', 'Nom', 'Email', 'Session', 'Statut']
    const rows = submissions.map(s => [
      new Date(s.submitted_at).toLocaleString('fr-FR'),
      s.students?.first_name ?? '',
      s.students?.last_name ?? '',
      s.students?.email ?? '',
      s.sessions?.name ?? '',
      STATUS_CONFIG[s.status]?.label ?? s.status,
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soumissions_${template?.name ?? 'formulaire'}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const uniqueSessions = Array.from(
    new Map(
      (submissions ?? [])
        .filter(s => s.sessions)
        .map(s => [s.sessions!.id, s.sessions!])
    ).values()
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/settings/enrollment-forms/${id}`)}
          className="text-gray-500 hover:text-gray-900 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au formulaire
        </Button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Soumissions — {template?.name ?? '...'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{submissions?.length ?? 0} soumission(s)</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={!submissions?.length}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="student_created">Apprenant créé</option>
          <option value="pending">En attente</option>
          <option value="error">Erreur</option>
        </select>
        {uniqueSessions.length > 0 && (
          <select
            value={filterSession}
            onChange={e => setFilterSession(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Toutes les sessions</option>
            {uniqueSessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && !submissions?.length && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl py-16 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune soumission pour ce formulaire.</p>
          <p className="text-gray-400 text-sm mt-1">
            Partagez le lien du formulaire pour recevoir des inscriptions.
          </p>
        </div>
      )}

      {/* Submissions list */}
      {submissions && submissions.length > 0 && (
        <div className="space-y-3">
          {submissions.map(sub => {
            const cfg = STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.pending
            const StatusIcon = cfg.icon
            const isExpanded = expandedId === sub.id

            return (
              <div key={sub.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
                <div
                  className="flex items-center justify-between gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                >
                  {/* Left */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-900 font-medium truncate">
                        {sub.students
                          ? `${sub.students.first_name} ${sub.students.last_name}`
                          : 'Apprenant inconnu'}
                      </p>
                      <p className="text-gray-400 text-xs truncate">
                        {sub.students?.email ?? '—'}
                      </p>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {sub.sessions && (
                      <span className="text-gray-500 text-xs hidden sm:block">{sub.sessions.name}</span>
                    )}
                    <span className="text-gray-400 text-xs hidden sm:block">{formatDate(sub.submitted_at)}</span>
                    {sub.documents.length > 0 && (
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <FileText className="w-3.5 h-3.5" />
                        {sub.documents.length}
                      </div>
                    )}
                    <Badge className={cfg.className}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {cfg.label}
                    </Badge>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-gray-400 hover:text-blue-600"
                        title="Télécharger PDF"
                        disabled={downloadingId === sub.id}
                        onClick={() => {
                          const name = sub.students
                            ? `${sub.students.first_name} ${sub.students.last_name}`
                            : 'apprenant'
                          downloadPdf(sub.id, name)
                        }}
                      >
                        {downloadingId === sub.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <FileDown className="w-3.5 h-3.5" />
                        }
                      </Button>
                      {sub.students && (
                        <Link href={`/dashboard/students/${sub.students.id}`}>
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-gray-400 hover:text-gray-700" title="Profil apprenant">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </div>

                {/* Expanded: form data + documents */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-4">
                    {/* Form data */}
                    <div>
                      <h4 className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
                        Données soumises
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(sub.form_data)
                          .filter(([k]) => !k.startsWith('__'))
                          .map(([key, val]) => {
                            const fieldDef = template?.fields?.find((f: { id: string }) => f.id === key)
                            const label = fieldDef?.label ?? key
                            const resolve = (v: unknown): string => {
                              if (typeof v === 'string' && labelMap[v]) return labelMap[v]
                              return String(v ?? '—')
                            }
                            const display = Array.isArray(val)
                              ? val.map(resolve).join(', ')
                              : resolve(val)
                            return (
                              <div key={key} className="bg-gray-50 rounded-lg p-2">
                                <p className="text-gray-400 text-xs">{label}</p>
                                <p className="text-gray-800 text-sm">{display || '—'}</p>
                              </div>
                            )
                          })}
                      </div>
                    </div>

                    {/* Documents */}
                    {sub.documents.length > 0 && (
                      <div>
                        <h4 className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-2">
                          Documents
                        </h4>
                        <div className="flex gap-2 flex-wrap">
                          {sub.documents.map(doc => (
                            <div
                              key={doc.field_id}
                              className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-500" />
                              {doc.filename}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
