/**
 * Mise en page des emails d'évaluation : la même que les modèles d'email par
 * défaut (bandeau au nom de l'organisme, message encadré, bouton centré, pied de page).
 */

import { emailHtml } from '@/lib/data/default-email-templates'
import { escapeHtml } from '@/lib/utils/sanitize-html'

export function emailButton(url: string, label: string): string {
  return `<div style="text-align:center;margin:28px 0;">
  <a href="${url}" style="display:inline-block;background:#1a56db;color:#ffffff;padding:13px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">${label}</a>
</div>`
}

/**
 * Place un contenu dans la mise en page. Sans organizationName, la balise
 * {organization_name} est laissée pour être remplacée à l'envoi. Un email déjà
 * complet (modèle de l'organisme avec sa propre mise en page) est laissé tel quel.
 */
export function withEmailLayout(title: string, bodyHtml: string, organizationName?: string): string {
  if (/<html[\s>]|<!doctype/i.test(bodyHtml)) return bodyHtml
  const html = emailHtml(escapeHtml(title), bodyHtml)
  return organizationName === undefined ? html : html.split('{organization_name}').join(escapeHtml(organizationName))
}

export interface EvaluationEmailInput {
  organizationName: string
  recipientName: string
  title: string
  /** HTML déjà échappé */
  messageHtml: string
  url: string
  buttonLabel: string
  /** HTML déjà échappé, affiché sous le bouton */
  noteHtml?: string
}

export function buildEvaluationEmailHtml(input: EvaluationEmailInput): string {
  const body = `
      <p style="font-size:17px;font-weight:600;color:#111827;margin-top:0;">Bonjour ${escapeHtml(input.recipientName)},</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:20px;border-radius:6px;margin:20px 0;">
        <p style="margin:0;color:#374151;line-height:1.8;">${input.messageHtml}</p>
      </div>
      ${emailButton(input.url, escapeHtml(input.buttonLabel))}
      ${input.noteHtml ? `<p style="color:#6b7280;font-size:13px;">${input.noteHtml}</p>` : ''}
      <p style="margin-bottom:0;">Cordialement,<br/><strong>L'équipe {organization_name}</strong></p>
    `
  return withEmailLayout(input.title, body, input.organizationName)
}
