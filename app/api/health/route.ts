/**
 * Health check public — pour monitoring uptime (UptimeRobot, Better Uptime, etc.)
 * GET /api/health : pas d'auth, vérifie Supabase + optionnellement Gotenberg.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isGotenbergConfigured } from '@/lib/services/gotenberg.service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const checks: Record<string, string> = {
    status: 'ok',
  }

  // Supabase : 1 requête légère
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const { error } = await supabase.from('organizations').select('id').limit(1).maybeSingle()
      checks.supabase = error ? `error: ${error.message}` : 'ok'
    } catch (e) {
      checks.supabase = e instanceof Error ? e.message : 'error'
    }
  } else {
    checks.supabase = 'missing_env'
  }

  // Gotenberg : optionnel, seulement si configuré
  if (isGotenbergConfigured()) {
    const gotenbergUrl = process.env.GOTENBERG_URL?.replace(/\/$/, '')
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 3000)
      const res = await fetch(`${gotenbergUrl}/ping`, { method: 'GET', signal: ctrl.signal })
      clearTimeout(t)
      checks.gotenberg = res.ok ? 'ok' : `status ${res.status}`
    } catch (e) {
      checks.gotenberg = e instanceof Error ? e.message : 'error'
    }
  } else {
    checks.gotenberg = 'not_configured'
  }

  const allOk =
    checks.supabase === 'ok' &&
    (checks.gotenberg === 'ok' || checks.gotenberg === 'not_configured')

  return NextResponse.json(checks, {
    status: allOk ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
