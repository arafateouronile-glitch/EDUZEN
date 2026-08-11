'use client'

import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { userManagementService } from '@/lib/services/user-management.service.client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import {
  Plus, GraduationCap, Edit, UserX, UserCheck, Mail, Briefcase, Hash,
  FolderOpen, Upload, Download, Trash2, FileText, PenLine, Calendar,
  Clock, Euro, AlertTriangle,
} from 'lucide-react'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'

const supabase = createClient()

// ─── Types ─────────────────────────────────────────────────────────────────

interface TeacherWithUser {
  id: string
  user_id: string
  organization_id: string
  employee_number: string | null
  hire_date: string | null
  specialization: string | null
  bio: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  user: { id: string; email: string; full_name: string | null; avatar_url: string | null } | null
}

interface TeacherDocument {
  id: string
  teacher_id: string
  organization_id: string
  title: string
  description: string | null
  document_type: string | null
  file_url: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  expiry_date: string | null
  verified: boolean | null
  verified_at: string | null
  uploaded_at: string | null
  notes: string | null
}

interface ProfileFormData {
  employee_number: string
  hire_date: string
  specialization: string
  bio: string
}

interface UploadFormData {
  title: string
  document_type: string
  expiry_date: string
}

interface ConventionFormData {
  period_start: string
  period_end: string
  hourly_rate: string
  total_hours: string
  specialization: string
  custom_notes: string
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  diploma: 'Diplôme',
  certification: 'Certification',
  administrative: 'Administratif',
  identity: 'Pièce d\'identité',
  other: 'Autre',
}

// ─── Expiry helper ────────────────────────────────────────────────────────

function expiryStatus(expiry_date: string | null): 'expired' | 'soon' | 'warning' | 'ok' | null {
  if (!expiry_date) return null
  const days = Math.floor((new Date(expiry_date).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return 'expired'
  if (days < 30) return 'soon'
  if (days < 90) return 'warning'
  return 'ok'
}

function ExpiryBadge({ date }: { date: string | null }) {
  const status = expiryStatus(date)
  if (!status || status === 'ok') return null
  const colors = {
    expired: 'bg-red-100 text-red-700 border-red-200',
    soon: 'bg-red-50 text-red-600 border-red-100',
    warning: 'bg-orange-50 text-orange-600 border-orange-100',
  } as const
  const labels = {
    expired: `Expiré (${new Date(date!).toLocaleDateString('fr-FR')})`,
    soon: `Expire le ${new Date(date!).toLocaleDateString('fr-FR')}`,
    warning: `Expire le ${new Date(date!).toLocaleDateString('fr-FR')}`,
  } as const
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${colors[status]}`}>
      <AlertTriangle className="w-3 h-3" />
      {labels[status]}
    </span>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────

export default function TeachersSettingsPage() {
  return (
    <RoleGuard allowedRoles={FORMATION_MANAGEMENT_ROLES}>
      <TeachersPageContent />
    </RoleGuard>
  )
}

function TeachersPageContent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [managedTeacher, setManagedTeacher] = useState<TeacherWithUser | null>(null)
  const [dialogTab, setDialogTab] = useState<string>('profile')
  const [showInactive, setShowInactive] = useState(false)

  // ─── Profile form ──────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState<ProfileFormData>({ employee_number: '', hire_date: '', specialization: '', bio: '' })

  // ─── Teachers query ────────────────────────────────────────────────────
  const { data: teachers, isLoading } = useQuery({
    queryKey: ['settings-teachers', user?.organization_id, showInactive],
    queryFn: async () => {
      if (!user?.organization_id) return []
      // Pas de jointure PostgREST (teachers.user_id référence auth.users, pas
      // public.users — PostgREST ne peut pas résoudre l'embed `user:users(...)`).
      // On récupère les users séparément et on fusionne côté client.
      let q = supabase
        .from('teachers')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false })
      if (!showInactive) q = q.eq('is_active', true)
      const { data: teacherRows, error } = await q
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
    enabled: !!user?.organization_id,
  })

  // ─── Org query ────────────────────────────────────────────────────────
  const { data: org } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data } = await supabase.from('organizations').select('*').eq('id', user.organization_id).maybeSingle()
      return data
    },
    enabled: !!user?.organization_id,
  })

  // ─── Profile mutation ─────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) =>
      userManagementService.updateTeacher(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-teachers'] })
      addToast({ title: 'Profil mis à jour', type: 'success' })
    },
    onError: (e: any) => addToast({ title: 'Erreur', description: e.message, type: 'error' }),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      userManagementService.updateTeacher(id, { is_active }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['settings-teachers'] })
      addToast({ title: vars.is_active ? 'Enseignant activé' : 'Enseignant désactivé', type: 'success' })
    },
    onError: (e: any) => addToast({ title: 'Erreur', description: e.message, type: 'error' }),
  })

  const openManage = (teacher: TeacherWithUser) => {
    setManagedTeacher(teacher)
    setDialogTab('profile')
    setProfileForm({
      employee_number: teacher.employee_number ?? '',
      hire_date: teacher.hire_date ?? '',
      specialization: teacher.specialization ?? '',
      bio: teacher.bio ?? '',
    })
  }

  const activeTeachers = teachers?.filter(t => t.is_active) ?? []
  const inactiveTeachers = teachers?.filter(t => !t.is_active) ?? []

  return (
    <div className="p-6 space-y-8">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Enseignants</h1>
          <p className="text-gray-600 mt-1">Gérez les formateurs et enseignants de votre organisation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/dashboard/settings/teachers/remuneration">
              <Euro className="w-4 h-4 mr-1.5" />
              Rémunération
            </a>
          </Button>
          <Button
            onClick={() => window.location.href = '/dashboard/settings/users/new'}
            className="bg-brand-blue hover:bg-brand-blue-dark"
          >
            <Plus className="w-4 h-4 mr-2" />
            Inviter un enseignant
          </Button>
        </div>
      </div>

      {/* Compteurs */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Total" value={teachers?.length ?? 0} />
          <StatCard label="Actifs" value={activeTeachers.length} color="green" />
          <StatCard label="Inactifs" value={inactiveTeachers.length} color="gray" />
        </div>
      )}

      {/* Filtre */}
      <div className="flex items-center gap-3">
        <Switch checked={showInactive} onCheckedChange={setShowInactive} id="show-inactive-teachers" />
        <Label htmlFor="show-inactive-teachers" className="cursor-pointer text-sm text-gray-600">
          Afficher les enseignants inactifs
        </Label>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : (teachers?.length ?? 0) === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun enseignant pour l'instant</p>
          <p className="text-gray-400 text-sm mt-1">Invitez un enseignant via le bouton ci-dessus, puis assignez-lui le rôle « Formateur »</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTeachers.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTeachers.map((t) => (
                <TeacherCard
                  key={t.id}
                  teacher={t}
                  onManage={openManage}
                  onToggleActive={(id) => toggleActiveMutation.mutate({ id, is_active: false })}
                />
              ))}
            </div>
          )}
          {showInactive && inactiveTeachers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-3">Inactifs</p>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                {inactiveTeachers.map((t) => (
                  <TeacherCard
                    key={t.id}
                    teacher={t}
                    onManage={openManage}
                    onToggleActive={(id) => toggleActiveMutation.mutate({ id, is_active: true })}
                    isInactive
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog multi-onglets */}
      <Dialog open={!!managedTeacher} onOpenChange={(open) => { if (!open) setManagedTeacher(null) }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {managedTeacher && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <TeacherAvatar teacher={managedTeacher} size="lg" />
                  <div>
                    <DialogTitle className="text-xl">{managedTeacher.user?.full_name ?? '—'}</DialogTitle>
                    <p className="text-sm text-gray-500">{managedTeacher.user?.email}</p>
                  </div>
                </div>
              </DialogHeader>

              <Tabs value={dialogTab} onValueChange={setDialogTab} className="mt-4">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="profile">Profil</TabsTrigger>
                  <TabsTrigger value="documents">Documents & Diplômes</TabsTrigger>
                  <TabsTrigger value="convention">Convention</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="pt-4">
                  <ProfileTab
                    teacher={managedTeacher}
                    formData={profileForm}
                    setFormData={setProfileForm}
                    onSave={() => updateMutation.mutate({
                      id: managedTeacher.id,
                      data: {
                        employee_number: profileForm.employee_number.trim() || null,
                        hire_date: profileForm.hire_date || null,
                        specialization: profileForm.specialization.trim() || null,
                        bio: profileForm.bio.trim() || null,
                      },
                    })}
                    isSaving={updateMutation.isPending}
                  />
                </TabsContent>

                <TabsContent value="documents" className="pt-4">
                  <DocumentsTab teacher={managedTeacher} orgId={user?.organization_id ?? ''} />
                </TabsContent>

                <TabsContent value="convention" className="pt-4">
                  <ConventionTab teacher={managedTeacher} org={org} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── TeacherCard ──────────────────────────────────────────────────────────

function TeacherCard({
  teacher, onManage, onToggleActive, isInactive = false,
}: {
  teacher: TeacherWithUser
  onManage: (t: TeacherWithUser) => void
  onToggleActive: (id: string) => void
  isInactive?: boolean
}) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <TeacherAvatar teacher={teacher} />
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{teacher.user?.full_name ?? '—'}</CardTitle>
              {isInactive && <Badge variant="secondary" className="text-xs mt-0.5">Inactif</Badge>}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={() => onManage(teacher)} title="Gérer">
              <FolderOpen className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onToggleActive(teacher.id)}
              title={isInactive ? 'Réactiver' : 'Désactiver'}
            >
              {isInactive ? <UserCheck className="w-3.5 h-3.5 text-green-600" /> : <UserX className="w-3.5 h-3.5 text-red-500" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm text-gray-600">
        {teacher.user?.email && (
          <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /><span className="truncate">{teacher.user.email}</span></div>
        )}
        {teacher.specialization && (
          <div className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-gray-400" /><span className="truncate">{teacher.specialization}</span></div>
        )}
        {teacher.employee_number && (
          <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-gray-400" /><span>{teacher.employee_number}</span></div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── TeacherAvatar ────────────────────────────────────────────────────────

function TeacherAvatar({ teacher, size = 'sm' }: { teacher: TeacherWithUser; size?: 'sm' | 'lg' }) {
  const initials = teacher.user?.full_name
    ? teacher.user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : teacher.user?.email?.[0]?.toUpperCase() ?? '?'
  const cls = size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
  return teacher.user?.avatar_url ? (
    <img src={teacher.user.avatar_url} alt="" className={`${cls} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${cls} rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0`}>
      <span className="font-semibold text-brand-blue">{initials}</span>
    </div>
  )
}

// ─── ProfileTab ───────────────────────────────────────────────────────────

function ProfileTab({ teacher, formData, setFormData, onSave, isSaving }: {
  teacher: TeacherWithUser
  formData: ProfileFormData
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>
  onSave: () => void
  isSaving: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Numéro employé</Label>
          <Input value={formData.employee_number} onChange={e => setFormData(p => ({ ...p, employee_number: e.target.value }))} placeholder="EMP-001" />
        </div>
        <div className="space-y-1">
          <Label>Date d'embauche</Label>
          <Input type="date" value={formData.hire_date} onChange={e => setFormData(p => ({ ...p, hire_date: e.target.value }))} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Spécialisation</Label>
          <Input value={formData.specialization} onChange={e => setFormData(p => ({ ...p, specialization: e.target.value }))} placeholder="Ex: Sécurité incendie, Gestes premiers secours..." />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Biographie</Label>
          <Textarea value={formData.bio} onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Présentation courte..." />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={isSaving} className="bg-brand-blue hover:bg-brand-blue-dark">
          {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  )
}

// ─── DocumentsTab ─────────────────────────────────────────────────────────

function DocumentsTab({ teacher, orgId }: { teacher: TeacherWithUser; orgId: string }) {
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadForm, setUploadForm] = useState<UploadFormData>({ title: '', document_type: 'diploma', expiry_date: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [isSendingInvite, setIsSendingInvite] = useState(false)

  const handleSendDocumentInvite = async () => {
    if (!teacher.user?.email) return
    setIsSendingInvite(true)
    try {
      const appUrl = window.location.origin
      const docsUrl = `${appUrl}/dashboard/teacher/documents`
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: teacher.user.email,
          subject: 'Merci de déposer vos documents sur votre espace formateur',
          message: `Bonjour ${teacher.user.full_name ?? 'Formateur'},\n\nNous vous remercions de bien vouloir déposer vos diplômes et documents professionnels (certifications, pièce d'identité, etc.) sur votre espace formateur.\n\nVous pouvez le faire directement en cliquant sur le lien suivant :\n${docsUrl}\n\nMerci de votre collaboration.\n\nCordialement,`,
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

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/teacher-documents/${docId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Erreur suppression')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-documents', teacher.user_id] })
      addToast({ title: 'Document supprimé', type: 'success' })
    },
    onError: (e: any) => addToast({ title: 'Erreur', description: e.message, type: 'error' }),
  })

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
      fd.append('target_teacher_user_id', teacher.user_id)

      const res = await fetch('/api/teacher-documents/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur upload')

      queryClient.invalidateQueries({ queryKey: ['teacher-documents', teacher.user_id] })
      setUploadForm({ title: '', document_type: 'diploma', expiry_date: '' })
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
      {/* Invitation à charger les documents */}
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

      {/* Liste des documents */}
      {isLoading ? (
        <p className="text-center text-gray-400 py-6">Chargement...</p>
      ) : (docs?.length ?? 0) === 0 && !showUploadForm ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucun document pour cet enseignant</p>
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
                  {doc.expiry_date && <ExpiryBadge date={doc.expiry_date} />}
                  {doc.expiry_date && expiryStatus(doc.expiry_date) === 'ok' && (
                    <span className="text-xs text-gray-400">Expire le {new Date(doc.expiry_date).toLocaleDateString('fr-FR')}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="outline" size="icon" onClick={() => handleDownload(doc)} title="Télécharger">
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => { if (confirm('Supprimer ce document ?')) deleteMutation.mutate(doc.id) }}
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire d'upload */}
      {showUploadForm ? (
        <form onSubmit={handleUpload} className="border border-dashed border-brand-blue/40 rounded-xl p-4 space-y-3 bg-blue-50/30">
          <p className="font-medium text-sm text-brand-blue">Ajouter un document</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Titre *</Label>
              <Input value={uploadForm.title} onChange={e => setUploadForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Diplôme de formateur, Attestation CPF..." required />
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

// ─── StatCard ─────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'blue' }: { label: string; value: number; color?: 'blue' | 'green' | 'gray' }) {
  const colors = { blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700', gray: 'bg-gray-50 text-gray-600' }
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  )
}
