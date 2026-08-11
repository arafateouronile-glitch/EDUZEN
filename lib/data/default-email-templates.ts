import type { EmailType } from '@/lib/services/email-template.service'

// ─── Helper HTML ──────────────────────────────────────────────────────────────

function emailHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#1a56db;padding:28px 40px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;">{organization_name}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;color:#374151;font-size:15px;line-height:1.7;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">
            Cet email a été envoyé par <strong>{organization_name}</strong>.<br/>
            Si vous avez des questions, contactez-nous par retour d'email.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DefaultTemplate {
  email_type: EmailType
  name: string
  subject: string
  description: string
  body_html: string
  body_text: string
  available_variables: string[]
}

// ─── Templates par défaut ─────────────────────────────────────────────────────

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // 1. Confirmation d'inscription
  {
    email_type: 'enrollment_confirmation',
    name: 'Confirmation d\'inscription',
    subject: 'Votre inscription à {session_name} est confirmée',
    description: 'Envoyé automatiquement lors de l\'inscription d\'un apprenant à une session.',
    available_variables: ['student_name', 'session_name', 'session_start_date', 'session_location', 'organization_name'],
    body_text: `Bonjour {student_name},

Nous avons le plaisir de vous confirmer votre inscription à la formation **{session_name}**.

**Détails de votre session :**
- Date de début : {session_start_date}
- Lieu : {session_location}

Conservez cet email comme justificatif d'inscription.

Pour toute question, n'hésitez pas à nous contacter.

Cordialement,
L'équipe {organization_name}`,
    body_html: emailHtml('Confirmation d\'inscription', `
      <p style="font-size:17px;font-weight:600;color:#111827;margin-top:0;">Bonjour {student_name},</p>
      <p>Nous avons le plaisir de vous confirmer votre inscription à la formation :</p>
      <div style="background:#eff6ff;border-left:4px solid #1a56db;padding:16px 20px;border-radius:4px;margin:20px 0;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#1e3a8a;">{session_name}</p>
      </div>
      <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:20px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:40%;">Date de début</td>
          <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #e5e7eb;">{session_start_date}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-weight:600;color:#374151;width:40%;">Lieu</td>
          <td style="padding:10px 16px;color:#374151;">{session_location}</td>
        </tr>
      </table>
      <p>Conservez cet email comme justificatif d'inscription. Pour toute question, n'hésitez pas à nous contacter.</p>
      <p style="margin-bottom:0;">Cordialement,<br/><strong>L'équipe {organization_name}</strong></p>
    `),
  },

  // 2. Rappel de session
  {
    email_type: 'session_reminder',
    name: 'Rappel de session',
    subject: 'Rappel : votre session {session_name} commence bientôt',
    description: 'Rappel envoyé avant le démarrage d\'une session de formation.',
    // Noms alignés sur les balises réellement remplacées lors de l'envoi
    // (onglet Convocations, envoi en masse) — session_date/session_time
    // n'y étaient jamais substituées.
    available_variables: ['student_name', 'session_name', 'session_start_date', 'session_start_time', 'session_location', 'espace_apprenant', 'organization_name'],
    body_text: `Bonjour {student_name},

Nous vous rappelons que votre session de formation commence prochainement.

**{session_name}**
- Date : {session_start_date}
- Heure : {session_start_time}
- Lieu : {session_location}

Retrouvez toutes les informations de votre formation sur votre espace apprenant : {espace_apprenant}

Merci de vous présenter à l'heure. En cas d'empêchement, contactez-nous dès que possible.

Cordialement,
L'équipe {organization_name}`,
    body_html: emailHtml('Rappel de session', `
      <p style="font-size:17px;font-weight:600;color:#111827;margin-top:0;">Bonjour {student_name},</p>
      <p>Votre session de formation approche. Voici un rappel des informations :</p>
      <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:4px;margin:20px 0;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#15803d;">{session_name}</p>
      </div>
      <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:20px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:40%;">Date</td>
          <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #e5e7eb;">{session_start_date}</td>
        </tr>
        <tr style="background:#ffffff;">
          <td style="padding:10px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:40%;">Heure</td>
          <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #e5e7eb;">{session_start_time}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-weight:600;color:#374151;width:40%;">Lieu</td>
          <td style="padding:10px 16px;color:#374151;">{session_location}</td>
        </tr>
      </table>
      <p>Retrouvez toutes les informations de votre formation sur votre <a href="{espace_apprenant}">espace apprenant</a>.</p>
      <p>Merci de vous présenter à l'heure. En cas d'empêchement, contactez-nous dès que possible.</p>
      <p style="margin-bottom:0;">Cordialement,<br/><strong>L'équipe {organization_name}</strong></p>
    `),
  },

  // 3. Document généré
  {
    email_type: 'document_generated',
    name: 'Document disponible',
    subject: 'Votre document "{document_title}" est disponible',
    description: 'Envoyé lorsqu\'un document est généré et mis à disposition d\'un apprenant.',
    available_variables: ['student_name', 'document_title', 'document_type', 'organization_name', 'document_url'],
    body_text: `Bonjour {student_name},

Votre document est maintenant disponible.

**Nom du document :** {document_title}
**Type :** {document_type}

Vous pouvez le télécharger en cliquant sur le lien ci-dessous :
{document_url}

Cordialement,
L'équipe {organization_name}`,
    body_html: emailHtml('Document disponible', `
      <p style="font-size:17px;font-weight:600;color:#111827;margin-top:0;">Bonjour {student_name},</p>
      <p>Votre document est maintenant disponible en téléchargement.</p>
      <div style="background:#faf5ff;border-left:4px solid #7c3aed;padding:16px 20px;border-radius:4px;margin:20px 0;">
        <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#5b21b6;">{document_title}</p>
        <p style="margin:0;font-size:13px;color:#7c3aed;">{document_type}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="{document_url}" style="display:inline-block;background:#1a56db;color:#ffffff;padding:13px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Télécharger le document</a>
      </div>
      <p style="font-size:13px;color:#6b7280;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>{document_url}</p>
      <p style="margin-bottom:0;">Cordialement,<br/><strong>L'équipe {organization_name}</strong></p>
    `),
  },

  // 4. Certificat délivré
  {
    email_type: 'certificate_issued',
    name: 'Certificat délivré',
    subject: 'Félicitations ! Votre certificat "{certificate_name}" est disponible',
    description: 'Envoyé lors de la délivrance d\'un certificat ou d\'une attestation de formation.',
    available_variables: ['student_name', 'certificate_name', 'certificate_date', 'organization_name', 'certificate_url'],
    body_text: `Bonjour {student_name},

Félicitations ! Votre certificat de formation a été délivré.

**{certificate_name}**
Délivré le : {certificate_date}

Vous pouvez télécharger votre certificat ici :
{certificate_url}

Nous vous félicitons pour l'obtention de cette certification et vous souhaitons une belle continuité dans votre parcours.

Cordialement,
L'équipe {organization_name}`,
    body_html: emailHtml('Certificat délivré', `
      <p style="font-size:17px;font-weight:600;color:#111827;margin-top:0;">Bonjour {student_name},</p>
      <p style="font-size:16px;color:#374151;">🎉 <strong>Félicitations !</strong> Votre certificat de formation a été délivré.</p>
      <div style="background:#fffbeb;border:2px solid #f59e0b;padding:20px 24px;border-radius:8px;margin:24px 0;text-align:center;">
        <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#92400e;">{certificate_name}</p>
        <p style="margin:0;font-size:13px;color:#b45309;">Délivré le {certificate_date}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="{certificate_url}" style="display:inline-block;background:#f59e0b;color:#ffffff;padding:13px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Télécharger mon certificat</a>
      </div>
      <p>Nous vous félicitons pour l'obtention de cette certification et vous souhaitons une belle continuité dans votre parcours.</p>
      <p style="margin-bottom:0;">Cordialement,<br/><strong>L'équipe {organization_name}</strong></p>
    `),
  },

  // 5. Facture envoyée
  {
    email_type: 'invoice_sent',
    name: 'Facture envoyée',
    subject: 'Votre facture n°{invoice_number} — {organization_name}',
    description: 'Envoyé lors de l\'émission d\'une facture.',
    available_variables: ['student_name', 'invoice_number', 'invoice_amount', 'due_date', 'organization_name', 'invoice_url'],
    body_text: `Bonjour {student_name},

Veuillez trouver ci-joint votre facture.

**Facture n°** {invoice_number}
**Montant :** {invoice_amount}
**Date d'échéance :** {due_date}

Vous pouvez consulter et télécharger votre facture ici :
{invoice_url}

Pour toute question relative à cette facture, contactez-nous par retour d'email.

Cordialement,
L'équipe {organization_name}`,
    body_html: emailHtml('Facture', `
      <p style="font-size:17px;font-weight:600;color:#111827;margin-top:0;">Bonjour {student_name},</p>
      <p>Veuillez trouver ci-dessous les détails de votre facture.</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin:20px 0;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:40%;">N° de facture</td>
          <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #e5e7eb;font-weight:600;">{invoice_number}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;width:40%;">Montant</td>
          <td style="padding:10px 16px;color:#374151;border-bottom:1px solid #e5e7eb;font-size:16px;font-weight:700;">{invoice_amount}</td>
        </tr>
        <tr style="background:#fef3c7;">
          <td style="padding:10px 16px;font-weight:600;color:#374151;width:40%;">Date d'échéance</td>
          <td style="padding:10px 16px;color:#b45309;font-weight:600;">{due_date}</td>
        </tr>
      </table>
      <div style="text-align:center;margin:28px 0;">
        <a href="{invoice_url}" style="display:inline-block;background:#059669;color:#ffffff;padding:13px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Voir la facture</a>
      </div>
      <p style="margin-bottom:0;">Cordialement,<br/><strong>L'équipe {organization_name}</strong></p>
    `),
  },

  // 6. Rappel de paiement
  {
    email_type: 'payment_reminder',
    name: 'Rappel de paiement',
    subject: 'Rappel : règlement de la facture n°{invoice_number}',
    description: 'Rappel envoyé pour une facture en attente de règlement.',
    available_variables: ['student_name', 'invoice_number', 'invoice_amount', 'due_date', 'days_overdue', 'organization_name'],
    body_text: `Bonjour {student_name},

Sauf erreur de notre part, la facture n°{invoice_number} d'un montant de {invoice_amount} n'a pas encore été réglée.

**Facture n°** {invoice_number}
**Montant :** {invoice_amount}
**Échéance :** {due_date}

Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais. Si vous avez déjà effectué ce paiement, veuillez ignorer ce message.

Pour toute question, contactez-nous par retour d'email.

Cordialement,
L'équipe {organization_name}`,
    body_html: emailHtml('Rappel de paiement', `
      <p style="font-size:17px;font-weight:600;color:#111827;margin-top:0;">Bonjour {student_name},</p>
      <p>Sauf erreur de notre part, la facture ci-dessous n'a pas encore été réglée.</p>
      <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px 20px;border-radius:4px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:600;color:#991b1b;">Facture n°{invoice_number}</p>
        <p style="margin:0 0 4px;color:#374151;">Montant : <strong>{invoice_amount}</strong></p>
        <p style="margin:0;color:#b91c1c;">Échéance dépassée depuis : {days_overdue} jour(s)</p>
      </div>
      <p>Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.</p>
      <p style="font-size:13px;color:#6b7280;">Si vous avez déjà effectué ce paiement, veuillez ignorer ce message.</p>
      <p style="margin-bottom:0;">Cordialement,<br/><strong>L'équipe {organization_name}</strong></p>
    `),
  },

  // 7. Notification générale
  {
    email_type: 'notification',
    name: 'Notification générale',
    subject: 'Notification de {organization_name}',
    description: 'Template générique pour les notifications ponctuelles.',
    available_variables: ['recipient_name', 'message', 'organization_name', 'action_url'],
    body_text: `Bonjour {recipient_name},

{message}

Pour plus d'informations : {action_url}

Cordialement,
L'équipe {organization_name}`,
    body_html: emailHtml('Notification', `
      <p style="font-size:17px;font-weight:600;color:#111827;margin-top:0;">Bonjour {recipient_name},</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:20px;border-radius:6px;margin:20px 0;">
        <p style="margin:0;color:#374151;line-height:1.8;">{message}</p>
      </div>
      <div style="text-align:center;margin:28px 0;">
        <a href="{action_url}" style="display:inline-block;background:#1a56db;color:#ffffff;padding:13px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">En savoir plus</a>
      </div>
      <p style="margin-bottom:0;">Cordialement,<br/><strong>L'équipe {organization_name}</strong></p>
    `),
  },
]
