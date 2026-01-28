/**
 * Intégrations avec les systèmes existants pour la conformité
 */

import { createClient } from '@/lib/supabase/client'
import { ComplianceService } from '@/lib/services/compliance.service'
import { ssoService } from '@/lib/services/sso.service'

/**
 * Vérifie la conformité 2FA et crée/met à jour les contrôles correspondants
 */
export async function sync2FACompliance(organizationId: string) {
  const supabase = createClient()
  const complianceService = new ComplianceService(supabase)

  // Récupérer les utilisateurs avec 2FA activé
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('organization_id', organizationId)

  if (!users) return

  let usersWith2FA = 0
  for (const user of users) {
    try {
      const { data: twoFA, error: twoFAError } = await supabase
        .from('user_2fa')
        .select('is_enabled')
        .eq('user_id', user.id)
        .eq('is_enabled', true)
        .maybeSingle()

      // Ignorer les erreurs 406 (table n'existe pas), PGRST116 (pas de lignes), PGRST301 (RLS)
      if (twoFAError) {
        const errorObj = twoFAError as { code?: string; status?: number }
      if (errorObj.code === 'PGRST116' || errorObj.code === 'PGRST301' || errorObj.status === 406) {
          // Table n'existe pas ou pas de données, continuer
          continue
        }
        // Autres erreurs, ignorer aussi
        continue
      }

      if (twoFA?.is_enabled) {
        usersWith2FA++
      }
    } catch (error) {
      // Ignorer toutes les erreurs
      continue
    }
  }

  const twoFARate = users.length > 0 ? (usersWith2FA / users.length) * 100 : 0

  // Créer ou mettre à jour le contrôle ISO 27001 A.9.4.2 (Authentification multi-facteurs)
  const controlId = 'A.9.4.2'
  const existingControls = await complianceService.getControls(organizationId, {
    framework: 'iso27001',
  })

  const existingControl = existingControls.find((c) => c.control_id === controlId)

  if (existingControl) {
    // Mettre à jour le contrôle
    await complianceService.updateControl(existingControl.id, {
      implementation_status: twoFARate >= 80 ? 'implemented' : twoFARate >= 50 ? 'partial' : 'not_implemented',
      compliance_status: twoFARate >= 80 ? 'compliant' : twoFARate >= 50 ? 'partially_compliant' : 'non_compliant',
      last_assessed_at: new Date().toISOString(),
    })
  } else {
    // Créer le contrôle
    await complianceService.createControl({
      organization_id: organizationId,
      control_id: controlId,
      framework: 'iso27001',
      title: 'Authentification multi-facteurs',
      description: 'Taux d\'adoption de l\'authentification à deux facteurs',
      category: 'access_control',
      implementation_status: twoFARate >= 80 ? 'implemented' : twoFARate >= 50 ? 'partial' : 'not_implemented',
      compliance_status: twoFARate >= 80 ? 'compliant' : twoFARate >= 50 ? 'partially_compliant' : 'non_compliant',
      risk_level: 'high',
      last_assessed_at: new Date().toISOString(),
    })
  }

  return { twoFARate, usersWith2FA, totalUsers: users.length }
}

/**
 * Vérifie la conformité SSO et crée/met à jour les contrôles correspondants
 */
export async function syncSSOCompliance(organizationId: string) {
  const supabase = createClient()
  const complianceService = new ComplianceService(supabase)

  // Vérifier si SSO est configuré
  const { data: ssoConfigs } = await supabase
    .from('sso_configurations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const hasSSO = ssoConfigs && ssoConfigs.length > 0

  // Créer ou mettre à jour le contrôle SOC 2 CC6.1 (Accès logique)
  const controlId = 'CC6.1'
  const existingControls = await complianceService.getControls(organizationId, {
    framework: 'soc2',
  })

  const existingControl = existingControls.find((c) => c.control_id === controlId)

  if (existingControl) {
    await complianceService.updateControl(existingControl.id, {
      implementation_status: hasSSO ? 'implemented' : 'not_implemented',
      compliance_status: hasSSO ? 'compliant' : 'non_compliant',
      last_assessed_at: new Date().toISOString(),
    })
  } else {
    await complianceService.createControl({
      organization_id: organizationId,
      control_id: controlId,
      framework: 'soc2',
      title: 'Accès logique et authentification',
      description: 'Configuration et utilisation du Single Sign-On (SSO)',
      category: 'access_control',
      implementation_status: hasSSO ? 'implemented' : 'not_implemented',
      compliance_status: hasSSO ? 'compliant' : 'non_compliant',
      risk_level: 'high',
      last_assessed_at: new Date().toISOString(),
    })
  }

  return { hasSSO, ssoConfigsCount: ssoConfigs?.length || 0 }
}

/**
 * Synchronise tous les contrôles basés sur les systèmes existants
 */
export async function syncAllComplianceControls(organizationId: string) {
  const results = {
    twoFA: await sync2FACompliance(organizationId),
    sso: await syncSSOCompliance(organizationId),
  }

  return results
}
