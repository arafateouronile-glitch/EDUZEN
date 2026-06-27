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
  const org = link?.organizations as { name: string; logo_url: string | null; email: string | null } | null
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

  const formDataEntries = Object.entries(sub.form_data as Record<string, unknown>)
    .filter(([k]) => !k.startsWith('__'))

  const html = buildFormHtml({ org, template, submission: sub, fields, formDataEntries, docsWithUrls, logoDataUrl })

  const studentName = sub.students
    ? `${sub.students.first_name}_${sub.students.last_name}`
    : 'formulaire'
  const filename = `inscription_${studentName}_${new Date(sub.submitted_at).toISOString().split('T')[0]}.pdf`

  let pdfBuffer: Buffer

  if (isGotenbergConfigured()) {
    pdfBuffer = await htmlToPdf(html, {
      format: 'A4',
      marginTop: '0',
      marginBottom: '0',
      marginLeft: '0',
      marginRight: '0',
    })
  } else {
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

  return new NextResponse(pdfBuffer, {
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
}: {
  org: { name: string; logo_url: string | null; email: string | null } | null
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
}) {
  const submittedAt = new Date(submission.submitted_at).toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const sessionHtml = submission.sessions ? `
    <div class="meta-card">
      <span class="meta-label">Session</span>
      <span class="meta-value">${submission.sessions.name}</span>
      ${submission.sessions.start_date ? `<span class="meta-value small">${new Date(submission.sessions.start_date).toLocaleDateString('fr-FR')}${submission.sessions.end_date ? ` &rarr; ${new Date(submission.sessions.end_date).toLocaleDateString('fr-FR')}` : ''}</span>` : ''}
      ${submission.sessions.location ? `<span class="meta-value small">Lieu : ${submission.sessions.location}</span>` : ''}
    </div>
  ` : ''

  const fieldRows = formDataEntries
    .filter(([k]) => {
      const fieldDef = fields.find(f => f.id === k)
      return fieldDef?.type !== 'file' && fieldDef?.type !== 'separator'
    })
    .map(([key, val]) => {
      const fieldDef = fields.find(f => f.id === key)
      const label = fieldDef?.label ?? key
      const display = Array.isArray(val)
        ? (val as string[]).join(', ')
        : String(val ?? '')
      return `
        <tr>
          <td class="field-label">${label}</td>
          <td class="field-value">${display || '<em class="empty">Non renseign&eacute;</em>'}</td>
        </tr>
      `
    }).join('')

  const docsHtml = docsWithUrls.length > 0 ? `
    <div class="section-block">
      <h3 class="section-title">Documents fournis</h3>
      <table class="fields-table">
        <tbody>
          ${docsWithUrls.map(doc => `
            <tr>
              <td class="field-label">${doc.fieldLabel}</td>
              <td class="field-value">
                ${doc.url
                  ? `<a href="${doc.url}" class="doc-link">${doc.filename}</a>`
                  : doc.filename
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    color: #1a1a2e;
    background: white;
    line-height: 1.5;
  }

  .top-band {
    background: #15263f;
    padding: 28px 40px 24px;
    color: white;
  }

  .org-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 18px;
  }

  .org-logo {
    width: 56px;
    height: 56px;
    object-fit: contain;
    background: white;
    border-radius: 8px;
    padding: 4px;
    flex-shrink: 0;
  }

  .org-logo-placeholder {
    width: 56px;
    height: 56px;
    background: rgba(255,255,255,0.15);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18pt;
    font-weight: 700;
    color: rgba(255,255,255,0.7);
    flex-shrink: 0;
    line-height: 1;
  }

  .org-name {
    font-size: 16pt;
    font-weight: 700;
  }

  .org-email {
    font-size: 9pt;
    color: rgba(255,255,255,0.6);
    margin-top: 2px;
  }

  .form-title {
    font-size: 20pt;
    font-weight: 800;
    margin-bottom: 4px;
  }

  .form-desc {
    font-size: 10pt;
    color: rgba(255,255,255,0.7);
  }

  .accent-band {
    height: 4px;
    background: #335ACF;
  }

  .meta-row {
    display: flex;
    gap: 12px;
    padding: 14px 40px;
    background: #f8f9fa;
    border-bottom: 1px solid #e5e7eb;
    flex-wrap: wrap;
  }

  .meta-card {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .meta-label {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #9ca3af;
  }

  .meta-value {
    font-size: 9.5pt;
    font-weight: 600;
    color: #374151;
  }

  .meta-value.small {
    font-size: 8.5pt;
    font-weight: 400;
    color: #6b7280;
  }

  .meta-sep {
    width: 1px;
    background: #e5e7eb;
    margin: 4px 12px;
    align-self: stretch;
  }

  .body {
    padding: 28px 40px 40px;
  }

  .section-block {
    margin-bottom: 28px;
  }

  .section-title {
    font-size: 9pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #335ACF;
    border-bottom: 1.5px solid #335ACF;
    padding-bottom: 6px;
    margin-bottom: 14px;
  }

  .fields-table {
    width: 100%;
    border-collapse: collapse;
  }

  .fields-table tr:last-child td {
    border-bottom: none;
  }

  .field-label {
    width: 38%;
    padding: 9px 12px 9px 0;
    font-size: 9.5pt;
    font-weight: 600;
    color: #6b7280;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }

  .field-value {
    padding: 9px 0 9px 12px;
    font-size: 10pt;
    color: #111827;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
  }

  .empty {
    color: #d1d5db;
    font-style: italic;
  }

  .doc-link {
    color: #335ACF;
    text-decoration: none;
    font-weight: 500;
  }

  .signature-row {
    display: flex;
    gap: 24px;
  }

  .signature-box {
    flex: 1;
    border: 1.5px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    min-height: 90px;
  }

  .signature-box-label {
    font-size: 8.5pt;
    font-weight: 700;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .signature-box-hint {
    font-size: 8pt;
    color: #d1d5db;
    font-style: italic;
  }

  .footer {
    margin-top: 32px;
    padding-top: 14px;
    border-top: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-text {
    font-size: 8pt;
    color: #d1d5db;
  }

  .badge {
    display: inline-block;
    background: #f0f4ff;
    color: #335ACF;
    font-size: 8pt;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 99px;
    border: 1px solid #c7d7fd;
  }
</style>
</head>
<body>

  <div class="top-band">
    <div class="org-header">
      ${logoDataUrl
        ? `<img src="${logoDataUrl}" class="org-logo" alt="Logo" />`
        : `<div class="org-logo-placeholder">${(org?.name ?? 'OF').substring(0, 2).toUpperCase()}</div>`
      }
      <div>
        <div class="org-name">${org?.name ?? 'Organisme de formation'}</div>
        ${org?.email ? `<div class="org-email">${org.email}</div>` : ''}
      </div>
    </div>
    <div class="form-title">${template?.name ?? 'Formulaire d\'inscription'}</div>
    ${template?.description ? `<div class="form-desc">${template.description}</div>` : ''}
  </div>

  <div class="accent-band"></div>

  <div class="meta-row">
    <div class="meta-card">
      <span class="meta-label">Date de soumission</span>
      <span class="meta-value">${submittedAt}</span>
    </div>
    ${submission.students ? `
    <div class="meta-sep"></div>
    <div class="meta-card">
      <span class="meta-label">Candidat</span>
      <span class="meta-value">${submission.students.first_name} ${submission.students.last_name}</span>
      ${submission.students.email ? `<span class="meta-value small">${submission.students.email}</span>` : ''}
    </div>
    ` : ''}
    ${sessionHtml ? `<div class="meta-sep"></div>${sessionHtml}` : ''}
  </div>

  <div class="body">

    <div class="section-block">
      <h3 class="section-title">Renseignements du candidat</h3>
      <table class="fields-table">
        <tbody>
          ${fieldRows || '<tr><td colspan="2" style="color:#d1d5db;font-style:italic;padding:8px 0;">Aucune donn&eacute;e</td></tr>'}
        </tbody>
      </table>
    </div>

    ${docsHtml}

    <div class="section-block">
      <h3 class="section-title">Signatures</h3>
      <div class="signature-row">
        <div class="signature-box">
          <div class="signature-box-label">Signature du candidat</div>
          <div class="signature-box-hint">Lu et approuv&eacute;</div>
        </div>
        <div class="signature-box">
          <div class="signature-box-label">Cachet et signature de l'organisme</div>
          <div class="signature-box-hint">${org?.name ?? ''}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-text">Document g&eacute;n&eacute;r&eacute; le ${new Date().toLocaleDateString('fr-FR')} &mdash; ${org?.name ?? ''}</div>
      <div class="footer-text"><span class="badge">EduZen</span></div>
    </div>

  </div>

</body>
</html>`
}
