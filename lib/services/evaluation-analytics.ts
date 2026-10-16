/**
 * Agrégation des réponses aux évaluations pour le tableau analytique
 * « Suivi qualité » (note globale /10, note par type d'évaluation, par
 * rubrique et par question, distribution des réponses).
 *
 * Logique pure — aucun accès Supabase ici, le chargement des lignes est fait
 * par /api/sessions/[id]/evaluation-analytics.
 */

export const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  pre_formation: 'Évaluation préformation',
  hot: 'Évaluation à chaud',
  cold: 'Évaluation à froid',
  manager: 'Questionnaire managers',
  instructor: 'Questionnaire intervenants',
  funder: 'Questionnaire financeurs',
  quiz: 'Quiz',
  exam: 'Examen',
  project: 'Projet',
  other: 'Autre',
}

const ASSESSMENT_TYPE_ORDER = ['pre_formation', 'hot', 'cold', 'manager', 'instructor', 'funder', 'quiz', 'exam', 'project', 'other']

// ── Lignes d'entrée ──────────────────────────────────────────────────────────

export interface AnalyticsGradeRow {
  id: string
  student_id: string | null
  assessment_type: string | null
  session_id?: string | null
}

export interface AnalyticsInstanceRow {
  id: string
  grade_id: string
  template_id: string
}

export interface AnalyticsTemplateRow {
  id: string
  name: string
}

export interface AnalyticsQuestionRow {
  id: string
  template_id: string
  question_text: string
  question_type: string
  options: unknown
  correct_answer: string | null
  order_index: number | null
  section: string | null
}

export interface AnalyticsResponseRow {
  instance_id: string
  question_id: string
  student_id: string
  answer_text: string | null
  answer_choice: string[] | null
  answer_boolean: boolean | null
  answer_rating: number | null
}

export interface AnalyticsStudentRow {
  id: string
  first_name: string | null
  last_name: string | null
}

export interface EvaluationAnalyticsInput {
  grades: AnalyticsGradeRow[]
  instances: AnalyticsInstanceRow[]
  templates: AnalyticsTemplateRow[]
  questions: AnalyticsQuestionRow[]
  responses: AnalyticsResponseRow[]
  students: AnalyticsStudentRow[]
}

// ── Sortie ───────────────────────────────────────────────────────────────────

export interface DistributionEntry {
  label: string
  count: number
  /** 0-100, arrondi */
  percent: number
  /** Bonne réponse (quiz de positionnement) */
  isCorrect?: boolean
  /** Valeur étoiles 0-5 de l'option (échelle de satisfaction) */
  starValue?: number
}

interface QuestionStatsBase {
  questionId: string
  text: string
  /** Nombre d'apprenants ayant répondu à cette question */
  respondents: number
  /** Note /10, null si la question n'est pas notée (texte libre, quiz, Oui/Non) */
  score10: number | null
}

export interface RatingQuestionStats extends QuestionStatsBase {
  kind: 'rating'
  /** Moyenne /5 */
  average: number | null
  distribution: DistributionEntry[]
}

export interface ChoiceQuestionStats extends QuestionStatsBase {
  kind: 'choice'
  /** Options valorisées en étoiles (Totalement… Pas du tout) → note /10 */
  isScale: boolean
  /** Options avec bonne(s) réponse(s) → % de bonnes réponses */
  isQuiz: boolean
  correctPercent: number | null
  distribution: DistributionEntry[]
}

export interface BooleanQuestionStats extends QuestionStatsBase {
  kind: 'boolean'
  distribution: DistributionEntry[]
}

export interface TextQuestionStats extends QuestionStatsBase {
  kind: 'text'
  answers: { studentId: string; studentName: string; answer: string }[]
}

export type QuestionStats = RatingQuestionStats | ChoiceQuestionStats | BooleanQuestionStats | TextQuestionStats

export interface SectionStats {
  /** null = questions sans rubrique */
  name: string | null
  score10: number | null
  questions: QuestionStats[]
}

export interface TemplateStats {
  templateId: string
  name: string
  respondents: number
  score10: number | null
  sections: SectionStats[]
}

export interface AssessmentTypeStats {
  assessmentType: string
  label: string
  /** Évaluations attribuées (grades) */
  assigned: number
  /** Évaluations avec au moins une réponse */
  respondents: number
  /** respondents / assigned, 0-100 */
  responseRate: number
  score10: number | null
  templates: TemplateStats[]
}

export interface EvaluationAnalytics {
  overallScore10: number | null
  totalAssigned: number
  totalRespondents: number
  types: AssessmentTypeStats[]
}

// ── Valeurs des échelles ─────────────────────────────────────────────────────

/**
 * Libellé d'option → étoiles 0-5, utilisé quand l'option n'a pas de star_value.
 * Plus complet que le mapping SQL de auto_correct_evaluation_responses (qui
 * ignore Totalement / En partie / Insuffisamment). Oui/Non volontairement
 * absents : un QCM Oui/Non est souvent neutre (« d'autres prestataires
 * consultés ? ») et ne doit pas être noté sans star_value explicite.
 */
const LABEL_STAR_VALUES: Record<string, number> = {
  'excellent': 5,
  'totalement': 5,
  'tout a fait': 5,
  'tres satisfait': 5,
  'tres bon': 4,
  'plutot oui': 4,
  'satisfait': 4,
  'bon': 3,
  'en partie': 3,
  'partiellement': 3,
  'moyennement': 3,
  'moyen': 1,
  'plutot non': 1,
  'insuffisamment': 1,
  'peu satisfait': 1,
  'insuffisant': 0,
  'pas du tout': 0,
  'pas satisfait': 0,
}

function normalizeLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.!?]+$/g, '')
    .trim()
}

export function labelToStars(label: string): number | undefined {
  return LABEL_STAR_VALUES[normalizeLabel(label)]
}

interface ParsedOption {
  text: string
  isCorrect: boolean
  starValue?: number
}

export function parseOptions(raw: unknown): ParsedOption[] {
  let value = raw
  // Certains modèles ont été enregistrés avec un JSON.stringify en trop.
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  return value
    .map((o): ParsedOption | null => {
      if (o && typeof o === 'object') {
        const obj = o as { text?: unknown; is_correct?: unknown; star_value?: unknown }
        const text = String(obj.text ?? '').trim()
        if (!text) return null
        const star = typeof obj.star_value === 'number' ? obj.star_value : undefined
        return { text, isCorrect: obj.is_correct === true, starValue: star }
      }
      const text = String(o ?? '').trim()
      return text ? { text, isCorrect: false } : null
    })
    .filter((o): o is ParsedOption => o !== null)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function percent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

function mean(values: number[]): number | null {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null
}

function toBoolean(r: AnalyticsResponseRow): boolean | null {
  if (typeof r.answer_boolean === 'boolean') return r.answer_boolean
  const raw = r.answer_choice?.[0] ?? r.answer_text
  if (raw == null || raw === '') return null
  const v = normalizeLabel(String(raw))
  if (['oui', 'vrai', 'true', '1'].includes(v)) return true
  if (['non', 'faux', 'false', '0'].includes(v)) return false
  return null
}

function studentName(s: AnalyticsStudentRow | undefined): string {
  if (!s) return 'Apprenant'
  const name = [s.last_name?.toUpperCase(), s.first_name].filter(Boolean).join(' ')
  return name || 'Apprenant'
}

// ── Statistiques par question ────────────────────────────────────────────────

function buildQuestionStats(
  question: AnalyticsQuestionRow,
  responses: AnalyticsResponseRow[],
  students: Map<string, AnalyticsStudentRow>
): QuestionStats {
  const base = { questionId: question.id, text: question.question_text }

  switch (question.question_type) {
    case 'rating': {
      const values = responses
        .map((r) => r.answer_rating)
        .filter((v): v is number => typeof v === 'number' && v >= 0 && v <= 5)
      const avg = mean(values)
      const levels = values.some((v) => v === 0) ? [5, 4, 3, 2, 1, 0] : [5, 4, 3, 2, 1]
      return {
        ...base,
        kind: 'rating',
        respondents: values.length,
        average: avg === null ? null : round1(avg),
        score10: avg === null ? null : round1(avg * 2),
        distribution: levels.map((level) => {
          const count = values.filter((v) => v === level).length
          return { label: String(level), count, percent: percent(count, values.length), starValue: level }
        }),
      }
    }

    case 'multiple_choice': {
      const options = parseOptions(question.options)
      const answered = responses.filter((r) => (r.answer_choice ?? []).some((c) => c && c.trim()))
      const isQuiz = options.some((o) => o.isCorrect)
      const starValues = options.map((o) => o.starValue ?? labelToStars(o.text))
      const isScale = !isQuiz && options.length > 0 && starValues.every((v) => v !== undefined)

      // Options connues + réponses hors liste (option supprimée depuis)
      const labels = options.map((o) => o.text)
      for (const r of answered) {
        for (const c of r.answer_choice ?? []) {
          if (c && !labels.includes(c)) labels.push(c)
        }
      }

      const distribution: DistributionEntry[] = labels.map((label) => {
        const count = answered.filter((r) => (r.answer_choice ?? []).includes(label)).length
        const idx = options.findIndex((o) => o.text === label)
        return {
          label,
          count,
          percent: percent(count, answered.length),
          ...(idx >= 0 && options[idx].isCorrect ? { isCorrect: true } : {}),
          ...(isScale && idx >= 0 ? { starValue: starValues[idx] } : {}),
        }
      })

      let score10: number | null = null
      if (isScale) {
        const perAnswer = answered
          .map((r) => {
            const idx = options.findIndex((o) => o.text === r.answer_choice?.[0])
            return idx >= 0 ? starValues[idx] : undefined
          })
          .filter((v): v is number => v !== undefined)
        const avg = mean(perAnswer)
        score10 = avg === null ? null : round1(avg * 2)
      }

      let correctPercent: number | null = null
      if (isQuiz && answered.length > 0) {
        const correct = new Set(options.filter((o) => o.isCorrect).map((o) => o.text))
        const ok = answered.filter((r) => {
          const chosen = new Set(r.answer_choice ?? [])
          return chosen.size === correct.size && [...chosen].every((c) => correct.has(c))
        }).length
        correctPercent = percent(ok, answered.length)
      }

      return { ...base, kind: 'choice', respondents: answered.length, score10, isScale, isQuiz, correctPercent, distribution }
    }

    case 'true_false': {
      const values = responses.map(toBoolean).filter((v): v is boolean => v !== null)
      const yes = values.filter(Boolean).length
      const no = values.length - yes
      return {
        ...base,
        kind: 'boolean',
        respondents: values.length,
        score10: null,
        distribution: [
          { label: 'Oui', count: yes, percent: percent(yes, values.length) },
          { label: 'Non', count: no, percent: percent(no, values.length) },
        ],
      }
    }

    default: {
      const answers = responses
        .map((r) => ({ r, answer: (r.answer_text ?? r.answer_choice?.join(', ') ?? '').trim() }))
        .filter(({ answer }) => answer.length > 0)
        .map(({ r, answer }) => ({ studentId: r.student_id, studentName: studentName(students.get(r.student_id)), answer }))
        .sort((a, b) => a.studentName.localeCompare(b.studentName, 'fr'))
      return { ...base, kind: 'text', respondents: answers.length, score10: null, answers }
    }
  }
}

function scoredMean(questions: QuestionStats[]): number | null {
  const avg = mean(questions.map((q) => q.score10).filter((v): v is number => v !== null))
  return avg === null ? null : round1(avg)
}

// ── Agrégation principale ────────────────────────────────────────────────────

export function buildEvaluationAnalytics(input: EvaluationAnalyticsInput): EvaluationAnalytics {
  const students = new Map(input.students.map((s) => [s.id, s]))
  const templates = new Map(input.templates.map((t) => [t.id, t]))
  const instanceByGrade = new Map(input.instances.map((i) => [i.grade_id, i]))

  const responsesByInstance = new Map<string, AnalyticsResponseRow[]>()
  for (const r of input.responses) {
    const list = responsesByInstance.get(r.instance_id) ?? []
    list.push(r)
    responsesByInstance.set(r.instance_id, list)
  }

  const questionsByTemplate = new Map<string, AnalyticsQuestionRow[]>()
  for (const q of input.questions) {
    const list = questionsByTemplate.get(q.template_id) ?? []
    list.push(q)
    questionsByTemplate.set(q.template_id, list)
  }
  for (const list of questionsByTemplate.values()) {
    list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  }

  // type → template → instances
  const gradesByType = new Map<string, AnalyticsGradeRow[]>()
  for (const g of input.grades) {
    const type = g.assessment_type || 'other'
    const list = gradesByType.get(type) ?? []
    list.push(g)
    gradesByType.set(type, list)
  }

  const types: AssessmentTypeStats[] = []
  for (const [type, grades] of gradesByType) {
    const instancesByTemplate = new Map<string, AnalyticsInstanceRow[]>()
    let typeRespondents = 0
    for (const g of grades) {
      const inst = instanceByGrade.get(g.id)
      if (!inst) continue
      if ((responsesByInstance.get(inst.id)?.length ?? 0) > 0) typeRespondents++
      const list = instancesByTemplate.get(inst.template_id) ?? []
      list.push(inst)
      instancesByTemplate.set(inst.template_id, list)
    }

    const templateStats: TemplateStats[] = []
    for (const [templateId, instances] of instancesByTemplate) {
      const instanceIds = new Set(instances.map((i) => i.id))
      const templateResponses = input.responses.filter((r) => instanceIds.has(r.instance_id))
      const respondents = new Set(templateResponses.map((r) => r.instance_id)).size

      const sections: SectionStats[] = []
      for (const q of questionsByTemplate.get(templateId) ?? []) {
        const stats = buildQuestionStats(q, templateResponses.filter((r) => r.question_id === q.id), students)
        const name = q.section?.trim() || null
        // Les rubriques gardent l'ordre de leur première question
        let section = sections.find((s) => s.name === name)
        if (!section) {
          section = { name, score10: null, questions: [] }
          sections.push(section)
        }
        section.questions.push(stats)
      }
      for (const s of sections) s.score10 = scoredMean(s.questions)

      templateStats.push({
        templateId,
        name: templates.get(templateId)?.name ?? 'Questionnaire',
        respondents,
        score10: scoredMean(sections.flatMap((s) => s.questions)),
        sections,
      })
    }

    const typeScore = mean(
      templateStats.flatMap((t) => t.sections.flatMap((s) => s.questions)).map((q) => q.score10).filter((v): v is number => v !== null)
    )

    types.push({
      assessmentType: type,
      label: ASSESSMENT_TYPE_LABELS[type] ?? type,
      assigned: grades.length,
      respondents: typeRespondents,
      responseRate: percent(typeRespondents, grades.length),
      score10: typeScore === null ? null : round1(typeScore),
      templates: templateStats,
    })
  }

  types.sort((a, b) => {
    const ia = ASSESSMENT_TYPE_ORDER.indexOf(a.assessmentType)
    const ib = ASSESSMENT_TYPE_ORDER.indexOf(b.assessmentType)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  const overall = mean(types.map((t) => t.score10).filter((v): v is number => v !== null))

  return {
    overallScore10: overall === null ? null : round1(overall),
    totalAssigned: types.reduce((n, t) => n + t.assigned, 0),
    totalRespondents: types.reduce((n, t) => n + t.respondents, 0),
    types,
  }
}

// ── Points d'attention ───────────────────────────────────────────────────────

export interface AttentionPoint {
  id: string
  level: 'critical' | 'warning'
  assessmentType: string
  typeLabel: string
  label: string
  score10: number | null
  detail: string
  /** id DOM de l'élément à faire défiler (question ou rubrique) */
  targetId: string | null
}

export function questionAnchorId(questionId: string): string {
  return `suivi-qualite-q-${questionId}`
}

export function sectionAnchorId(templateId: string, sectionName: string): string {
  return `suivi-qualite-s-${templateId}-${sectionName.replace(/[^a-zA-Z0-9]+/g, '-')}`
}

/** Part des réponses négatives (≤ 2 étoiles, ou option d'échelle ≤ 1 étoile), 0-100 */
export function negativeShare(q: QuestionStats): number | null {
  if (q.respondents === 0) return null
  if (q.kind === 'rating') {
    const neg = q.distribution.filter((d) => (d.starValue ?? 5) <= 2).reduce((n, d) => n + d.count, 0)
    return percent(neg, q.respondents)
  }
  if (q.kind === 'choice' && q.isScale) {
    const neg = q.distribution.filter((d) => d.starValue !== undefined && d.starValue <= 1).reduce((n, d) => n + d.count, 0)
    return percent(neg, q.respondents)
  }
  return null
}

const NEGATIVE_SHARE_THRESHOLD = 20
const RESPONSE_RATE_THRESHOLD = 50

/**
 * Liste les éléments qui demandent une action : notes sous le seuil, part
 * importante de réponses négatives, taux de réponse faible. Critiques d'abord,
 * puis par note croissante.
 */
export function buildAttentionPoints(analytics: EvaluationAnalytics, threshold = 7): AttentionPoint[] {
  const points: AttentionPoint[] = []
  const levelFor = (score: number) => (score < threshold - 2 ? 'critical' : 'warning') as AttentionPoint['level']

  for (const type of analytics.types) {
    const base = { assessmentType: type.assessmentType, typeLabel: type.label }

    if (type.assigned > 0 && type.responseRate < RESPONSE_RATE_THRESHOLD) {
      points.push({
        ...base,
        id: `rate-${type.assessmentType}`,
        level: type.responseRate < RESPONSE_RATE_THRESHOLD / 2 ? 'critical' : 'warning',
        label: 'Taux de réponse faible',
        score10: null,
        detail: `${type.respondents}/${type.assigned} réponses (${type.responseRate} %)`,
        targetId: null,
      })
    }

    // La préformation mesure le niveau de départ (et les attentes) : une note
    // basse y est attendue et ne signale pas un problème de qualité.
    if (type.assessmentType === 'pre_formation') continue

    for (const template of type.templates) {
      for (const section of template.sections) {
        if (section.name && section.score10 !== null && section.score10 < threshold) {
          points.push({
            ...base,
            id: `section-${template.templateId}-${section.name}`,
            level: levelFor(section.score10),
            label: section.name,
            score10: section.score10,
            detail: `Rubrique notée ${section.score10.toFixed(1)}/10`,
            targetId: sectionAnchorId(template.templateId, section.name),
          })
        }
        for (const q of section.questions) {
          if (q.score10 !== null && q.score10 < threshold) {
            points.push({
              ...base,
              id: `question-${q.questionId}`,
              level: levelFor(q.score10),
              label: q.text,
              score10: q.score10,
              detail: `Question notée ${q.score10.toFixed(1)}/10`,
              targetId: questionAnchorId(q.questionId),
            })
            continue
          }
          const neg = negativeShare(q)
          if (neg !== null && neg >= NEGATIVE_SHARE_THRESHOLD) {
            points.push({
              ...base,
              id: `negative-${q.questionId}`,
              level: 'warning',
              label: q.text,
              score10: q.score10,
              detail: `${neg} % de réponses négatives`,
              targetId: questionAnchorId(q.questionId),
            })
          }
        }
      }
    }
  }

  const rank = (p: AttentionPoint) => (p.level === 'critical' ? 0 : 1)
  return points.sort((a, b) => rank(a) - rank(b) || (a.score10 ?? 99) - (b.score10 ?? 99))
}

// ── Avant / après formation ──────────────────────────────────────────────────

export interface BeforeAfterPair {
  label: string
  /** Appariement par nom de rubrique ou par texte de question identique */
  matchedBy: 'section' | 'question'
  afterType: string
  afterTypeLabel: string
  before10: number
  after10: number
  delta: number
}

export interface BeforeAfterComparison {
  hasBefore: boolean
  hasAfter: boolean
  pairs: BeforeAfterPair[]
  /** Progression moyenne en points /10, null sans appariement */
  averageDelta: number | null
}

const AFTER_TYPES = ['hot', 'cold']

function scoredItems(type: AssessmentTypeStats) {
  const sections = new Map<string, number>()
  const questions = new Map<string, { text: string; score: number; section: string | null }>()
  for (const template of type.templates) {
    for (const section of template.sections) {
      if (section.name && section.score10 !== null) sections.set(normalizeLabel(section.name), section.score10)
      for (const q of section.questions) {
        if (q.score10 !== null) questions.set(normalizeLabel(q.text), { text: q.text, score: q.score10, section: section.name })
      }
    }
  }
  return { sections, questions }
}

/**
 * Compare la préformation à l'évaluation à chaud / à froid : rubriques de même
 * nom d'abord, puis questions au texte identique (hors rubriques déjà appariées).
 */
export function buildBeforeAfter(analytics: EvaluationAnalytics): BeforeAfterComparison {
  const pre = analytics.types.find((t) => t.assessmentType === 'pre_formation')
  const afters = analytics.types.filter((t) => AFTER_TYPES.includes(t.assessmentType))
  const pairs: BeforeAfterPair[] = []

  if (pre) {
    const before = scoredItems(pre)
    for (const after of afters) {
      const items = scoredItems(after)
      const pairedSections = new Set<string>()
      for (const template of after.templates) {
        for (const section of template.sections) {
          if (!section.name || section.score10 === null) continue
          const key = normalizeLabel(section.name)
          const b = before.sections.get(key)
          if (b === undefined || pairedSections.has(key)) continue
          pairedSections.add(key)
          pairs.push({
            label: section.name,
            matchedBy: 'section',
            afterType: after.assessmentType,
            afterTypeLabel: after.label,
            before10: b,
            after10: section.score10,
            delta: round1(section.score10 - b),
          })
        }
      }
      for (const [key, a] of items.questions) {
        const b = before.questions.get(key)
        if (!b) continue
        if (a.section && pairedSections.has(normalizeLabel(a.section))) continue
        pairs.push({
          label: a.text,
          matchedBy: 'question',
          afterType: after.assessmentType,
          afterTypeLabel: after.label,
          before10: b.score,
          after10: a.score,
          delta: round1(a.score - b.score),
        })
      }
    }
  }

  const avg = mean(pairs.map((p) => p.delta))
  return {
    hasBefore: !!pre,
    hasAfter: afters.length > 0,
    pairs,
    averageDelta: avg === null ? null : round1(avg),
  }
}

/** Réponse de GET /api/sessions/[id]/evaluation-analytics */
export interface EvaluationAnalyticsResponse extends EvaluationAnalytics {
  attentionPoints: AttentionPoint[]
  beforeAfter: BeforeAfterComparison
  formationId: string | null
}

/** Point de GET /api/formations/[id]/evaluation-trend */
export interface EvaluationTrendPoint {
  sessionId: string
  name: string
  startDate: string
  overall10: number | null
  /** Note /10 par type d'évaluation (hot, cold…) */
  byType: Record<string, number | null>
  respondents: number
}
