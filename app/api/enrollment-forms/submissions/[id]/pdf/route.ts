import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { createPage } from '@/lib/utils/puppeteer-pool'
import type { FormField } from '@/lib/types/enrollment-forms'

export const runtime = 'nodejs'
export const maxDuration = 60

async function getOrgId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  return data?.organization_id ?? null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId()
  if (!orgId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient() as any

  const { data: sub, error } = await admin
    .from('enrollment_submissions')
    .select(`
      id, submitted_at, form_data, documents, status,
      students ( id, first_name, last_name, email, phone ),
      sessions ( id, name, start_date, end_date, location ),
      enrollment_form_links (
        enrollment_form_templates ( id, name, description, fields ),
        organizations ( id, name, logo_url, email )
      )
    `)
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error || !sub) {
    return NextResponse.json({ error: 'Soumission introuvable' }, { status: 404 })
  }

  const link = sub.enrollment_form_links as any
  const template = link?.enrollment_form_templates as { name: string; description: string | null; fields: FormField[] } | null
  const orgBase = link?.organizations as { name: string; logo_url: string | null; email: string | null } | null

  // Fetch full org details for premium header/footer
  const { data: orgFull } = await admin
    .from('organizations')
    .select('name, logo_url, address, city, phone, email, siret, nda_number')
    .eq('id', orgId)
    .single()

  const org = orgFull ?? orgBase
  const fields: FormField[] = template?.fields ?? []

  // Generate signed URLs for uploaded documents (1 hour)
  const docsWithUrls: Array<{ field_id: string; filename: string; url: string | null; fieldLabel: string }> = []
  for (const doc of (sub.documents ?? []) as Array<{ field_id: string; storage_path: string; filename: string }>) {
    const fieldDef = fields.find(f => f.id === doc.field_id)
    const { data: signedData } = await admin.storage
      .from('enrollments')
      .createSignedUrl(doc.storage_path, 3600)
    docsWithUrls.push({
      field_id: doc.field_id,
      filename: doc.filename,
      url: signedData?.signedUrl ?? null,
      fieldLabel: fieldDef?.label ?? doc.filename,
    })
  }

  // Embed logo as data URL (Gotenberg has no access to external URLs)
  let logoDataUrl: string | null = null
  if (org?.logo_url) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(org.logo_url, { signal: controller.signal })
      clearTimeout(timeout)
      if (res.ok) {
        const buf = await res.arrayBuffer()
        const mime = res.headers.get('content-type') ?? 'image/png'
        logoDataUrl = `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
      }
    } catch {
      // Logo unavailable — continue without
    }
  }

  // Resolve dynamic field UUIDs → human-readable labels
  const dynamicSources = [...new Set(fields.filter(f => f.dynamic_source).map(f => f.dynamic_source!))]
  const labelMaps: Record<string, Record<string, string>> = {}

  await Promise.all(dynamicSources.map(async (source) => {
    if (source === 'programs') {
      const { data } = await admin.from('programs').select('id, name').eq('organization_id', orgId)
      labelMaps.programs = Object.fromEntries((data ?? []).map((r: { id: string; name: string }) => [r.id, r.name]))
    } else if (source === 'sessions') {
      const { data } = await admin.from('sessions').select('id, name, start_date').eq('organization_id', orgId)
      labelMaps.sessions = Object.fromEntries((data ?? []).map((r: { id: string; name: string; start_date: string | null }) => [
        r.id,
        r.start_date ? `${r.name} — ${new Date(r.start_date).toLocaleDateString('fr-FR')}` : r.name,
      ]))
    } else if (source === 'funding_types') {
      const { data } = await admin.from('funding_types').select('id, name').eq('organization_id', orgId)
      labelMaps.funding_types = Object.fromEntries((data ?? []).map((r: { id: string; name: string }) => [r.id, r.name]))
    }
  }))

  const formDataEntries = Object.entries(sub.form_data as Record<string, unknown>)
    .filter(([k]) => !k.startsWith('__'))

  const html = buildFormHtml({ org, template, submission: sub, fields, formDataEntries, docsWithUrls, logoDataUrl, labelMaps })

  const studentName = sub.students
    ? `${sub.students.first_name}_${sub.students.last_name}`
    : 'formulaire'
  const filename = `inscription_${studentName}_${new Date(sub.submitted_at).toISOString().split('T')[0]}.pdf`

  let pdfBuffer: Buffer | undefined

  let gotenbergFailed = false
  if (isGotenbergConfigured()) {
    try {
      pdfBuffer = await htmlToPdf(html, {
        format: 'A4',
        marginTop: '0',
        marginBottom: '0',
        marginLeft: '0',
        marginRight: '0',
      })
    } catch {
      // Gotenberg unreachable (dev) — fall through to Puppeteer
      gotenbergFailed = true
    }
  }

  if (!isGotenbergConfigured() || gotenbergFailed) {
    // Fallback local : Puppeteer (dev sans Gotenberg)
    let page: Awaited<ReturnType<typeof createPage>> | null = null
    try {
      page = await createPage()
      await page.setContent(html, { waitUntil: 'domcontentloaded' })
      pdfBuffer = Buffer.from(await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      }))
    } finally {
      if (page) await page.close().catch(() => {})
    }
  }

  if (!pdfBuffer) {
    return NextResponse.json({ error: 'Échec génération PDF' }, { status: 500 })
  }

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function buildFormHtml({
  org,
  template,
  submission,
  fields,
  formDataEntries,
  docsWithUrls,
  logoDataUrl,
  labelMaps,
}: {
  org: { name: string; logo_url?: string | null; email?: string | null; phone?: string | null; address?: string | null; city?: string | null; siret?: string | null; nda_number?: string | null } | null
  template: { name: string; description: string | null } | null
  submission: {
    submitted_at: string
    students?: { first_name: string; last_name: string; email: string | null; phone?: string | null } | null
    sessions?: { name: string; start_date?: string | null; end_date?: string | null; location?: string | null } | null
  }
  fields: FormField[]
  formDataEntries: [string, unknown][]
  docsWithUrls: Array<{ field_id: string; filename: string; url: string | null; fieldLabel: string }>
  logoDataUrl: string | null
  labelMaps: Record<string, Record<string, string>>
}) {
  const f = (s: string | null | undefined) => s ?? ''
  const submittedAt = new Date(submission.submitted_at).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const fieldRows = formDataEntries
    .filter(([k]) => {
      const fieldDef = fields.find(fd => fd.id === k)
      return fieldDef?.type !== 'file' && fieldDef?.type !== 'separator'
    })
    .map(([key, val]) => {
      const fieldDef = fields.find(fd => fd.id === key)
      const label = fieldDef?.label ?? key
      let raw = Array.isArray(val) ? (val as string[]).join(', ') : String(val ?? '')
      if (fieldDef?.dynamic_source && raw) {
        const map = labelMaps[fieldDef.dynamic_source] ?? {}
        raw = raw.split(', ').map(v => map[v] ?? v).join(', ')
      }
      return `<tr>
        <td style="width:38%;padding:7px 12px 7px 0;font-size:9pt;font-weight:600;color:#555;border-bottom:1px solid #f0f0f0;vertical-align:top;font-family:'Times New Roman',Times,serif;">${label}</td>
        <td style="padding:7px 0 7px 12px;font-size:9.5pt;color:#1A1A1A;border-bottom:1px solid #f0f0f0;vertical-align:top;font-family:'Times New Roman',Times,serif;">${raw || '<em style="color:#bbb;font-style:italic;">Non renseign&eacute;</em>'}</td>
      </tr>`
    }).join('')

  const docsRows = docsWithUrls.map(doc => `<tr>
    <td style="width:38%;padding:7px 12px 7px 0;font-size:9pt;font-weight:600;color:#555;border-bottom:1px solid #f0f0f0;font-family:'Times New Roman',Times,serif;">${doc.fieldLabel}</td>
    <td style="padding:7px 0 7px 12px;font-size:9.5pt;border-bottom:1px solid #f0f0f0;font-family:'Times New Roman',Times,serif;">${doc.url ? `<a href="${doc.url}" style="color:#1A1A1A;text-decoration:underline;">${doc.filename}</a>` : doc.filename}</td>
  </tr>`).join('')

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" style="max-height:60px;max-width:130px;object-fit:contain;" alt="Logo" />`
    : ''

  const sessionLine = submission.sessions
    ? [
        submission.sessions.name,
        submission.sessions.start_date ? new Date(submission.sessions.start_date).toLocaleDateString('fr-FR') : null,
        submission.sessions.end_date ? `au ${new Date(submission.sessions.end_date).toLocaleDateString('fr-FR')}` : null,
      ].filter(Boolean).join(' — ')
    : null

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 15mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; color: #1A1A1A; background: white; line-height: 1.5; }
  table { border-collapse: collapse; }
</style>
</head>
<body>

  <!-- HEADER : logo droite, infos org gauche -->
  <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:4px;">
    <tr>
      <td style="vertical-align:top;padding-right:15px;">
        <p style="font-weight:bold;font-size:10pt;margin:0 0 2px 0;line-height:1.1;">${f(org?.name)}</p>
        ${org?.address ? `<p style="font-size:8pt;color:#666;margin:0;line-height:1.3;">${f(org.address)}</p>` : ''}
        ${org?.city ? `<p style="font-size:8pt;color:#666;margin:0;line-height:1.3;">${f(org.city)}</p>` : ''}
        ${org?.email ? `<p style="font-size:8pt;color:#666;margin:0;line-height:1.3;">Email : ${f(org.email)}</p>` : ''}
        ${org?.phone ? `<p style="font-size:8pt;color:#666;margin:0;line-height:1.3;">T&eacute;l : ${f(org.phone)}</p>` : ''}
      </td>
      <td style="vertical-align:top;text-align:right;white-space:nowrap;">${logoHtml}</td>
    </tr>
  </table>

  <div style="border-top:1px solid #1A1A1A;margin-bottom:18px;"></div>

  <!-- TITRE -->
  <div style="text-align:center;margin-bottom:18px;">
    <p style="font-size:14pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px 0;">${template?.name ?? 'Formulaire d\'inscription'}</p>
    ${template?.description ? `<p style="font-size:9pt;color:#666;font-style:italic;margin:0;">${template.description}</p>` : ''}
    <p style="font-size:8.5pt;color:#888;margin:4px 0 0 0;">D&eacute;pos&eacute; le ${submittedAt}</p>
  </div>

  <!-- CANDIDAT + SESSION -->
  <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:18px;border:1px solid #e5e7eb;">
    <tr>
      <td style="padding:10px 14px;vertical-align:top;width:50%;border-right:1px solid #e5e7eb;">
        <p style="font-size:7pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;color:#888;margin:0 0 4px 0;">Candidat</p>
        ${submission.students ? `
          <p style="font-size:10.5pt;font-weight:bold;margin:0;">${submission.students.first_name} ${submission.students.last_name}</p>
          ${submission.students.email ? `<p style="font-size:8.5pt;color:#555;margin:1px 0 0 0;">${submission.students.email}</p>` : ''}
          ${submission.students.phone ? `<p style="font-size:8.5pt;color:#555;margin:1px 0 0 0;">${submission.students.phone}</p>` : ''}
        ` : '<p style="font-size:9pt;color:#bbb;font-style:italic;margin:0;">Non renseign&eacute;</p>'}
      </td>
      <td style="padding:10px 14px;vertical-align:top;">
        <p style="font-size:7pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;color:#888;margin:0 0 4px 0;">Session</p>
        ${sessionLine ? `<p style="font-size:10pt;font-weight:bold;margin:0;">${sessionLine}</p>` : '<p style="font-size:9pt;color:#bbb;font-style:italic;margin:0;">Non renseign&eacute;</p>'}
        ${submission.sessions?.location ? `<p style="font-size:8.5pt;color:#555;margin:1px 0 0 0;">Lieu : ${submission.sessions.location}</p>` : ''}
      </td>
    </tr>
  </table>

  <!-- CHAMPS DU FORMULAIRE -->
  <p style="font-size:7.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.7px;color:#888;border-bottom:1px solid #1A1A1A;padding-bottom:3px;margin-bottom:10px;">Renseignements du candidat</p>
  <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:22px;">
    <tbody>
      ${fieldRows || '<tr><td colspan="2" style="font-size:9pt;color:#bbb;font-style:italic;padding:6px 0;">Aucune donn&eacute;e</td></tr>'}
    </tbody>
  </table>

  ${docsWithUrls.length > 0 ? `
  <!-- DOCUMENTS -->
  <p style="font-size:7.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.7px;color:#888;border-bottom:1px solid #1A1A1A;padding-bottom:3px;margin-bottom:10px;">Documents fournis</p>
  <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:22px;">
    <tbody>${docsRows}</tbody>
  </table>
  ` : ''}

  <!-- SIGNATURES -->
  <p style="font-size:7.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.7px;color:#888;border-bottom:1px solid #1A1A1A;padding-bottom:3px;margin-bottom:16px;">Signatures</p>
  <p style="text-align:center;font-size:9pt;color:#555;margin-bottom:22px;">Fait &agrave; ${f(org?.city) || '___________'}, le _______________</p>
  <table cellpadding="0" cellspacing="0" style="width:100%;">
    <tr>
      <td style="width:48%;text-align:center;vertical-align:top;padding:0 10px;">
        <p style="font-size:9pt;font-weight:bold;margin:0 0 4px 0;">Signature du candidat</p>
        <p style="font-size:8pt;color:#888;font-style:italic;margin:0 0 55px 0;">Lu et approuv&eacute;</p>
        <div style="border-top:1px solid #1A1A1A;padding-top:5px;">
          ${submission.students ? `<p style="font-size:8.5pt;color:#555;">${submission.students.first_name} ${submission.students.last_name}</p>` : ''}
        </div>
      </td>
      <td style="width:4%;"></td>
      <td style="width:48%;text-align:center;vertical-align:top;padding:0 10px;">
        <p style="font-size:9pt;font-weight:bold;margin:0 0 4px 0;">Cachet et signature de l'organisme</p>
        <p style="font-size:8pt;color:#888;font-style:italic;margin:0 0 55px 0;">${f(org?.name)}</p>
        <div style="border-top:1px solid #1A1A1A;padding-top:5px;">
          <p style="font-size:8.5pt;color:#555;">&nbsp;</p>
        </div>
      </td>
    </tr>
  </table>

  <!-- FOOTER -->
  <div style="margin-top:30px;padding-top:6px;background:#fafafa;">
    <p style="font-size:6.5pt;color:#1A1A1A;text-align:center;margin:0;font-weight:500;line-height:1.3;">
      ${f(org?.name)}${org?.address ? ` | ${f(org.address)} ${f(org.city)}` : ''}${org?.siret ? ` | SIRET : ${f(org.siret)}` : ''}
    </p>
    ${org?.nda_number ? `<p style="font-size:6.5pt;color:#666;text-align:center;margin:1px 0 0 0;line-height:1.2;">D&eacute;claration d'activit&eacute; : ${f(org.nda_number)}</p>` : ''}
  </div>

</body>
</html>`
}
