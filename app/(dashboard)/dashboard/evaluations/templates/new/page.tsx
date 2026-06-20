'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { evaluationTemplateService, type QuestionOption } from '@/lib/services/evaluation-template.service.client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react'
import Link from 'next/link'
import { motion, Reorder } from '@/components/ui/motion'

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'numeric' | 'rating'

/** Types d'évaluation satisfaction : uniquement étoiles + expression libre */
const SATISFACTION_ASSESSMENT_TYPES = ['pre_formation', 'hot', 'cold', 'manager', 'instructor', 'funder']

interface Question {
  id: string
  question_text: string
  question_type: QuestionType
  options?: QuestionOption[]
  correct_answer?: string
  correct_answer_pattern?: string
  points: number
  explanation?: string
  order_index: number
}

export default function NewEvaluationTemplatePage() {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assessment_type: '',
    subject: '',
    max_score: 20,
    passing_score: 70,
    time_limit_minutes: null as number | null,
    shuffle_questions: false,
    show_correct_answers: true,
  })

  const [questions, setQuestions] = useState<Question[]>([])

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')
      if (!formData.name) throw new Error('Le nom du modèle est requis')
      if (questions.length === 0) throw new Error('Au moins une question est requise')

      return evaluationTemplateService.createTemplate(
        user.organization_id,
        {
          name: formData.name,
          description: formData.description || null,
          assessment_type: formData.assessment_type || null,
          subject: formData.subject || null,
          max_score: formData.max_score,
          passing_score: formData.passing_score || null,
          time_limit_minutes: formData.time_limit_minutes || null,
          shuffle_questions: formData.shuffle_questions,
          show_correct_answers: formData.show_correct_answers,
        },
        questions.map((q) => ({
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options ? JSON.stringify(q.options) as any : null,
          correct_answer: q.correct_answer || null,
          correct_answer_pattern: q.correct_answer_pattern || null,
          points: q.points,
          explanation: q.explanation || null,
          order_index: q.order_index,
        }))
      )
    },
    onSuccess: (template: any) => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] })
      addToast({
        type: 'success',
        title: 'Modèle créé',
        description: 'Le modèle d\'évaluation a été créé avec succès.',
      })
      if (template?.id) {
        router.push(`/dashboard/evaluations/templates/${template.id}`)
      }
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création.',
      })
    },
  })

  const isSatisfactionTemplate = SATISFACTION_ASSESSMENT_TYPES.includes(formData.assessment_type)

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      question_text: '',
      question_type: isSatisfactionTemplate ? 'rating' : 'multiple_choice',
      options: isSatisfactionTemplate ? undefined : [
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
      points: 1,
      order_index: questions.length + 1,
    }
    setQuestions([...questions, newQuestion])
  }

  const addExpressionLibreQuestion = () => {
    const newQuestion: Question = {
      id: `temp-${Date.now()}`,
      question_text: 'Dites-nous en quelques mots ce que vous avez pensé de la formation.',
      question_type: 'essay',
      points: 0,
      order_index: questions.length + 1,
    }
    setQuestions([...questions, newQuestion])
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id).map((q, index) => ({ ...q, order_index: index + 1 })))
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === id) {
          const updated = { ...q, ...updates }
          if (updates.question_type && updates.question_type !== q.question_type) {
            if (updates.question_type === 'multiple_choice') {
              updated.options = [
                { text: '', is_correct: false },
                { text: '', is_correct: false },
              ]
            } else {
              updated.options = undefined
            }
            updated.correct_answer = undefined
          }
          return updated
        }
        return q
      })
    )
  }

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options) {
          return {
            ...q,
            options: [...q.options, { text: '', is_correct: false }],
          }
        }
        return q
      })
    )
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options) {
          const newOptions = q.options.filter((_, i) => i !== optionIndex)
          return {
            ...q,
            options: newOptions.length > 0 ? newOptions : undefined,
          }
        }
        return q
      })
    )
  }

  const updateOption = (questionId: string, optionIndex: number, updates: Partial<QuestionOption>) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.options) {
          return {
            ...q,
            options: q.options.map((opt, i) => (i === optionIndex ? { ...opt, ...updates } : opt)),
          }
        }
        return q
      })
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/evaluations/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nouveau modèle d'évaluation</h1>
          <p className="text-muted-foreground mt-1">
            Créez un modèle avec questions et réponses pour correction automatique
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
        className="space-y-6"
      >
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du modèle *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Évaluation de fin de module"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du modèle d'évaluation"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">Sujet/Matière</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Mathématiques"
                />
              </div>

              <div>
                <Label htmlFor="assessment_type">Type d'évaluation</Label>
                <select
                  id="assessment_type"
                  value={formData.assessment_type}
                  onChange={(e) => setFormData({ ...formData, assessment_type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="">Sélectionner...</option>
                  <option value="pre_formation">Pré-formation</option>
                  <option value="hot">À chaud</option>
                  <option value="cold">À froid</option>
                  <option value="quiz">Quiz</option>
                  <option value="exam">Examen</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="max_score">Note maximale</Label>
                <Input
                  id="max_score"
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.max_score}
                  onChange={(e) => setFormData({ ...formData, max_score: parseFloat(e.target.value) || 20 })}
                />
              </div>

              <div>
                <Label htmlFor="passing_score">Score de réussite (%)</Label>
                <Input
                  id="passing_score"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: parseFloat(e.target.value) || 70 })}
                />
              </div>

              <div>
                <Label htmlFor="time_limit">Durée (minutes)</Label>
                <Input
                  id="time_limit"
                  type="number"
                  min="1"
                  value={formData.time_limit_minutes || ''}
                  onChange={(e) => setFormData({ ...formData, time_limit_minutes: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Illimité"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.shuffle_questions}
                  onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })}
                />
                <span>Mélanger les questions</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.show_correct_answers}
                  onChange={(e) => setFormData({ ...formData, show_correct_answers: e.target.checked })}
                />
                <span>Afficher les bonnes réponses après correction</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Questions</CardTitle>
              <div className="flex gap-2">
                {isSatisfactionTemplate && (
                  <Button type="button" onClick={addExpressionLibreQuestion} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Question expression libre
                  </Button>
                )}
                <Button type="button" onClick={addQuestion} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  {isSatisfactionTemplate ? 'Ajouter une question (étoiles)' : 'Ajouter une question'}
                </Button>
              </div>
            </div>
            {isSatisfactionTemplate && (
              <p className="text-sm text-muted-foreground mt-1">
                Évaluations satisfaction : uniquement notation par étoiles (0–5) et une dernière question en expression libre (ex. Dites-nous en quelques mots ce que vous avez pensé de la formation).
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {isSatisfactionTemplate
                  ? 'Aucune question. Cliquez sur "Ajouter une question (étoiles)" ou "Question expression libre" pour commencer.'
                  : 'Aucune question. Cliquez sur "Ajouter une question" pour commencer.'}
              </div>
            ) : (
              questions.map((question, index) => (
                <Card key={question.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">Question {index + 1}</CardTitle>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Texte de la question *</Label>
                      <Textarea
                        value={question.question_text}
                        onChange={(e) => updateQuestion(question.id, { question_text: e.target.value })}
                        placeholder="Entrez la question..."
                        rows={2}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type de question *</Label>
                        <select
                          value={question.question_type}
                          onChange={(e) => updateQuestion(question.id, { question_type: e.target.value as QuestionType })}
                          className="w-full px-4 py-2 border rounded-lg"
                        >
                          {isSatisfactionTemplate ? (
                            <>
                              <option value="rating">Étoiles 0–5 (satisfaction)</option>
                              <option value="essay">Expression libre</option>
                            </>
                          ) : (
                            <>
                              <option value="multiple_choice">Choix multiples</option>
                              <option value="true_false">Vrai/Faux</option>
                              <option value="short_answer">Réponse courte</option>
                              <option value="numeric">Numérique</option>
                              <option value="rating">Étoiles 0-5 (satisfaction)</option>
                              <option value="essay">Expression libre</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <Label>Points *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={question.points}
                          onChange={(e) => updateQuestion(question.id, { points: parseFloat(e.target.value) || 1 })}
                          required
                        />
                      </div>
                    </div>

                    {/* Options pour choix multiples (masqué pour modèles satisfaction) */}
                    {!isSatisfactionTemplate && question.question_type === 'multiple_choice' && question.options && (
                      <div className="space-y-2">
                        <Label>Options de réponse *</Label>
                        <p className="text-xs text-muted-foreground">
                          Pour les évaluations satisfaction : renseignez « Valeur étoiles » (0–5) pour chaque option (ex. Excellent=5, Moyen=1, Insuffisant=0). La moyenne sera calculée automatiquement.
                        </p>
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex flex-wrap items-center gap-2">
                            <input
                              type="checkbox"
                              checked={option.is_correct ?? false}
                              onChange={(e) => updateOption(question.id, optIndex, { is_correct: e.target.checked })}
                              title="Bonne réponse (quiz noté)"
                            />
                            <Input
                              value={option.text}
                              onChange={(e) => updateOption(question.id, optIndex, { text: e.target.value })}
                              placeholder={`Option ${optIndex + 1}`}
                              className="flex-1 min-w-[120px]"
                            />
                            <div className="flex items-center gap-1">
                              <Label htmlFor={`star-${question.id}-${optIndex}`} className="text-xs whitespace-nowrap">Étoiles</Label>
                              <Input
                                id={`star-${question.id}-${optIndex}`}
                                type="number"
                                min={0}
                                max={5}
                                step={1}
                                value={option.star_value ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                                  updateOption(question.id, optIndex, { star_value: v === undefined || Number.isNaN(v) ? undefined : Math.min(5, Math.max(0, v)) })
                                }}
                                placeholder="0–5"
                                className="w-16"
                                title="Valeur étoiles pour satisfaction (0–5)"
                              />
                            </div>
                            {question.options && question.options.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeOption(question.id, optIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(question.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter une option
                        </Button>
                      </div>
                    )}

                    {/* Réponse pour Vrai/Faux (masqué pour satisfaction) */}
                    {!isSatisfactionTemplate && question.question_type === 'true_false' && (
                      <div>
                        <Label>Bonne réponse *</Label>
                        <select
                          value={question.correct_answer || ''}
                          onChange={(e) => updateQuestion(question.id, { correct_answer: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg"
                        >
                          <option value="">Sélectionner...</option>
                          <option value="true">Vrai</option>
                          <option value="false">Faux</option>
                        </select>
                      </div>
                    )}

                    {/* Réponse pour réponse courte (masqué pour satisfaction) */}
                    {!isSatisfactionTemplate && question.question_type === 'short_answer' && (
                      <div className="space-y-2">
                        <div>
                          <Label>Bonne réponse *</Label>
                          <Input
                            value={question.correct_answer || ''}
                            onChange={(e) => updateQuestion(question.id, { correct_answer: e.target.value })}
                            placeholder="Réponse attendue"
                          />
                        </div>
                        <div>
                          <Label>Pattern regex (optionnel)</Label>
                          <Input
                            value={question.correct_answer_pattern || ''}
                            onChange={(e) => updateQuestion(question.id, { correct_answer_pattern: e.target.value })}
                            placeholder="Ex: ^(oui|yes)$ pour accepter 'oui' ou 'yes'"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Permet une validation flexible (insensible à la casse par défaut)
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Réponse pour numérique (masqué pour satisfaction) */}
                    {!isSatisfactionTemplate && question.question_type === 'numeric' && (
                      <div>
                        <Label>Bonne réponse (nombre) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={question.correct_answer || ''}
                          onChange={(e) => updateQuestion(question.id, { correct_answer: e.target.value })}
                          placeholder="Ex: 42"
                        />
                      </div>
                    )}

                    {/* Étoiles 0-5 (satisfaction) */}
                    {question.question_type === 'rating' && (
                      <p className="text-sm text-muted-foreground">
                        L&apos;apprenant verra des étoiles de 0 à 5. Aucune bonne réponse à définir.
                      </p>
                    )}

                    {/* Note pour dissertation */}
                    {question.question_type === 'essay' && (
                      <p className="text-sm text-gray-500">
                        {isSatisfactionTemplate
                          ? "L'apprenant pourra saisir un texte libre (ex. Dites-nous en quelques mots ce que vous avez pensé de la formation)."
                          : 'Les questions de type "Expression libre" nécessitent une correction manuelle. La note sera attribuée par l\'enseignant après correction.'}
                      </p>
                    )}

                    {/* Explication */}
                    <div>
                      <Label>Explication (optionnel)</Label>
                      <Textarea
                        value={question.explanation || ''}
                        onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                        placeholder="Explication de la réponse correcte (affichée après correction)"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/dashboard/evaluations/templates">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending || questions.length === 0}>
            {createMutation.isPending ? 'Création...' : 'Créer le modèle'}
          </Button>
        </div>
      </form>
    </div>
  )
}


