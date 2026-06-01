import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { filterXSS } from 'xss'
import { logger } from '@/lib/utils/logger'

const VALID_PROFILES = ['formateur', 'consultant', 'blogueur', 'conseiller', 'autre']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { firstName, lastName, email, companyName, profileType, website, message } = body

    if (!firstName || !lastName || !email || !profileType) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    if (!VALID_PROFILES.includes(profileType)) {
      return NextResponse.json({ error: 'Profil invalide' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check for duplicate email
    const { data: existing } = await admin
      .from('affiliates')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Une candidature existe déjà pour cet email.' },
        { status: 409 }
      )
    }

    const { error } = await admin.from('affiliates').insert({
      full_name: filterXSS(`${String(firstName).trim()} ${String(lastName).trim()}`.slice(0, 200)),
      email: String(email).toLowerCase().slice(0, 200),
      company_name: companyName ? filterXSS(String(companyName).slice(0, 200)) : null,
      status: 'pending',
      metadata: {
        profile_type: profileType,
        website: website ? String(website).slice(0, 300) : null,
        message: message ? filterXSS(String(message).slice(0, 2000)) : null,
      },
    })

    if (error) {
      logger.error('[affiliate/apply] insert error', error)
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error('[affiliate/apply] unexpected error', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
