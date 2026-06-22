'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import type { SessionFormData } from '../hooks/use-session-detail'
import type { TableRow } from '@/lib/types/supabase-helpers'
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
  CheckCircle2,
  Euro,
} from 'lucide-react'

type User = TableRow<'users'>

interface ConfigIntervenantsProps {
  formData: SessionFormData
  onFormDataChange: (data: SessionFormData) => void
  users?: User[]
  sessionId: string
}

type DocType = 'convention_formateur' | 'ordre_de_mission'

export function ConfigIntervenants({
  formData,
  onFormDataChange,
  users = [],
  sessionId,
}: ConfigIntervenantsProps) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [interventionDays, setInterventionDays] = useState('')
  const [dailyRate, setDailyRate] = useState('')
  const [docType, setDocType] = useState<DocType>('convention_formateur')
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isSendingSignature, setIsSendingSignature] = useState(false)

  const selectedTeacher = users.find((u) => u.id === formData.teacher_id)
  const totalCost =
    interventionDays && dailyRate
      ? (parseFloat(interventionDays) * parseFloat(dailyRate)).toFixed(2)
      : null

  // Charger le session_teachers record existant
  const { data: sessionTeacher } = useQuery({
    queryKey: ['session-teacher', sessionId, formData.teacher_id],
    queryFn: async () => {
      if (!formData.teacher_id) return null
      const { data } = await supabase
        .from('session_teachers')
        .select('*')
        .eq('session_id', sessionId)
        .eq('teacher_id', formData.teacher_id)
        .maybeSingle()
      return data as Record<string, any> | null
    },
    enabled: !!formData.teacher_id && !!sessionId,
  })

  // Pré-remplir depuis la DB quand le record change
  useEffect(() => {
    if (sessionTeacher) {
      setInterventionDays(sessionTeacher.intervention_days?.toString() ?? '')
      setDailyRate(sessionTeacher.daily_rate?.toString() ?? '')
    } else {
      setInterventionDays('')
      setDailyRate('')
    }
  }, [sessionTeacher])

  // Sauvegarder dans session_teachers
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formData.teacher_id) throw new Error('Aucun intervenant sélectionné')
      const payload: Record<string, any> = {
        session_id: sessionId,
        teacher_id: formData.teacher_id,
        intervention_days: interventionDays ? parseFloat(interventionDays) : null,
        daily_rate: dailyRate ? parseFloat(dailyRate) : null,
        is_primary: true,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase
        .from('session_teachers')
        .upsert(payload as any, { onConflict: 'session_id,teacher_id' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-teacher', sessionId, formData.teacher_id] })
      addToast({ title: 'Conditions sauvegardées', type: 'success' })
    },
    onError: () => {
      addToast({ title: 'Erreur lors de la sauvegarde', type: 'error' })
    },
  })

  async function generatePdf(): Promise<Blob | null> {
    if (!selectedTeacher) return null
    const endpoint = docType === 'ordre_de_mission'
      ? '/api/teacher-documents/generate-ordre-de-mission'
      : '/api/teacher-documents/generate-convention'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacher: {
          user_id: selectedTeacher.id,
          full_name: selectedTeacher.full_name ?? '',
          email: (selectedTeacher as any).email ?? '',
          specialization: (selectedTeacher as any).specialization ?? null,
        },
        session: {
          name: formData.name || '',
          period_start: formData.start_date || new Date().toISOString().split('T')[0],
          period_end: formData.end_date || new Date().toISOString().split('T')[0],
          daily_rate: dailyRate ? parseFloat(dailyRate) : null,
          intervention_days: interventionDays ? parseFloat(interventionDays) : null,
          specialization: (selectedTeacher as any).specialization ?? null,
        },
        // Compatibilité convention route
        convention: {
          period_start: formData.start_date || new Date().toISOString().split('T')[0],
          period_end: formData.end_date || new Date().toISOString().split('T')[0],
          daily_rate: dailyRate ? parseFloat(dailyRate) : null,
          intervention_days: interventionDays ? parseFloat(interventionDays) : null,
          specialization: (selectedTeacher as any).specialization ?? null,
          custom_notes: null,
        },
      }),
    })
    if (!res.ok) throw new Error('Erreur génération PDF')
    return res.blob()
  }

  async function handleDownload() {
    if (!selectedTeacher) return
    setIsGeneratingPdf(true)
    try {
      const blob = await generatePdf()
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const prefix = docType === 'ordre_de_mission' ? 'ordre-mission' : 'convention'
      a.download = `${prefix}-${(selectedTeacher.full_name ?? 'formateur').replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      addToast({ title: 'Erreur lors de la génération du PDF', type: 'error' })
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  async function handleSendEmail() {
    if (!selectedTeacher) return
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
      const filePath = `teacher-conventions/${userData!.organization_id}/${selectedTeacher.id}/${timestamp}.pdf`
      const arrayBuffer = await blob.arrayBuffer()
      await supabaseClient.storage.from('documents').upload(filePath, arrayBuffer, { contentType: 'application/pdf', upsert: true })
      const { data: signedData } = await supabaseClient.storage.from('documents').createSignedUrl(filePath, 3600)
      const signedUrl = signedData?.signedUrl

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: (selectedTeacher as any).email ?? '',
          subject: `Convention de prestation — ${formData.name || 'Session de formation'}`,
          message: `Bonjour ${selectedTeacher.full_name},\n\nVeuillez trouver ci-joint votre convention de prestation pour la session de formation.\n\nCordialement`,
          attachmentUrl: signedUrl,
          attachmentName: `convention-${(selectedTeacher.full_name ?? 'formateur').replace(/\s+/g, '-')}.pdf`,
        }),
      })
      addToast({ title: 'Convention envoyée par email', type: 'success' })
    } catch {
      addToast({ title: "Erreur lors de l'envoi", type: 'error' })
    } finally {
      setIsSendingEmail(false)
    }
  }

  async function handleSendForSignature() {
    if (!selectedTeacher) return
    setIsSendingSignature(true)
    try {
      const blob = await generatePdf()
      if (!blob) return

      const reader = new FileReader()
      const pdfBase64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(blob)
      })

      const res = await fetch('/api/signature-requests/send-from-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          documentTitle: `Convention formateur — ${selectedTeacher.full_name}`,
          recipientEmail: (selectedTeacher as any).email ?? '',
          recipientName: selectedTeacher.full_name ?? '',
          recipientId: selectedTeacher.id,
          recipientType: 'teacher',
          subject: `Signature convention — ${formData.name || 'Session de formation'}`,
          message: `Bonjour ${selectedTeacher.full_name},\n\nVeuillez signer la convention de prestation pour la session de formation.`,
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

  const teachers = users.filter((u) => u.role === 'teacher')

  // Tous les intervenants de la session (multi-formateurs)
  const { data: allSessionTeachers } = useQuery({
    queryKey: ['all-session-teachers', sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('session_teachers')
        .select('teacher_id, daily_rate, hourly_rate, intervention_days, total_hours, role, is_primary')
        .eq('session_id', sessionId)
        .order('is_primary', { ascending: false })
      return (data ?? []) as unknown as Array<{
        teacher_id: string | null
        daily_rate: number | null
        hourly_rate: number | null
        intervention_days: number | null
        total_hours: number | null
        role: string | null
        is_primary: boolean | null
      }>
    },
    enabled: !!sessionId,
  })

  return (
    <div className="space-y-4">
      {/* Sélection de l'intervenant */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Intervenant de la session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block text-sm font-medium">Enseignant / Formateur</Label>
            <select
              value={formData.teacher_id}
              onChange={(e) => {
                onFormDataChange({ ...formData, teacher_id: e.target.value })
                setInterventionDays('')
                setDailyRate('')
              }}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-background"
            >
              <option value="">Sélectionner un intervenant</option>
              {teachers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
            {teachers.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Aucun formateur trouvé — ajoutez des utilisateurs avec le rôle "Enseignant" dans les paramètres.
              </p>
            )}
          </div>

          {selectedTeacher && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <div>
                <span className="font-medium">{selectedTeacher.full_name}</span>
                {(selectedTeacher as any).specialization && (
                  <span className="text-muted-foreground ml-2">— {(selectedTeacher as any).specialization}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conditions d'intervention */}
      {formData.teacher_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4" />
              Conditions d'intervention
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
      )}

      {/* Documents */}
      {formData.teacher_id && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Documents
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
                disabled={isGeneratingPdf || isSendingEmail || isSendingSignature || !(selectedTeacher as any)?.email}
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
                disabled={isGeneratingPdf || isSendingEmail || isSendingSignature || !(selectedTeacher as any)?.email}
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

            {!(selectedTeacher as any)?.email && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                L'email du formateur n'est pas renseigné — l'envoi par email et la signature électronique ne sont pas disponibles.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Conventions multi-formateurs depuis session_teachers */}
      {allSessionTeachers && allSessionTeachers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Euro className="h-4 w-4" />
              Conventions de prestation ({allSessionTeachers.length} intervenant{allSessionTeachers.length > 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {allSessionTeachers.map((st) => {
              const teacher = users.find((u) => u.id === st.teacher_id)
              const name = teacher?.full_name ?? st.teacher_id ?? '—'
              const total =
                st.daily_rate != null && st.intervention_days != null
                  ? st.daily_rate * st.intervention_days
                  : st.hourly_rate != null && st.total_hours != null
                  ? st.hourly_rate * st.total_hours
                  : null

              return (
                <div
                  key={st.teacher_id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{name}</span>
                      {st.is_primary && (
                        <Badge variant="secondary" className="text-xs shrink-0">Principal</Badge>
                      )}
                      {st.role && (
                        <Badge variant="outline" className="text-xs shrink-0">{st.role}</Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      {st.daily_rate != null && (
                        <span>{st.daily_rate.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}/j</span>
                      )}
                      {st.intervention_days != null && (
                        <span className="ml-2">· {st.intervention_days} j</span>
                      )}
                      {total != null && (
                        <span className="ml-2 font-medium text-foreground">
                          = {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </span>
                      )}
                    </div>
                  </div>
                  {st.teacher_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={() => window.open(
                        `/api/sessions/${sessionId}/teacher-convention?user_id=${st.teacher_id}`,
                        '_blank'
                      )}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Convention PDF
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
