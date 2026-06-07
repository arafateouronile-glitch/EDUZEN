'use server'

import { createClient } from '@/lib/supabase/server'

export type DemoLeadInput = {
  first_name: string
  last_name: string
  company: string
  email: string
  phone?: string
  message?: string
}

export async function submitDemoLead(input: DemoLeadInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('demo_leads')
    .insert({
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      company: input.company.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      message: input.message?.trim() || null,
    })

  if (error) {
    return { success: false, error: 'Une erreur est survenue. Réessaie.' }
  }

  return { success: true }
}
