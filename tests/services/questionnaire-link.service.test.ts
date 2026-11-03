import { describe, it, expect } from 'vitest'
import { getOrCreateQuestionnaireLink, toPublicQuestion } from '@/lib/services/questionnaire-link.service'

type Rows = Record<string, unknown[]>

/** Client Supabase minimal : lectures depuis `rows`, insertions enregistrées dans `inserted`. */
function fakeAdmin(rows: Rows) {
  const inserted: Record<string, unknown[]> = {}
  const client = {
    from(table: string) {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: rows[table]?.[0] ?? null }),
        insert(row: unknown) {
          ;(inserted[table] ??= []).push(row)
          return {
            select: () => ({
              single: async () => ({ data: { id: `${table}-id`, token: 'new-token' }, error: null }),
            }),
          }
        },
        then: (resolve: (v: unknown) => void) => resolve({ data: rows[table] ?? [] }),
      }
      return chain
    },
  }
  return { client, inserted }
}

const input = {
  organizationId: 'org',
  session: { id: 'session', name: 'SSIAP 1' },
  student: { id: 'student', first_name: 'Marie', last_name: 'Dupont', email: 'm@x.fr' },
  template: { id: 'template', name: 'Recueil des besoins' },
  assessmentType: 'pre_formation',
}

describe('getOrCreateQuestionnaireLink', () => {
  it('ne renvoie rien si le questionnaire est déjà soumis', async () => {
    const { client, inserted } = fakeAdmin({ questionnaire_links: [{ token: 't', submitted_at: '2026-11-01' }] })
    expect(await getOrCreateQuestionnaireLink(client, input)).toEqual({ status: 'already_submitted' })
    expect(inserted).toEqual({})
  })

  it('réutilise un lien non soumis', async () => {
    const { client, inserted } = fakeAdmin({ questionnaire_links: [{ token: 't', submitted_at: null }] })
    expect(await getOrCreateQuestionnaireLink(client, input)).toEqual({ status: 'ready', token: 't', created: false })
    expect(inserted).toEqual({})
  })

  it("réutilise une évaluation non remplie au lieu d'en créer une seconde", async () => {
    const { client, inserted } = fakeAdmin({
      grades: [{ id: 'g1' }],
      evaluation_template_instances: [{ id: 'i1', grade_id: 'g1', completed_at: null }],
    })
    expect(await getOrCreateQuestionnaireLink(client, input)).toEqual({ status: 'ready', token: 'new-token', created: true })
    expect(inserted.grades).toBeUndefined()
    expect(inserted.questionnaire_links?.[0]).toMatchObject({ grade_id: 'g1', instance_id: 'i1' })
  })

  it('considère comme soumise une évaluation déjà remplie', async () => {
    const { client } = fakeAdmin({
      grades: [{ id: 'g1' }],
      evaluation_template_instances: [{ id: 'i1', grade_id: 'g1', completed_at: '2026-11-01' }],
    })
    expect(await getOrCreateQuestionnaireLink(client, input)).toEqual({ status: 'already_submitted' })
  })

  it('crée évaluation, instance et lien pour un nouvel apprenant', async () => {
    const { client, inserted } = fakeAdmin({})
    expect(await getOrCreateQuestionnaireLink(client, input)).toEqual({ status: 'ready', token: 'new-token', created: true })
    expect(inserted.grades?.[0]).toMatchObject({ assessment_type: 'pre_formation', student_id: 'student' })
    expect(inserted.evaluation_template_instances?.[0]).toMatchObject({ template_id: 'template' })
    expect(inserted.questionnaire_links?.[0]).toMatchObject({ student_name: 'Marie Dupont' })
  })
})

describe('toPublicQuestion', () => {
  it('convertit chaque type de modèle vers un type affichable', () => {
    const type = (question_type: string) => toPublicQuestion({ question_type }).question_type
    expect(type('essay')).toBe('text')
    expect(type('short_answer')).toBe('text')
    expect(type('numeric')).toBe('text')
    expect(type('multiple_choice')).toBe('choice')
    expect(type('true_false')).toBe('boolean')
    expect(type('rating')).toBe('rating')
    expect(type('inconnu')).toBe('text')
  })

  it('ne transmet que les libellés, jamais la bonne réponse', () => {
    const options = [{ text: 'A', is_correct: true }, { text: 'B', is_correct: false }]
    expect(toPublicQuestion({ question_type: 'multiple_choice', options }).options).toEqual(['A', 'B'])
    expect(toPublicQuestion({ question_type: 'multiple_choice', options: JSON.stringify(options) }).options).toEqual(['A', 'B'])
    expect(toPublicQuestion({ question_type: 'essay', options: null }).options).toBeNull()
  })
})
