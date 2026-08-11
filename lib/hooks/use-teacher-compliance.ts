/**
 * Hook partagé autour de v_teacher_document_compliance : liste des documents
 * requis (par statut indépendant/salarié) et de leur statut de conformité, pour un
 * formateur donné ou pour tous les formateurs d'une organisation.
 */

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ComplianceStatus } from '@/lib/utils/document-expiry'

const supabase = createClient()

export interface TeacherComplianceRow {
  teacher_id: string
  teacher_user_id: string
  organization_id: string
  statut: 'independant' | 'salarie'
  required_document_type_id: string
  code: string
  label: string
  required_for: 'independant' | 'salarie' | 'both'
  renewal_months: number | null
  teacher_document_id: string | null
  document_title: string | null
  file_url: string | null
  uploaded_at: string | null
  explicit_expiry_date: string | null
  effective_expiry_date: string | null
  status: ComplianceStatus
}

async function fetchCompliance(organizationId: string, teacherUserId?: string | null): Promise<TeacherComplianceRow[]> {
  let q = (supabase as any)
    .from('v_teacher_document_compliance')
    .select('*')
    .eq('organization_id', organizationId)
    .order('label', { ascending: true })

  if (teacherUserId) q = q.eq('teacher_user_id', teacherUserId)

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as TeacherComplianceRow[]
}

/** Conformité de tous les formateurs actifs de l'organisation. */
export function useOrganizationTeacherCompliance(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ['teacher-compliance', organizationId],
    queryFn: () => fetchCompliance(organizationId!),
    enabled: !!organizationId,
  })
}

/** Conformité d'un seul formateur (utilisé par le dialog de détail admin et par
 * l'espace personnel du formateur lui-même). */
export function useTeacherCompliance(organizationId: string | null | undefined, teacherUserId: string | null | undefined) {
  return useQuery({
    queryKey: ['teacher-compliance', organizationId, teacherUserId],
    queryFn: () => fetchCompliance(organizationId!, teacherUserId),
    enabled: !!organizationId && !!teacherUserId,
  })
}

export function worstComplianceStatus(rows: TeacherComplianceRow[]): ComplianceStatus {
  if (rows.some(r => r.status === 'expired')) return 'expired'
  if (rows.some(r => r.status === 'missing')) return 'missing'
  if (rows.some(r => r.status === 'expiring_soon')) return 'expiring_soon'
  return 'ok'
}
