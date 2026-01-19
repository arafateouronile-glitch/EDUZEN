import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ComplianceService } from '@/lib/services/compliance.service'

/**
 * Middleware pour logger tous les accès utilisateur
 */
export async function logAccess(request: NextRequest, action: string, resourceType?: string, resourceId?: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return // Ne pas logger si l'utilisateur n'est pas authentifié
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return
    }

    // Extraire l'IP et le user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Logger l'accès
    const complianceService = new ComplianceService(supabase)
    await complianceService.logAccess({
      user_id: user.id,
      organization_id: userData.organization_id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: true,
    })
  } catch (error) {
    // Ne pas faire échouer la requête si le logging échoue
    console.error('Error logging access:', error)
  }
}

/**
 * Logger les actions sensibles (création, modification, suppression)
 */
export async function logSensitiveAction(
  request: NextRequest,
  action: 'create' | 'update' | 'delete',
  resourceType: string,
  resourceId?: string
) {
  return logAccess(request, action, resourceType, resourceId)
}

/**
 * Logger les exports et téléchargements
 */
export async function logExport(request: NextRequest, resourceType: string, resourceId?: string) {
  return logAccess(request, 'export', resourceType, resourceId)
}
