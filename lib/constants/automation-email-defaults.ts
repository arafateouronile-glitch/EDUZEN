/**
 * Emails intégrés des automatisations prédéfinies (lib/constants/automation-presets.ts).
 *
 * Utilisés quand l'organisme n'a ni modèle pour le type de l'automatisation,
 * ni modèle par défaut d'un type proche : une automatisation activée envoie
 * toujours un email correct. Variables remplacées par
 * /api/emails/scheduled/execute (replaceTemplateVariables).
 */

export interface AutomationEmailDefault {
  subject: string
  body_html: string
}

/** Type d'email existant dont le modèle par défaut de l'organisme peut servir */
export const AUTOMATION_EMAIL_FALLBACK_TYPE: Record<string, string> = {
  convocation_j14: 'convocation',
  rappel_j7: 'session_reminder',
  rappel_j3: 'session_reminder',
  attestation_presence: 'certificate_issued',
  certificat_realisation: 'certificate_issued',
  relance_paiement: 'payment_reminder',
}

const wrap = (content: string) => `<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937; max-width: 600px;">
${content}
<p style="margin-top: 24px;">Cordialement,<br/>{organization_name}</p>
<p style="font-size: 12px; color: #6b7280;">{organization_email} · {organization_phone}</p>
</div>`

const sessionBlock = `<table style="border-collapse: collapse; margin: 12px 0;">
<tr><td style="padding: 2px 12px 2px 0; color: #6b7280;">Formation</td><td><strong>{session_name}</strong></td></tr>
<tr><td style="padding: 2px 12px 2px 0; color: #6b7280;">Dates</td><td>du {session_start_date} au {session_end_date}</td></tr>
<tr><td style="padding: 2px 12px 2px 0; color: #6b7280;">Horaire</td><td>{session_start_time}</td></tr>
<tr><td style="padding: 2px 12px 2px 0; color: #6b7280;">Lieu</td><td>{session_location}</td></tr>
</table>`

const learnerSpaceButton = (label: string) =>
  `<p><a href="{espace_apprenant}" style="display: inline-block; background: #335ACF; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none;">${label}</a></p>`

export const AUTOMATION_EMAIL_DEFAULTS: Record<string, AutomationEmailDefault> = {
  convocation_j14: {
    subject: 'Convocation — {session_name}',
    body_html: wrap(`<p>Bonjour {student_first_name},</p>
<p>Nous avons le plaisir de vous convoquer à la formation suivante :</p>
${sessionBlock}
<p>Retrouvez toutes les informations pratiques dans votre espace apprenant.</p>
${learnerSpaceButton('Accéder à mon espace')}`),
  },
  rappel_j7: {
    subject: 'Rappel : votre formation commence dans 7 jours — {session_name}',
    body_html: wrap(`<p>Bonjour {recipient_name},</p>
<p>Nous vous rappelons que la formation <strong>{session_name}</strong> débute dans une semaine.</p>
${sessionBlock}`),
  },
  rappel_j3: {
    subject: 'Rappel : votre formation commence dans 3 jours — {session_name}',
    body_html: wrap(`<p>Bonjour {student_first_name},</p>
<p>Votre formation <strong>{session_name}</strong> commence dans 3 jours. Pensez à prévoir votre trajet et le matériel demandé.</p>
${sessionBlock}`),
  },
  evaluation_post_formation: {
    subject: 'Votre avis sur la formation {session_name}',
    body_html: wrap(`<p>Bonjour {student_first_name},</p>
<p>Merci d'avoir suivi la formation <strong>{session_name}</strong>. Votre avis nous aide à améliorer nos formations : merci de prendre quelques minutes pour remplir le questionnaire de satisfaction dans votre espace apprenant.</p>
${learnerSpaceButton('Donner mon avis')}`),
  },
  relance_evaluation: {
    subject: 'Rappel : votre avis sur la formation {session_name}',
    body_html: wrap(`<p>Bonjour {student_first_name},</p>
<p>Vous n'avez pas encore répondu au questionnaire de satisfaction de la formation <strong>{session_name}</strong>. Cela ne prend que quelques minutes.</p>
${learnerSpaceButton('Répondre au questionnaire')}`),
  },
  attestation_presence: {
    subject: 'Votre attestation de présence — {session_name}',
    body_html: wrap(`<p>Bonjour {student_first_name},</p>
<p>Vous trouverez ci-joint votre attestation de présence pour la formation <strong>{session_name}</strong> (du {session_start_date} au {session_end_date}).</p>
<p>Elle reste également disponible dans votre espace apprenant.</p>`),
  },
  certificat_realisation: {
    subject: 'Votre certificat de réalisation — {session_name}',
    body_html: wrap(`<p>Bonjour {student_first_name},</p>
<p>Vous trouverez ci-joint votre certificat de réalisation de la formation <strong>{session_name}</strong>.</p>
<p>Il reste également disponible dans votre espace apprenant.</p>`),
  },
  relance_paiement: {
    subject: 'Factures impayées — {session_name}',
    body_html: wrap(`<p>Bonjour {recipient_name},</p>
<p>La session <strong>{session_name}</strong>, terminée le {session_end_date}, compte encore <strong>{factures_impayees} facture(s) impayée(s)</strong> pour un montant de <strong>{montant_impaye}</strong>.</p>
<p>Pensez à relancer les financeurs ou les apprenants concernés depuis l'onglet Finances de la session.</p>`),
  },
}
