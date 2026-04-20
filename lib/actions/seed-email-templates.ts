'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEFAULT_TEMPLATES } from '@/lib/data/default-email-templates'

export { DEFAULT_TEMPLATES }

// ─── Server action ────────────────────────────────────────────────────────────

export async function seedDefaultEmailTemplates(): Promise<{
  success: boolean
  created: number
  skipped: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, created: 0, skipped: 0, error: 'Non authentifié' }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return { success: false, created: 0, skipped: 0, error: 'Organisation introuvable' }
    }

    const orgId = userData.organization_id
    const admin = createAdminClient()

    // Récupérer les types déjà configurés
    const { data: existing } = await admin
      .from('email_templates')
      .select('email_type')
      .eq('organization_id', orgId)
      .eq('is_active', true)

    const existingTypes = new Set((existing ?? []).map(t => t.email_type))

    const toInsert = DEFAULT_TEMPLATES
      .filter(t => !existingTypes.has(t.email_type))
      .map(t => ({
        ...t,
        organization_id: orgId,
        is_default: true,
        is_active: true,
        created_by: user.id,
      }))

    if (toInsert.length === 0) {
      return { success: true, created: 0, skipped: DEFAULT_TEMPLATES.length }
    }

    const { error } = await admin.from('email_templates').insert(toInsert)
    if (error) throw error

    return {
      success: true,
      created: toInsert.length,
      skipped: existingTypes.size,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return { success: false, created: 0, skipped: 0, error: message }
  }
}
