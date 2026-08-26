'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { useVocabulary } from '@/lib/hooks/use-vocabulary'
import { createClient } from '@/lib/supabase/client'
import { userManagementService } from '@/lib/services/user-management.service.client'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/toast'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from '@/components/ui/motion'
import { ComplianceStatusBadge } from '@/components/documents/expiry-badge'
import {
  useOrganizationTeacherCompliance,
  worstComplianceStatus,
  type TeacherComplianceRow,
} from '@/lib/hooks/use-teacher-compliance'
import {
  Users, Briefcase, AlertTriangle, ShieldCheck, Mail, Search,
  Upload, Download, FileText, Send, Hash, ExternalLink, GraduationCap, Settings2,
  Calendar, Euro, Clock, PenLine, CheckCircle2,
} from 'lucide-react'

const supabase = createClient()

// ─── Types ─────────────────────────────────────────────────────────────────

interface TeacherWithUser {
  id: string
  user_id: string
  organization_id: string
  employee_number: string | null
  specialization: string | null
  bio: string | null
  statut: 'independant' | 'salarie'
  siret: string | null
  is_active: boolean
  user: { id: string; email: string; full_name: string | null; avatar_url: string | null } | null
}

interface TeacherDocument {
  id: string
  teacher_id: string
  organization_id: string
  title: string
  document_type: string | null
  required_document_type_id: string | null
  file_url: string
  expiry_date: string | null
  verified: boolean | null
  uploaded_at: string | null
}

interface Kpi {
  label: string
  value: string | number
  icon: React.ReactNode
  accent: string
  chipBg: string
}

const COMPLIANCE_ACCENT: Record<'ok' | 'expiring_soon' | 'expired' | 'missing', string> = {
  ok: 'border-l-emerald-400',
  expiring_soon: 'border-l-orange-400',
  expired: 'border-l-red-400',
  missing: 'border-l-gray-300',
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  diploma: 'Diplôme',
  certification: 'Certification',
  administrative: 'Administratif',
  identity: "Pièce d'identité",
  other: 'Autre',
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function FormateursPage() {
  return (
    <RoleGuard allowedRoles={FORMATION_MANAGEMENT_ROLES}>
      <FormateursPageContent />
    </RoleGuard>
  )
}

function FormateursPageContent() {
  const { user } = useAuth()
  const vocab = useVocabulary()
  const orgId = user?.organization_id
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<'all' | 'independant' | 'salarie'>('all')
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'ok' | 'expiring_soon' | 'non_conforme'>('all')
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherWithUser | null>(null)
  const [dialogTab, setDialogTab] = useState('conformite')
  const [prefillRequiredTypeId, setPrefillRequiredTypeId] = useState<string | null>(null)

  // Déclenche le seed du catalogue de documents requis au premier accès (idempotent côté serveur)
  useQuery({
    queryKey: ['seed-teacher-required-types', orgId],
    queryFn: async () => {
      const res = await fetch('/api/teacher-documents/required-types')
      return res.ok ? res.json() : []
    },
    enabled: !!orgId,
    staleTime: Infinity,
  })

  const { data: teachers, isLoading: isLoadingTeachers } = useQuery({
    queryKey: ['formateurs-list', orgId],
    queryFn: async () => {
      if (!orgId) return []
      // Pas de jointure PostgREST (teachers.user_id référence auth.users, pas
      // public.users — PostgREST ne peut pas résoudre l'embed `user:users(...)`).
      // On récupère les users séparément et on fusionne côté client.
      const { data: teacherRows, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = teacherRows ?? []
      if (rows.length === 0) return []

      const userIds = rows.map((t: any) => t.user_id)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds)
      if (usersError) throw usersError
      const usersById = new Map((users ?? []).map((u: any) => [u.id, u]))

      return rows.map((t: any) => ({ ...t, user: usersById.get(t.user_id) ?? null })) as unknown as TeacherWithUser[]
    },
    enabled: !!orgId,
  })

  const { data: compliance, isLoading: isLoadingCompliance } = useOrganizationTeacherCompliance(orgId)

  const { data: org } = useQuery({
    queryKey: ['organization', orgId],
    queryFn: async () => {
      if (!orgId) return null
      const { data } = await supabase.from('organizations').select('*').eq('id', orgId).maybeSingle()
      return data
    },
    enabled: !!orgId,
  })

  const complianceByTeacher = useMemo(() => {
    const map = new Map<string, TeacherComplianceRow[]>()
    ;(compliance ?? []).forEach(row => {
      const list = map.get(row.teacher_user_id) ?? []
      list.push(row)
      map.set(row.teacher_user_id, list)
    })
    return map
  }, [compliance])

  const isLoading = isLoadingTeachers || isLoadingCompliance

  const filteredTeachers = useMemo(() => {
    return (teachers ?? []).filter(t => {
      if (statutFilter !== 'all' && t.statut !== statutFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const name = (t.user?.full_name ?? '').toLowerCase()
        const email = (t.user?.email ?? '').toLowerCase()
        if (!name.includes(q) && !email.includes(q)) return false
      }
      if (complianceFilter !== 'all') {
        const worst = worstComplianceStatus(complianceByTeacher.get(t.user_id) ?? [])
        if (complianceFilter === 'ok' && worst !== 'ok') return false
        if (complianceFilter === 'expiring_soon' && worst !== 'expiring_soon') return false
        if (complianceFilter === 'non_conforme' && worst !== 'expired' && worst !== 'missing') return false
      }
      return true
    })
  }, [teachers, statutFilter, search, complianceFilter, complianceByTeacher])

  const independantsCount = (teachers ?? []).filter(t => t.statut === 'independant').length
  const salariesCount = (teachers ?? []).length - independantsCount
  const expiringSoonCount = (compliance ?? []).filter(r => r.status === 'expiring_soon').length
  const nonConformeCount = (teachers ?? []).filter(t => {
    const worst = worstComplianceStatus(complianceByTeacher.get(t.user_id) ?? [])
    return worst === 'expired' || worst === 'missing'
  }).length

  const kpis: Kpi[] = [
    {
      label: `Total ${vocab.teachers.toLowerCase()}`,
      value: teachers?.length ?? 0,
      icon: <Users className="h-5 w-5" />,
      accent: 'text-indigo-600',
      chipBg: 'bg-indigo-50',
    },
    {
      label: 'Indépendants / Salariés',
      value: `${independantsCount} / ${salariesCount}`,
      icon: <Briefcase className="h-5 w-5" />,
      accent: 'text-blue-600',
      chipBg: 'bg-blue-50',
    },
    {
      label: 'Documents à surveiller',
      value: expiringSoonCount,
      icon: <ShieldCheck className="h-5 w-5" />,
      accent: 'text-orange-600',
      chipBg: 'bg-orange-50',
    },
    {
      label: 'Non conformes',
      value: nonConformeCount,
      icon: <AlertTriangle className="h-5 w-5" />,
      accent: 'text-red-600',
      chipBg: 'bg-red-50',
    },
  ]

  const openTeacher = (t: TeacherWithUser) => {
    setSelectedTeacher(t)
    setDialogTab('conformite')
  }

  const nonConformeTeachers = (teachers ?? []).filter(t => {
    const worst = worstComplianceStatus(complianceByTeacher.get(t.user_id) ?? [])
    return worst === 'expired' || worst === 'missing'
  })

  const bulkRelanceMutation = useMutation({
    mutationFn: async () => {
      const relances = nonConformeTeachers.map(t => ({
        teacher_user_id: t.user_id,
        required_document_type_ids: (complianceByTeacher.get(t.user_id) ?? [])
          .filter(r => r.status !== 'ok')
          .map(r => r.required_document_type_id),
      })).filter(r => r.required_document_type_ids.length > 0)

      const res = await fetch('/api/teacher-documents/relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relances }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur relance groupée')
      return json as { sent: number; errors: number }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-compliance'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-alert-log'] })
      addToast({
        title: 'Relances envoyées',
        description: `${result.sent} formateur${result.sent > 1 ? 's' : ''} relancé${result.sent > 1 ? 's' : ''}${result.errors > 0 ? `, ${result.errors} erreur(s)` : ''}`,
        type: result.errors > 0 ? 'warning' : 'success',
      })
    },
    onError: (e: any) => addToast({ title: 'Erreur', description: e.message, type: 'error' }),
  })

  const handleBulkRelance = () => {
    if (!confirm(`Envoyer une relance à ${nonConformeTeachers.length} formateur${nonConformeTeachers.length > 1 ? 's' : ''} non conforme${nonConformeTeachers.length > 1 ? 's' : ''} ?`)) return
    bulkRelanceMutation.mutate()
  }

  return (
    <div className="p-6 space-y-8">
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center shadow-sm shadow-brand-blue/20 flex-shrink-0">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent leading-tight">
              {vocab.teachers}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Conformité des documents par statut ({vocab.teacher.toLowerCase()} indépendant ou salarié)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {nonConformeCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkRelance}
              disabled={bulkRelanceMutation.isPending}
              className="border-amber-200 text-amber-700 hover:bg-amber-100"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {bulkRelanceMutation.isPending ? 'Envoi...' : `Relancer tous les non-conformes (${nonConformeCount})`}
            </Button>
          )}
          <Link href="/dashboard/settings/teacher-document-types">
            <Button variant="outline" size="sm">
              <Settings2 className="w-4 h-4 mr-1.5" />
              Documents requis
            </Button>
          </Link>
        </div>
      </motion.div>

      <KpiBar kpis={kpis} loading={isLoading} />

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white rounded-xl border border-gray-200 shadow-sm p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un nom ou un email..."
            className="pl-9 border-gray-200"
          />
        </div>
        <Select value={statutFilter} onValueChange={v => setStatutFilter(v as typeof statutFilter)}>
          <SelectTrigger className="sm:w-48 border-gray-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="independant">Indépendant</SelectItem>
            <SelectItem value="salarie">Salarié</SelectItem>
          </SelectContent>
        </Select>
        <Select value={complianceFilter} onValueChange={v => setComplianceFilter(v as typeof complianceFilter)}>
          <SelectTrigger className="sm:w-56 border-gray-200"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute conformité</SelectItem>
            <SelectItem value="ok">À jour</SelectItem>
            <SelectItem value="expiring_soon">À surveiller</SelectItem>
            <SelectItem value="non_conforme">Non conforme</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-white">
          <div className="h-14 w-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-brand-blue" />
          </div>
          <p className="text-gray-700 font-semibold">Aucun {vocab.teacher.toLowerCase()} trouvé</p>
          <p className="text-gray-400 text-sm mt-1">
            {(teachers?.length ?? 0) > 0 ? 'Essayez d\'ajuster vos filtres.' : `Invitez un ${vocab.teacher.toLowerCase()} depuis les paramètres pour le voir apparaître ici.`}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((t, i) => {
            const rows = complianceByTeacher.get(t.user_id) ?? []
            const worst = worstComplianceStatus(rows)
            const missingCount = rows.filter(r => r.status === 'missing').length
            const expiredCount = rows.filter(r => r.status === 'expired').length
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
              >
                <GlassCard
                  variant="premium"
                  hoverable
                  className={`p-5 cursor-pointer border-l-4 ${COMPLIANCE_ACCENT[worst]}`}
                  onClick={() => openTeacher(t)}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <TeacherAvatar teacher={t} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{t.user?.full_name ?? '—'}</p>
                        <p className="text-xs text-gray-500 truncate">{t.user?.email}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      t.statut === 'independant' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {t.statut === 'independant' ? 'Indépendant' : 'Salarié'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <ComplianceStatusBadge status={worst} />
                    {(missingCount + expiredCount) > 0 && (
                      <span className="text-xs text-gray-500">
                        {missingCount + expiredCount} document{missingCount + expiredCount > 1 ? 's' : ''} à traiter
                      </span>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Dialog de détail */}
      <Dialog open={!!selectedTeacher} onOpenChange={open => { if (!open) { setSelectedTeacher(null); setPrefillRequiredTypeId(null) } }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTeacher && orgId && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <TeacherAvatar teacher={selectedTeacher} size="lg" />
                  <div>
                    <DialogTitle className="text-xl">{selectedTeacher.user?.full_name ?? '—'}</DialogTitle>
                    <p className="text-sm text-gray-500">{selectedTeacher.user?.email}</p>
                  </div>
                </div>
              </DialogHeader>

              <Tabs value={dialogTab} onValueChange={setDialogTab} className="mt-4">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="conformite">Conformité</TabsTrigger>
                  <TabsTrigger value="profil">Profil</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="convention">Convention</TabsTrigger>
                </TabsList>

                <TabsContent value="conformite" className="pt-4">
                  <ComplianceTab
                    teacher={selectedTeacher}
                    rows={complianceByTeacher.get(selectedTeacher.user_id) ?? []}
                    onUploadFor={row => {
                      setPrefillRequiredTypeId(row.required_document_type_id)
                      setDialogTab('documents')
                    }}
                  />
                </TabsContent>

                <TabsContent value="profil" className="pt-4">
                  <ProfileTab teacher={selectedTeacher} />
                </TabsContent>

                <TabsContent value="documents" className="pt-4">
                  <DocumentsTab
                    teacher={selectedTeacher}
                    orgId={orgId}
                    requiredTypes={complianceByTeacher.get(selectedTeacher.user_id) ?? []}
                    prefillRequiredTypeId={prefillRequiredTypeId}
                    onPrefillConsumed={() => setPrefillRequiredTypeId(null)}
                  />
                </TabsContent>

                <TabsContent value="convention" className="pt-4">
                  <ConventionTab teacher={selectedTeacher} org={org} />
                </TabsContent>
              </Tabs>

              <div className="pt-2 mt-2 border-t border-gray-100 flex justify-end">
                <a
                  href="/dashboard/settings/teachers/remuneration"
                  className="text-xs text-gray-400 hover:text-brand-blue inline-flex items-center gap-1"
                >
                  Rémunération <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── KpiBar ───────────────────────────────────────────────────────────────

function KpiBar({ kpis, loading }: { kpis: Kpi[]; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <GlassCard variant="default" hoverable className="p-4 flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.chipBg}`}>
              <span className={kpi.accent}>{kpi.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 truncate">{kpi.label}</p>
              {loading ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <p className="text-xl font-bold text-gray-900 leading-tight">{kpi.value}</p>
              )}
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  )
}

// ─── TeacherAvatar ────────────────────────────────────────────────────────

function TeacherAvatar({ teacher, size = 'sm' }: { teacher: TeacherWithUser; size?: 'sm' | 'lg' }) {
  const initials = teacher.user?.full_name
    ? teacher.user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : teacher.user?.email?.[0]?.toUpperCase() ?? '?'
  const cls = size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
  return teacher.user?.avatar_url ? (
    <img src={teacher.user.avatar_url} alt="" className={`${cls} rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm`} />
  ) : (
    <div className={`${cls} rounded-full bg-gradient-to-br from-brand-blue/15 to-brand-cyan/15 ring-2 ring-white shadow-sm flex items-center justify-center flex-shrink-0`}>
      <span className="font-semibold text-brand-blue">{initials}</span>
    </div>
  )
}

// ─── ComplianceTab ────────────────────────────────────────────────────────

interface AlertLogRow {
  required_document_type_id: string | null
  alert_type: string
  sent_at: string
  sent_by: string | null
}

function relanceAgeLabel(sentAt: string): string {
  const days = Math.floor((Date.now() - new Date(sentAt).getTime()) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  return `il y a ${days} jours`
}

function relanceKindLabel(alertType: string): string {
  if (alertType === 'missing_manual') return 'manuelle'
  if (alertType === 'missing_weekly_digest') return 'digest hebdo'
  return 'automatique'
}

function ComplianceTab({ teacher, rows, onUploadFor }: {
  teacher: TeacherWithUser
  rows: TeacherComplianceRow[]
  onUploadFor: (row: TeacherComplianceRow) => void
}) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const { data: alertLog } = useQuery({
    queryKey: ['teacher-alert-log', teacher.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_document_alert_log' as any)
        .select('required_document_type_id, alert_type, sent_at, sent_by')
        .eq('teacher_id', teacher.user_id)
        .order('sent_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as AlertLogRow[]
    },
  })

  const latestAlertByType = useMemo(() => {
    const map = new Map<string, AlertLogRow>()
    ;(alertLog ?? []).forEach(a => {
      if (!a.required_document_type_id) return
      if (!map.has(a.required_document_type_id)) map.set(a.required_document_type_id, a)
    })
    return map
  }, [alertLog])

  const relanceMutation = useMutation({
    mutationFn: async (requiredDocumentTypeIds: string[]) => {
      const res = await fetch('/api/teacher-documents/relance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_user_id: teacher.user_id, required_document_type_ids: requiredDocumentTypeIds }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur relance')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-compliance'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-alert-log', teacher.user_id] })
      addToast({ title: 'Relance envoyée', description: `Email et notification envoyés à ${teacher.user?.email}`, type: 'success' })
    },
    onError: (e: any) => addToast({ title: 'Erreur', description: e.message, type: 'error' }),
  })

  const handleDownload = async (fileUrl: string) => {
    const { data } = await supabase.storage.from('teacher-documents').createSignedUrl(fileUrl, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const problematic = rows.filter(r => r.status !== 'ok')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Documents requis pour le statut <strong>{teacher.statut === 'independant' ? 'Indépendant' : 'Salarié'}</strong>
        </p>
        {problematic.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => relanceMutation.mutate(problematic.map(r => r.required_document_type_id))}
            disabled={relanceMutation.isPending}
            className="border-amber-200 text-amber-700 hover:bg-amber-100 flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {relanceMutation.isPending ? 'Envoi...' : `Relancer (${problematic.length})`}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {rows.map(row => (
          <div key={row.required_document_type_id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{row.label}</p>
              {row.effective_expiry_date && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {row.status === 'expired' ? 'Expiré le' : 'Expire le'} {new Date(row.effective_expiry_date).toLocaleDateString('fr-FR')}
                </p>
              )}
              {latestAlertByType.has(row.required_document_type_id) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Dernière relance {relanceKindLabel(latestAlertByType.get(row.required_document_type_id)!.alert_type)} : {relanceAgeLabel(latestAlertByType.get(row.required_document_type_id)!.sent_at)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ComplianceStatusBadge status={row.status} />
              {row.file_url && (
                <Button variant="outline" size="icon" onClick={() => handleDownload(row.file_url!)} title="Télécharger">
                  <Download className="w-3.5 h-3.5" />
                </Button>
              )}
              {row.status !== 'ok' && (
                <Button variant="outline" size="sm" onClick={() => onUploadFor(row)}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Uploader
                </Button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">Aucun document requis configuré pour cette organisation.</p>
        )}
      </div>
    </div>
  )
}

// ─── ProfileTab ───────────────────────────────────────────────────────────

function ProfileTab({ teacher }: { teacher: TeacherWithUser }) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    employee_number: teacher.employee_number ?? '',
    specialization: teacher.specialization ?? '',
    statut: teacher.statut,
    siret: teacher.siret ?? '',
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) => userManagementService.updateTeacher(teacher.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formateurs-list'] })
      queryClient.invalidateQueries({ queryKey: ['teacher-compliance'] })
      addToast({ title: 'Profil mis à jour', type: 'success' })
    },
    onError: (e: any) => addToast({ title: 'Erreur', description: e.message, type: 'error' }),
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Statut</Label>
          <Select value={form.statut} onValueChange={v => setForm(p => ({ ...p, statut: v as 'independant' | 'salarie' }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent portal={false}>
              <SelectItem value="salarie">Salarié</SelectItem>
              <SelectItem value="independant">Indépendant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.statut === 'independant' && (
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" />SIRET</Label>
            <Input value={form.siret} onChange={e => setForm(p => ({ ...p, siret: e.target.value }))} placeholder="14 chiffres" maxLength={14} />
          </div>
        )}
        <div className="space-y-1">
          <Label>Numéro employé</Label>
          <Input value={form.employee_number} onChange={e => setForm(p => ({ ...p, employee_number: e.target.value }))} placeholder="EMP-001" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Spécialisation</Label>
          <Input value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} placeholder="Ex: Sécurité incendie, Gestes premiers secours..." />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => updateMutation.mutate({
            employee_number: form.employee_number.trim() || null,
            specialization: form.specialization.trim() || null,
            statut: form.statut,
            siret: form.statut === 'independant' ? (form.siret.trim() || null) : null,
          })}
          disabled={updateMutation.isPending}
          className="bg-brand-blue hover:bg-brand-blue-dark"
        >
          {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  )
}

// ─── DocumentsTab ─────────────────────────────────────────────────────────

function DocumentsTab({ teacher, orgId, requiredTypes, prefillRequiredTypeId, onPrefillConsumed }: {
  teacher: TeacherWithUser
  orgId: string
  requiredTypes: TeacherComplianceRow[]
  prefillRequiredTypeId?: string | null
  onPrefillConsumed?: () => void
}) {
  const { addToast } = useToast()
  const { user: adminUser } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadForm, setUploadForm] = useState({ title: '', document_type: 'diploma', expiry_date: '', required_document_type_id: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)

  useEffect(() => {
    if (!prefillRequiredTypeId) return
    const row = requiredTypes.find(rt => rt.required_document_type_id === prefillRequiredTypeId)
    setUploadForm(p => ({ ...p, required_document_type_id: prefillRequiredTypeId, title: p.title || row?.label || '' }))
    setShowUploadForm(true)
    onPrefillConsumed?.()
  }, [prefillRequiredTypeId])
  const [isSendingInvite, setIsSendingInvite] = useState(false)

  const { data: docs, isLoading } = useQuery({
    queryKey: ['teacher-documents', teacher.user_id, orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_documents')
        .select('*')
        .eq('teacher_id', teacher.user_id)
        .eq('organization_id', orgId)
        .order('uploaded_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as TeacherDocument[]
    },
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher-documents', teacher.user_id] })
    queryClient.invalidateQueries({ queryKey: ['teacher-compliance'] })
  }

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/teacher-documents/${docId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur suppression')
    },
    onSuccess: () => { invalidateAll(); addToast({ title: 'Document supprimé', type: 'success' }) },
    onError: (e: any) => addToast({ title: 'Erreur', description: e.message, type: 'error' }),
  })

  const verifyMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('teacher_documents' as any)
        .update({ verified: true, verified_at: new Date().toISOString(), verified_by: adminUser?.id } as any)
        .eq('id', docId)
      if (error) throw error
    },
    onSuccess: () => { invalidateAll(); addToast({ title: 'Document vérifié', type: 'success' }) },
    onError: (e: any) => addToast({ title: 'Erreur', description: e.message, type: 'error' }),
  })

  const handleSendDocumentInvite = async () => {
    if (!teacher.user?.email) return
    setIsSendingInvite(true)
    try {
      const docsUrl = `${window.location.origin}/dashboard/teacher/documents`
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: teacher.user.email,
          subject: 'Merci de déposer vos documents sur votre espace formateur',
          message: `Bonjour ${teacher.user.full_name ?? 'Formateur'},\n\nNous vous remercions de bien vouloir déposer vos documents de conformité sur votre espace formateur.\n\nVous pouvez le faire directement en cliquant sur le lien suivant :\n${docsUrl}\n\nMerci de votre collaboration.\n\nCordialement,`,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur envoi email')
      addToast({ title: 'Email envoyé', description: `Invitation envoyée à ${teacher.user.email}`, type: 'success' })
    } catch (err: any) {
      addToast({ title: 'Erreur', description: err.message, type: 'error' })
    } finally {
      setIsSendingInvite(false)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !uploadForm.title.trim()) return
    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('title', uploadForm.title.trim())
      fd.append('document_type', uploadForm.document_type)
      if (uploadForm.expiry_date) fd.append('expiry_date', uploadForm.expiry_date)
      if (uploadForm.required_document_type_id) fd.append('required_document_type_id', uploadForm.required_document_type_id)
      fd.append('target_teacher_user_id', teacher.user_id)

      const res = await fetch('/api/teacher-documents/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur upload')

      invalidateAll()
      setUploadForm({ title: '', document_type: 'diploma', expiry_date: '', required_document_type_id: '' })
      setSelectedFile(null)
      setShowUploadForm(false)
      addToast({ title: 'Document ajouté', type: 'success' })
    } catch (err: any) {
      addToast({ title: 'Erreur', description: err.message, type: 'error' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (doc: TeacherDocument) => {
    const { data } = await supabase.storage.from('teacher-documents').createSignedUrl(doc.file_url, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-800">Demander les documents au formateur</p>
          <p className="text-xs text-amber-600 mt-0.5 truncate">Envoi d'un email à {teacher.user?.email} avec le lien vers son espace</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendDocumentInvite}
          disabled={isSendingInvite || !teacher.user?.email}
          className="ml-3 flex-shrink-0 border-amber-200 text-amber-700 hover:bg-amber-100"
        >
          <Mail className="w-3.5 h-3.5 mr-1.5" />
          {isSendingInvite ? 'Envoi...' : 'Envoyer'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center text-gray-400 py-6">Chargement...</p>
      ) : (docs?.length ?? 0) === 0 && !showUploadForm ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucun document pour ce formateur</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs?.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{doc.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  {doc.document_type && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                      {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                    </span>
                  )}
                  {doc.verified ? (
                    <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 rounded">Vérifié</span>
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded">En attente</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {!doc.verified && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => verifyMutation.mutate(doc.id)}
                    disabled={verifyMutation.isPending}
                    title="Vérifier"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={() => handleDownload(doc)} title="Télécharger">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => { if (confirm('Supprimer ce document ?')) deleteMutation.mutate(doc.id) }}
                  title="Supprimer"
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUploadForm ? (
        <form onSubmit={handleUpload} className="border border-dashed border-brand-blue/40 rounded-xl p-4 space-y-3 bg-blue-50/30">
          <p className="font-medium text-sm text-brand-blue">Ajouter un document</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Titre *</Label>
              <Input value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Diplôme de formateur, Kbis..." required />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={uploadForm.document_type} onValueChange={v => setUploadForm(p => ({ ...p, document_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent portal={false}>
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Date d'expiration</Label>
              <Input type="date" value={uploadForm.expiry_date} onChange={e => setUploadForm(p => ({ ...p, expiry_date: e.target.value }))} />
            </div>
            {requiredTypes.length > 0 && (
              <div className="col-span-2 space-y-1">
                <Label>Document requis couvert</Label>
                <Select
                  value={uploadForm.required_document_type_id || 'none'}
                  onValueChange={v => setUploadForm(p => ({ ...p, required_document_type_id: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent portal={false}>
                    <SelectItem value="none">Aucun</SelectItem>
                    {requiredTypes.map(rt => (
                      <SelectItem key={rt.required_document_type_id} value={rt.required_document_type_id}>{rt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="col-span-2 space-y-1">
              <Label>Fichier PDF *</Label>
              <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
              <div
                className="border border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <p className="text-sm text-green-700 font-medium">{selectedFile.name}</p>
                ) : (
                  <p className="text-sm text-gray-400">Cliquez pour sélectionner un PDF (max 10 Mo)</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowUploadForm(false); setSelectedFile(null) }}>Annuler</Button>
            <Button type="submit" size="sm" className="bg-brand-blue hover:bg-brand-blue-dark" disabled={isUploading || !selectedFile || !uploadForm.title.trim()}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {isUploading ? 'Upload...' : 'Ajouter'}
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" onClick={() => setShowUploadForm(true)} className="w-full border-dashed">
          <Upload className="w-4 h-4 mr-2" />
          Ajouter un document
        </Button>
      )}
    </div>
  )
}

// ─── ConventionTab ────────────────────────────────────────────────────────

interface ConventionFormData {
  period_start: string
  period_end: string
  hourly_rate: string
  total_hours: string
  specialization: string
  custom_notes: string
}

function ConventionTab({ teacher, org }: { teacher: TeacherWithUser; org: any }) {
  const { addToast } = useToast()
  const [form, setForm] = useState<ConventionFormData>({
    period_start: '',
    period_end: '',
    hourly_rate: '',
    total_hours: '',
    specialization: teacher.specialization ?? '',
    custom_notes: '',
  })
  const [isGenerating, setIsGenerating] = useState<'signature' | 'email' | null>(null)

  const generatePdf = async (): Promise<Blob | null> => {
    const res = await fetch('/api/teacher-documents/generate-convention', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacher: {
          user_id: teacher.user_id,
          full_name: teacher.user?.full_name ?? '',
          email: teacher.user?.email ?? '',
          specialization: teacher.specialization,
        },
        convention: {
          period_start: form.period_start,
          period_end: form.period_end,
          hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
          total_hours: form.total_hours ? Number(form.total_hours) : null,
          specialization: form.specialization.trim() || null,
          custom_notes: form.custom_notes.trim() || null,
        },
      }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error ?? 'Erreur génération PDF')
    }
    return res.blob()
  }

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

  const handleSendForSignature = async () => {
    if (!form.period_start || !form.period_end) {
      addToast({ title: 'La période est requise', type: 'error' })
      return
    }
    setIsGenerating('signature')
    try {
      const blob = await generatePdf()
      if (!blob) return
      const pdfBase64 = await blobToBase64(blob)
      const res = await fetch('/api/signature-requests/send-from-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          documentTitle: `Convention de prestation — ${teacher.user?.full_name}`,
          type: 'convention',
          recipientEmail: teacher.user?.email,
          recipientName: teacher.user?.full_name,
          recipientId: teacher.user_id,
          recipientType: 'teacher',
          subject: `Convention de prestation à signer`,
          message: `Bonjour ${teacher.user?.full_name},\n\nVeuillez trouver ci-joint votre convention de prestation. Merci de la signer électroniquement en cliquant sur le lien ci-dessous.`,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur envoi signature')
      addToast({ title: 'Convention envoyée pour signature', description: `Email envoyé à ${teacher.user?.email}`, type: 'success' })
    } catch (err: any) {
      addToast({ title: 'Erreur', description: err.message, type: 'error' })
    } finally {
      setIsGenerating(null)
    }
  }

  const handleSendByEmail = async () => {
    if (!form.period_start || !form.period_end) {
      addToast({ title: 'La période est requise', type: 'error' })
      return
    }
    setIsGenerating('email')
    try {
      const blob = await generatePdf()
      if (!blob) return

      // Upload dans Supabase Storage pour obtenir une URL
      const orgId = org?.id ?? 'unknown'
      const fileName = `teacher-conventions/${orgId}/${teacher.user_id}/${Date.now()}.pdf`
      const file = new File([blob], 'convention.pdf', { type: 'application/pdf' })
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { upsert: true })
      if (uploadErr) throw new Error('Erreur upload : ' + uploadErr.message)

      const { data: signedData } = await supabase.storage
        .from('documents')
        .createSignedUrl(uploadData.path, 3600 * 24 * 7)
      if (!signedData?.signedUrl) throw new Error('Impossible d\'obtenir l\'URL du document')

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: teacher.user?.email,
          subject: `Convention de prestation — ${teacher.user?.full_name}`,
          message: `Bonjour ${teacher.user?.full_name},\n\nVeuillez trouver en pièce jointe votre convention de prestation.\n\nCordialement,\n${org?.name ?? ''}`,
          attachmentUrl: signedData.signedUrl,
          attachmentName: `convention-${(teacher.user?.full_name ?? 'formateur').replace(/\s+/g, '-')}.pdf`,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur envoi email')
      addToast({ title: 'Convention envoyée par email', description: `Email envoyé à ${teacher.user?.email}`, type: 'success' })
    } catch (err: any) {
      addToast({ title: 'Erreur', description: err.message, type: 'error' })
    } finally {
      setIsGenerating(null)
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">
        Générez une convention de prestation pour <strong>{teacher.user?.full_name}</strong>, puis envoyez-la pour signature électronique ou par email.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Début de la convention *</Label>
          <Input type="date" value={form.period_start} onChange={e => setForm(p => ({ ...p, period_start: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Fin de la convention *</Label>
          <Input type="date" value={form.period_end} onChange={e => setForm(p => ({ ...p, period_end: e.target.value }))} required />
        </div>
        <div className="space-y-1">
          <Label className="flex items-center gap-1.5"><Euro className="w-3.5 h-3.5" />Tarif horaire HT (€)</Label>
          <Input type="number" min="0" step="0.01" value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} placeholder="Ex: 75.00" />
        </div>
        <div className="space-y-1">
          <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Volume horaire</Label>
          <Input type="number" min="0" step="0.5" value={form.total_hours} onChange={e => setForm(p => ({ ...p, total_hours: e.target.value }))} placeholder="Ex: 14" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />Domaine / spécialité</Label>
          <Input value={form.specialization} onChange={e => setForm(p => ({ ...p, specialization: e.target.value }))} placeholder="Ex: Sécurité incendie, Premiers secours..." />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Clauses particulières</Label>
          <Textarea value={form.custom_notes} onChange={e => setForm(p => ({ ...p, custom_notes: e.target.value }))} rows={3} placeholder="Conditions spécifiques, matériel fourni, etc." />
        </div>
      </div>

      {form.hourly_rate && form.total_hours && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm">
          <span className="text-gray-600">Montant total estimé HT : </span>
          <strong className="text-brand-blue">
            {(Number(form.hourly_rate) * Number(form.total_hours)).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </strong>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleSendForSignature}
          disabled={!!isGenerating || !form.period_start || !form.period_end}
          className="flex-1 bg-brand-blue hover:bg-brand-blue-dark"
        >
          <PenLine className="w-4 h-4 mr-2" />
          {isGenerating === 'signature' ? 'Génération...' : 'Envoyer pour signature'}
        </Button>
        <Button
          variant="outline"
          onClick={handleSendByEmail}
          disabled={!!isGenerating || !form.period_start || !form.period_end}
          className="flex-1"
        >
          <Mail className="w-4 h-4 mr-2" />
          {isGenerating === 'email' ? 'Envoi...' : 'Envoyer par email'}
        </Button>
      </div>
    </div>
  )
}
