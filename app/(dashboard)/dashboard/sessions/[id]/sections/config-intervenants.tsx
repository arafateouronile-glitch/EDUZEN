'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import { sessionSlotService } from '@/lib/services/session-slot.service.client'
import { extractTeacherConventionVariables } from '@/lib/utils/teacher-convention/extract-variables'
import { extractOrdreMissionVariables } from '@/lib/utils/ordre-mission/extract-variables'
import { isVisibleNow } from '@/lib/utils/teacher-visibility'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SessionFormData } from '../hooks/use-session-detail'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { formatDate } from '@/lib/utils'
import {
  Users,
  Save,
  FileText,
  Download,
  Mail,
  PenLine,
  Calculator,
  Loader2,
  ClipboardList,
  CalendarDays,
  Plus,
  Star,
  Trash2,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react'

type User = TableRow<'users'>
type SessionSlot = TableRow<'session_slots'>

interface ConfigIntervenantsProps {
  formData: SessionFormData
  onFormDataChange: (data: SessionFormData) => void
  users?: User[]
  sessionId: string
  sessionSlots?: SessionSlot[]
}

const TIME_SLOT_LABELS: Record<string, string> = {
  morning: 'Matin',
  afternoon: 'Après-midi',
  full_day: 'Journée complète',
}

type DocType = 'convention_formateur' | 'ordre_de_mission'

type SessionTeacherRow = {
  teacher_id: string | null
  daily_rate: number | null
  hourly_rate: number | null
  intervention_days: number | null
  total_hours: number | null
  role: string | null
  is_primary: boolean | null
  visibility_date: string | null
}

export function ConfigIntervenants({
  formData,
  onFormDataChange,
  users = [],
  sessionId,
  sessionSlots,
}: ConfigIntervenantsProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { user } = useAuth()

  const teachers = users.filter((u) => u.role === 'teacher')

  // Tous les intervenants déjà ajoutés à cette session (multi-formateurs) —
  // c'est la source de vérité ; formData.teacher_id ne sert plus que de
  // pointeur vers celui marqué "principal" (sessions.teacher_id).
  const { data: allSessionTeachers } = useQuery({
    queryKey: ['all-session-teachers', sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('session_teachers')
        .select('teacher_id, daily_rate, hourly_rate, intervention_days, total_hours, role, is_primary, visibility_date')
        .eq('session_id', sessionId)
        .order('is_primary', { ascending: false })
      return (data ?? []) as unknown as SessionTeacherRow[]
    },
    enabled: !!sessionId,
  })

  // Intervenant dont on édite les conditions / séances / documents en ce
  // moment — indépendant du "principal" pour permettre de configurer
  // plusieurs formateurs sur des séances différentes sans écraser
  // formData.teacher_id à chaque changement de sélection.
  const [activeIntervenantId, setActiveIntervenantId] = useState<string | null>(null)
  const [newTeacherToAdd, setNewTeacherToAdd] = useState('')

  // Par défaut, ouvrir le principal (ou le premier intervenant) dès qu'ils sont chargés.
  useEffect(() => {
    if (activeIntervenantId) return
    if (!allSessionTeachers || allSessionTeachers.length === 0) return
    const primary = allSessionTeachers.find((st) => st.is_primary) ?? allSessionTeachers[0]
    if (primary?.teacher_id) setActiveIntervenantId(primary.teacher_id)
  }, [allSessionTeachers, activeIntervenantId])

  const activeTeacher = users.find((u) => u.id === activeIntervenantId)
  const availableTeachersToAdd = teachers.filter(
    (t) => !allSessionTeachers?.some((st) => st.teacher_id === t.id)
  )

  // Migration silencieuse : une session existante peut avoir un teacher_id
  // (sessions.teacher_id, formData.teacher_id) sans ligne session_teachers
  // correspondante — l'ancien sélecteur unique ne créait cette ligne qu'au
  // clic sur "Sauvegarder les conditions". On la crée automatiquement pour
  // que ce formateur apparaisse bien dans la liste des intervenants.
  const migratingLegacyTeacherRef = useRef(false)
  useEffect(() => {
    if (!formData.teacher_id || !allSessionTeachers || migratingLegacyTeacherRef.current) return
    const alreadyPresent = allSessionTeachers.some((st) => st.teacher_id === formData.teacher_id)
    if (alreadyPresent) return
    migratingLegacyTeacherRef.current = true
    supabase
      .from('session_teachers')
      .upsert(
        {
          session_id: sessionId,
          teacher_id: formData.teacher_id,
          is_primary: true,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'session_id,teacher_id' }
      )
      .then(({ error }) => {
        migratingLegacyTeacherRef.current = false
        if (!error) queryClient.invalidateQueries({ queryKey: ['all-session-teachers', sessionId] })
      })
  }, [formData.teacher_id, allSessionTeachers, sessionId, supabase, queryClient])

  const [interventionDays, setInterventionDays] = useState('')
  const [dailyRate, setDailyRate] = useState('')
  const [isEditingVisibility, setIsEditingVisibility] = useState(false)
  const [visibilityDateInput, setVisibilityDateInput] = useState('')
  const [docType, setDocType] = useState<DocType>('convention_formateur')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isSendingSignature, setIsSendingSignature] = useState(false)
  const [selectedConventionTemplateId, setSelectedConventionTemplateId] = useState<string>('')
  const [selectedMissionTemplateId, setSelectedMissionTemplateId] = useState<string>('')

  // Modèles de convention formateur / ordre de mission disponibles pour
  // l'organisation — même principe que le sélecteur "Modèle" des devis/factures.
  const { data: conventionTemplates } = useQuery({
    queryKey: ['convention-formateur-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return documentTemplateService.getAllTemplates(user.organization_id, {
        type: 'convention_formateur',
        isActive: true,
      })
    },
    enabled: !!user?.organization_id,
  })

  const { data: missionTemplates } = useQuery({
    queryKey: ['ordre-mission-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return documentTemplateService.getAllTemplates(user.organization_id, {
        type: 'ordre_de_mission',
        isActive: true,
      })
    },
    enabled: !!user?.organization_id,
  })

  const { data: org } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data } = await supabase.from('organizations').select('*').eq('id', user.organization_id).single()
      return data
    },
    enabled: !!user?.organization_id,
  })

  // Fiche formateur (statut indépendant/salarié, SIRET, spécialité) — table
  // teachers, distincte de users (identité) et absente du prop `users`.
  const { data: teacherProfile } = useQuery({
    queryKey: ['teacher-profile', activeIntervenantId, user?.organization_id],
    queryFn: async () => {
      if (!activeIntervenantId || !user?.organization_id) return null
      const { data } = await supabase
        .from('teachers')
        .select('statut, siret, specialization')
        .eq('user_id', activeIntervenantId)
        .eq('organization_id', user.organization_id)
        .maybeSingle()
      return data
    },
    enabled: !!activeIntervenantId && !!user?.organization_id,
  })

  const totalCost =
    interventionDays && dailyRate
      ? (parseFloat(interventionDays) * parseFloat(dailyRate)).toFixed(2)
      : null

  // Charger le session_teachers record existant de l'intervenant actif
  const { data: sessionTeacher } = useQuery({
    queryKey: ['session-teacher', sessionId, activeIntervenantId],
    queryFn: async () => {
      if (!activeIntervenantId) return null
      const { data } = await supabase
        .from('session_teachers')
        .select('*')
        .eq('session_id', sessionId)
        .eq('teacher_id', activeIntervenantId)
        .maybeSingle()
      return data as Record<string, any> | null
    },
    enabled: !!activeIntervenantId && !!sessionId,
  })

  // Pré-remplir depuis la DB quand le record change
  useEffect(() => {
    if (sessionTeacher) {
      setInterventionDays(sessionTeacher.intervention_days?.toString() ?? '')
      setDailyRate(sessionTeacher.daily_rate?.toString() ?? '')
      setVisibilityDateInput(
        sessionTeacher.visibility_date
          ? format(new Date(sessionTeacher.visibility_date), "yyyy-MM-dd'T'HH:mm")
          : ''
      )
    } else {
      setInterventionDays('')
      setDailyRate('')
      setVisibilityDateInput('')
    }
    setIsEditingVisibility(false)
  }, [sessionTeacher])

  // Ajouter un intervenant à la session. Ne touche pas au formateur
  // "principal" existant, sauf s'il s'agit du tout premier intervenant
  // ajouté : dans ce cas il devient principal par défaut (comportement
  // identique à l'ancien sélecteur unique pour le cas simple 1 formateur).
  const addIntervenantMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      const isFirst = !allSessionTeachers || allSessionTeachers.length === 0
      const { error } = await supabase.from('session_teachers').upsert(
        {
          session_id: sessionId,
          teacher_id: teacherId,
          is_primary: isFirst,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'session_id,teacher_id' }
      )
      if (error) throw error
      return { teacherId, isFirst }
    },
    onSuccess: ({ teacherId, isFirst }) => {
      queryClient.invalidateQueries({ queryKey: ['all-session-teachers', sessionId] })
      setActiveIntervenantId(teacherId)
      setNewTeacherToAdd('')
      if (isFirst) onFormDataChange({ ...formData, teacher_id: teacherId })
      addToast({ title: 'Intervenant ajouté à la session', type: 'success' })
    },
    onError: () => {
      addToast({ title: "Erreur lors de l'ajout de l'intervenant", type: 'error' })
    },
  })

  // Retirer un intervenant : supprime sa ligne session_teachers et libère
  // (met à null) les séances qui lui étaient assignées.
  const removeIntervenantMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      const { error: delError } = await supabase
        .from('session_teachers')
        .delete()
        .eq('session_id', sessionId)
        .eq('teacher_id', teacherId)
      if (delError) throw delError

      const { error: slotsError } = await supabase
        .from('session_slots')
        .update({ teacher_id: null })
        .eq('session_id', sessionId)
        .eq('teacher_id', teacherId)
      if (slotsError) throw slotsError
    },
    onSuccess: (_data, teacherId) => {
      queryClient.invalidateQueries({ queryKey: ['all-session-teachers', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['session-slots', sessionId] })
      if (activeIntervenantId === teacherId) setActiveIntervenantId(null)
      if (formData.teacher_id === teacherId) onFormDataChange({ ...formData, teacher_id: '' })
      addToast({ title: 'Intervenant retiré de la session', type: 'success' })
    },
    onError: () => {
      addToast({ title: 'Erreur lors du retrait de l\'intervenant', type: 'error' })
    },
  })

  // Marquer un intervenant comme "principal" — synchronise formData.teacher_id
  // (donc sessions.teacher_id) avec session_teachers.is_primary.
  const makePrimaryMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      const { error: clearError } = await supabase
        .from('session_teachers')
        .update({ is_primary: false })
        .eq('session_id', sessionId)
      if (clearError) throw clearError

      const { error } = await supabase
        .from('session_teachers')
        .update({ is_primary: true })
        .eq('session_id', sessionId)
        .eq('teacher_id', teacherId)
      if (error) throw error
    },
    onSuccess: (_data, teacherId) => {
      queryClient.invalidateQueries({ queryKey: ['all-session-teachers', sessionId] })
      onFormDataChange({ ...formData, teacher_id: teacherId })
      addToast({ title: 'Intervenant principal mis à jour', type: 'success' })
    },
    onError: () => {
      addToast({ title: 'Erreur lors de la mise à jour', type: 'error' })
    },
  })

  // Sauvegarder les conditions (jours / tarif) de l'intervenant actif dans session_teachers
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeIntervenantId) throw new Error('Aucun intervenant sélectionné')
      const payload: Record<string, any> = {
        session_id: sessionId,
        teacher_id: activeIntervenantId,
        intervention_days: interventionDays ? parseFloat(interventionDays) : null,
        daily_rate: dailyRate ? parseFloat(dailyRate) : null,
        is_primary: sessionTeacher?.is_primary ?? false,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase
        .from('session_teachers')
        .upsert(payload as any, { onConflict: 'session_id,teacher_id' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-teacher', sessionId, activeIntervenantId] })
      queryClient.invalidateQueries({ queryKey: ['all-session-teachers', sessionId] })
      addToast({ title: 'Conditions sauvegardées', type: 'success' })
    },
    onError: () => {
      addToast({ title: 'Erreur lors de la sauvegarde', type: 'error' })
    },
  })

  // Programme (ou efface, avec nextValue=null) la date/heure de visibilité du
  // planning pour l'intervenant actif — indépendant des conditions
  // d'intervention (jours/tarif) : l'un ne doit pas écraser l'autre.
  const saveVisibilityMutation = useMutation({
    mutationFn: async (nextValue: string | null) => {
      if (!activeIntervenantId) throw new Error('Aucun intervenant sélectionné')
      const payload: Record<string, any> = {
        session_id: sessionId,
        teacher_id: activeIntervenantId,
        visibility_date: nextValue ? new Date(nextValue).toISOString() : null,
        is_primary: sessionTeacher?.is_primary ?? false,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase
        .from('session_teachers')
        .upsert(payload as any, { onConflict: 'session_id,teacher_id' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-teacher', sessionId, activeIntervenantId] })
      queryClient.invalidateQueries({ queryKey: ['all-session-teachers', sessionId] })
      setIsEditingVisibility(false)
      addToast({ title: 'Visibilité du planning mise à jour', type: 'success' })
    },
    onError: () => {
      addToast({ title: 'Erreur lors de la mise à jour de la visibilité', type: 'error' })
    },
  })

  async function generatePdf(): Promise<Blob | null> {
    if (!activeTeacher) return null

    // Convention formateur et ordre de mission passent tous deux par le
    // pipeline générique de modèles (document_templates + /api/documents/generate-pdf),
    // comme devis/facture — permet de choisir le modèle.
    if (docType === 'convention_formateur' || docType === 'ordre_de_mission') {
      if (!user?.organization_id) throw new Error('Organisation manquante')

      const selectedTemplateId = docType === 'convention_formateur' ? selectedConventionTemplateId : selectedMissionTemplateId
      const template = selectedTemplateId
        ? await documentTemplateService.getTemplateById(selectedTemplateId)
        : await documentTemplateService.getDefaultTemplate(user.organization_id, docType)

      if (!template) {
        throw new Error(
          docType === 'convention_formateur'
            ? 'Aucun modèle de convention formateur trouvé'
            : "Aucun modèle d'ordre de mission trouvé"
        )
      }

      const variables = docType === 'convention_formateur'
        ? extractTeacherConventionVariables({
            organization: org ?? undefined,
            teacherUser: {
              first_name: (activeTeacher as any).first_name,
              last_name: (activeTeacher as any).last_name,
              full_name: activeTeacher.full_name,
              email: (activeTeacher as any).email,
              phone: (activeTeacher as any).phone,
            },
            teacherProfile,
            convention: {
              period_start: formData.start_date,
              period_end: formData.end_date,
              intervention_days: interventionDays ? parseFloat(interventionDays) : null,
              daily_rate: dailyRate ? parseFloat(dailyRate) : null,
              location: formData.location,
              custom_notes: null,
            },
          })
        : extractOrdreMissionVariables({
            organization: org ?? undefined,
            teacherUser: {
              first_name: (activeTeacher as any).first_name,
              last_name: (activeTeacher as any).last_name,
              full_name: activeTeacher.full_name,
              email: (activeTeacher as any).email,
              phone: (activeTeacher as any).phone,
            },
            teacherProfile,
            mission: {
              session_name: formData.name,
              session_ref: formData.code,
              period_start: formData.start_date,
              period_end: formData.end_date,
              location: formData.location,
              intervention_days: interventionDays ? parseFloat(interventionDays) : null,
            },
            authorizedBy: { full_name: user.full_name, role: user.role },
          })

      const res = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          variables,
          organizationId: user.organization_id,
        }),
      })
      if (!res.ok) throw new Error('Erreur génération PDF')
      return res.blob()
    }

    return null
  }

  async function handleDownload() {
    if (!activeTeacher) return
    setIsGeneratingPdf(true)
    try {
      const blob = await generatePdf()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const prefix = docType === 'ordre_de_mission' ? 'ordre-mission' : 'convention'
      a.download = `${prefix}-${(activeTeacher.full_name ?? 'formateur').replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      addToast({
        title: 'Erreur lors de la génération du PDF',
        description: error instanceof Error ? error.message : undefined,
        type: 'error',
      })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  async function handleSendEmail() {
    if (!activeTeacher) return
    setIsSendingEmail(true)
    try {
      const blob = await generatePdf()
      if (!blob) return

      // Upload dans Supabase Storage
      const supabaseClient = createClient()
      const { data: { user } } = await supabaseClient.auth.getUser()
      const { data: userData } = await supabaseClient
        .from('users')
        .select('organization_id')
        .eq('id', user!.id)
        .single()

      const timestamp = Date.now()
      const filePath = `teacher-conventions/${userData!.organization_id}/${activeTeacher.id}/${timestamp}.pdf`
      const arrayBuffer = await blob.arrayBuffer()
      await supabaseClient.storage.from('documents').upload(filePath, arrayBuffer, { contentType: 'application/pdf', upsert: true })
      const { data: signedData } = await supabaseClient.storage.from('documents').createSignedUrl(filePath, 3600)
      const signedUrl = signedData?.signedUrl

      const docLabel = docType === 'ordre_de_mission' ? 'Ordre de mission' : 'Convention de prestation'
      const filePrefix = docType === 'ordre_de_mission' ? 'ordre-mission' : 'convention'
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: (activeTeacher as any).email ?? '',
          subject: `${docLabel} — ${formData.name || 'Session de formation'}`,
          message: `Bonjour ${activeTeacher.full_name},\n\nVeuillez trouver ci-joint votre ${docLabel.toLowerCase()} pour la session de formation.\n\nCordialement`,
          attachmentUrl: signedUrl,
          attachmentName: `${filePrefix}-${(activeTeacher.full_name ?? 'formateur').replace(/\s+/g, '-')}.pdf`,
        }),
      })
      addToast({ title: `${docLabel} envoyé${docType === 'ordre_de_mission' ? '' : 'e'} par email`, type: 'success' })
    } catch {
      addToast({ title: "Erreur lors de l'envoi", type: 'error' })
    } finally {
      setIsSendingEmail(false)
    }
  }

  async function handleSendForSignature() {
    if (!activeTeacher) return
    setIsSendingSignature(true)
    try {
      const blob = await generatePdf()
      if (!blob) return

      const reader = new FileReader()
      const pdfBase64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(blob)
      })

      const docLabel = docType === 'ordre_de_mission' ? 'Ordre de mission' : 'Convention formateur'
      const res = await fetch('/api/signature-requests/send-from-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          documentTitle: `${docLabel} — ${activeTeacher.full_name}`,
          type: 'convention',
          sessionId,
          recipientEmail: (activeTeacher as any).email ?? '',
          recipientName: activeTeacher.full_name ?? '',
          recipientId: activeTeacher.id,
          recipientType: 'teacher',
          subject: `Signature ${docLabel} — ${formData.name || 'Session de formation'}`,
          message: `Bonjour ${activeTeacher.full_name},\n\nVeuillez signer votre ${docLabel.toLowerCase()} pour la session de formation.`,
        }),
      })
      if (!res.ok) throw new Error()
      addToast({ title: 'Demande de signature envoyée', type: 'success' })
    } catch {
      addToast({ title: "Erreur lors de l'envoi pour signature", type: 'error' })
    } finally {
      setIsSendingSignature(false)
    }
  }

  // Séances (session_slots) de la session — normalement déjà chargées par la
  // page parente et passées en prop ; requête de secours si absente, sur la
  // même clé de cache pour rester synchronisée avec l'onglet "Dates & prix".
  const { data: fetchedSlots } = useQuery({
    queryKey: ['session-slots', sessionId],
    queryFn: () => sessionSlotService.getBySessionId(sessionId),
    enabled: !!sessionId && sessionSlots === undefined,
  })
  const slots = useMemo(
    () => (sessionSlots ?? (fetchedSlots as SessionSlot[] | undefined) ?? []),
    [sessionSlots, fetchedSlots]
  )

  // Séances assignées à l'intervenant actif — état local pour permettre de
  // cocher/décocher avant sauvegarde.
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set())

  // Resynchroniser la sélection quand on change d'intervenant actif ou que les séances rechargent.
  useEffect(() => {
    if (!activeIntervenantId) {
      setSelectedSlotIds(new Set())
      return
    }
    setSelectedSlotIds(
      new Set(slots.filter((s) => s.teacher_id === activeIntervenantId).map((s) => s.id))
    )
  }, [activeIntervenantId, slots])

  const toggleSlot = (slotId: string) => {
    setSelectedSlotIds((prev) => {
      const next = new Set(prev)
      if (next.has(slotId)) next.delete(slotId)
      else next.add(slotId)
      return next
    })
  }

  const saveSlotsMutation = useMutation({
    mutationFn: async () => {
      if (!activeIntervenantId) throw new Error('Aucun intervenant sélectionné')
      const toAssign = slots
        .filter((s) => selectedSlotIds.has(s.id) && s.teacher_id !== activeIntervenantId)
        .map((s) => s.id)
      const toUnassign = slots
        .filter((s) => !selectedSlotIds.has(s.id) && s.teacher_id === activeIntervenantId)
        .map((s) => s.id)

      if (toAssign.length > 0) {
        const { error } = await supabase
          .from('session_slots')
          .update({ teacher_id: activeIntervenantId })
          .in('id', toAssign)
        if (error) throw error
      }
      if (toUnassign.length > 0) {
        const { error } = await supabase
          .from('session_slots')
          .update({ teacher_id: null })
          .in('id', toUnassign)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-slots', sessionId] })
      addToast({ title: 'Séances de l\'intervenant mises à jour', type: 'success' })
    },
    onError: (error) => {
      addToast({
        title: 'Erreur lors de la mise à jour des séances',
        description: error instanceof Error ? error.message : undefined,
        type: 'error',
      })
    },
  })

  return (
    <div className="space-y-4">
      {/* Intervenants de la session — plusieurs formateurs possibles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Intervenants de la session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <select
              value={newTeacherToAdd}
              onChange={(e) => setNewTeacherToAdd(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-background"
            >
              <option value="">Ajouter un intervenant…</option>
              {availableTeachersToAdd.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={!newTeacherToAdd || addIntervenantMutation.isPending}
              onClick={() => newTeacherToAdd && addIntervenantMutation.mutate(newTeacherToAdd)}
            >
              {addIntervenantMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          {teachers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Aucun formateur trouvé — ajoutez des utilisateurs avec le rôle "Enseignant" dans les paramètres.
            </p>
          )}

          {(!allSessionTeachers || allSessionTeachers.length === 0) ? (
            <p className="text-sm text-muted-foreground py-2">
              Aucun intervenant ajouté pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {allSessionTeachers.map((st) => {
                if (!st.teacher_id) return null
                const teacherId = st.teacher_id
                const teacher = users.find((u) => u.id === teacherId)
                const isActive = activeIntervenantId === teacherId
                const mySlotsCount = slots.filter((s) => s.teacher_id === teacherId).length

                return (
                  <div
                    key={teacherId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveIntervenantId(teacherId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setActiveIntervenantId(teacherId)
                    }}
                    className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                      isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{teacher?.full_name ?? teacherId}</span>
                        {st.is_primary && (
                          <Badge variant="secondary" className="text-xs shrink-0">Principal</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!st.is_primary && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Définir comme intervenant principal"
                            onClick={(e) => {
                              e.stopPropagation()
                              makePrimaryMutation.mutate(teacherId)
                            }}
                          >
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0"
                          title="Convention PDF"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(`/api/sessions/${sessionId}/teacher-convention?user_id=${teacherId}`, '_blank')
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Retirer cet intervenant"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeIntervenantMutation.mutate(teacherId)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {mySlotsCount > 0
                        ? `${mySlotsCount} séance${mySlotsCount > 1 ? 's' : ''} assignée${mySlotsCount > 1 ? 's' : ''}`
                        : 'Aucune séance assignée'}
                      {st.daily_rate != null &&
                        ` · ${st.daily_rate.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}/j`}
                      {st.intervention_days != null && ` · ${st.intervention_days} j`}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {activeTeacher && (
        <>
          {/* Visibilité du planning (session + séances) pour cet intervenant */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Visibilité du planning — {activeTeacher.full_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Détermine à partir de quand {activeTeacher.full_name} peut voir cette session et ses
                séances dans son espace personnel (accueil, calendrier, émargement). Par défaut, tout
                est visible immédiatement.
              </p>

              {isEditingVisibility ? (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label htmlFor="visibility_date" className="text-sm">
                      Date et heure de visibilité
                    </Label>
                    <Input
                      id="visibility_date"
                      type="datetime-local"
                      value={visibilityDateInput}
                      onChange={(e) => setVisibilityDateInput(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!visibilityDateInput || saveVisibilityMutation.isPending}
                    onClick={() => saveVisibilityMutation.mutate(visibilityDateInput)}
                  >
                    {saveVisibilityMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditingVisibility(false)
                      setVisibilityDateInput(
                        sessionTeacher?.visibility_date
                          ? format(new Date(sessionTeacher.visibility_date), "yyyy-MM-dd'T'HH:mm")
                          : ''
                      )
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    {isVisibleNow(sessionTeacher?.visibility_date) ? (
                      <Eye className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {!sessionTeacher?.visibility_date
                        ? 'Visible immédiatement'
                        : isVisibleNow(sessionTeacher.visibility_date)
                          ? `Visible depuis le ${format(new Date(sessionTeacher.visibility_date), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}`
                          : `Visible à partir du ${format(new Date(sessionTeacher.visibility_date), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}`}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingVisibility(true)}
                    >
                      {sessionTeacher?.visibility_date ? 'Modifier la date' : 'Programmer une date de visibilité'}
                    </Button>
                    {!!sessionTeacher?.visibility_date && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saveVisibilityMutation.isPending}
                        onClick={() => saveVisibilityMutation.mutate(null)}
                      >
                        Rendre visible immédiatement
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Séances sur lesquelles intervient ce formateur */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4" />
                  Séances de {activeTeacher.full_name}
                </CardTitle>
                {slots.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setSelectedSlotIds(new Set(slots.map((s) => s.id)))}
                    >
                      Tout sélectionner
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setSelectedSlotIds(new Set())}
                    >
                      Tout désélectionner
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Seules les séances cochées apparaîtront dans l'espace personnel de {activeTeacher.full_name}.
                Une séance ne peut être assignée qu'à un seul intervenant à la fois.
              </p>

              {slots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Aucune séance planifiée pour cette session — configurez les dates dans l'onglet "Dates & prix".
                </p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const isChecked = selectedSlotIds.has(slot.id)
                    const otherTeacher =
                      slot.teacher_id && slot.teacher_id !== activeIntervenantId
                        ? users.find((u) => u.id === slot.teacher_id)
                        : null
                    return (
                      <label
                        key={slot.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                          isChecked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSlot(slot.id)}
                          className="h-4 w-4 shrink-0 accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{formatDate(slot.date)}</span>
                            <span className="text-muted-foreground">
                              {TIME_SLOT_LABELS[slot.time_slot] ?? slot.time_slot}
                              {slot.start_time && ` · ${slot.start_time.slice(0, 5)}–${slot.end_time?.slice(0, 5) ?? ''}`}
                            </span>
                            {slot.location && (
                              <span className="text-xs text-muted-foreground">📍 {slot.location}</span>
                            )}
                          </div>
                          {otherTeacher && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              Actuellement assignée à {otherTeacher.full_name}
                              {isChecked ? ' — sera réassignée' : ''}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}

              {slots.length > 0 && (
                <Button
                  type="button"
                  onClick={() => saveSlotsMutation.mutate()}
                  disabled={saveSlotsMutation.isPending}
                  size="sm"
                  className="w-full"
                >
                  {saveSlotsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Enregistrer les séances ({selectedSlotIds.size} sélectionnée{selectedSlotIds.size > 1 ? 's' : ''})
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Conditions d'intervention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4" />
                Conditions d'intervention — {activeTeacher.full_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="intervention_days" className="text-sm">
                    Nombre de jours
                  </Label>
                  <Input
                    id="intervention_days"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="ex: 3 ou 3.5"
                    value={interventionDays}
                    onChange={(e) => setInterventionDays(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Demi-journées acceptées (0.5)</p>
                </div>
                <div>
                  <Label htmlFor="daily_rate" className="text-sm">
                    Tarif journalier HT (€)
                  </Label>
                  <Input
                    id="daily_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="ex: 450"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {totalCost && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-sm text-muted-foreground">Montant total estimé HT</span>
                  <span className="text-lg font-bold text-primary">
                    {parseFloat(totalCost).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              )}

              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                size="sm"
                className="w-full"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Sauvegarder les conditions
              </Button>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Documents — {activeTeacher.full_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Type de document</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDocType('convention_formateur')}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm text-left transition-colors ${
                      docType === 'convention_formateur'
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span>Convention formateur</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocType('ordre_de_mission')}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-sm text-left transition-colors ${
                      docType === 'ordre_de_mission'
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <ClipboardList className="h-4 w-4 shrink-0" />
                    <span>Ordre de mission</span>
                  </button>
                </div>
              </div>

              {docType === 'convention_formateur' && (
                <div>
                  <Label className="text-sm mb-2 block">Modèle</Label>
                  <Select value={selectedConventionTemplateId} onValueChange={setSelectedConventionTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Modèle par défaut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Modèle par défaut</SelectItem>
                      {conventionTemplates?.filter((t) => !!t).map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {docType === 'ordre_de_mission' && (
                <div>
                  <Label className="text-sm mb-2 block">Modèle</Label>
                  <Select value={selectedMissionTemplateId} onValueChange={setSelectedMissionTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Modèle par défaut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Modèle par défaut</SelectItem>
                      {missionTemplates?.filter((t) => !!t).map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={isGeneratingPdf || isSendingEmail || isSendingSignature}
                  className="flex-col h-auto py-3 gap-1"
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="text-xs">Télécharger</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendEmail}
                  disabled={isGeneratingPdf || isSendingEmail || isSendingSignature || !(activeTeacher as any)?.email}
                  className="flex-col h-auto py-3 gap-1"
                >
                  {isSendingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  <span className="text-xs">Envoyer par email</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendForSignature}
                  disabled={isGeneratingPdf || isSendingEmail || isSendingSignature || !(activeTeacher as any)?.email}
                  className="flex-col h-auto py-3 gap-1"
                >
                  {isSendingSignature ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PenLine className="h-4 w-4" />
                  )}
                  <span className="text-xs">Pour signature</span>
                </Button>
              </div>

              {!(activeTeacher as any)?.email && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                  L'email du formateur n'est pas renseigné — l'envoi par email et la signature électronique ne sont pas disponibles.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
