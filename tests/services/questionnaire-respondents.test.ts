/**
 * Questionnaires formateur, manager et financeur : public d'un modèle,
 * destinataires proposés et liens sans apprenant.
 */
import { describe, it, expect } from 'vitest'
import {
  dedupeRecipients,
  getOrCreateRespondentLink,
  templateAudience,
} from '@/lib/services/questionnaire-link.service'
import { entityRecipient } from '@/lib/services/questionnaire-recipients'

type Rows = Record<string, unknown[]>

/** Client Supabase minimal : lectures depuis `rows`, insertions enregistrées dans `inserted`. */
function fakeAdmin(rows: Rows) {
  const inserted: Record<string, Record<string, unknown>[]> = {}
  const client = {
    from(table: string) {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        neq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: rows[table]?.[0] ?? null }),
        insert(row: Record<string, unknown>) {
          ;(inserted[table] ??= []).push(row)
          return { select: () => ({ single: async () => ({ data: { id: `${table}-id`, token: 'new-token' }, error: null }) }) }
        },
      }
      return chain
    },
  }
  return { client, inserted }
}

describe('templateAudience', () => {
  it('range chaque type de modèle chez son public', () => {
    expect(['hot', 'cold', 'pre_formation', 'a_chaud', null].map(templateAudience)).toEqual(['student', 'student', 'student', 'student', 'student'])
    expect(templateAudience('instructor')).toBe('instructor')
    expect(templateAudience('manager')).toBe('manager')
    expect(templateAudience('funder')).toBe('funder')
  })

  it('écarte les évaluations notées', () => {
    expect(['quiz', 'exam', 'project', 'other'].map(templateAudience)).toEqual([null, null, null, null])
  })
})

describe('destinataires proposés', () => {
  it("prend le contact référent de l'entité, sinon l'entité elle-même", () => {
    expect(entityRecipient('manager', {
      id: 'e1', name: 'ACME', email: 'info@acme.fr', contact_email: 'rh@acme.fr', contact_first_name: 'Léa', contact_last_name: 'Martin',
    })).toEqual({ type: 'manager', name: 'Léa Martin', email: 'rh@acme.fr', detail: 'ACME', entityId: 'e1' })

    expect(entityRecipient('funder', {
      id: 'e2', name: 'OPCO EP', email: null, contact_email: null, contact_first_name: null, contact_last_name: null,
    })).toEqual({ type: 'funder', name: 'OPCO EP', email: null, detail: null, entityId: 'e2' })
  })

  it('garde un destinataire par email, sans perdre ceux qui n\'en ont pas', () => {
    const result = dedupeRecipients([
      { type: 'manager', name: 'Léa', email: 'RH@acme.fr' },
      { type: 'manager', name: 'Léa bis', email: 'rh@acme.fr ' },
      { type: 'manager', name: 'Sans email', email: null },
      { type: 'manager', name: 'Sans email', email: null },
      { type: 'manager', name: 'Autre', email: null },
    ])
    expect(result.map((r) => [r.name, r.email])).toEqual([
      ['Léa', 'rh@acme.fr'],
      ['Sans email', null],
      ['Autre', null],
    ])
  })
})

describe('getOrCreateRespondentLink', () => {
  const input = {
    organizationId: 'org',
    session: { id: 'session', name: 'SSIAP 1' },
    template: { id: 'template', name: 'Questionnaire intervenant' },
    assessmentType: 'instructor',
    respondent: { type: 'instructor' as const, name: 'Paul Prof', email: 'Paul@Ecole.fr', userId: 'u1' },
  }

  it("crée l'évaluation sans apprenant et un lien au nom de l'intervenant", async () => {
    const { client, inserted } = fakeAdmin({})
    expect(await getOrCreateRespondentLink(client, input)).toEqual({ status: 'ready', token: 'new-token', created: true })

    expect(inserted.grades[0]).toMatchObject({ student_id: null, assessment_type: 'instructor', subject: 'Questionnaire intervenant' })
    expect(inserted.questionnaire_links[0]).toMatchObject({
      student_id: null,
      student_name: 'Paul Prof',
      student_email: 'paul@ecole.fr',
      respondent_type: 'instructor',
      respondent_user_id: 'u1',
      respondent_entity_id: null,
    })
  })

  it("rejoint le lot de la page Évaluations (même sujet et même date que le QR code)", async () => {
    const { client, inserted } = fakeAdmin({})
    await getOrCreateRespondentLink(client, { ...input, batch: { subject: 'Bilan formateur', gradedAt: '2026-11-11' } })
    expect(inserted.grades[0]).toMatchObject({ subject: 'Bilan formateur', graded_at: '2026-11-11', student_id: null })
  })

  it('réutilise le lien existant, ou ne renvoie rien si déjà répondu', async () => {
    const reuse = fakeAdmin({ questionnaire_links: [{ token: 't', submitted_at: null }] })
    expect(await getOrCreateRespondentLink(reuse.client, input)).toEqual({ status: 'ready', token: 't', created: false })
    expect(reuse.inserted).toEqual({})

    const done = fakeAdmin({ questionnaire_links: [{ token: 't', submitted_at: '2026-11-10' }] })
    expect(await getOrCreateRespondentLink(done.client, input)).toEqual({ status: 'already_submitted' })
  })
})
