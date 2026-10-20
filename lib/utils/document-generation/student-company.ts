/**
 * Entreprise / entité de rattachement d'un apprenant, au format Company
 * attendu par extractDocumentVariables (variables {entreprise_*}).
 *
 * Partagé entre la génération côté navigateur (fiche session) et côté serveur
 * (envois programmés) : le client Supabase est passé en paramètre.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Company = TableRow<'companies'>

/** Mappe une ligne external_entities → Company pour compatibilité avec extractDocumentVariables */
export function mapExternalEntityToCompany(ext: Record<string, unknown>): Company {
  return {
    id: ext.id as string,
    name: ext.name as string,
    address: ext.address as string | null,
    city: ext.city as string | null,
    postal_code: ext.postal_code as string | null,
    phone: ext.phone as string | null,
    email: ext.email as string | null,
    billing_email: ext.contact_email as string | null,
    siret: ext.siret as string | null,
    siren: ext.siren as string | null,
    website: ext.website as string | null,
    metadata: { tva_number: ext.vat_number },
    organization_id: ext.organization_id as string,
    is_active: ext.is_active as boolean,
    billing_address: null,
    country: ext.country as string | null,
    legal_form: ext.legal_form as string | null,
    logo_url: null,
    notes: null,
    opco_contact_email: null,
    opco_id: null,
    opco_name: null,
    created_at: ext.created_at as string,
    updated_at: ext.updated_at as string,
    deleted_at: null,
    deleted_by: null,
    external_entity_id: null,
  } as Company
}

/**
 * Entité principale de l'apprenant : external_entities (via student_entities,
 * entité courante), sinon company_employees. null si aucune.
 */
export async function fetchStudentCompany(client: SupabaseClient, studentId: string): Promise<Company | null> {
  try {
    const { data: seData } = await client
      .from('student_entities')
      .select('external_entities(*)')
      .eq('student_id', studentId)
      .eq('is_current', true)
      .limit(1)
      .maybeSingle()
    const entity = (seData as { external_entities?: unknown } | null)?.external_entities
    if (entity && !Array.isArray(entity)) {
      return mapExternalEntityToCompany(entity as Record<string, unknown>)
    }

    const { data: ceData } = await client
      .from('company_employees')
      .select('companies(*)')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    const company = (ceData as { companies?: unknown } | null)?.companies
    if (company && !Array.isArray(company)) {
      return company as Company
    }
    return null
  } catch {
    return null
  }
}
