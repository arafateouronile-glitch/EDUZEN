'use client'

import { CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { Plus, X, ClipboardList, Award, TrendingUp, Users, CheckCircle2, Calendar, FileText, AlertCircle, Sparkles, FileText as FileTextIcon, Mail, User, Link2 } from 'lucide-react'
import { formatDate, cn } from '@/lib/utils'
import type { 
  GradeWithRelations,
  StudentWithRelations
} from '@/lib/types/query-types'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Star } from 'lucide-react'

interface GestionEvaluationsProps {
  grades?: GradeWithRelations[]
  gradesStats?: {
    total: number
    average: number
    averagePercentage: number
  } | null
  students?: StudentWithRelations[]
  showEvaluationForm: boolean
  evaluationForm: {
    template_id?: string
    subject: string
    assessment_type: string
    student_id: string | undefined
    score: string
    max_score: string
    percentage: string
    notes: string
    graded_at: string
    /** Note satisfaction 0-5 (étoiles) pour types à chaud / à froid / apprenants / financeurs */
    rating?: string
  }
  onEvaluationFormChange: (form: GestionEvaluationsProps['evaluationForm']) => void
  onCreateEvaluation: () => void
  createEvaluationMutation: {
    isPending: boolean
    error: Error | null
  }
  onCloseEvaluationForm: () => void
  onShowEvaluationForm: (type?: string, subject?: string) => void
  evaluationTemplates?: Array<{
    id: string
    name: string
    subject?: string | null
    assessment_type?: string | null
    max_score?: number | null
    description?: string | null
    [key: string]: unknown
  }>
  onTemplateChange?: (templateId: string | undefined) => void
  /** Map grade_id -> template_id pour savoir quelles évaluations ont déjà un quiz côté apprenant */
  gradeInstanceMap?: Record<string, string>
  /** Associer un modèle à un grade existant (pour que l'apprenant voie le quiz) */
  onAttachTemplate?: (gradeId: string, templateId: string) => void
  attachTemplateMutation?: { mutate: (args: { gradeId: string; templateId: string }) => void; isPending: boolean }
}

/** Types d'évaluation "satisfaction" (form) : avis client + étoiles 0-5, pas de score */
const SATISFACTION_ASSESSMENT_TYPES = ['a_chaud', 'a_froid', 'managers']
/** Types d'évaluation "satisfaction" en base (assessment_type) */
const SATISFACTION_TYPES_DB = ['hot', 'cold', 'manager', 'instructor', 'funder']

const evaluationTypes = [
  {
    id: 'preformation',
    title: 'Évaluation préformation',
    description: 'Sondez les attentes et diagnostiquez le besoin avant la session.',
    subject: 'Évaluation préformation',
    icon: ClipboardList,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    hoverBg: 'group-hover:bg-blue-100'
  },
  {
    id: 'a_chaud',
    title: 'Évaluation à chaud',
    description: 'Envoyez une évaluation dématérialisée à l\'apprenant pour qu\'il note à chaud la formation.',
    subject: 'Évaluation à chaud',
    icon: TrendingUp,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    hoverBg: 'group-hover:bg-orange-100'
  },
  {
    id: 'a_froid',
    title: 'Évaluation à froid',
    description: 'Mesurez l\'impact professionnel de la formation pour entrer dans une démarche qualité.',
    subject: 'Évaluation à froid',
    icon: Award,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    hoverBg: 'group-hover:bg-purple-100'
  },
  {
    id: 'managers',
    title: 'Questionnaire managers',
    description: 'Impliquez les prescripteurs de la formation dans votre démarche qualité.',
    subject: 'Questionnaire managers',
    icon: Users,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    hoverBg: 'group-hover:bg-emerald-100'
  },
]

export function GestionEvaluations({
  grades = [],
  gradesStats,
  students = [],
  showEvaluationForm,
  evaluationForm,
  onEvaluationFormChange,
  onCreateEvaluation,
  createEvaluationMutation,
  onCloseEvaluationForm,
  onShowEvaluationForm,
  evaluationTemplates = [],
  onTemplateChange,
  gradeInstanceMap = {},
  onAttachTemplate,
  attachTemplateMutation,
}: GestionEvaluationsProps) {
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

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Formulaire de création d'évaluation */}
      <AnimatePresence>
        {showEvaluationForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard variant="default" className="p-6 border-brand-blue/20 shadow-lg shadow-brand-blue/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                    <Award className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900">Créer une évaluation</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCloseEvaluationForm}
                  className="rounded-full hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  onCreateEvaluation()
                }}
                className="space-y-6"
              >
                {/* Sélecteur de modèle — en premier pour associer le quiz apprenant dès la création */}
                {evaluationTemplates.length > 0 && (
                  <div className="space-y-2 p-4 bg-brand-blue/5 border border-brand-blue/20 rounded-xl">
                    <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FileTextIcon className="h-4 w-4 text-brand-blue" />
                      Modèle d'évaluation
                    </label>
                    <Select
                      value={evaluationForm.template_id || ''}
                      onValueChange={(value) => {
                        if (onTemplateChange) {
                          onTemplateChange(value || undefined)
                        } else {
                          onEvaluationFormChange({
                            ...evaluationForm,
                            template_id: value || undefined,
                          })
                        }
                      }}
                    >
                      <SelectTrigger className="w-full bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue">
                        <SelectValue placeholder="Choisir un modèle (quiz apprenant)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl z-[100]">
                        <SelectItem value="">Aucun modèle (note manuelle uniquement)</SelectItem>
                        {evaluationTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <FileTextIcon className="h-4 w-4 text-gray-400" />
                              <span>{template.name}</span>
                              {template.subject && (
                                <span className="text-xs text-gray-500">({template.subject})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-600">
                      {evaluationForm.template_id
                        ? "L'apprenant pourra passer le quiz associé à ce modèle dans son espace."
                        : "Choisir un modèle permet à l'apprenant de passer le quiz dans son espace personnel (recommandé si vous cochez « Ajouter à l'espace personnel »)."}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Sujet *</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={evaluationForm.subject}
                        onChange={(e) => onEvaluationFormChange({ ...evaluationForm, subject: e.target.value })}
                        className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                        placeholder="Ex: Évaluation de fin de module"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Élève (optionnel)</label>
                    <div className="relative">
                      <select
                        value={evaluationForm.student_id || ''}
                        onChange={(e) => onEvaluationFormChange({ ...evaluationForm, student_id: e.target.value || undefined })}
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all appearance-none"
                      >
                        <option value="">Tous les apprenants (évaluation collective)</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.first_name} {student.last_name} ({student.student_number})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                        <Users className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  {SATISFACTION_ASSESSMENT_TYPES.includes(evaluationForm.assessment_type) ? (
                    <>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-semibold text-gray-700">Satisfaction (étoiles 0 à 5)</label>
                        <div className="flex items-center gap-1 flex-wrap">
                          {[0, 1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() =>
                                onEvaluationFormChange({
                                  ...evaluationForm,
                                  rating: String(n),
                                  score: '',
                                  max_score: '',
                                  percentage: '',
                                })
                              }
                              className={cn(
                                'flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium',
                                Number(evaluationForm.rating) === n
                                  ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              )}
                              title={n === 0 ? 'Non renseigné' : `${n} étoile${n > 1 ? 's' : ''}`}
                            >
                              {n === 0 ? (
                                <span>—</span>
                              ) : (
                                <>
                                  {Array.from({ length: n }).map((_, i) => (
                                    <Star key={i} className="h-5 w-5 fill-amber-500 text-amber-500" />
                                  ))}
                                </>
                              )}
                              <span className="ml-0.5">{n}/5</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">Avis client : pas de note chiffrée, uniquement satisfaction (étoiles) et commentaire.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Note (optionnel)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={evaluationForm.score}
                          onChange={(e) => {
                            const score = e.target.value
                            const maxScore = parseFloat(evaluationForm.max_score) || 20
                            const percentage = score && maxScore ? Math.round((parseFloat(score) / maxScore) * 100).toString() : ''
                            onEvaluationFormChange({
                              ...evaluationForm,
                              score,
                              percentage: evaluationForm.percentage || percentage,
                            })
                          }}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                          placeholder="Laisser vide si calculée plus tard"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Note maximale</label>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          value={evaluationForm.max_score}
                          onChange={(e) => {
                            const maxScore = parseFloat(e.target.value) || 20
                            const score = parseFloat(evaluationForm.score) || 0
                            const percentage = score && maxScore ? Math.round((score / maxScore) * 100).toString() : ''
                            onEvaluationFormChange({
                              ...evaluationForm,
                              max_score: e.target.value,
                              percentage: evaluationForm.percentage || percentage,
                            })
                          }}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                          placeholder="20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">Pourcentage</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={evaluationForm.percentage}
                            onChange={(e) => onEvaluationFormChange({ ...evaluationForm, percentage: e.target.value })}
                            className="w-full pl-4 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                            placeholder="Calculé auto."
                          />
                          <span className="absolute right-3 top-2.5 text-gray-400 font-medium">%</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">
                      {SATISFACTION_ASSESSMENT_TYPES.includes(evaluationForm.assessment_type) ? 'Date de saisie' : 'Date de correction'} *
                    </label>
                    <input
                      type="date"
                      value={evaluationForm.graded_at}
                      onChange={(e) => onEvaluationFormChange({ ...evaluationForm, graded_at: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">
                    {SATISFACTION_ASSESSMENT_TYPES.includes(evaluationForm.assessment_type)
                      ? 'Avis / Commentaire client'
                      : 'Notes/Commentaires'}
                  </label>
                  <textarea
                    value={evaluationForm.notes}
                    onChange={(e) => onEvaluationFormChange({ ...evaluationForm, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                    rows={3}
                    placeholder={
                      SATISFACTION_ASSESSMENT_TYPES.includes(evaluationForm.assessment_type)
                        ? 'Saisissez l\'avis ou le commentaire du client / apprenant / financeur...'
                        : 'Ajoutez des commentaires, observations ou remarques...'
                    }
                  />
                </div>

                {/* Options d'envoi */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="text-sm font-bold text-gray-700 mb-3">Options d'envoi</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={(evaluationForm as { sendByEmail?: boolean }).sendByEmail ?? true}
                        onChange={(e) => onEvaluationFormChange({ ...evaluationForm, sendByEmail: e.target.checked } as Parameters<typeof onEvaluationFormChange>[0])}
                        className="w-5 h-5 text-brand-blue border-gray-300 rounded focus:ring-brand-blue/20 focus:ring-2"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <Mail className="h-4 w-4 text-gray-500 group-hover:text-brand-blue transition-colors" />
                        <div>
                          <span className="text-sm font-semibold text-gray-900">Envoyer par email</span>
                          <p className="text-xs text-gray-500">Un email avec un lien vers l'évaluation sera envoyé à l'apprenant</p>
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={(evaluationForm as { addToPersonalSpace?: boolean }).addToPersonalSpace ?? true}
                        onChange={(e) => onEvaluationFormChange({ ...evaluationForm, addToPersonalSpace: e.target.checked } as Parameters<typeof onEvaluationFormChange>[0])}
                        className="w-5 h-5 text-brand-blue border-gray-300 rounded focus:ring-brand-blue/20 focus:ring-2"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <User className="h-4 w-4 text-gray-500 group-hover:text-brand-blue transition-colors" />
                        <div>
                          <span className="text-sm font-semibold text-gray-900">Ajouter à l'espace personnel</span>
                          <p className="text-xs text-gray-500">L'évaluation sera visible dans l'espace personnel de l'apprenant</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {createEvaluationMutation.error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {createEvaluationMutation.error instanceof Error
                      ? createEvaluationMutation.error.message
                      : 'Une erreur est survenue'}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCloseEvaluationForm}
                    className="rounded-xl border-gray-200"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createEvaluationMutation.isPending}
                    className="bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl shadow-lg shadow-brand-blue/20"
                  >
                    {createEvaluationMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        <span>Création...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        <span>Créer l'évaluation</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Statistiques des évaluations */}
      {grades.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <GlassCard variant="subtle" className="p-6 flex flex-col items-center justify-center text-center border-l-4 border-l-brand-blue">
              <div className="p-3 bg-brand-blue/10 rounded-full mb-3">
                <ClipboardList className="h-6 w-6 text-brand-blue" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{grades.length}</p>
              <p className="text-sm font-medium text-gray-500 mt-1">Évaluations totales</p>
            </GlassCard>
            
            <GlassCard variant="subtle" className="p-6 flex flex-col items-center justify-center text-center border-l-4 border-l-brand-cyan">
              <div className="p-3 bg-brand-cyan/10 rounded-full mb-3">
                <TrendingUp className="h-6 w-6 text-brand-cyan" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {gradesStats?.average?.toFixed(2) || '0'}
                <span className="text-lg text-gray-400 font-normal">/{gradesStats?.averagePercentage ? Math.round(gradesStats.average * (100 / gradesStats.averagePercentage)) : 20}</span>
              </p>
              <p className="text-sm font-medium text-gray-500 mt-1">Note moyenne</p>
            </GlassCard>
            
            <GlassCard variant="subtle" className="p-6 flex flex-col items-center justify-center text-center border-l-4 border-l-purple-500">
              <div className="p-3 bg-purple-100 rounded-full mb-3">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {gradesStats?.averagePercentage?.toFixed(1) || 0}%
              </p>
              <p className="text-sm font-medium text-gray-500 mt-1">Moyenne globale</p>
            </GlassCard>
            
            <GlassCard variant="subtle" className="p-6 flex flex-col items-center justify-center text-center border-l-4 border-l-green-500">
              <div className="p-3 bg-green-100 rounded-full mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {grades.filter((g) => g.graded_at).length}
              </p>
              <p className="text-sm font-medium text-gray-500 mt-1">Corrigées</p>
            </GlassCard>
          </div>
        </motion.div>
      )}

      {/* Liste des évaluations existantes */}
      {grades.length > 0 && (
        <motion.div variants={itemVariants}>
          <GlassCard variant="premium" className="p-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-64 h-64 bg-brand-blue/5 rounded-full blur-3xl -z-10" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg shadow-brand-blue/20">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Évaluations enregistrées</CardTitle>
                  <p className="text-sm text-gray-500 font-medium">Historique des notes et appréciations</p>
                </div>
              </div>
              <Button
                onClick={() => onShowEvaluationForm('evaluation_generale', 'Évaluation générale')}
                className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-lg shadow-brand-blue/20 transition-all"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle évaluation
              </Button>
            </div>

            <div className="space-y-3">
              {grades.map((grade, index) => {
                const student = grade.students
                return (
                  <motion.div 
                    key={grade.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-brand-blue/30 hover:shadow-md transition-all duration-300"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {SATISFACTION_TYPES_DB.includes(grade.assessment_type || '') ? (
                        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center gap-0.5 text-amber-600 group-hover:bg-amber-100 transition-colors duration-300">
                          <span className="font-bold text-lg">{grade.rating ?? '—'}</span>
                          <Star className="h-4 w-4 fill-amber-500 shrink-0" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-brand-blue/5 flex items-center justify-center text-brand-blue font-bold text-lg group-hover:bg-brand-blue group-hover:text-white transition-colors duration-300">
                          {grade.score ?? '—'}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-lg">{grade.subject}</p>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">
                            {grade.assessment_type || 'Évaluation'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1 font-medium text-gray-700">
                            {student ? (
                              <>
                                <Users className="h-3 w-3" />
                                {student.first_name} {student.last_name}
                              </>
                            ) : (
                              <>
                                <Users className="h-3 w-3" />
                                Évaluation collective
                              </>
                            )}
                          </span>
                          {grade.graded_at && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(grade.graded_at)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!gradeInstanceMap[grade.id] && evaluationTemplates.length > 0 && onAttachTemplate && attachTemplateMutation && (
                        <Select
                          onValueChange={(templateId) => {
                            if (templateId) onAttachTemplate(grade.id, templateId)
                          }}
                          {...(attachTemplateMutation.isPending ? { 'aria-disabled': true } : {})}
                        >
                          <SelectTrigger className="w-[200px] h-9 text-sm border-dashed border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-50">
                            <Link2 className="h-4 w-4 mr-1.5 text-amber-600" />
                            <SelectValue placeholder="Associer un modèle (quiz apprenant)" />
                          </SelectTrigger>
                          <SelectContent>
                            {evaluationTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                                {template.subject && (
                                  <span className="text-xs text-gray-500 ml-1">({template.subject})</span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {gradeInstanceMap[grade.id] && (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3 mr-1" />
                          Quiz apprenant
                        </Badge>
                      )}
                      <div className="flex flex-col items-end">
                        {SATISFACTION_TYPES_DB.includes(grade.assessment_type || '') ? (
                          <>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">Satisfaction</span>
                            <span className="font-bold text-amber-600 flex items-center gap-0.5">
                              {grade.rating ?? '—'}
                              <Star className="h-4 w-4 fill-amber-500" />
                              <span className="text-gray-400 text-sm font-normal">/5</span>
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">Note</span>
                            <span className="font-bold text-gray-900">
                              <span className="text-xl">{grade.score ?? '—'}</span>
                              <span className="text-gray-400 text-sm">/{grade.max_score ?? 20}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Types d'évaluations disponibles */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl -z-10" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg shadow-purple-500/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Types d'évaluations disponibles</CardTitle>
              <p className="text-sm text-gray-500 font-medium">Sélectionnez un modèle pour commencer</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evaluationTypes.map((type) => (
              <motion.div
                key={type.id}
                className="group relative bg-white border border-gray-100 rounded-xl p-5 hover:border-brand-blue/30 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                whileHover={{ y: -4 }}
                onClick={() => onShowEvaluationForm(type.id, type.subject)}
              >
                <div className="flex items-start gap-4 relative z-10">
                  <div className={`w-12 h-12 ${type.bg} ${type.hoverBg} rounded-xl flex items-center justify-center transition-colors flex-shrink-0`}>
                    <type.icon className={`h-6 w-6 ${type.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-lg group-hover:text-brand-blue transition-colors">{type.title}</h4>
                    <p className="text-sm text-gray-500 font-medium mt-1 leading-relaxed">{type.description}</p>
                    <div className="mt-4 flex items-center text-sm font-bold text-brand-blue opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 duration-300">
                      <Plus className="h-4 w-4 mr-1" /> Créer
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}
