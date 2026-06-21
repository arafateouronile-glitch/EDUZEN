import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { createPage } from '@/lib/utils/puppeteer-pool'
import { buildTeacherConventionHtml } from '@/lib/utils/teacher-convention/build-html'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ConventionBody {
  teacher: {
    user_id: string
    full_name: string
    email: string
    specialization?: string | null
  }
  convention: {
    period_start: string
    period_end: string
    session_name?: string | null
    hourly_rate?: number | null
    total_hours?: number | null
    daily_rate?: number | null
    intervention_days?: number | null
    specialization?: string | null
    custom_notes?: string | null
  }
}

export async function POST(request: NextRequest) {
  let page: Awaited<ReturnType<typeof createPage>> | null = null
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, organization_id')
      .eq('id', user.id)
      .single()

    if (!userData || !['admin', 'secretary'].includes(userData.role ?? '')) {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    const body = await request.json() as ConventionBody

    if (!body.teacher?.user_id || !body.convention?.period_start || !body.convention?.period_end) {
      return NextResponse.json({ error: 'Données incomplètes (enseignant, période requise)' }, { status: 400 })
    }

    // Récupérer les infos de l'organisation
    const { data: org } = await supabase
      .from('organizations')
      .select('name, address, city, email, phone, siret, nda_number')
      .eq('id', userData.organization_id!)
      .single()

    const html = buildTeacherConventionHtml({
      teacher: {
        full_name:      body.teacher.full_name,
        email:          body.teacher.email,
        specialization: body.teacher.specialization ?? body.convention.specialization ?? null,
      },
      convention: {
        period_start:      body.convention.period_start,
        period_end:        body.convention.period_end,
        session_name:      body.convention.session_name ?? null,
        daily_rate:        body.convention.daily_rate ?? null,
        hourly_rate:       body.convention.hourly_rate ?? null,
        intervention_days: body.convention.intervention_days ?? null,
        total_hours:       body.convention.total_hours ?? null,
        custom_notes:      body.convention.custom_notes ?? null,
      },
      org: {
        name:       (org as Record<string,unknown> | null)?.name as string ?? null,
        address:    (org as Record<string,unknown> | null)?.address as string ?? null,
        city:       (org as Record<string,unknown> | null)?.city as string ?? null,
        email:      (org as Record<string,unknown> | null)?.email as string ?? null,
        phone:      (org as Record<string,unknown> | null)?.phone as string ?? null,
        siret:      (org as Record<string,unknown> | null)?.siret as string ?? null,
        nda_number: (org as Record<string,unknown> | null)?.nda_number as string ?? null,
      },
    })

    // Génération PDF via Gotenberg (ou Puppeteer en fallback)
    if (isGotenbergConfigured()) {
      const pdfBuffer = await htmlToPdf(html, { format: 'A4', marginTop: '0.98in', marginBottom: '0.98in', marginLeft: '0.79in', marginRight: '0.79in' })
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="convention-${body.teacher.full_name.replace(/\s+/g, '-')}.pdf"`,
        },
      })
    }

    if (process.env.VERCEL === '1') {
      return NextResponse.json({ error: 'Génération PDF indisponible sur Vercel sans Gotenberg' }, { status: 503 })
    }

    page = await createPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '25mm', bottom: '25mm', left: '20mm', right: '20mm' },
    })
    await page.close()
    page = null

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="convention-${body.teacher.full_name.replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (error: unknown) {
    if (page) { try { await page.close() } catch {} }
    logger.error('Erreur génération convention formateur', error)
    return NextResponse.json({ error: 'Erreur lors de la génération de la convention' }, { status: 500 })
  }
}
