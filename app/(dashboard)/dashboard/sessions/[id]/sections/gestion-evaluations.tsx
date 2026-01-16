'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, X, ClipboardList } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { 
  EnrollmentWithRelations, 
  GradeWithRelations,
  StudentWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Enrollment = TableRow<'enrollments'>

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
    subject: string
    assessment_type: string
    student_id: string | undefined
    score: string
    max_score: string
    percentage: string
    notes: string
    graded_at: string
  }
  onEvaluationFormChange: (form: GestionEvaluationsProps['evaluationForm']) => void
  onCreateEvaluation: () => void
  createEvaluationMutation: {
    isPending: boolean
    error: Error | null
  }
  onCloseEvaluationForm: () => void
  onShowEvaluationForm: (type?: string, subject?: string) => void
}

const evaluationTypes = [
  {
    id: 'preformation',
    title: 'Évaluation préformation pour les apprenants',
    description: 'Sondez les attentes et diagnostiquez le besoin avant la session.',
    subject: 'Évaluation préformation',
  },
  {
    id: 'a_chaud',
    title: 'Évaluation à chaud pour les apprenants',
    description: 'Envoyez une évaluation dématérialisée à l\'apprenant pour qu\'il note à chaud la formation.',
    subject: 'Évaluation à chaud',
  },
  {
    id: 'a_froid',
    title: 'Évaluation à froid pour les apprenants',
    description: 'Mesurez l\'impact professionnel de la formation pour entrer dans une démarche qualité quantitative.',
    subject: 'Évaluation à froid',
  },
  {
    id: 'managers',
    title: 'Questionnaire pour les managers des apprenants',
    description: 'Impliquez les prescripteurs de la formation dans votre démarche qualité.',
    subject: 'Questionnaire managers',
  },
  {
    id: 'intervenants',
    title: 'Questionnaire pour les intervenants',
    description: 'Demandez aux intervenants d\'évaluer la session.',
    subject: 'Questionnaire intervenants',
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
}: GestionEvaluationsProps) {
  return (
    <div className="space-y-6">
      {/* Formulaire de création d'évaluation */}
      {showEvaluationForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Créer une évaluation</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCloseEvaluationForm}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onCreateEvaluation()
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Sujet *</label>
                <input
                  type="text"
                  value={evaluationForm.subject}
                  onChange={(e) => onEvaluationFormChange({ ...evaluationForm, subject: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ex: Évaluation de fin de module"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Élève (optionnel)</label>
                <select
                  value={evaluationForm.student_id || ''}
                  onChange={(e) => onEvaluationFormChange({ ...evaluationForm, student_id: e.target.value || undefined })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Tous les apprenants (évaluation collective)</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} ({student.student_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Note (optionnel)</label>
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
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Laisser vide si la note sera calculée plus tard"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    La note peut être ajoutée plus tard après correction
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Note maximale (optionnel)</label>
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
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="20"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Par défaut : 20 points
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Pourcentage (optionnel)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={evaluationForm.percentage}
                  onChange={(e) => onEvaluationFormChange({ ...evaluationForm, percentage: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Calculé automatiquement si vide"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Si vide, le pourcentage sera calculé automatiquement (note / note max × 100)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date de correction</label>
                <input
                  type="date"
                  value={evaluationForm.graded_at}
                  onChange={(e) => onEvaluationFormChange({ ...evaluationForm, graded_at: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notes/Commentaires (optionnel)</label>
                <textarea
                  value={evaluationForm.notes}
                  onChange={(e) => onEvaluationFormChange({ ...evaluationForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={4}
                  placeholder="Ajoutez des commentaires, observations ou remarques sur cette évaluation..."
                />
              </div>

              {createEvaluationMutation.error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
                  {createEvaluationMutation.error instanceof Error
                    ? createEvaluationMutation.error.message
                    : 'Une erreur est survenue'}
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCloseEvaluationForm}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={createEvaluationMutation.isPending}>
                  {createEvaluationMutation.isPending ? 'Création...' : 'Créer l\'évaluation'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Statistiques des évaluations */}
      {grades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistiques des évaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{grades.length}</p>
                <p className="text-sm text-muted-foreground mt-1">Évaluations totales</p>
              </div>
              <div className="text-center p-4 bg-brand-blue-ghost rounded-lg">
                <p className="text-2xl font-bold text-brand-blue">
                  {gradesStats?.average?.toFixed(2) || '0'}/{gradesStats?.averagePercentage ? Math.round(gradesStats.average * (100 / gradesStats.averagePercentage)) : 20}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Note moyenne</p>
              </div>
              <div className="text-center p-4 bg-brand-cyan-ghost rounded-lg">
                <p className="text-2xl font-bold text-brand-cyan">
                  {gradesStats?.averagePercentage?.toFixed(1) || 0}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">Moyenne en %</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {grades.filter((g) => g.graded_at).length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Corrigées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des évaluations existantes */}
      {grades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Évaluations enregistrées</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShowEvaluationForm('evaluation_generale', 'Évaluation générale')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle évaluation
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {grades.map((grade) => {
                const student = grade.students
                return (
                  <div key={grade.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <ClipboardList className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{grade.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {student ? `${student.first_name} ${student.last_name}` : 'Évaluation collective'} • {grade.assessment_type || 'Évaluation'}
                            {grade.graded_at && ` • ${formatDate(grade.graded_at)}`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {grade.score}/{grade.max_score || 20}
                      </p>
                      {grade.percentage !== null && (
                        <p className="text-sm text-muted-foreground">
                          {grade.percentage}%
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Types d'évaluations disponibles */}
      <Card>
        <CardHeader>
          <CardTitle>Types d'évaluations disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evaluationTypes.map((type) => (
              <Card key={type.id}>
                <CardHeader>
                  <CardTitle className="text-base">{type.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{type.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onShowEvaluationForm(type.id, type.subject)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer une {type.subject.toLowerCase()}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

