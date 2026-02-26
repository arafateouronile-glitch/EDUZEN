import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Déconnexion côté serveur : vide les cookies de session Supabase puis redirige vers /auth/login.
 * Garantit que le middleware ne voit plus l'utilisateur après déconnexion.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const url = request.nextUrl.clone()
  url.pathname = '/auth/login'
  return NextResponse.redirect(url, { status: 302 })
}
