/**
 * GET /api/auditor/entity-pdf?token=XXX&type=program&id=ENTITY_ID
 * Génère le PDF du document source d'une entité (programme, session…)
 * via le token auditeur — pas de cookie auth requis.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { AuditorPortalService } from '@/lib/services/auditor-portal.service'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import { extractDocumentVariables } from '@/lib/utils/document-generation/variable-extractor'
import { logger } from '@/lib/utils/logger'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { createPage } from '@/lib/utils/puppeteer-pool'

export const runtime = 'nodejs'
export const maxDuration = 30

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function generatePdfFromHtml(html: string): Promise<Buffer> {
  if (isGotenbergConfigured()) {
    try {
      const buf = await Promise.race([
        htmlToPdf(html, {
          format: 'A4',
          marginTop: '0.6in',
          marginBottom: '0.6in',
          marginLeft: '0.7in',
          marginRight: '0.7in',
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gotenberg timeout')), 8000)),
      ])
      if (buf && buf.length > 0) return buf
    } catch {
      logger.warn('[entity-pdf] Gotenberg unavailable, falling back to Puppeteer')
    }
  }

  let page: Awaited<ReturnType<typeof createPage>> | null = null
  try {
    page = await createPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const buf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0.6in', bottom: '0.6in', left: '0.7in', right: '0.7in' },
    })
    return Buffer.from(buf)
  } finally {
    await page?.close()
  }
}

/** HTML simple pour les types d'entité sans template dédié */
function buildEntitySummaryHtml(
  entityType: string,
  entityId: string,
  entityName: string,
  orgName: string,
  data: Record<string, unknown>
): string {
  const labelMap: Record<string, string> = {
    session: 'Session de formation',
    student: 'Apprenant',
    teacher: 'Formateur',
    document: 'Document',
    evaluation: 'Évaluation',
    contract: 'Contrat',
    accessibility: 'Accessibilité',
  }
  const typeLabel = labelMap[entityType] ?? entityType

  const rows = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `
      <tr>
        <td style="padding:7px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-size:11pt;color:#374151;">${k}</td>
        <td style="padding:7px 12px;border:1px solid #e5e7eb;font-size:11pt;color:#111827;">${typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
      </tr>
    `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111827; padding: 32px; }
  h1 { font-size: 9pt; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #6b7280; }
  h2 { font-size: 16pt; font-weight: bold; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #9ca3af; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div style="border-bottom:2px solid #000;padding-bottom:16px;margin-bottom:24px;">
    <h1>${typeLabel}</h1>
    <h2>${entityName}</h2>
    <p style="font-size:10pt;color:#6b7280;margin-top:4px;">${orgName}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th style="padding:7px 12px;border:1px solid #e5e7eb;background:#f3f4f6;text-align:left;">Propriété</th>
        <th style="padding:7px 12px;border:1px solid #e5e7eb;background:#f3f4f6;text-align:left;">Valeur</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:12px;font-size:9pt;color:#9ca3af;">ID : ${entityId}</p>
  <div class="footer">
    <span>Généré le ${new Date().toLocaleString('fr-FR')} via EDUZEN</span>
    <span>Portail Auditeur — Lecture seule</span>
  </div>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const entityType = searchParams.get('type')
  const entityId = searchParams.get('id')

  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'type et id requis' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  let orgId: string

  if (token) {
    const service = new AuditorPortalService(supabase)
    const link = await service.validateToken(token)
    if (!link) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    }
    orgId = link.organization_id
  } else {
    // Mode preview : authentification par session
    const sessionClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 403 })
    }
    orgId = userData.organization_id
  }

  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    const orgName = org?.name ?? 'Organisme de formation'

    let html: string
    let filename: string

    if (entityType === 'program') {
      // Programme → générer via le template configuré
      const { data: program } = await supabase
        .from('programs')
        .select('*')
        .eq('id', entityId)
        .eq('organization_id', orgId)
        .single()

      if (!program) {
        return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })
      }

      const templateService = new DocumentTemplateService(supabase)
      const template = await templateService.getDefaultTemplate(orgId, 'programme')

      if (template) {
        const variables = extractDocumentVariables({
          program: { ...program, formations: [] } as Parameters<typeof extractDocumentVariables>[0]['program'],
          organization: org as Parameters<typeof extractDocumentVariables>[0]['organization'],
          language: 'fr',
          issueDate: new Date().toISOString(),
        })
        const { generateHTML } = await import('@/lib/utils/document-generation/html-generator')
        const result = await generateHTML(template, variables)
        html = result.html
      } else {
        // Pas de template → résumé générique
        html = buildEntitySummaryHtml('program', entityId, program.name ?? 'Programme', orgName, {
          Nom: program.name,
          Description: program.description,
          Objectifs: program.pedagogical_objectives,
          'Public cible': program.learner_profile,
          Prérequis: program.prerequisites,
          Durée: program.duration_days ? `${program.duration_days} jours` : undefined,
          Prix: program.price ? `${program.price} €` : undefined,
          Modalités: program.modalities,
        })
      }
      filename = `programme-${(program.name ?? 'formation').replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

    } else if (entityType === 'session') {
      const { data: session } = await supabase
        .from('sessions')
        .select('*, formations(name)')
        .eq('id', entityId)
        .eq('organization_id', orgId)
        .single()

      if (!session) {
        return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
      }

      const formation = (session as any).formations
      html = buildEntitySummaryHtml('session', entityId, formation?.name ?? 'Session', orgName, {
        Formation: formation?.name,
        'Date début': session.start_date,
        'Date fin': session.end_date,
        Lieu: (session as any).location,
        Statut: session.status,
        'Capacité max': session.max_students,
      })
      filename = `session-${entityId.slice(0, 8)}.pdf`

    } else if (entityType === 'teacher') {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', entityId)
        .eq('organization_id', orgId)
        .single()

      if (!teacher) {
        return NextResponse.json({ error: 'Formateur introuvable' }, { status: 404 })
      }

      const name = [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || 'Formateur'
      html = buildEntitySummaryHtml('teacher', entityId, name, orgName, {
        Prénom: teacher.first_name,
        Nom: teacher.last_name,
        Email: teacher.email,
        Spécialisation: (teacher as any).specialization,
        Statut: teacher.is_active ? 'Actif' : 'Inactif',
      })
      filename = `formateur-${name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

    } else {
      // Type non supporté → résumé générique à partir des données evidence
      html = buildEntitySummaryHtml(entityType, entityId, entityId, orgName, {
        'Type d\'entité': entityType,
        ID: entityId,
      })
      filename = `entite-${entityType}-${entityId.slice(0, 8)}.pdf`
    }

    const pdfBuffer = await generatePdfFromHtml(html)

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return NextResponse.json({ error: 'Échec de génération PDF' }, { status: 500 })
    }

    return new NextResponse(pdfBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    logger.error('[entity-pdf] Error:', error)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
