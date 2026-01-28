'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  Briefcase, 
  UserPlus, 
  ChevronRight, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  GraduationCap, 
  Check, 
  AlertCircle,
  Sparkles,
  Shield,
  Camera,
  Upload,
  X
} from 'lucide-react'
import Link from 'next/link'
import { studentSchema, type StudentFormData } from '@/lib/validations/schemas'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { logger, sanitizeError } from '@/lib/utils/logger'

export default function NewStudentPage() {
  const router = useRouter()
  const auth = useAuth()
  const { user, isLoading: userLoading, session } = auth
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    setValue,
    trigger,
    watch,
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    mode: 'onChange',
    defaultValues: {
      first_name: '',
      last_name: '',
      photo_url: '',
      date_of_birth: '',
      gender: '',
      email: '',
      phone: '',
      address: '',
      postal_code: '',
      city: '',
      address_complement: '',
      guardian_id: '',
      guardian_first_name: '',
      guardian_last_name: '',
      guardian_relationship: 'parent',
      guardian_phone_primary: '',
      guardian_phone_secondary: '',
      guardian_email: '',
      guardian_address: '',
      organization_id: '',
      entity_id: '',
      company_name: '',
      company_address: '',
      company_phone: '',
      company_email: '',
      company_siret: '',
      class_id: '',
      enrollment_date: new Date().toISOString().split('T')[0],
    },
  })

  const [guardianMode, setGuardianMode] = useState<'existing' | 'new'>('new')
  
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

  const { data: existingGuardians } = useQuery({
    queryKey: ['guardians', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('guardians')
        .select('*')
        .eq('organization_id', user.organization_id)
        .order('last_name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id && !userLoading,
  })

  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      if (user?.role === 'super_admin') {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, code')
          .order('name', { ascending: true })
        if (error) throw error
        return data || []
      } else {
        if (!user?.organization_id) return []
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, code')
          .eq('id', user.organization_id)
        if (error) throw error
        return data || []
      }
    },
    enabled: !userLoading,
  })

  const { data: externalEntities } = useQuery({
    queryKey: ['external-entities', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('external_entities')
        .select('id, name, type, siret')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id && !userLoading,
  })

  const [companyMode, setCompanyMode] = useState<'existing' | 'new'>('new')

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setValue('photo_url', '')
  }

  const createMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      const targetOrganizationId = data.organization_id || user?.organization_id
      if (!targetOrganizationId) throw new Error('Organization ID manquant')

      // Upload photo if exists
      let uploadedPhotoUrl = data.photo_url
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${targetOrganizationId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(filePath, photoFile)

        if (uploadError) {
          logger.error('Photo upload error:', uploadError)
          // Continue without photo if upload fails
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('student-photos')
            .getPublicUrl(filePath)
          uploadedPhotoUrl = publicUrl
        }
      }

      let guardianId: string
      
      if (data.guardian_id && guardianMode === 'existing') {
        guardianId = data.guardian_id
      } else {
        // Create new guardian if info provided, otherwise skip
        if (data.guardian_first_name && data.guardian_last_name) {
          const guardianPhonePrimary = (data.guardian_phone_primary ?? '').trim()
          if (!guardianPhonePrimary) {
            throw new Error('Téléphone du tuteur obligatoire.')
          }

          const { data: guardian, error: guardianError } = await supabase
            .from('guardians')
            .insert({
              organization_id: targetOrganizationId,
              first_name: data.guardian_first_name,
              last_name: data.guardian_last_name,
              relationship: data.guardian_relationship || 'parent',
              phone_primary: guardianPhonePrimary,
              phone_secondary: data.guardian_phone_secondary || null,
              email: data.guardian_email || null,
              address: data.guardian_address || null,
            })
            .select()
            .single()

          if (guardianError) throw guardianError
          guardianId = guardian.id
        } else {
          // No guardian created
          guardianId = ''
        }
      }

      const { data: organization } = await supabase
        .from('organizations')
        .select('code')
        .eq('id', targetOrganizationId)
        .single()

      const orgCode = organization?.code || 'EDUZEN'
      const year = new Date().getFullYear().toString().slice(-2)
      
      const prefix = `${orgCode}${year}`
      const { data: lastStudent } = await supabase
        .from('students')
        .select('student_number')
        .eq('organization_id', targetOrganizationId)
        .like('student_number', `${prefix}%`)
        .order('student_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      let sequence = 1
      if (lastStudent?.student_number) {
        const lastSequence = parseInt(lastStudent.student_number.slice(-4)) || 0
        sequence = lastSequence + 1
      }
      
      let studentNumber = `${prefix}${String(sequence).padStart(4, '0')}`
      
      const { data: existingCheck } = await supabase
        .from('students')
        .select('id')
        .eq('organization_id', targetOrganizationId)
        .eq('student_number', studentNumber)
        .maybeSingle()
      
      if (existingCheck) {
        let attempts = 0
        while (attempts < 100) {
          sequence++
          studentNumber = `${prefix}${String(sequence).padStart(4, '0')}`
          
          const { data: check } = await supabase
            .from('students')
            .select('id')
            .eq('organization_id', targetOrganizationId)
            .eq('student_number', studentNumber)
            .maybeSingle()
          
          if (!check) {
            break
          }
          attempts++
        }
        
        if (attempts >= 100) {
          throw new Error('Impossible de générer un numéro d\'élève unique. Veuillez réessayer.')
        }
      }

      const studentData: any = {
        organization_id: targetOrganizationId,
        student_number: studentNumber,
        first_name: data.first_name,
        last_name: data.last_name,
        photo_url: uploadedPhotoUrl || null,
        date_of_birth: data.date_of_birth || null,
        gender: (data.gender as 'male' | 'female' | 'other') || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        postal_code: data.postal_code || null,
        city: data.city || null,
        address_complement: data.address_complement || null,
        enrollment_date: data.enrollment_date,
        status: 'active',
      }

      if (data.entity_id && companyMode === 'existing') {
        // Le rattachement sera créé après la création de l'étudiant
      } else if (data.company_name || data.company_address || data.company_phone || data.company_email || data.company_siret) {
        studentData.metadata = {
          company: {
            name: data.company_name || null,
            address: data.company_address || null,
            phone: data.company_phone || null,
            email: data.company_email || null,
            siret: data.company_siret || null,
          },
        }
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert(studentData)
        .select()
        .single()

      if (studentError) {
        logger.error('Student creation error:', studentError)
        if (studentError.code === '23505') {
          throw new Error(
            `Un élève avec le numéro "${studentNumber}" existe déjà dans votre organisation. Veuillez réessayer ou contacter le support.`
          )
        }
        throw new Error(studentError.message || 'Une erreur est survenue lors de la création de l\'élève')
      }

      if (guardianId) {
        const { error: linkError } = await supabase
          .from('student_guardians')
          .insert({
            student_id: student.id,
            guardian_id: guardianId,
            is_primary: true,
          })

        if (linkError) {
          logger.error('Link guardian error:', linkError)
          // Non-blocking error
        }
      }

      if (data.entity_id && companyMode === 'existing' && user?.id) {
        const { error: entityError } = await supabase
          .from('student_entities')
          .insert({
            student_id: student.id,
            entity_id: data.entity_id,
            relationship_type: 'apprenticeship',
            is_current: true,
            created_by: user.id,
          })

        if (entityError) {
          logger.error('Entity link error:', entityError)
          logger.warn('L\'élève a été créé mais le rattachement à l\'entité a échoué')
        }
      }

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
          logger.error('Enrollment error:', enrollmentError)
          logger.warn('L\'élève a été créé mais l\'inscription à la session a échoué')
        }
      }

      return student
    },
    onSuccess: (student) => {
      router.push(`/dashboard/students/${student.id}`)
    },
    onError: (error) => {
      logger.error('Student creation mutation error:', error)
    },
  })

  const onSubmit = async (data: StudentFormData) => {
    if (step < 3) {
      // Étape 1 : valider uniquement l'identité
      if (step === 1) {
        const isValidStep = await trigger(['first_name', 'last_name'])
        if (isValidStep) setStep(2)
        return
      }

      // Étape 2 : NE DOIT PAS être bloquante
      if (step === 2) {
        setStep(3)
        return
      }
    } else {
      // Dernière étape : soumettre (valider tous les champs requis)
      const requiredFields: (keyof StudentFormData)[] = ['first_name', 'last_name', 'enrollment_date']

      // Validation tuteur optionnelle
      if (guardianMode === 'existing') {
        // Si mode existant sélectionné mais pas d'ID, on ignore (pas de tuteur)
      } else {
        // Si mode nouveau, on vérifie si des champs sont remplis partiellement
        const gf = watch('guardian_first_name')
        const gl = watch('guardian_last_name')
        const gp = watch('guardian_phone_primary')
        
        // Si un champ est rempli, les autres deviennent requis pour la cohérence
        if (gf || gl || gp) {
           // Mais pour l'instant on laisse passer, la mutation gérera
        }
      }

      const allFieldsValid = await trigger(requiredFields)
      if (!allFieldsValid) {
        // Si erreur sur step 1, retour step 1
        const fn = watch('first_name')
        const ln = watch('last_name')
        if (!fn || !ln) setStep(1)
        return
      }

      createMutation.mutate(data)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    )
  }

  if (!user || !user.organization_id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="h-10 w-10 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-800 mb-2">
            Organisation manquante
          </h2>
          <p className="text-red-700">
            Votre compte n'est pas associé à une organisation. Veuillez contacter le support.
          </p>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="min-h-screen pb-24 relative"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8 space-y-4">
        <nav className="flex items-center text-sm text-gray-500 mb-4">
          <Link href="/dashboard/students" className="hover:text-brand-blue transition-colors flex items-center gap-1">
            <Users className="h-4 w-4" />
            Élèves
          </Link>
          <ChevronRight className="h-4 w-4 mx-2 text-gray-300" />
          <span className="text-brand-blue font-medium bg-brand-blue/10 px-2 py-0.5 rounded-full text-xs">Nouveau</span>
        </nav>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/students">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/50">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-lg shadow-lg shadow-brand-blue/20">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-display font-bold text-gray-900 tracking-tight">
                  Nouvel élève
                </h1>
              </div>
              <p className="text-gray-500 pl-[3.25rem]">
                Inscrivez un nouvel élève en suivant les étapes.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Progress Steps */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex flex-col items-center relative z-10 w-1/3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 mb-2",
                      step >= s 
                        ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/30 scale-110" 
                        : "bg-gray-100 text-gray-400"
                    )}>
                      {step > s ? <Check className="h-5 w-5" /> : s}
                    </div>
                    <span className={cn(
                      "text-xs font-medium transition-colors duration-300",
                      step >= s ? "text-brand-blue" : "text-gray-400"
                    )}>
                      {s === 1 && 'Personnel'}
                      {s === 2 && 'Rattachement'}
                      {s === 3 && 'Académique'}
                    </span>
                    {s < 3 && (
                      <div className="absolute top-5 left-1/2 w-full h-[2px] -z-10 bg-gray-100">
                        <div 
                          className="h-full bg-brand-blue transition-all duration-500 ease-out"
                          style={{ width: step > s ? '100%' : '0%' }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard variant="premium" className="p-8 space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                      <User className="h-5 w-5 text-brand-blue" />
                      <h2 className="text-xl font-bold text-gray-900">Informations personnelles</h2>
                    </div>

                    {/* Photo Upload */}
                    <div className="flex flex-col items-center justify-center p-6 bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 hover:border-brand-blue/50 transition-colors">
                      <div className="relative group cursor-pointer">
                        <div className={cn(
                          "w-32 h-32 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-md border-4 border-white transition-all group-hover:scale-105",
                          !photoPreview && "bg-gray-100"
                        )}>
                          {photoPreview ? (
                            <Image 
                              src={photoPreview} 
                              alt="Aperçu" 
                              width={128} 
                              height={128} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Camera className="h-10 w-10 text-gray-400" />
                          )}
                        </div>
                        
                        <label htmlFor="photo-upload" className="absolute bottom-0 right-0 p-2 bg-brand-blue text-white rounded-full shadow-lg cursor-pointer hover:bg-brand-blue-dark transition-colors">
                          <Upload className="h-4 w-4" />
                        </label>
                        <input 
                          id="photo-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handlePhotoChange}
                        />

                        {photoPreview && (
                          <button
                            type="button"
                            onClick={removePhoto}
                            className="absolute top-0 right-0 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-gray-500 font-medium">Photo de profil</p>
                      <p className="text-xs text-gray-400">JPG, PNG ou WEBP (Max 2Mo)</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Prénom *</label>
                        <input
                          type="text"
                          {...register('first_name')}
                          className={cn(
                            "w-full px-4 py-3 bg-white/50 border rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all",
                            errors.first_name ? "border-red-500" : "border-gray-200"
                          )}
                          placeholder="Jean"
                        />
                        {errors.first_name && <p className="text-sm text-red-500">{errors.first_name.message}</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Nom *</label>
                        <input
                          type="text"
                          {...register('last_name')}
                          className={cn(
                            "w-full px-4 py-3 bg-white/50 border rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all",
                            errors.last_name ? "border-red-500" : "border-gray-200"
                          )}
                          placeholder="Dupont"
                        />
                        {errors.last_name && <p className="text-sm text-red-500">{errors.last_name.message}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Date de naissance</label>
                        <div className="relative">
                          <input
                            type="date"
                            {...register('date_of_birth')}
                            className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Genre</label>
                        <select
                          {...register('gender')}
                          className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none"
                        >
                          <option value="">Sélectionner</option>
                          <option value="male">Masculin</option>
                          <option value="female">Féminin</option>
                          <option value="other">Autre</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Email</label>
                        <div className="relative">
                          <input
                            type="email"
                            {...register('email')}
                            className="w-full pl-10 px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                            placeholder="jean.dupont@email.com"
                          />
                          <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Téléphone</label>
                        <div className="relative">
                          <input
                            type="tel"
                            {...register('phone')}
                            className="w-full pl-10 px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                            placeholder="+33 6 12 34 56 78"
                          />
                          <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Adresse complète</label>
                      <div className="relative">
                        <input
                          type="text"
                          {...register('address')}
                          className="w-full pl-10 px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                          placeholder="Ex: 123 Rue de la République"
                        />
                        <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Code postal</label>
                        <input
                          type="text"
                          {...register('postal_code')}
                          className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                          placeholder="75001"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Ville</label>
                        <input
                          type="text"
                          {...register('city')}
                          className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                          placeholder="Paris"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Complément d'adresse</label>
                      <input
                        type="text"
                        {...register('address_complement')}
                        className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                        placeholder="Ex: Appartement 3B, Bâtiment A, Résidence Les Jardins"
                      />
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Tuteur */}
                  <GlassCard variant="default" className="p-8 space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <h2 className="text-xl font-bold text-gray-900">Tuteur / Responsable</h2>
                    </div>

                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <div className="flex gap-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            guardianMode === 'existing' ? "border-brand-blue bg-brand-blue" : "border-gray-300 group-hover:border-brand-blue"
                          )}>
                            {guardianMode === 'existing' && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <input
                            type="radio"
                            value="existing"
                            checked={guardianMode === 'existing'}
                            onChange={(e) => {
                              setGuardianMode(e.target.value as 'existing' | 'new')
                              setValue('guardian_id', '')
                              setValue('guardian_first_name', '')
                              setValue('guardian_last_name', '')
                              setValue('guardian_phone_primary', '')
                            }}
                            className="hidden"
                          />
                          <span className="text-sm font-medium text-gray-700">Sélectionner un tuteur existant</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            guardianMode === 'new' ? "border-brand-blue bg-brand-blue" : "border-gray-300 group-hover:border-brand-blue"
                          )}>
                            {guardianMode === 'new' && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <input
                            type="radio"
                            value="new"
                            checked={guardianMode === 'new'}
                            onChange={(e) => {
                              setGuardianMode(e.target.value as 'existing' | 'new')
                              setValue('guardian_id', '')
                            }}
                            className="hidden"
                          />
                          <span className="text-sm font-medium text-gray-700">Créer un nouveau tuteur</span>
                        </label>
                      </div>
                    </div>

                    {guardianMode === 'existing' ? (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Tuteur existant *</label>
                        <select
                          {...register('guardian_id')}
                          className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none"
                        >
                          <option value="">Sélectionner un tuteur</option>
                          {existingGuardians?.map((guardian: any) => (
                            <option key={guardian.id} value={guardian.id}>
                              {guardian.first_name} {guardian.last_name} - {guardian.phone_primary}
                            </option>
                          ))}
                        </select>
                        {errors.guardian_id && <p className="text-sm text-red-500">{errors.guardian_id.message}</p>}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Prénom du tuteur</label>
                            <input
                              type="text"
                              {...register('guardian_first_name')}
                              className={cn(
                                "w-full px-4 py-3 bg-white/50 border rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all",
                                errors.guardian_first_name ? "border-red-500" : "border-gray-200"
                              )}
                            />
                            {errors.guardian_first_name && <p className="text-sm text-red-500">{errors.guardian_first_name.message}</p>}
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Nom du tuteur</label>
                            <input
                              type="text"
                              {...register('guardian_last_name')}
                              className={cn(
                                "w-full px-4 py-3 bg-white/50 border rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all",
                                errors.guardian_last_name ? "border-red-500" : "border-gray-200"
                              )}
                            />
                            {errors.guardian_last_name && <p className="text-sm text-red-500">{errors.guardian_last_name.message}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Lien de parenté</label>
                            <select
                              {...register('guardian_relationship')}
                              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none"
                            >
                              <option value="parent">Parent</option>
                              <option value="father">Père</option>
                              <option value="mother">Mère</option>
                              <option value="guardian">Tuteur</option>
                              <option value="other">Autre</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Téléphone principal</label>
                            <div className="relative">
                              <input
                                type="tel"
                                {...register('guardian_phone_primary')}
                                className={cn(
                                  "w-full pl-10 px-4 py-3 bg-white/50 border rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all",
                                  errors.guardian_phone_primary ? "border-red-500" : "border-gray-200"
                                )}
                                placeholder="+33 6 12 34 56 78"
                              />
                              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                            </div>
                            {errors.guardian_phone_primary && <p className="text-sm text-red-500">{errors.guardian_phone_primary.message}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Téléphone secondaire</label>
                            <div className="relative">
                              <input
                                type="tel"
                                {...register('guardian_phone_secondary')}
                                className="w-full pl-10 px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                placeholder="+33 1 23 45 67 89"
                              />
                              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Email</label>
                            <div className="relative">
                              <input
                                type="email"
                                {...register('guardian_email')}
                                className="w-full pl-10 px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                placeholder="tuteur@email.com"
                              />
                              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                            </div>
                            {errors.guardian_email && <p className="text-sm text-red-500">{errors.guardian_email.message}</p>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Adresse complète</label>
                          <div className="relative">
                            <input
                              type="text"
                              {...register('guardian_address')}
                              className="w-full pl-10 px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                              placeholder="Ex: 45 Avenue des Champs-Élysées"
                            />
                            <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    )}
                  </GlassCard>

                  {/* Entreprise */}
                  <GlassCard variant="default" className="p-8 space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                      <Briefcase className="h-5 w-5 text-brand-cyan" />
                      <h2 className="text-xl font-bold text-gray-900">Entreprise / Organisme (Optionnel)</h2>
                    </div>

                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                      <div className="flex gap-6">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            companyMode === 'existing' ? "border-brand-blue bg-brand-blue" : "border-gray-300 group-hover:border-brand-blue"
                          )}>
                            {companyMode === 'existing' && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <input
                            type="radio"
                            value="existing"
                            checked={companyMode === 'existing'}
                            onChange={(e) => {
                              setCompanyMode(e.target.value as 'existing' | 'new')
                              setValue('entity_id', '')
                              setValue('company_name', '')
                            }}
                            className="hidden"
                          />
                          <span className="text-sm font-medium text-gray-700">Entité existante</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            companyMode === 'new' ? "border-brand-blue bg-brand-blue" : "border-gray-300 group-hover:border-brand-blue"
                          )}>
                            {companyMode === 'new' && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <input
                            type="radio"
                            value="new"
                            checked={companyMode === 'new'}
                            onChange={(e) => {
                              setCompanyMode(e.target.value as 'existing' | 'new')
                              setValue('entity_id', '')
                            }}
                            className="hidden"
                          />
                          <span className="text-sm font-medium text-gray-700">Saisie manuelle</span>
                        </label>
                      </div>
                    </div>

                    {companyMode === 'existing' ? (
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Sélectionner une entité</label>
                        <select
                          {...register('entity_id')}
                          className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none"
                        >
                          <option value="">Sélectionner...</option>
                          {externalEntities?.map((entity: any) => (
                            <option key={entity.id} value={entity.id}>
                              {entity.name} {entity.siret && `(SIRET: ${entity.siret})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Nom de l'entreprise</label>
                            <input
                              type="text"
                              {...register('company_name')}
                              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                              placeholder="Raison sociale"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">SIRET</label>
                            <input
                              type="text"
                              {...register('company_siret')}
                              maxLength={14}
                              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                              placeholder="14 chiffres"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Téléphone</label>
                            <div className="relative">
                              <input
                                type="tel"
                                {...register('company_phone')}
                                className="w-full pl-10 px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                placeholder="+33 1 23 45 67 89"
                              />
                              <Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Email</label>
                            <div className="relative">
                              <input
                                type="email"
                                {...register('company_email')}
                                className="w-full pl-10 px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                                placeholder="entreprise@email.com"
                              />
                              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                            </div>
                            {errors.company_email && <p className="text-sm text-red-500">{errors.company_email.message}</p>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">Adresse complète</label>
                          <div className="relative">
                            <input
                              type="text"
                              {...register('company_address')}
                              className="w-full pl-10 px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                              placeholder="Ex: 10 Rue de la Paix, 75002 Paris"
                            />
                            <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard variant="premium" className="p-8 space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
                      <GraduationCap className="h-5 w-5 text-brand-blue" />
                      <h2 className="text-xl font-bold text-gray-900">Informations académiques</h2>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Session de formation</label>
                        <div className="relative">
                          <select
                            {...register('class_id')}
                            className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none"
                          >
                            <option value="">Sélectionner une session</option>
                            {sessions?.map((session) => (
                              <option key={session.id} value={session.id}>
                                {session.name}
                              </option>
                            ))}
                          </select>
                          <Calendar className="absolute right-3 top-3.5 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Date d'inscription *</label>
                        <input
                          type="date"
                          {...register('enrollment_date')}
                          className={cn(
                            "w-full px-4 py-3 bg-white/50 border rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all",
                            errors.enrollment_date ? "border-red-500" : "border-gray-200"
                          )}
                        />
                        {errors.enrollment_date && <p className="text-sm text-red-500">{errors.enrollment_date.message}</p>}
                      </div>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg h-fit">
                        <Sparkles className="h-4 w-4 text-brand-blue" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-brand-blue text-sm mb-1">Résumé de l'inscription</h4>
                        <p className="text-xs text-blue-700/80">
                          Un numéro d'étudiant unique sera généré automatiquement lors de la création.
                          L'étudiant recevra un email de bienvenue si son adresse email a été renseignée.
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            {createMutation.error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100 flex items-start gap-2"
              >
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Erreur lors de la création</p>
                  <p className="opacity-90">
                    {createMutation.error instanceof Error ? createMutation.error.message : 'Une erreur est survenue'}
                  </p>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between pt-4">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="bg-white hover:bg-gray-50 border-gray-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Précédent
                </Button>
              ) : (
                <div /> // Spacer
              )}
              
              <Button
                type="button"
                onClick={async (e) => {
                  e.preventDefault()
                  const formData = watch()
                  
                  if (step === 1) {
                    const isValid = await trigger(['first_name', 'last_name'])
                    if (isValid) setStep(2)
                  } else if (step === 2) {
                    setStep(3)
                  } else {
                    await handleSubmit(onSubmit)(e as any)
                  }
                }}
                disabled={createMutation.isPending}
                className="bg-gradient-to-r from-brand-blue to-brand-blue-dark hover:from-brand-blue-dark hover:to-brand-blue-darker text-white shadow-lg shadow-brand-blue/25 transition-all hover:scale-[1.02]"
              >
                {step < 3 ? (
                  <>
                    Suivant
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                ) : createMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Création...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Créer l'élève
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar Tips */}
        <div className="space-y-6">
          <motion.div variants={itemVariants} className="sticky top-6 space-y-6">
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <Sparkles className="h-5 w-5 text-brand-cyan" />
                <h3 className="font-bold text-gray-900">Conseils</h3>
              </div>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 shrink-0" />
                  Assurez-vous que les informations de contact (email/téléphone) sont correctes pour les notifications.
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 shrink-0" />
                  Le numéro d'étudiant est généré automatiquement selon le format de votre organisation.
                </li>
                <li className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-blue mt-1.5 shrink-0" />
                  La photo de profil est optionnelle mais recommandée pour l'identification.
                </li>
              </ul>
            </GlassCard>

            <GlassCard variant="subtle" className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Données sécurisées</h4>
                  <p className="text-xs text-gray-500">Conforme RGPD</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Les données personnelles collectées sont strictement confidentielles et utilisées uniquement pour la gestion administrative et pédagogique.
              </p>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
