import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureErrorResponse } from '@/lib/utils/api-error-response'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/enterprise/company-by-entity?entity=uuid
 * Pour un admin : retourne la company du portail associée à cette external_entity.
 * Crée la company (et le lien) si elle n'existe pas encore.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return createSecureErrorResponse(new Error('Non authentifié'), { status: 401 })
    }

    const entityId = request.nextUrl.searchParams.get('entity')
    if (!entityId) {
      return NextResponse.json(
        { error: 'Paramètre entity (UUID) requis' },
        { status: 400 }
      )
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('id', authUser.id)
      .single()

    if (userError || !userRow) {
      return createSecureErrorResponse(new Error('Utilisateur introuvable'), { status: 403 })
    }

    if (!['admin', 'super_admin'].includes(userRow.role)) {
      return createSecureErrorResponse(
        new Error('Accès réservé aux administrateurs'),
        { status: 403 }
      )
    }

    const organizationId = userRow.organization_id
    if (!organizationId) {
      return NextResponse.json({ error: 'Aucune organisation' }, { status: 400 })
    }

    // Récupérer l'entité (RLS : même organisation)
    const { data: externalEntity, error: entityError } = await supabase
      .from('external_entities')
      .select('id, organization_id, name, siret, siren, email, phone, address, city, postal_code, country, website, legal_form')
      .eq('id', entityId)
      .eq('organization_id', organizationId)
      .single()

    if (entityError || !externalEntity) {
      logger.warn('Company-by-entity: external entity not found or access denied', { entityId, error: entityError })
      return NextResponse.json(
        { error: 'Entité introuvable ou accès refusé' },
        { status: 404 }
      )
    }

    // Company déjà liée ?
    let company: { id: string; [key: string]: unknown } | null = null
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('*')
      .eq('external_entity_id', entityId)
      .maybeSingle()

    if (existingCompany) {
      company = existingCompany
    } else {
      // Créer la company et lier à l'entité
      const { data: newCompany, error: insertError } = await supabase
        .from('companies')
        .insert({
          organization_id: organizationId,
          external_entity_id: entityId,
          name: externalEntity.name,
          siret: externalEntity.siret ?? null,
          siren: externalEntity.siren ?? null,
          email: externalEntity.email ?? null,
          phone: externalEntity.phone ?? null,
          address: externalEntity.address ?? null,
          city: externalEntity.city ?? null,
          postal_code: externalEntity.postal_code ?? null,
          country: externalEntity.country ?? 'France',
          website: externalEntity.website ?? null,
          legal_form: externalEntity.legal_form ?? null,
          is_active: true,
        })
        .select('*')
        .single()

      if (insertError) {
        logger.error('Company-by-entity: failed to create company', { error: insertError })
        return createSecureErrorResponse(
          new Error('Impossible de créer l\'entreprise pour cette entité'),
          { status: 500 }
        )
      }
      company = newCompany
    }

    // Synchroniser company_employees depuis student_entities (rattachements actuels de l'entité)
    const { data: studentLinks } = await supabase
      .from('student_entities')
      .select('student_id, department, position, tutor_name, tutor_email, tutor_phone, relationship_type')
      .eq('entity_id', entityId)
      .eq('is_current', true)

    const currentStudentIds = new Set((studentLinks || []).map((se: { student_id: string }) => se.student_id))

    if (studentLinks && studentLinks.length > 0) {
      const rows = (studentLinks as Array<{ student_id: string; department: string | null; position: string | null; tutor_name: string | null; tutor_email: string | null; tutor_phone: string | null; relationship_type: string }>).map((se) => ({
        company_id: company!.id,
        student_id: se.student_id,
        department: se.department ?? null,
        job_title: se.position ?? null,
        manager_name: se.tutor_name ?? null,
        manager_email: se.tutor_email ?? null,
        contract_type: se.relationship_type ?? null,
        is_active: true,
      }))
      const { error: upsertError } = await supabase
        .from('company_employees')
        .upsert(rows, { onConflict: 'company_id,student_id', ignoreDuplicates: false })
      if (upsertError) {
        logger.warn('Company-by-entity: sync company_employees failed', { error: upsertError })
      }
    }

    // Désactiver les company_employees dont l'apprenant n'est plus rattaché à cette entité
    const { data: existingEmployees } = await supabase
      .from('company_employees')
      .select('id, student_id')
      .eq('company_id', company!.id)
      .eq('is_active', true)
    const toDeactivate = (existingEmployees || []).filter((e: { student_id: string }) => !currentStudentIds.has(e.student_id))
    if (toDeactivate.length > 0) {
      await supabase
        .from('company_employees')
        .update({ is_active: false })
        .eq('company_id', company!.id)
        .in('student_id', toDeactivate.map((e: { student_id: string }) => e.student_id))
    }

    return NextResponse.json({ company })
  } catch (error) {
    logger.error('Company-by-entity', error)
    return createSecureErrorResponse(new Error('Erreur serveur'), { status: 500 })
  }
}
