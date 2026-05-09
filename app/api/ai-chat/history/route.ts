import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// ai_conversations isn't in the generated types yet (migration pending),
// so we use a plain SupabaseClient type to bypass the strict schema check.
type Db = SupabaseClient

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ messages: [] }, { status: 401 })

  const db = supabase as unknown as Db
  const { data } = await db
    .from('ai_conversations')
    .select('messages')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ messages: (data as { messages: unknown[] } | null)?.messages ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ ok: false }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { messages } = (await req.json()) as { messages: unknown[] }

  const db = supabase as unknown as Db
  await db
    .from('ai_conversations')
    .upsert(
      {
        user_id: user.id,
        organization_id: profile?.organization_id ?? '',
        messages,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  return NextResponse.json({ ok: true })
}
