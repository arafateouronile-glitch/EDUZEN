'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { evaluationTemplateService, type QuestionOption } from '@/lib/services/evaluation-template.service.client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import Link from 'next/link'

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

export default function EditEvaluationTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  // Récupérer le modèle
  const { data: template, isLoading } = useQuery<{
    id: string;
    name: string;
    description?: string;
    assessment_type?: string;
    subject?: string;
    max_score?: number;
    passing_score?: number;
    time_limit_minutes?: number | null;
    shuffle_questions?: boolean;
    show_correct_answers?: boolean;
    [key: string]: any;
  } | null>({
    queryKey: ['evaluation-template', templateId],
    queryFn: async () => {
      const result = await evaluationTemplateService.getTemplateById(templateId)
      return result as any
    },
    enabled: !!templateId,
  })

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

  // Initialiser le formulaire avec les données du modèle
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        assessment_type: template.assessment_type || '',
        subject: template.subject || '',
        max_score: template.max_score || 20,
        passing_score: template.passing_score || 70,
        time_limit_minutes: template.time_limit_minutes ?? null,
        shuffle_questions: template.shuffle_questions || false,
        show_correct_answers: template.show_correct_answers !== false,
      })

      // Convertir les questions du modèle en format Question
      const templateQuestions = (template.questions || []) as Array<{
        id: string;
        question_text: string;
        question_type: string;
        options?: any;
        correct_answer?: string;
        correct_answer_pattern?: string;
        points?: number;
        explanation?: string;
        [key: string]: any;
      }>;
      const formattedQuestions: Question[] = templateQuestions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type as QuestionType,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
        correct_answer: q.correct_answer || undefined,
        correct_answer_pattern: q.correct_answer_pattern || undefined,
        points: q.points || 1,
        explanation: q.explanation || undefined,
        order_index: q.order_index || 0,
      }))
      setQuestions(formattedQuestions)
    }
  }, [template])

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name) throw new Error('Le nom du modèle est requis')
      if (questions.length === 0) throw new Error('Au moins une question est requise')

      return evaluationTemplateService.updateTemplate(
        templateId,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-template', templateId] })
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] })
      addToast({
        type: 'success',
        title: 'Modèle mis à jour',
        description: 'Le modèle d\'évaluation a été mis à jour avec succès.',
      })
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la mise à jour.',
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

  if (isLoading) {
    return <div className="space-y-6">Chargement...</div>
  }

  if (!template) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Modèle non trouvé</h2>
          <p className="text-muted-foreground mb-4">Le modèle demandé n'existe pas ou a été supprimé.</p>
          <Link href="/dashboard/evaluations/templates">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux modèles
            </Button>
          </Link>
        </div>
      </div>
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
          <h1 className="text-3xl font-bold">Modifier le modèle</h1>
          <p className="text-muted-foreground mt-1">
            Modifiez le modèle d'évaluation et ses questions
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          updateMutation.mutate()
        }}
        className="space-y-6"
      >
        {/* Informations générales - même structure que new/page.tsx */}
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
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

        {/* Questions - même structure que new/page.tsx */}
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
                      <CardTitle className="text-base">Question {index + 1}</CardTitle>
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
                          />
                        </div>
                        <div>
                          <Label>Pattern regex (optionnel)</Label>
                          <Input
                            value={question.correct_answer_pattern || ''}
                            onChange={(e) => updateQuestion(question.id, { correct_answer_pattern: e.target.value })}
                          />
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
                        />
                      </div>
                    )}

                    {/* Étoiles 0-5 (satisfaction) : pas de bonne réponse, l'apprenant choisit 0 à 5 */}
                    {question.question_type === 'rating' && (
                      <p className="text-sm text-gray-500">
                        L&apos;apprenant verra des étoiles de 0 à 5. Aucune bonne réponse à définir.
                      </p>
                    )}

                    {/* Expression libre : texte libre, pas de correction auto */}
                    {question.question_type === 'essay' && (
                      <p className="text-sm text-gray-500">
                        L&apos;apprenant pourra saisir un texte libre (ex. Dites-nous en quelques mots ce que vous avez pensé de la formation).
                      </p>
                    )}

                    {/* Explication */}
                    <div>
                      <Label>Explication (optionnel)</Label>
                      <Textarea
                        value={question.explanation || ''}
                        onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
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
          <Button type="submit" disabled={updateMutation.isPending || questions.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  )
}


