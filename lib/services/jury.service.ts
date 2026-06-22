/**
 * jury.service.ts
 * Service client pour la gestion des membres du jury et de leurs assignations à une session.
 * Les tables jury_members et session_jury ne sont pas encore dans les types générés Supabase,
 * les requêtes utilisent donc des casts `as any`.
 */

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

// Tables jury_members et session_jury non dans le schéma généré — cast centralisé ici
function db(client: ReturnType<typeof createClient>): SupabaseClient {
  return client as unknown as SupabaseClient
}

export interface JuryMember {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  email: string
  company: string | null
  created_at: string
  updated_at: string
}

export interface SessionJury {
  id: string
  session_id: string
  jury_member_id: string
  status: 'pending' | 'confirmed' | 'declined'
  token: string
  email_sent_at: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
  jury_members?: JuryMember
}

export interface CreateJuryMemberInput {
  first_name: string
  last_name: string
  email: string
  company?: string
}

// ─── Jury Members ────────────────────────────────────────────────────────────

async function getJuryMembers(organizationId: string): Promise<JuryMember[]> {
  const supabase = createClient()
  const { data, error } = await db(supabase)
    .from('jury_members')
    .select('*')
    .eq('organization_id', organizationId)
    .order('last_name', { ascending: true })
  if (error) throw error
  return data || []
}

async function searchJuryMembers(
  organizationId: string,
  query: string
): Promise<JuryMember[]> {
  const supabase = createClient()
  const { data, error } = await db(supabase)
    .from('jury_members')
    .select('*')
    .eq('organization_id', organizationId)
    .or(
      `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%`
    )
    .order('last_name', { ascending: true })
    .limit(20)
  if (error) throw error
  return data || []
}

async function createJuryMember(
  organizationId: string,
  input: CreateJuryMemberInput
): Promise<JuryMember> {
  const supabase = createClient()
  const { data, error } = await db(supabase)
    .from('jury_members')
    .insert({ ...input, organization_id: organizationId })
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateJuryMember(
  id: string,
  input: Partial<CreateJuryMemberInput>
): Promise<JuryMember> {
  const supabase = createClient()
  const { data, error } = await db(supabase)
    .from('jury_members')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function deleteJuryMember(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await db(supabase)
    .from('jury_members')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Session Jury ─────────────────────────────────────────────────────────────

async function getSessionJury(sessionId: string): Promise<SessionJury[]> {
  const res = await fetch(`/api/jury/session-assignments?sessionId=${encodeURIComponent(sessionId)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Erreur ${res.status}`)
  }
  return res.json()
}

async function addJuryToSession(
  sessionId: string,
  juryMemberId: string
): Promise<SessionJury> {
  const res = await fetch('/api/jury/session-assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, juryMemberId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Erreur ${res.status}`)
  }
  return res.json()
}

async function removeJuryFromSession(sessionJuryId: string): Promise<void> {
  const res = await fetch('/api/jury/session-assignments', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionJuryId }),
  })
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Erreur ${res.status}`)
  }
}

export const juryService = {
  // Jury members
  getJuryMembers,
  searchJuryMembers,
  createJuryMember,
  updateJuryMember,
  deleteJuryMember,
  // Session jury
  getSessionJury,
  addJuryToSession,
  removeJuryFromSession,
}
