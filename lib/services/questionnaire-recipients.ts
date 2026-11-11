/**
 * Destinataires proposés pour un questionnaire non apprenant d'une session :
 * intervenants (formateurs), entreprises (managers) ou financeurs. Liste
 * pré-cochée dans l'onglet Évaluations, et référence côté serveur pour
 * rattacher un email à son utilisateur ou à son entité.
 */

import { dedupeRecipients, type QuestionnaireAudience, type QuestionnaireRecipient } from './questionnaire-link.service'

// Tables récentes ou relations absentes des types générés
type AnyClient = any

export interface EntityContactRow {
  id: string
  name: string | null
  email: string | null
  contact_email: string | null
  contact_first_name: string | null
  contact_last_name: string | null
}

const ENTITY_COLUMNS = 'id, name, email, contact_email, contact_first_name, contact_last_name'

/** Contact d'une entité : la personne référente si elle est renseignée, sinon l'entité */
export function entityRecipient(
  type: 'manager' | 'funder',
  entity: EntityContactRow
): QuestionnaireRecipient {
  const contactName = `${entity.contact_first_name ?? ''} ${entity.contact_last_name ?? ''}`.trim()
  return {
    type,
    name: contactName || entity.name || 'Contact',
    email: entity.contact_email?.trim() || entity.email?.trim() || null,
    detail: contactName ? entity.name : null,
    entityId: entity.id,
  }
}

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null

async function activeEnrollmentIds(admin: AnyClient, sessionId: string) {
  const { data, error } = await admin
    .from('enrollments')
    .select('id, student_id')
    .eq('session_id', sessionId)
    .neq('status', 'cancelled')
  if (error) throw error
  return (data ?? []) as Array<{ id: string; student_id: string | null }>
}

async function loadInstructors(admin: AnyClient, sessionId: string): Promise<QuestionnaireRecipient[]> {
  const [teachersResult, sessionResult] = await Promise.all([
    admin.from('session_teachers').select('teacher_id, is_primary').eq('session_id', sessionId),
    admin.from('sessions').select('teacher_id').eq('id', sessionId).maybeSingle(),
  ])
  if (teachersResult.error) throw teachersResult.error
  if (sessionResult.error) throw sessionResult.error

  const rows = (teachersResult.data ?? []) as Array<{ teacher_id: string | null; is_primary: boolean | null }>
  const primaryIds = new Set(rows.filter((r) => r.is_primary).map((r) => r.teacher_id))
  const legacyId = (sessionResult.data as { teacher_id?: string | null } | null)?.teacher_id
  if (legacyId) primaryIds.add(legacyId)
  const ids = [...new Set([...rows.map((r) => r.teacher_id), legacyId].filter((id): id is string => !!id))]
  if (ids.length === 0) return []

  const { data: users, error } = await admin.from('users').select('id, full_name, email').in('id', ids)
  if (error) throw error
  return ((users ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>).map((u) => ({
    type: 'instructor' as const,
    name: u.full_name || u.email || 'Intervenant',
    email: u.email,
    detail: primaryIds.has(u.id) ? 'Intervenant principal' : 'Intervenant',
    userId: u.id,
  }))
}

async function loadManagers(admin: AnyClient, sessionId: string): Promise<QuestionnaireRecipient[]> {
  const enrollments = await activeEnrollmentIds(admin, sessionId)
  const studentIds = [...new Set(enrollments.map((e) => e.student_id).filter((id): id is string => !!id))]

  const [reservationsResult, studentEntitiesResult] = await Promise.all([
    admin
      .from('session_entity_reservations')
      .select(`status, external_entities(${ENTITY_COLUMNS})`)
      .eq('session_id', sessionId),
    studentIds.length > 0
      ? admin
          .from('student_entities')
          .select(`external_entities(${ENTITY_COLUMNS})`)
          .in('student_id', studentIds)
          .eq('is_current', true)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (reservationsResult.error) throw reservationsResult.error
  if (studentEntitiesResult.error) throw studentEntitiesResult.error

  const entities = [
    ...((reservationsResult.data ?? []) as Array<{ status: string | null; external_entities: unknown }>)
      .filter((r) => r.status !== 'cancelled')
      .map((r) => one(r.external_entities as EntityContactRow | EntityContactRow[] | null)),
    ...((studentEntitiesResult.data ?? []) as Array<{ external_entities: unknown }>)
      .map((r) => one(r.external_entities as EntityContactRow | EntityContactRow[] | null)),
  ].filter((e): e is EntityContactRow => !!e)

  return [...new Map(entities.map((e) => [e.id, e])).values()].map((e) => entityRecipient('manager', e))
}

async function loadFunders(admin: AnyClient, sessionId: string): Promise<QuestionnaireRecipient[]> {
  const enrollments = await activeEnrollmentIds(admin, sessionId)
  const { data: reservations, error: reservationsError } = await admin
    .from('session_entity_reservations')
    .select('id')
    .eq('session_id', sessionId)
  if (reservationsError) throw reservationsError

  const filters: string[] = []
  if (enrollments.length > 0) filters.push(`enrollment_id.in.(${enrollments.map((e) => e.id).join(',')})`)
  const reservationIds = ((reservations ?? []) as Array<{ id: string }>).map((r) => r.id)
  if (reservationIds.length > 0) filters.push(`session_entity_reservation_id.in.(${reservationIds.join(',')})`)
  if (filters.length === 0) return []

  // Le financeur est l'entité facturée sur la session (OPCO, entreprise…)
  const { data: invoices, error } = await admin
    .from('invoices')
    .select(`entity_id, external_entities(${ENTITY_COLUMNS})`)
    .not('entity_id', 'is', null)
    .or(filters.join(','))
  if (error) throw error

  const entities = ((invoices ?? []) as Array<{ external_entities: unknown }>)
    .map((i) => one(i.external_entities as EntityContactRow | EntityContactRow[] | null))
    .filter((e): e is EntityContactRow => !!e)

  return [...new Map(entities.map((e) => [e.id, e])).values()].map((e) => entityRecipient('funder', e))
}

export async function loadRecipientCandidates(
  admin: AnyClient,
  sessionId: string,
  audience: Exclude<QuestionnaireAudience, 'student'>
): Promise<QuestionnaireRecipient[]> {
  const loaders = { instructor: loadInstructors, manager: loadManagers, funder: loadFunders }
  const recipients = await loaders[audience](admin, sessionId)
  return dedupeRecipients(recipients).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}
