import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { filterXSS } from 'xss'
import type { SupabaseClient } from '@supabase/supabase-js'

const VALID_REASONS = ['demo', 'question', 'pricing', 'support', 'partnership', 'other']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { firstName, lastName, email, company, reason, message } = body

    if (!firstName || !lastName || !email || !reason || !message) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Objet invalide' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    const supabase = await createClient()
    const { error } = await (supabase as unknown as SupabaseClient)
      .from('contact_submissions').insert({
      first_name: filterXSS(String(firstName).slice(0, 100)),
      last_name:  filterXSS(String(lastName).slice(0, 100)),
      email:      String(email).slice(0, 200).toLowerCase(),
      company:    filterXSS(String(company || '').slice(0, 200)),
      reason,
      message:    filterXSS(String(message).slice(0, 5000)),
    })

    if (error) {
      logger.error('[contact] Supabase insert error', error)
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('[contact] Unexpected error', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
