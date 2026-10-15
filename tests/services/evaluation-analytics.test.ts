import { describe, it, expect } from 'vitest'
import {
  buildEvaluationAnalytics,
  labelToStars,
  parseOptions,
  type EvaluationAnalyticsInput,
  type AnalyticsResponseRow,
  type ChoiceQuestionStats,
  type RatingQuestionStats,
  type TextQuestionStats,
  type BooleanQuestionStats,
} from '@/lib/services/evaluation-analytics'

const students = [
  { id: 's1', first_name: 'Loris', last_name: 'Allache' },
  { id: 's2', first_name: 'Youssouf', last_name: 'Drame' },
  { id: 's3', first_name: 'Kelly', last_name: 'Voumina' },
]

function resp(instance: string, student: string, question: string, fields: Partial<AnalyticsResponseRow>): AnalyticsResponseRow {
  return {
    instance_id: instance,
    question_id: question,
    student_id: student,
    answer_text: null,
    answer_choice: null,
    answer_boolean: null,
    answer_rating: null,
    ...fields,
  }
}

function baseInput(): EvaluationAnalyticsInput {
  return {
    grades: [
      { id: 'g1', student_id: 's1', assessment_type: 'hot' },
      { id: 'g2', student_id: 's2', assessment_type: 'hot' },
      { id: 'g3', student_id: 's3', assessment_type: 'hot' }, // pas encore répondu
      { id: 'g4', student_id: 's1', assessment_type: 'pre_formation' },
    ],
    instances: [
      { id: 'i1', grade_id: 'g1', template_id: 'hot-t' },
      { id: 'i2', grade_id: 'g2', template_id: 'hot-t' },
      { id: 'i3', grade_id: 'g3', template_id: 'hot-t' },
      { id: 'i4', grade_id: 'g4', template_id: 'pre-t' },
    ],
    templates: [
      { id: 'hot-t', name: 'À chaud' },
      { id: 'pre-t', name: 'Préformation' },
    ],
    questions: [
      { id: 'q-rating', template_id: 'hot-t', question_text: 'Satisfaction', question_type: 'rating', options: null, correct_answer: null, order_index: 2, section: 'Organisation' },
      {
        id: 'q-scale', template_id: 'hot-t', question_text: 'Durée adaptée ?', question_type: 'multiple_choice',
        options: [{ text: 'Totalement' }, { text: 'En partie' }, { text: 'Insuffisamment' }, { text: 'Pas du tout' }],
        correct_answer: null, order_index: 1, section: 'Organisation',
      },
      { id: 'q-text', template_id: 'hot-t', question_text: 'Commentaires', question_type: 'essay', options: null, correct_answer: null, order_index: 3, section: null },
      { id: 'q-bool', template_id: 'hot-t', question_text: 'Supports adaptés ?', question_type: 'true_false', options: null, correct_answer: null, order_index: 4, section: null },
      {
        id: 'q-quiz', template_id: 'pre-t', question_text: 'Alarme incendie ?', question_type: 'multiple_choice',
        // options stockées en chaîne JSON (ancien bug de sauvegarde)
        options: JSON.stringify([{ text: 'Prévenir les secours', is_correct: true }, { text: 'Éteindre le feu', is_correct: false }]),
        correct_answer: null, order_index: 1, section: null,
      },
    ],
    responses: [
      resp('i1', 's1', 'q-rating', { answer_rating: 5 }),
      resp('i2', 's2', 'q-rating', { answer_rating: 4 }),
      resp('i1', 's1', 'q-scale', { answer_choice: ['Totalement'] }),
      resp('i2', 's2', 'q-scale', { answer_choice: ['En partie'] }),
      resp('i1', 's1', 'q-text', { answer_text: 'Très bien' }),
      resp('i2', 's2', 'q-text', { answer_text: '   ' }), // vide → ignoré
      resp('i1', 's1', 'q-bool', { answer_boolean: true }),
      resp('i2', 's2', 'q-bool', { answer_choice: ['Non'] }),
      resp('i4', 's1', 'q-quiz', { answer_choice: ['Prévenir les secours'] }),
    ],
    students,
  }
}

describe('labelToStars / parseOptions', () => {
  it('mappe les libellés d\'échelle, sans accents ni casse', () => {
    expect(labelToStars('Totalement')).toBe(5)
    expect(labelToStars('en partie')).toBe(3)
    expect(labelToStars('Plutôt non')).toBe(1)
    expect(labelToStars('Pas du tout')).toBe(0)
    expect(labelToStars('Oui')).toBeUndefined()
  })

  it('parse les options objets, chaînes et JSON stringifié', () => {
    expect(parseOptions(['A', 'B']).map((o) => o.text)).toEqual(['A', 'B'])
    expect(parseOptions('[{"text":"A","star_value":4}]')[0]).toEqual({ text: 'A', isCorrect: false, starValue: 4 })
    expect(parseOptions('pas du json')).toEqual([])
  })
})

describe('buildEvaluationAnalytics', () => {
  const result = buildEvaluationAnalytics(baseInput())
  const hot = result.types.find((t) => t.assessmentType === 'hot')!
  const hotQuestions = hot.templates[0].sections.flatMap((s) => s.questions)
  const byId = (id: string) => hotQuestions.find((q) => q.questionId === id)!

  it('ordonne les types préformation → à chaud et compte les réponses', () => {
    expect(result.types.map((t) => t.assessmentType)).toEqual(['pre_formation', 'hot'])
    expect(hot.assigned).toBe(3)
    expect(hot.respondents).toBe(2)
  })

  it('note étoiles : moyenne, votants, distribution 5→1', () => {
    const q = byId('q-rating') as RatingQuestionStats
    expect(q.average).toBe(4.5)
    expect(q.score10).toBe(9)
    expect(q.respondents).toBe(2)
    expect(q.distribution.map((d) => d.label)).toEqual(['5', '4', '3', '2', '1'])
    expect(q.distribution[0]).toMatchObject({ count: 1, percent: 50 })
  })

  it('échelle Totalement / En partie notée via le libellé', () => {
    const q = byId('q-scale') as ChoiceQuestionStats
    expect(q.isScale).toBe(true)
    expect(q.score10).toBe(8) // (5 + 3) / 2 × 2
  })

  it('regroupe par rubrique dans l\'ordre des questions et calcule la note de rubrique', () => {
    const sections = hot.templates[0].sections
    expect(sections.map((s) => s.name)).toEqual(['Organisation', null])
    expect(sections[0].questions.map((q) => q.questionId)).toEqual(['q-scale', 'q-rating'])
    expect(sections[0].score10).toBe(8.5)
  })

  it('texte libre : nom de l\'apprenant, réponses vides ignorées, non noté', () => {
    const q = byId('q-text') as TextQuestionStats
    expect(q.score10).toBeNull()
    expect(q.answers).toEqual([{ studentId: 's1', studentName: 'ALLACHE Loris', answer: 'Très bien' }])
  })

  it('Oui/Non depuis answer_boolean ou answer_choice', () => {
    const q = byId('q-bool') as BooleanQuestionStats
    expect(q.distribution).toEqual([
      { label: 'Oui', count: 1, percent: 50 },
      { label: 'Non', count: 1, percent: 50 },
    ])
  })

  it('quiz de positionnement : bonne réponse marquée, pas de note', () => {
    const pre = result.types.find((t) => t.assessmentType === 'pre_formation')!
    const q = pre.templates[0].sections[0].questions[0] as ChoiceQuestionStats
    expect(q.isQuiz).toBe(true)
    expect(q.score10).toBeNull()
    expect(q.correctPercent).toBe(100)
    expect(q.distribution.find((d) => d.label === 'Prévenir les secours')?.isCorrect).toBe(true)
    expect(pre.score10).toBeNull()
  })

  it('note globale = moyenne des types notés uniquement', () => {
    expect(hot.score10).toBe(8.5)
    expect(result.overallScore10).toBe(8.5)
  })

  it('aucune donnée → note nulle', () => {
    const empty = buildEvaluationAnalytics({ grades: [], instances: [], templates: [], questions: [], responses: [], students: [] })
    expect(empty.overallScore10).toBeNull()
    expect(empty.types).toEqual([])
  })
})
