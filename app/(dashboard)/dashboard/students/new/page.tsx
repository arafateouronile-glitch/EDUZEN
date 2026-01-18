'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { studentService } from '@/lib/services/student.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { studentSchema, type StudentFormData } from '@/lib/validations/schemas'
import { usePageAnalytics } from '@/lib/hooks/use-page-analytics'
import { useCreateStudent } from '@/lib/hooks/use-create-student'

export default function NewStudentPage() {
  const router = useRouter()
  const auth = useAuth()
  const { user, isLoading: userLoading, session } = auth
  const supabase = createClient()

  // Tous les hooks doivent être appelés avant les early returns
  const [step, setStep] = useState(1)
  
  // React Hook Form avec validation Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    trigger,
    watch,
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    mode: 'onChange',
    defaultValues: {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      guardian_first_name: '',
      guardian_last_name: '',
      guardian_relationship: 'parent',
      guardian_phone_primary: '',
      guardian_phone_secondary: '',
      guardian_email: '',
      guardian_address: '',
      class_id: '',
      enrollment_date: new Date().toISOString().split('T')[0],
    },
  })

  // Récupérer les sessions (remplace les classes)
  const { data: sessions } = useQuery({
    queryKey: ['program-sessions-all', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, start_date, end_date, formations!inner(id, name, code, organization_id, programs(id, name))')
        .eq('formations.organization_id', user.organization_id)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data?.map((session: any) => ({
        id: session.id,
        name: `${session.name} - ${session.formations.name}${session.formations.programs ? ` (${session.formations.programs.name})` : ''}`,
        code: session.formations.code,
        start_date: session.start_date,
        end_date: session.end_date,
      })) || []
    },
    enabled: !!user?.organization_id && !userLoading,
  })

  const createMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')

      // 1. Créer le tuteur
      const { data: guardian, error: guardianError } = await supabase
        .from('guardians')
        .insert({
          organization_id: user.organization_id,
          first_name: data.guardian_first_name,
          last_name: data.guardian_last_name,
          relationship: data.guardian_relationship,
          phone_primary: data.guardian_phone_primary,
          phone_secondary: data.guardian_phone_secondary || null,
          email: data.guardian_email || null,
          address: data.guardian_address || null,
        })
        .select()
        .single()

      if (guardianError) throw guardianError

      // 2. Générer un numéro étudiant unique
      // Récupérer le code de l'organisation
      const { data: organization } = await supabase
        .from('organizations')
        .select('code')
        .eq('id', user.organization_id)
        .single()

      const orgCode = organization?.code || 'EDUZEN'
      const year = new Date().getFullYear().toString().slice(-2)
      
      // Récupérer le dernier numéro d'élève pour cette organisation et cette année
      const prefix = `${orgCode}${year}`
      const { data: lastStudent } = await supabase
        .from('students')
        .select('student_number')
        .eq('organization_id', user.organization_id)
        .like('student_number', `${prefix}%`)
        .order('student_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      // Générer le prochain numéro
      let sequence = 1
      if (lastStudent?.student_number) {
        // Extraire la séquence du dernier numéro
        const lastSequence = parseInt(lastStudent.student_number.slice(-4)) || 0
        sequence = lastSequence + 1
      }
      
      let studentNumber = `${prefix}${String(sequence).padStart(4, '0')}`
      
      // Double vérification : s'assurer que ce numéro n'existe pas déjà
      const { data: existingCheck } = await supabase
        .from('students')
        .select('id')
        .eq('organization_id', user.organization_id)
        .eq('student_number', studentNumber)
        .maybeSingle()
      
      if (existingCheck) {
        // Si le numéro existe encore (cas de course), incrémenter jusqu'à trouver un numéro libre
        let attempts = 0
        while (attempts < 100) {
          sequence++
          studentNumber = `${prefix}${String(sequence).padStart(4, '0')}`
          
          const { data: check } = await supabase
            .from('students')
            .select('id')
            .eq('organization_id', user.organization_id)
            .eq('student_number', studentNumber)
            .maybeSingle()
          
          if (!check) {
            // Numéro disponible
            break
          }
          attempts++
        }
        
        if (attempts >= 100) {
          throw new Error('Impossible de générer un numéro d\'élève unique. Veuillez réessayer.')
        }
      }

      // 3. Créer l'élève
      // Note: class_id n'est pas inséré car il fait référence à la table "classes", 
      // pas aux sessions. L'inscription à la session est gérée via la table "enrollments"
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          organization_id: user.organization_id,
          student_number: studentNumber,
          first_name: data.first_name,
          last_name: data.last_name,
          date_of_birth: data.date_of_birth || null,
          gender: (data.gender as 'male' | 'female' | 'other') || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          // class_id n'est pas inséré ici car il fait référence à "classes", pas "sessions"
          // L'inscription à la session sera créée via la table "enrollments" ci-dessous
          enrollment_date: data.enrollment_date,
          status: 'active', // Statut par défaut pour un nouvel étudiant
        })
        .select()
        .single()

      if (studentError) {
        console.error('Student creation error:', studentError)
        console.error('Error details:', {
          code: studentError.code,
          message: studentError.message,
          details: studentError.details,
          hint: studentError.hint,
        })
        
        // Gérer spécifiquement l'erreur de duplication de numéro d'élève
        if (studentError.code === '23505') {
          throw new Error(
            `Un élève avec le numéro "${studentNumber}" existe déjà dans votre organisation. Veuillez réessayer ou contacter le support.`
          )
        }
        
        throw new Error(
          studentError.message ||
          'Une erreur est survenue lors de la création de l\'élève'
        )
      }

      // 4. Lier le tuteur à l'élève
      const { error: linkError } = await supabase
        .from('student_guardians')
        .insert({
          student_id: student.id,
          guardian_id: guardian.id,
          is_primary: true,
        })

      if (linkError) {
        console.error('Link guardian error:', linkError)
        throw new Error('Erreur lors de la liaison du tuteur à l\'élève')
      }

      // 5. Créer l'inscription si une session est sélectionnée
      if (data.class_id) {
        const { error: enrollmentError } = await supabase
          .from('enrollments')
          .insert({
            student_id: student.id,
            session_id: data.class_id,
            enrollment_date: data.enrollment_date,
            status: 'confirmed',
            payment_status: 'pending',
            total_amount: 0,
            paid_amount: 0,
          })

        if (enrollmentError) {
          console.error('Enrollment error:', enrollmentError)
          // Ne pas faire échouer la création de l'élève si l'inscription échoue
          // On peut toujours créer l'inscription plus tard
          console.warn('L\'élève a été créé mais l\'inscription à la session a échoué')
        }
      }

      return student
    },
    onSuccess: (student) => {
      router.push(`/dashboard/students/${student.id}`)
    },
    onError: (error) => {
      console.error('Student creation mutation error:', error)
    },
  })

  const onSubmit = async (data: StudentFormData) => {
    console.log('onSubmit called:', { step, data })
    
    if (step < 3) {
      // Valider les champs de l'étape actuelle
      let fieldsToValidate: (keyof StudentFormData)[] = []
      if (step === 1) {
        // Étape 1 : Informations personnelles (sans enrollment_date qui est à l'étape 3)
        fieldsToValidate = ['first_name', 'last_name']
      } else if (step === 2) {
        // Étape 2 : Informations du tuteur
        fieldsToValidate = ['guardian_first_name', 'guardian_last_name', 'guardian_phone_primary']
      }
      
      console.log('Validating fields:', fieldsToValidate)
      const isValidStep = await trigger(fieldsToValidate)
      console.log('Validation result:', { step, fieldsToValidate, isValidStep, errors })
      
      if (isValidStep) {
        console.log('Validation passed, moving to step', step + 1)
        setStep(step + 1)
      } else {
        console.log('Validation failed for step', step, 'Errors:', errors)
      }
    } else {
      // Dernière étape : soumettre (valider tous les champs requis)
      console.log('Final step, validating all fields')
      const allFieldsValid = await trigger(['first_name', 'last_name', 'guardian_first_name', 'guardian_last_name', 'guardian_phone_primary', 'enrollment_date'])
      if (allFieldsValid) {
        console.log('All fields valid, creating student')
        createMutation.mutate(data)
      } else {
        console.log('Final validation failed, errors:', errors)
      }
    }
  }

  // État pour suivre si l'étape actuelle est valide
  const [isStepValid, setIsStepValid] = useState(false)
  
  // Observer les valeurs spécifiques du formulaire pour valider l'étape
  const first_name = watch('first_name')
  const last_name = watch('last_name')
  const enrollment_date = watch('enrollment_date')
  const guardian_first_name = watch('guardian_first_name')
  const guardian_last_name = watch('guardian_last_name')
  const guardian_phone_primary = watch('guardian_phone_primary')

  // Valider l'étape actuelle quand les champs changent
  const validateCurrentStep = async () => {
    try {
      if (step === 1) {
        // Étape 1 : Seulement prénom et nom (enrollment_date est à l'étape 3)
        const isValid = await trigger(['first_name', 'last_name'])
        setIsStepValid(isValid)
        return isValid
      }
      if (step === 2) {
        const isValid = await trigger(['guardian_first_name', 'guardian_last_name', 'guardian_phone_primary'])
        setIsStepValid(isValid)
        return isValid
      }
      // Étape 3 : Valider tous les champs requis
      if (step === 3) {
        const isValid = await trigger(['enrollment_date'])
        setIsStepValid(isValid)
        return isValid
      }
      setIsStepValid(true)
      return true
    } catch (error) {
      console.error('Validation error:', error)
      setIsStepValid(false)
      return false
    }
  }

  // Valider l'étape quand elle change ou quand les valeurs pertinentes changent
  useEffect(() => {
    validateCurrentStep()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, first_name, last_name, enrollment_date, guardian_first_name, guardian_last_name, guardian_phone_primary])
  
  // Valider aussi au montage initial
  useEffect(() => {
    if (step === 1) {
      validateCurrentStep()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Early returns après tous les hooks
  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Chargement...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="bg-warning-bg border border-warning-border rounded-lg p-4">
          <h2 className="text-lg font-semibold text-warning-primary mb-2">
            Utilisateur non trouvé
          </h2>
          <p className="text-warning-primary mb-4">
            Votre compte n'existe pas encore dans la base de données. Cela peut arriver si votre compte a été créé récemment.
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-warning-primary">
              Session ID : {session?.user?.id || 'Non défini'}
            </p>
            <p className="text-sm text-warning-primary">
              Email de session : {session?.user?.email || 'Non défini'}
            </p>
            <p className="text-sm text-warning-primary mt-4">
              <strong>Solution :</strong> Déconnectez-vous et créez un nouveau compte via <Link href="/auth/register" className="text-primary underline">/auth/register</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!user.organization_id) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Organization ID manquant
          </h2>
          <p className="text-red-700 mb-4">
            Votre compte n'est pas associé à une organisation. Suivez les étapes ci-dessous pour corriger cela.
          </p>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-red-600">
              User ID : {user.id || 'Non défini'}
            </p>
            <p className="text-sm text-red-600">
              Email : {user.email || 'Non défini'}
            </p>
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm font-semibold mb-2">Pour corriger :</p>
              <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                <li>Allez dans le SQL Editor de Supabase</li>
                <li>Exécutez le script dans <code className="bg-gray-200 px-1 rounded">supabase/fix_missing_organization.sql</code></li>
                <li>Ou créez un nouveau compte via <Link href="/auth/register" className="text-primary underline">/auth/register</Link></li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/students">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nouvel élève</h1>
          <p className="mt-2 text-sm text-gray-600">
            Inscrivez un nouvel élève en quelques étapes
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center space-x-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 flex items-center">
            <div
              className={`flex-1 h-2 rounded ${
                step >= s ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
            {s < 3 && (
              <div
                className={`w-2 h-2 rounded-full ${
                  step > s ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
        <div className="ml-4 text-sm text-muted-foreground">
          Étape {step} sur 3
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && 'Informations personnelles'}
            {step === 2 && 'Informations du tuteur'}
            {step === 3 && 'Informations académiques'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      {...register('first_name')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    />
                    {errors.first_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      {...register('last_name')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    />
                    {errors.last_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      {...register('date_of_birth')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    />
                    {errors.date_of_birth && (
                      <p className="text-red-500 text-sm mt-1">{errors.date_of_birth.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Genre</label>
                    <select
                      {...register('gender')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    >
                      <option value="">Sélectionner</option>
                      <option value="male">Masculin</option>
                      <option value="female">Féminin</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      {...register('email')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Téléphone</label>
                    <input
                      type="tel"
                      {...register('phone')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Adresse</label>
                  <input
                    type="text"
                    {...register('address')}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ville</label>
                  <input
                    type="text"
                    {...register('city')}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Prénom du tuteur *
                    </label>
                    <input
                      type="text"
                      required
                      {...register('guardian_first_name')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    />
                    {errors.guardian_first_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.guardian_first_name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nom du tuteur *
                    </label>
                    <input
                      type="text"
                      required
                      {...register('guardian_last_name')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    />
                    {errors.guardian_last_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.guardian_last_name.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Lien de parenté *
                  </label>
                  <select
                    required
                    {...register('guardian_relationship')}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  >
                    <option value="parent">Parent</option>
                    <option value="father">Père</option>
                    <option value="mother">Mère</option>
                    <option value="guardian">Tuteur</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Téléphone principal *
                    </label>
                    <input
                      type="tel"
                      required
                      {...register('guardian_phone_primary')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    />
                    {errors.guardian_phone_primary && (
                      <p className="text-red-500 text-sm mt-1">{errors.guardian_phone_primary.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Téléphone secondaire
                    </label>
                    <input
                      type="tel"
                      {...register('guardian_phone_secondary')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    />
                    {errors.guardian_phone_secondary && (
                      <p className="text-red-500 text-sm mt-1">{errors.guardian_phone_secondary.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email du tuteur
                  </label>
                  <input
                    type="email"
                    {...register('guardian_email')}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                  {errors.guardian_email && (
                    <p className="text-red-500 text-sm mt-1">{errors.guardian_email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Adresse du tuteur
                  </label>
                  <input
                    type="text"
                    {...register('guardian_address')}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                  {errors.guardian_address && (
                    <p className="text-red-500 text-sm mt-1">{errors.guardian_address.message}</p>
                  )}
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Session
                  </label>
                  <select
                    {...register('class_id')}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  >
                    <option value="">Sélectionner une session</option>
                    {sessions?.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Date d'inscription
                  </label>
                  <input
                    type="date"
                    required
                    {...register('enrollment_date')}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                  />
                  {errors.enrollment_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.enrollment_date.message}</p>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  Précédent
                </Button>
              )}
              <div className="ml-auto">
                <Button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault()
                    console.log('Button clicked manually, step:', step)
                    const formData = watch()
                    console.log('Current form data:', formData)
                    
                    // Valider et passer à l'étape suivante
                    if (step === 1) {
                      const isValid = await trigger(['first_name', 'last_name'])
                      console.log('Step 1 validation:', isValid, 'Errors:', errors)
                      if (isValid) {
                        console.log('Moving to step 2')
                        setStep(2)
                      }
                    } else if (step === 2) {
                      const isValid = await trigger(['guardian_first_name', 'guardian_last_name', 'guardian_phone_primary'])
                      console.log('Step 2 validation:', isValid, 'Errors:', errors)
                      if (isValid) {
                        console.log('Moving to step 3')
                        setStep(3)
                      }
                    } else {
                      // Étape 3 : soumettre le formulaire
                      await handleSubmit(onSubmit)(e as any)
                    }
                  }}
                  disabled={createMutation.isPending}
                >
                  {step < 3
                    ? 'Suivant'
                    : createMutation.isPending
                    ? 'Création...'
                    : 'Créer l\'élève'}
                </Button>
              </div>
            </div>

            {createMutation.error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm space-y-1">
                <p className="font-semibold">Erreur lors de la création de l'élève :</p>
                <p>
                  {createMutation.error instanceof Error
                    ? createMutation.error.message
                    : 'Une erreur est survenue'}
                </p>
                {createMutation.error && 'code' in createMutation.error && (
                  <p className="text-xs opacity-75">
                    Code d'erreur: {String(createMutation.error.code)}
                    {createMutation.error.code === '23505' && (
                      <span className="block mt-1">
                        ❌ Un élève avec ce numéro existe déjà. Le système va générer automatiquement un numéro unique lors de la prochaine tentative.
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

