/**
 * Template email de relance J+7 pour affiliés n'ayant pas encore généré de clics.
 * À envoyer automatiquement (cron) 7 jours après validation.
 */

export interface AffiliateFollowupJ7Params {
  /** Prénom ou nom d'affichage */
  firstName: string
  /** Lien personnel ?ref=... */
  referralLink: string
}

export function getAffiliateFollowupJ7Subject(): string {
  return 'Un coup de main pour votre premier partage EDUZEN ?'
}

export function getAffiliateFollowupJ7Html(params: AffiliateFollowupJ7Params): string {
  const { firstName, referralLink } = params

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.6;">
  <p>Bonjour <strong>${escapeHtml(firstName)}</strong>,</p>
  <p>J'ai vu que vous n'aviez pas encore utilisé votre lien partenaire. Avez-vous besoin d'un coup de main pour rédiger votre premier post LinkedIn ou votre newsletter ?</p>
  <p>Voici un modèle de texte qui a généré 5 ventes la semaine dernière chez un de nos partenaires :</p>
  <blockquote style="border-left: 4px solid #274472; margin: 16px 0; padding: 12px 16px; background: #f8fafc;">
    "Vous en avez marre de la paperasse pour garder votre certification Qualiopi ? J'utilise EDUZEN : tout est automatisé (émargement, documents, preuves). Essai gratuit 14 jours avec le code [VOTRE_CODE] — ça change la vie en tant qu'OF."
  </blockquote>
  <p>Votre lien à partager : <a href="${escapeHtml(referralLink)}" style="color: #34B9EE; word-break: break-all;">${escapeHtml(referralLink)}</a></p>
  <p>Si vous voulez un texte sur mesure pour votre audience (Réseaux, email, site), répondez à ce mail et je vous envoie une version personnalisée.</p>
  <p>À très vite,</p>
  <p>Arafate<br>Fondateur d'EDUZEN</p>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
