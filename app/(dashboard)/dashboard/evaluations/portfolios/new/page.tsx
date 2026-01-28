'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import {
  ArrowLeft, Plus, Search, Users, FileText, Calendar, 
  CheckCircle2, User, BookOpen
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { logger, sanitizeError } from '@/lib/utils/logger'

export default function NewPortfolioPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const { addToast } = useToast()

  const [step, setStep] = useState(1)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Récupérer les templates (organisation + modèles système)
  const { data: templates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['portfolio-templates-active', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      // Récupérer les templates de l'organisation ET les templates système (organization_id IS NULL)
      const { data, error } = await supabase
        .from('learning_portfolio_templates')
        .select('*')
        .or(`organization_id.eq.${user.organization_id},organization_id.is.null`)
        .eq('is_active', true)
        .order('is_default', { ascending: false }) // Modèles par défaut en premier
        .order('name')
      
      if (error) {
        logger.debug('Table non trouvée', sanitizeError(error))
        return []
      }
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  const isTeacher = user?.role === 'teacher'

  // Récupérer les sessions assignées à l'enseignant (pour les enseignants)
  const { data: teacherSessionIds } = useQuery({
    queryKey: ['teacher-session-ids-portfolio-new', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('session_teachers')
        .select('session_id')
        .eq('teacher_id', user.id)
      if (error) {
        logger.error('Erreur récupération sessions enseignant', sanitizeError(error))
        return []
      }
      return data?.map((st: any) => st.session_id) || []
    },
    enabled: !!user?.id && isTeacher,
  })

  // Récupérer les sessions
  // Pour les enseignants, filtrer uniquement par leurs sessions assignées
  const { data: sessions } = useQuery({
    queryKey: ['sessions-for-portfolio', user?.organization_id, isTeacher, teacherSessionIds],
    queryFn: async () => {
      if (!user?.organization_id) return []
      
      let query = supabase
        .from('sessions')
        .select('id, name, start_date, end_date, formations!inner(id, name, organization_id)')
        .eq('formations.organization_id', user.organization_id)
        .in('status', ['planned', 'ongoing', 'active', 'in_progress'])
        .order('start_date', { ascending: false })
      
      // Filtrer par les sessions de l'enseignant si applicable
      if (isTeacher && teacherSessionIds && teacherSessionIds.length > 0) {
        query = query.in('id', teacherSessionIds)
      } else if (isTeacher) {
        // Si l'enseignant n'a pas de sessions, retourner un tableau vide
        return []
      }
      
      const { data, error } = await query
      if (error) return []
      return data || []
    },
    enabled: !!user?.organization_id && (!isTeacher || (isTeacher && teacherSessionIds !== undefined)),
  })

  // Récupérer les apprenants de la session sélectionnée
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['session-students', selectedSessionId],
    queryFn: async () => {
      if (!selectedSessionId) return []
      
      // Récupérer les inscriptions avec statuts valides (pas annulées ou refusées)
      const { data, error } = await supabase
        .from('enrollments')
        .select('student:students(id, first_name, last_name, email, photo_url)')
        .eq('session_id', selectedSessionId)
        .not('status', 'in', '("cancelled","rejected","dropped")')
      
      if (error) {
        logger.error('Erreur récupération apprenants:', error)
        return []
      }
      
      // Filtrer les résultats valides et dédupliquer par ID
      const studentsMap = new Map()
      data?.forEach((e: any) => {
        if (e.student && e.student.id) {
          studentsMap.set(e.student.id, e.student)
        }
      })
      
      return Array.from(studentsMap.values())
    },
    enabled: !!selectedSessionId,
  })

  // Mutation pour créer les livrets
  const createMutation = useMutation({
    mutationFn: async () => {
      const portfoliosToCreate = selectedStudentIds.map(studentId => ({
        organization_id: user?.organization_id,
        template_id: selectedTemplateId,
        student_id: studentId,
        session_id: selectedSessionId || null,
        status: 'draft',
        progress_percentage: 0,
        started_at: new Date().toISOString(),
        content: {},
      }))

      const { data, error } = await (supabase
        .from('learning_portfolios') as any)
        .insert(portfoliosToCreate)
        .select()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      addToast({ 
        type: 'success', 
        title: 'Livrets créés', 
        description: `${data.length} livret(s) ont été créés avec succès.` 
      })
      // Rediriger vers le premier livret créé ou la liste
      if (data.length === 1) {
        router.push(`/dashboard/evaluations/portfolios/${data[0].id}`)
      } else {
        router.push('/dashboard/evaluations/portfolios')
      }
    },
    onError: (error: any) => {
      addToast({ 
        type: 'error', 
        title: 'Erreur', 
        description: error.message || 'Impossible de créer les livrets.' 
      })
    },
  })

  const handleCreate = () => {
    if (!selectedTemplateId) {
      addToast({ type: 'error', title: 'Erreur', description: 'Sélectionnez un modèle de livret.' })
      return
    }
    if (selectedStudentIds.length === 0) {
      addToast({ type: 'error', title: 'Erreur', description: 'Sélectionnez au moins un apprenant.' })
      return
    }
    createMutation.mutate()
  }

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const selectAllStudents = () => {
    if (students) {
      setSelectedStudentIds(students.map((s: any) => s.id))
    }
  }

  const filteredStudents = students?.filter((s: any) => {
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase()) || s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard/evaluations/portfolios">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Nouveau livret d'apprentissage
            </h1>
            <p className="text-gray-600">
              Créez un livret pour un ou plusieurs apprenants
            </p>
          </div>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-2 mt-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div 
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step >= s ? 'bg-brand-blue text-white' : 'bg-gray-200 text-gray-600'
                )}
              >
                {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
              </div>
              {s < 3 && (
                <div className={cn(
                  'w-12 h-1 mx-2 rounded',
                  step > s ? 'bg-brand-blue' : 'bg-gray-200'
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-16 mt-2 text-sm text-gray-600">
          <span className={step >= 1 ? 'text-brand-blue font-medium' : ''}>Modèle</span>
          <span className={step >= 2 ? 'text-brand-blue font-medium' : ''}>Session</span>
          <span className={step >= 3 ? 'text-brand-blue font-medium' : ''}>Apprenants</span>
        </div>
      </motion.div>

      {/* Étape 1: Sélection du modèle */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-blue" />
                Choisir un modèle de livret
              </CardTitle>
              <CardDescription>
                Sélectionnez le modèle de livret à utiliser pour ce(s) apprenant(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTemplates ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                </div>
              ) : templates?.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Aucun modèle de livret disponible</p>
                  <Link href="/dashboard/evaluations/portfolios/templates/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un modèle
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates?.map((template: any) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={cn(
                        'p-4 border-2 rounded-lg cursor-pointer transition-all',
                        selectedTemplateId === template.id
                          ? 'border-brand-blue bg-brand-blue/5'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${template.primary_color}20` }}
                        >
                          <FileText className="h-5 w-5" style={{ color: template.primary_color }} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{template.name}</h4>
                          {template.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {template.template_structure?.length || 0} sections
                          </p>
                        </div>
                        {selectedTemplateId === template.id && (
                          <CheckCircle2 className="h-5 w-5 text-brand-blue" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-6">
                <Button 
                  onClick={() => setStep(2)} 
                  disabled={!selectedTemplateId}
                >
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Étape 2: Sélection de la session (optionnel) */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-blue" />
                Sélectionner une session (optionnel)
              </CardTitle>
              <CardDescription>
                Associez le livret à une session de formation pour faciliter le suivi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div
                  onClick={() => setSelectedSessionId('')}
                  className={cn(
                    'p-4 border-2 rounded-lg cursor-pointer transition-all',
                    !selectedSessionId
                      ? 'border-brand-blue bg-brand-blue/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Sans session</h4>
                      <p className="text-sm text-gray-600">Créer un livret indépendant</p>
                    </div>
                    {!selectedSessionId && <CheckCircle2 className="h-5 w-5 text-brand-blue" />}
                  </div>
                </div>

                {sessions?.map((session: any) => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={cn(
                      'p-4 border-2 rounded-lg cursor-pointer transition-all',
                      selectedSessionId === session.id
                        ? 'border-brand-blue bg-brand-blue/5'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{session.name}</h4>
                        <p className="text-sm text-gray-600">{session.formations?.name}</p>
                      </div>
                      {selectedSessionId === session.id && <CheckCircle2 className="h-5 w-5 text-brand-blue" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button onClick={() => setStep(3)}>
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Étape 3: Sélection des apprenants */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-blue" />
                Sélectionner les apprenants
              </CardTitle>
              <CardDescription>
                {selectedSessionId 
                  ? 'Sélectionnez les apprenants de la session'
                  : 'Recherchez et sélectionnez les apprenants'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un apprenant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {students && students.length > 0 && (
                  <Button variant="outline" onClick={selectAllStudents}>
                    Tout sélectionner
                  </Button>
                )}
              </div>

              {isLoadingStudents ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
                </div>
              ) : !selectedSessionId ? (
                <div className="text-center py-8 text-gray-600">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>Sélectionnez une session à l'étape précédente pour voir les apprenants</p>
                  <p className="text-sm mt-2">ou créez un livret sans session</p>
                </div>
              ) : filteredStudents?.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p>Aucun apprenant trouvé dans cette session</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredStudents?.map((student: any) => (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={cn(
                        'p-3 border rounded-lg cursor-pointer transition-all flex items-center gap-3',
                        selectedStudentIds.includes(student.id)
                          ? 'border-brand-blue bg-brand-blue/5'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <div className="relative w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                        {student.photo_url ? (
                          <Image
                            src={student.photo_url}
                            alt={`${student.first_name} ${student.last_name}`}
                            fill
                            className="rounded-full object-cover"
                          />
                        ) : (
                          `${student.first_name?.[0]}${student.last_name?.[0]}`
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{student.first_name} {student.last_name}</p>
                        <p className="text-sm text-gray-600">{student.email}</p>
                      </div>
                      {selectedStudentIds.includes(student.id) && (
                        <CheckCircle2 className="h-5 w-5 text-brand-blue" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedStudentIds.length > 0 && (
                <div className="mt-4 p-3 bg-brand-blue/5 rounded-lg">
                  <p className="text-sm text-brand-blue font-medium">
                    {selectedStudentIds.length} apprenant(s) sélectionné(s)
                  </p>
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={selectedStudentIds.length === 0 || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Création...' : `Créer ${selectedStudentIds.length} livret(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

