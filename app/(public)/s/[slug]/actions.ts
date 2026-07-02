'use server'

import { createAdminClient as createClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { headers } from 'next/headers'
import type { FormField } from '@/lib/types/enrollment-forms'

// Simple rate-limit store (in-memory, resets on redeploy — sufficient for Vercel)
const ipSubmissions = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipSubmissions.get(ip)
  if (!entry || entry.resetAt < now) {
    ipSubmissions.set(ip, { count: 1, resetAt: now + 3_600_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

interface SubmitResult {
  success: boolean
  error?: string
}

export async function submitEnrollmentForm(
  token: string,
  rawData: Record<string, string | string[] | null>,
  files: Record<string, { name: string; type: string; base64: string; size: number }>
): Promise<SubmitResult> {
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown'

  // Honeypot check — field name is "website"
  if (rawData['__hp_website']) return { success: false, error: 'Spam détecté' }

  if (!checkRateLimit(ip)) {
    return { success: false, error: 'Trop de soumissions. Réessayez dans une heure.' }
  }

  const supabase = createClient() as any

  // 1. Reload and validate the link
  const { data: link, error: linkError } = await supabase
    .from('enrollment_form_links')
    .select(`
      id, org_id, session_id, expires_at, max_uses, current_uses, is_active,
      enrollment_form_templates ( id, fields ),
      organizations ( id, name, email )
    `)
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (linkError || !link) return { success: false, error: 'Lien invalide' }
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return { success: false, error: 'Ce formulaire a expiré' }
  }
  if (link.max_uses !== null && link.current_uses >= link.max_uses) {
    return { success: false, error: 'Limite d\'inscriptions atteinte' }
  }

  const template = link.enrollment_form_templates as { id: string; fields: FormField[] } | null
  if (!template) return { success: false, error: 'Template introuvable' }

  // 2. Validate required fields
  for (const field of template.fields) {
    if (field.required && field.type !== 'separator' && field.type !== 'file') {
      const val = rawData[field.id]
      const isEmpty = !val || (Array.isArray(val) && val.length === 0) || val === ''
      if (isEmpty) {
        return { success: false, error: `Le champ "${field.label}" est obligatoire.` }
      }
    }
    if (field.required && field.type === 'file' && !files[field.id]) {
      return { success: false, error: `Le document "${field.label}" est obligatoire.` }
    }
  }

  // 3. Build student data from mapped fields
  const studentData: Record<string, string | null> = {}
  const customFields: Record<string, string> = {}
  const enrollmentExtra: { session_id?: string; program_id?: string; funding_type_id?: string } = {}

  for (const field of template.fields) {
    if (!field.maps_to || field.type === 'separator' || field.type === 'file') continue
    const value = rawData[field.id]
    const strVal = Array.isArray(value) ? value.join(', ') : (value ?? null)

    if (field.maps_to.startsWith('student.')) {
      const key = field.maps_to.replace('student.', '')
      if (key.startsWith('custom_field_')) {
        customFields[key] = strVal ?? ''
      } else {
        const dbKey = key === 'birth_date' ? 'date_of_birth' : key
        studentData[dbKey] = strVal
      }
    } else if (field.maps_to === 'enrollment.session_id' && strVal) {
      enrollmentExtra.session_id = strVal
    } else if (field.maps_to === 'enrollment.program_id' && strVal) {
      enrollmentExtra.program_id = strVal
    } else if (field.maps_to === 'enrollment.funding_type_id' && strVal) {
      enrollmentExtra.funding_type_id = strVal
    }
  }

  // 4. Create or update student
  const email = studentData['email']
  let studentId: string

  if (email) {
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('organization_id', link.org_id)
      .eq('email', email)
      .single()

    if (existing) {
      const { error: updateErr } = await supabase
        .from('students')
        .update({
          ...studentData,
          custom_fields: customFields,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (updateErr) return { success: false, error: 'Erreur mise à jour apprenant' }
      studentId = existing.id
    } else {
      const studentNumber = `ETU-${Date.now()}`
      const { data: newStudent, error: insertErr } = await supabase
        .from('students')
        .insert({
          organization_id: link.org_id,
          student_number: studentNumber,
          first_name: studentData['first_name'] ?? 'Inconnu',
          last_name: studentData['last_name'] ?? '',
          ...studentData,
          custom_fields: customFields,
        })
        .select('id')
        .single()

      if (insertErr || !newStudent) {
        return { success: false, error: 'Erreur création apprenant: ' + insertErr?.message }
      }
      studentId = newStudent.id
    }
  } else {
    const studentNumber = `ETU-${Date.now()}`
    const { data: newStudent, error: insertErr } = await supabase
      .from('students')
      .insert({
        organization_id: link.org_id,
        student_number: studentNumber,
        first_name: studentData['first_name'] ?? 'Inconnu',
        last_name: studentData['last_name'] ?? '',
        ...studentData,
        custom_fields: customFields,
      })
      .select('id')
      .single()

    if (insertErr || !newStudent) {
      return { success: false, error: 'Erreur création apprenant' }
    }
    studentId = newStudent.id
  }

  // 5. Upload files
  const submissionId = crypto.randomUUID()
  const uploadedDocs: Array<{ field_id: string; storage_path: string; filename: string }> = []

  for (const [fieldId, file] of Object.entries(files)) {
    const base64Data = file.base64.split(',')[1] ?? file.base64
    const buffer = Buffer.from(base64Data, 'base64')
    const path = `org_${link.org_id}/submissions/${submissionId}/${fieldId}/${file.name}`

    const { error: uploadErr } = await supabase.storage
      .from('enrollments')
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (!uploadErr) {
      uploadedDocs.push({ field_id: fieldId, storage_path: path, filename: file.name })
    }
  }

  // 6. Create enrollment in session if session_id present and not already enrolled
  // Field-selected session_id takes priority over link's session_id
  const effectiveSessionId = enrollmentExtra.session_id ?? link.session_id ?? null

  if (effectiveSessionId && studentId) {
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('session_id', effectiveSessionId)
      .eq('student_id', studentId)
      .single()

    if (!existingEnrollment) {
      const { error: enrollErr } = await supabase
        .from('enrollments')
        .insert({
          session_id: effectiveSessionId,
          student_id: studentId,
          status: 'pending',
          total_amount: 0,
          enrollment_date: new Date().toISOString().split('T')[0],
          ...(enrollmentExtra.funding_type_id ? { funding_type_id: enrollmentExtra.funding_type_id } : {}),
        })
      if (enrollErr) {
        console.error('[enrollment-form] enrollment insert error:', enrollErr.message)
      }
    }
  }

  // 7. Save submission
  await supabase.from('enrollment_submissions').insert({
    id: submissionId,
    link_id: link.id,
    org_id: link.org_id,
    session_id: effectiveSessionId,
    student_id: studentId,
    form_data: rawData,
    documents: uploadedDocs,
    status: 'student_created',
    ip_address: ip,
  })

  // 8. Increment counter
  await supabase
    .from('enrollment_form_links')
    .update({ current_uses: link.current_uses + 1 })
    .eq('id', link.id)

  // 9. Confirmation email to student
  const org = link.organizations as { name: string; email: string | null } | null
  if (email && org) {
    await sendEmailViaResend({
      to: email,
      subject: `${org.name} — Confirmation d'inscription`,
      html: buildConfirmationEmail({
        orgName: org.name,
        studentName: `${studentData['first_name'] ?? ''} ${studentData['last_name'] ?? ''}`.trim(),
        email,
      }),
    })

    // Notification to org
    if (org.email) {
      await sendEmailViaResend({
        to: org.email,
        subject: `Nouvelle inscription via formulaire — ${studentData['first_name']} ${studentData['last_name']}`,
        html: buildOrgNotificationEmail({
          orgName: org.name,
          studentName: `${studentData['first_name'] ?? ''} ${studentData['last_name'] ?? ''}`.trim(),
          email,
        }),
      })
    }
  }

  return { success: true }
}

function buildConfirmationEmail({
  orgName,
  studentName,
  email,
}: {
  orgName: string
  studentName: string
  email: string
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#15263f;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="padding:40px;text-align:center;">
          <div style="font-family:'Syne',Arial,sans-serif;font-size:24px;font-weight:700;color:#34B9EE;margin-bottom:8px;">${orgName}</div>
          <div style="width:60px;height:3px;background:linear-gradient(135deg,#335ACF,#34B9EE);margin:0 auto 32px;border-radius:2px;"></div>
          <div style="font-size:48px;margin-bottom:24px;">✅</div>
          <h1 style="color:#ffffff;font-size:22px;font-weight:600;margin:0 0 16px;">Votre inscription a bien été reçue !</h1>
          <p style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;margin:0 0 24px;">
            Bonjour ${studentName || email},<br><br>
            Nous avons bien reçu votre formulaire d'inscription.
            Votre dossier est en cours de traitement et nous reviendrons vers vous prochainement.
          </p>
          <div style="background:rgba(255,255,255,0.06);border-radius:10px;padding:16px;margin-top:24px;">
            <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">
              Cet email a été envoyé à ${email}
            </p>
          </div>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
          <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0;">${orgName} — Propulsé par EduZen</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildOrgNotificationEmail({
  orgName,
  studentName,
  email,
}: {
  orgName: string
  studentName: string
  email: string
}) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:40px 20px;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:32px;">
    <h2 style="color:#274472;margin:0 0 16px;">Nouvelle inscription reçue</h2>
    <p><strong>Nom :</strong> ${studentName}</p>
    <p><strong>Email :</strong> ${email}</p>
    <p style="color:#666;font-size:13px;margin-top:24px;">Via le formulaire d'inscription EduZen — ${orgName}</p>
  </div>
</body>
</html>`
}

// Email action is in lib/actions/enrollment-form-actions.ts
