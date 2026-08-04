'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { invoiceService } from '@/lib/services/invoice.service.client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { invoiceSchema, type InvoiceFormData } from '@/lib/validations/schemas'

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefilledEntityId = searchParams.get('entity_id') || ''
  const { user } = useAuth()
  const supabase = createClient()

  // Récupérer les élèves
  // PostgREST plafonne silencieusement chaque requête (souvent 1000 lignes) —
  // sans pagination, un organisme avec beaucoup d'élèves ne voit que les
  // premiers noms dans l'ordre alphabétique (ex: la liste s'arrête à "B").
  // On boucle donc par pages jusqu'à épuisement des résultats.
  const { data: students } = useQuery({
    queryKey: ['students', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const pageSize = 1000
      const allStudents = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('students')
          .select('id, first_name, last_name, student_number, classes(name)')
          .eq('organization_id', user.organization_id)
          .eq('status', 'active')
          .order('last_name')
          .range(from, from + pageSize - 1)
        if (error) throw error
        allStudents.push(...(data || []))
        if (!data || data.length < pageSize) break
        from += pageSize
      }
      return allStudents
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les classes pour génération en masse
  const { data: classes } = useQuery({
    queryKey: ['classes', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('name')
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les entités externes (entreprises/organismes) de l'organisation
  const { data: entities } = useQuery({
    queryKey: ['external-entities-for-invoice', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await (supabase.from('external_entities') as any)
        .select('id, name, type')
        .eq('organization_id', user.organization_id)
        .order('name')
      if (error) throw error
      return (data || []) as { id: string; name: string; type: string | null }[]
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les programmes de l'organisation (sélecteur pour le mode entreprise)
  const { data: programs } = useQuery({
    queryKey: ['programs-for-invoice', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('organization_id', user.organization_id)
        .order('name')
      if (error) throw error
      return (data || []) as { id: string; name: string }[]
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les formations de l'organisation (déclinaisons d'un programme —
  // sélecteur pour le mode entreprise, filtré côté UI par le programme choisi)
  const { data: formations } = useQuery({
    queryKey: ['formations-for-invoice', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('formations')
        .select('id, name, program_id')
        .eq('organization_id', user.organization_id)
        .order('name')
      if (error) throw error
      return (data || []) as { id: string; name: string; program_id: string | null }[]
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer toutes les sessions de l'organisation (sélecteur pour le mode entreprise)
  const { data: sessions } = useQuery({
    queryKey: ['sessions-for-invoice', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, start_date')
        .eq('organization_id', user.organization_id)
        .order('start_date', { ascending: false })
      if (error) throw error
      return (data || []) as { id: string; name: string; start_date: string | null }[]
    },
    enabled: !!user?.organization_id,
  })

  const [invoiceType, setInvoiceType] = useState<'single' | 'bulk'>('single')
  const [documentType, setDocumentType] = useState<'quote' | 'invoice'>('quote') // Par défaut, créer un devis
  const [recipientType, setRecipientType] = useState<'student' | 'entity'>(prefilledEntityId ? 'entity' : 'student')
  // Numéro suggéré automatiquement — si l'utilisateur ne l'a pas modifié à la
  // soumission, on envoie une chaîne vide pour laisser InvoiceService.create()
  // le régénérer avec sa propre logique de retry sur collision (le numéro
  // affiché ici peut devenir périmé si une autre facture/devis a été créé
  // entre-temps, d'où l'erreur "duplicate key" sinon).
  const [previewedInvoiceNumber, setPreviewedInvoiceNumber] = useState('')

  // React Hook Form avec validation Zod
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    mode: 'onChange',
    defaultValues: {
      student_id: '',
      entity_id: prefilledEntityId,
      session_id: '',
      program_id: '',
      formation_id: '',
      enrollment_id: '',
      expected_count: '1',
      document_type: 'quote',
      invoice_number: '',
      type: 'tuition',
      amount: '',
      tax_amount: '',
      currency: 'EUR',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 jours
      notes: '',
      mentions_libres: '',
      status: 'draft',
    },
  })

  const formData = watch()

  // Inscriptions existantes de l'élève choisi (sélecteur de session en mode
  // apprenant) — contrairement au mode entreprise, on ne peut pas créer une
  // inscription à la volée depuis ce formulaire (ça aurait des effets de bord
  // bien plus larges qu'une simple facturation : émargement, effectifs...),
  // donc la session proposée est limitée aux inscriptions déjà existantes.
  const { data: studentEnrollments } = useQuery({
    queryKey: ['student-enrollments-for-invoice', formData.student_id],
    queryFn: async () => {
      if (!formData.student_id) return []
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, session_id, sessions(id, name)')
        .eq('student_id', formData.student_id)
        .order('enrollment_date', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: recipientType === 'student' && !!formData.student_id,
  })

  // Synchroniser document_type avec le state
  const handleDocumentTypeChange = (type: 'quote' | 'invoice') => {
    setDocumentType(type)
    setValue('document_type', type)
  }

  // Aperçu du prochain numéro (facture ou devis, séquences séparées),
  // modifiable ensuite par l'utilisateur avant soumission.
  useEffect(() => {
    if (!user?.organization_id) return
    invoiceService
      .previewNextInvoiceNumber(user.organization_id, documentType)
      .then((number) => {
        setValue('invoice_number', number)
        setPreviewedInvoiceNumber(number)
      })
      .catch(() => {})
  }, [documentType, user?.organization_id, setValue])

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      // Pour l'instant, on gère seulement les factures individuelles avec Zod
      // La génération en masse nécessiterait un schéma séparé
      if (invoiceType === 'bulk') {
        // NOTE: Fonctionnalité prévue - Créer un schéma pour la génération en masse de paiements
        // Permettra de créer plusieurs paiements à la fois pour une facture ou plusieurs factures
        throw new Error('La génération en masse n\'est pas encore validée avec Zod')
      } else {
        // Facture individuelle
        const amount = parseFloat(data.amount) || 0
        const taxAmount = parseFloat(data.tax_amount || '0') || 0
        const totalAmount = amount + taxAmount
        // Si l'utilisateur n'a pas modifié le numéro suggéré, on envoie une
        // chaîne vide pour laisser le service le régénérer avec retry en cas
        // de collision (numéro devenu périmé entre l'affichage et l'envoi).
        const invoiceNumberToSend = data.invoice_number === previewedInvoiceNumber ? '' : (data.invoice_number || '')

        if (recipientType === 'entity') {
          if (!data.entity_id) throw new Error('Veuillez sélectionner une entreprise')

          // La session est facultative : un devis peut être émis avant qu'une
          // session précise ne soit retenue. On ne crée/relie une réservation
          // d'entité que si une session a été choisie.
          let reservationId: string | null = null
          if (data.session_id) {
            const { data: reservation, error: reservationError } = await supabase
              .from('session_entity_reservations')
              .upsert(
                {
                  organization_id: user.organization_id,
                  session_id: data.session_id,
                  entity_id: data.entity_id,
                  expected_count: parseInt(data.expected_count || '1', 10) || 1,
                },
                { onConflict: 'session_id,entity_id' }
              )
              .select('id')
              .single()
            if (reservationError) throw reservationError
            reservationId = reservation.id
          }

          return invoiceService.create({
            organization_id: user.organization_id,
            entity_id: data.entity_id,
            session_entity_reservation_id: reservationId,
            program_id: data.program_id || null,
            formation_id: data.formation_id || null,
            invoice_number: invoiceNumberToSend,
            type: data.type,
            document_type: data.document_type || 'invoice',
            issue_date: data.issue_date,
            due_date: data.due_date,
            amount: amount,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            currency: data.currency,
            status: data.status || 'draft',
            notes: data.notes || null,
            mentions_libres: data.mentions_libres || null,
          } as Parameters<typeof invoiceService.create>[0] & { document_type?: 'quote' | 'invoice' })
        }

        return invoiceService.create({
          organization_id: user.organization_id,
          student_id: data.student_id,
          enrollment_id: data.enrollment_id || null,
          program_id: data.program_id || null,
          formation_id: data.formation_id || null,
          invoice_number: invoiceNumberToSend,
          type: data.type,
          document_type: data.document_type || 'invoice',
          issue_date: data.issue_date,
          due_date: data.due_date,
          amount: amount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          currency: data.currency,
          status: data.status || 'draft',
          items: [],
          notes: data.notes || null,
          mentions_libres: data.mentions_libres || null,
        } as Parameters<typeof invoiceService.create>[0] & { document_type?: 'quote' | 'invoice' })
      }
    },
    onSuccess: (result) => {
      if (invoiceType === 'bulk') {
        router.push('/dashboard/payments')
      } else if (result?.id) {
        router.push(`/dashboard/payments/${result.id}`)
      }
    },
  })

  const handleSubmit = handleFormSubmit((data) => {
    createMutation.mutate(data)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {documentType === 'quote' ? 'Nouveau devis' : 'Nouvelle facture'}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Créez un {documentType === 'quote' ? 'devis' : 'facture'} individuel{documentType === 'quote' ? 'le' : 'le'} ou en masse
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Type de document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <button
              type="button"
              onClick={() => handleDocumentTypeChange('quote')}
              className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                documentType === 'quote'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">Devis</div>
              <div className="text-sm text-muted-foreground mt-1">
                Estimation avant formation
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleDocumentTypeChange('invoice')}
              className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                documentType === 'invoice'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">Facture</div>
              <div className="text-sm text-muted-foreground mt-1">
                Facture après formation
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Type de facturation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-6">
            <button
              type="button"
              onClick={() => setInvoiceType('single')}
              className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                invoiceType === 'single'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{documentType === 'quote' ? 'Devis individuel' : 'Facture individuelle'}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Pour un élève spécifique
              </div>
            </button>
            <button
              type="button"
              onClick={() => setInvoiceType('bulk')}
              className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                invoiceType === 'bulk'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">{documentType === 'quote' ? 'Génération en masse' : 'Facturation en masse'}</div>
              <div className="text-sm text-muted-foreground mt-1">
                Pour toute une classe
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {invoiceType === 'single' && (
        <Card>
          <CardHeader>
            <CardTitle>Destinataire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4 mb-2">
              <button
                type="button"
                onClick={() => {
                  setRecipientType('student')
                  setValue('entity_id', '')
                  setValue('session_id', '')
                  setValue('expected_count', '1')
                }}
                className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                  recipientType === 'student'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Apprenant</div>
                <div className="text-sm text-muted-foreground mt-1">Un élève de l&apos;organisation</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecipientType('entity')
                  setValue('student_id', '')
                  setValue('enrollment_id', '')
                }}
                className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                  recipientType === 'entity'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">Entreprise</div>
                <div className="text-sm text-muted-foreground mt-1">Une entité externe, rattachée à une session</div>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informations du {documentType === 'quote' ? 'devis' : 'facture'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {invoiceType === 'bulk' && (
              <div className="bg-warning-bg border border-warning-border rounded-lg p-4 mb-6">
                <p className="text-sm text-warning-primary">
                  La génération en masse n'est pas encore validée avec Zod. Veuillez utiliser "Facture individuelle" pour bénéficier de la validation complète.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Numéro {documentType === 'quote' ? 'de devis' : 'de facture'}
              </label>
              <input
                type="text"
                {...register('invoice_number')}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono min-touch-target"
                placeholder="Généré automatiquement"
              />
              <p className="text-sm text-muted-foreground mt-1">Numéro proposé automatiquement — modifiable si besoin.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Type *</label>
                <select
                  {...register('type')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.type ? 'border-danger-primary' : ''
                  }`}
                >
                  <option value="tuition">Scolarité</option>
                  <option value="registration">Inscription</option>
                  <option value="other">Autre</option>
                </select>
                {errors.type && (
                  <p className="text-sm text-danger-primary mt-1">{errors.type.message}</p>
                )}
              </div>

              {invoiceType === 'single' && recipientType === 'student' ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Élève *</label>
                  <select
                    {...register('student_id')}
                    onChange={(e) => {
                      setValue('student_id', e.target.value)
                      setValue('enrollment_id', '')
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                      errors.student_id ? 'border-danger-primary' : ''
                    }`}
                  >
                    <option value="">Sélectionner un élève</option>
                    {students?.map((student: { id: string; first_name?: string; last_name?: string; student_number?: string }) => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} ({student.student_number})
                      </option>
                    ))}
                  </select>
                  {errors.student_id && (
                    <p className="text-sm text-danger-primary mt-1">{errors.student_id.message}</p>
                  )}
                </div>
              ) : invoiceType === 'single' && recipientType === 'entity' ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Entreprise *</label>
                  <select
                    {...register('entity_id')}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                      errors.entity_id ? 'border-danger-primary' : ''
                    }`}
                  >
                    <option value="">Sélectionner une entreprise</option>
                    {entities?.map((entity) => (
                      <option key={entity.id} value={entity.id}>{entity.name}</option>
                    ))}
                  </select>
                  {errors.entity_id && (
                    <p className="text-sm text-danger-primary mt-1">{errors.entity_id.message}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-2">Classe *</label>
                  <div className="bg-warning-bg border border-warning-border rounded-lg p-4">
                    <p className="text-sm text-warning-primary">
                      La génération en masse n'est pas encore validée avec Zod. Veuillez utiliser "Facture individuelle".
                    </p>
                  </div>
                </div>
              )}
            </div>

            {invoiceType === 'single' && (recipientType === 'entity' || recipientType === 'student') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Programme</label>
                  <select
                    {...register('program_id')}
                    onChange={(e) => {
                      setValue('program_id', e.target.value)
                      // La formation choisie doit appartenir au programme sélectionné
                      const currentFormation = formations?.find((f) => f.id === watch('formation_id'))
                      if (currentFormation && currentFormation.program_id !== (e.target.value || null)) {
                        setValue('formation_id', '')
                      }
                    }}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  >
                    <option value="">Aucun programme précis</option>
                    {programs?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Facultatif — sert à préremplir les variables du modèle de document.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Formation</label>
                  <select
                    {...register('formation_id')}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  >
                    <option value="">Aucune formation précise</option>
                    {(watch('program_id')
                      ? formations?.filter((f) => f.program_id === watch('program_id'))
                      : formations
                    )?.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {watch('program_id') ? 'Formations du programme sélectionné.' : 'Facultatif — filtré par programme si un programme est choisi.'}
                  </p>
                </div>
                {recipientType === 'entity' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">Session</label>
                      <select
                        {...register('session_id')}
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                      >
                        <option value="">Aucune session précise</option>
                        {sessions?.map((s) => (
                          <option key={s.id} value={s.id}>{s.name || s.id.slice(0, 8)}</option>
                        ))}
                      </select>
                      <p className="text-sm text-muted-foreground mt-1">
                        Facultatif — peut être choisie plus tard si le devis est émis avant qu'une session précise ne soit retenue.
                      </p>
                    </div>
                    {watch('session_id') && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Effectif prévisionnel</label>
                        <input
                          type="number"
                          min={1}
                          {...register('expected_count')}
                          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-2">Session</label>
                    <select
                      {...register('enrollment_id')}
                      disabled={!formData.student_id}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target disabled:bg-gray-50 disabled:text-muted-foreground"
                    >
                      <option value="">Aucune session précise</option>
                      {studentEnrollments?.map((e) => (
                        <option key={e.id} value={e.id}>{e.sessions?.name || e.session_id?.slice(0, 8) || e.id.slice(0, 8)}</option>
                      ))}
                    </select>
                    <p className="text-sm text-muted-foreground mt-1">
                      {!formData.student_id
                        ? 'Sélectionnez d\'abord un élève.'
                        : studentEnrollments && studentEnrollments.length === 0
                          ? 'Cet élève n\'a aucune inscription à une session — facultatif.'
                          : 'Facultatif — limitée aux sessions où cet élève est déjà inscrit.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Montant *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('amount')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.amount ? 'border-danger-primary' : ''
                  }`}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-sm text-danger-primary mt-1">{errors.amount.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">TVA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('tax_amount')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.tax_amount ? 'border-danger-primary' : ''
                  }`}
                  placeholder="0.00"
                />
                {errors.tax_amount && (
                  <p className="text-sm text-danger-primary mt-1">{errors.tax_amount.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Devise</label>
                <select
                  {...register('currency')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                >
                  <option value="EUR">EUR (Euro)</option>
                  <option value="USD">USD (Dollar)</option>
                  <option value="XOF">XOF (Franc CFA Ouest)</option>
                  <option value="XAF">XAF (Franc CFA Centre)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date d'émission *</label>
                <input
                  type="date"
                  {...register('issue_date')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.issue_date ? 'border-danger-primary' : ''
                  }`}
                />
                {errors.issue_date && (
                  <p className="text-sm text-danger-primary mt-1">{errors.issue_date.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date d'échéance *</label>
                <input
                  type="date"
                  {...register('due_date')}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target ${
                    errors.due_date ? 'border-danger-primary' : ''
                  }`}
                />
                {errors.due_date && (
                  <p className="text-sm text-danger-primary mt-1">{errors.due_date.message}</p>
                )}
              </div>
            </div>

            {invoiceType === 'single' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Notes supplémentaires..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mentions libres</label>
                  <textarea
                    {...register('mentions_libres')}
                    rows={3}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={`Texte qui apparaîtra tel quel sur le ${documentType === 'quote' ? 'devis' : 'la facture'}...`}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Apparaît sur le PDF si votre modèle de document inclut la variable {'{mentions_libres}'}.
                  </p>
                </div>
              </>
            )}

            {formData.amount && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Montant HT:</span>
                  <span className="font-medium">{formData.amount} {formData.currency}</span>
                </div>
                {formData.tax_amount && parseFloat(formData.tax_amount) > 0 && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-muted-foreground">TVA:</span>
                    <span className="font-medium">{formData.tax_amount} {formData.currency}</span>
                  </div>
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <span className="font-semibold">Total TTC:</span>
                  <span className="font-bold text-lg">
                    {(
                      parseFloat(formData.amount || '0') +
                      parseFloat(formData.tax_amount || '0')
                    ).toFixed(2)}{' '}
                    {formData.currency}
                  </span>
                </div>
              </div>
            )}

            {createMutation.error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Une erreur est survenue'}
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <Link href="/dashboard/payments">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending
                  ? 'Création...'
                  : invoiceType === 'bulk'
                  ? (documentType === 'quote' ? 'Générer les devis' : 'Générer les factures')
                  : (documentType === 'quote' ? 'Créer le devis' : 'Créer la facture')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

