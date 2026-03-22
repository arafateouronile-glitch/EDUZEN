/**
 * GET /api/affiliate/track?ref=AFFILIATE_ID
 * Enregistre un clic affilié et pose un cookie (60 jours) pour attribution à la conversion.
 * À appeler côté client quand l'utilisateur arrive avec ?ref= dans l'URL.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

const COOKIE_NAME = 'eduzen_affiliate_ref'
const COOKIE_DAYS = 60

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get('ref')?.trim()
  if (!ref) {
    return new NextResponse(null, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id')
      .eq('id', ref)
      .eq('status', 'approved')
      .maybeSingle()

    if (!affiliate) {
      return NextResponse.json({ error: 'Affilié invalide ou inactif' }, { status: 404 })
    }

    const visitorId = request.headers.get('x-visitor-id') || request.nextUrl.searchParams.get('vid') || crypto.randomUUID()
    const { error } = await supabase.from('affiliate_referrals').insert({
      affiliate_id: ref,
      type: 'click',
      visitor_id: visitorId,
    })

    if (error) {
      logger.warn('[affiliate/track] insert click', { error })
    }

    const maxAge = COOKIE_DAYS * 24 * 60 * 60
    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, ref, {
      path: '/',
      maxAge,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    })
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (e) {
    logger.error('[affiliate/track]', e)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
