'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmailBodyEditor } from '@/components/ui/email-body-editor'
import {
  AUTOMATION_EMAIL_DEFAULTS,
  AUTOMATION_EMAIL_FALLBACK_TYPE,
} from '@/lib/constants/automation-email-defaults'
import { AUTOMATION_EVALUATION_TEMPLATES } from '@/lib/constants/automation-presets'

const BASE_VARIABLES = [
  'recipient_name',
  'student_first_name',
  'student_last_name',
  'session_name',
  'session_start_date',
  'session_end_date',
  'session_start_time',
  'session_location',
  'session_url',
  'espace_apprenant',
  'organization_name',
  'organization_email',
  'organization_phone',
]
const EVALUATION_VARIABLES = ['questionnaire_url', 'evaluation_name']

interface EmailTemplateOption {
  id: string
  name?: string | null
  email_type?: string | null
  subject?: string | null
  body_html?: string | null
  body_text?: string | null
  is_default?: boolean | null
  is_active?: boolean | null
}

interface EvaluationTemplateOption {
  id: string
  name: string
}

/** Mail envoyé si la règle n'a pas de texte propre (même ordre que /api/emails/scheduled/execute) */
function baseEmail(
  emailType: string | undefined,
  templateId: string | undefined,
  emailTemplates: EmailTemplateOption[]
): { subject: string; body: string } {
  const defaultOf = (type: string | undefined) =>
    type ? emailTemplates.find((t) => t.email_type === type && t.is_default && t.is_active !== false) : undefined
  const template =
    emailTemplates.find((t) => t.id === templateId) ??
    defaultOf(emailType) ??
    defaultOf(emailType ? AUTOMATION_EMAIL_FALLBACK_TYPE[emailType] : undefined)
  if (template) {
    return { subject: template.subject ?? '', body: template.body_html || template.body_text || '' }
  }
  const builtIn = emailType ? AUTOMATION_EMAIL_DEFAULTS[emailType] : undefined
  return { subject: builtIn?.subject ?? '', body: builtIn?.body_html ?? '' }
}

export function AutomationEmailFields({
  idPrefix,
  emailType,
  templateId,
  emailTemplates,
  evaluationTemplates,
  emailSubject,
  emailBodyHtml,
  evaluationTemplateId,
  onChange,
}: {
  idPrefix: string
  emailType: string | undefined
  templateId: string | undefined
  emailTemplates: EmailTemplateOption[]
  evaluationTemplates: EvaluationTemplateOption[]
  emailSubject: string | null | undefined
  emailBodyHtml: string | null | undefined
  evaluationTemplateId: string | null | undefined
  onChange: (fields: {
    email_subject?: string | null
    email_body_html?: string | null
    evaluation_template_id?: string | null
  }) => void
}) {
  const base = baseEmail(emailType, templateId, emailTemplates)
  const requiredEvaluation = emailType ? AUTOMATION_EVALUATION_TEMPLATES[emailType] : undefined
  const selectedEvaluation = evaluationTemplateId || requiredEvaluation || ''

  return (
    <div className="space-y-4 border-t pt-6">
      <div>
        <h3 className="font-semibold text-gray-900">Mail de cette automatisation</h3>
        <p className="text-xs text-gray-500 mt-1">
          Prérempli avec le mail prévu pour cette automatisation. Vos modifications ne concernent que cette règle.
        </p>
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-evaluation_template_id`}>Évaluation à envoyer</Label>
        <select
          id={`${idPrefix}-evaluation_template_id`}
          value={selectedEvaluation}
          onChange={(e) => onChange({ evaluation_template_id: e.target.value || null })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
        >
          {!requiredEvaluation && <option value="">Aucune</option>}
          {evaluationTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        {selectedEvaluation && (
          <p className="text-xs text-gray-500 mt-1">
            Chaque apprenant reçoit son lien personnel, ajouté automatiquement au mail s&apos;il n&apos;y figure pas. Les formateurs et coordinateurs ne reçoivent pas ce mail.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-email_subject`}>Objet *</Label>
        <Input
          id={`${idPrefix}-email_subject`}
          value={emailSubject ?? base.subject}
          required
          onChange={(e) =>
            onChange({ email_subject: e.target.value === base.subject ? null : e.target.value })
          }
        />
      </div>

      <div>
        <Label>Message *</Label>
        <div className="mt-1">
          <EmailBodyEditor
            value={emailBodyHtml ?? base.body}
            onChange={(html) => onChange({ email_body_html: html === base.body ? null : html })}
            availableVariables={selectedEvaluation ? [...BASE_VARIABLES, ...EVALUATION_VARIABLES] : BASE_VARIABLES}
            placeholder="Rédigez le message de cette automatisation…"
          />
        </div>
      </div>
    </div>
  )
}
