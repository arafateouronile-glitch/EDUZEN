import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureErrorResponse } from '@/lib/utils/api-error-response'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/enterprise/associate
 * Permet à un admin de l'organisation de s'associer à une entreprise (création si besoin).
 * Crée une entreprise "Mon entreprise" si aucune n'existe, puis ajoute l'utilisateur comme manager.
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return createSecureErrorResponse(new Error('Non authentifié'), { status: 401 })
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role, full_name, email')
      .eq('id', authUser.id)
      .single()

    if (userError || !userRow) {
      logger.error('Enterprise associate: user not found', { error: userError })
      return createSecureErrorResponse(new Error('Utilisateur introuvable'), { status: 403 })
    }

    if (!['admin', 'super_admin'].includes(userRow.role)) {
      return createSecureErrorResponse(
        new Error('Seuls les administrateurs peuvent associer un compte à une entreprise'),
        { status: 403 }
      )
    }

    const organizationId = userRow.organization_id
    if (!organizationId) {
      return createSecureErrorResponse(
        new Error('Aucune organisation associée à votre compte'),
        { status: 400 }
      )
    }

    // Déjà manager ?
    const { data: existingManager } = await supabase
      .from('company_managers')
      .select('company_id')
      .eq('user_id', authUser.id)
      .eq('is_active', true)
      .maybeSingle()

    if (existingManager) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', existingManager.company_id)
        .single()
      return NextResponse.json({
        success: true,
        company: company ?? { id: existingManager.company_id, name: 'Entreprise' },
        alreadyAssociated: true,
      })
    }

    // Première entreprise de l'organisation ou en créer une
    const { data: existingCompanies } = await supabase
      .from('companies')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1)
    const existingCompany = existingCompanies?.[0] ?? null

    let companyId: string
    let companyName: string

    if (existingCompany) {
      companyId = existingCompany.id
      companyName = existingCompany.name
    } else {
      const { data: newCompany, error: insertCompanyError } = await supabase
        .from('companies')
        .insert({
          organization_id: organizationId,
          name: 'Mon entreprise',
          country: 'France',
          is_active: true,
        })
        .select('id, name')
        .single()

      if (insertCompanyError) {
        logger.error('Enterprise associate: failed to create company', { error: insertCompanyError })
        return createSecureErrorResponse(
          new Error('Impossible de créer l\'entreprise'),
          { status: 500 }
        )
      }
      companyId = newCompany!.id
      companyName = newCompany!.name
    }

    const fullName = (userRow.full_name || userRow.email || 'Manager').trim()
    const parts = fullName.split(/\s+/)
    const firstName = parts[0] ?? 'Manager'
    const lastName = parts.slice(1).join(' ') || firstName

    const { error: insertManagerError } = await supabase.from('company_managers').insert({
      company_id: companyId,
      user_id: authUser.id,
      first_name: firstName,
      last_name: lastName,
      email: userRow.email,
      role: 'manager',
      can_view_invoices: true,
      can_download_documents: true,
      can_request_training: true,
      can_manage_employees: true,
      is_primary_contact: true,
      is_active: true,
      accepted_at: new Date().toISOString(),
    })

    if (insertManagerError) {
      logger.error('Enterprise associate: failed to add manager', { error: insertManagerError })
      return createSecureErrorResponse(
        new Error('Impossible de vous associer à l\'entreprise'),
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      company: { id: companyId, name: companyName },
    })
  } catch (error) {
    logger.error('Enterprise associate', error)
    return createSecureErrorResponse(new Error('Erreur serveur'), { status: 500 })
  }
}
