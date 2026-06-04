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
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${escapeHtml(firstName)},</p>

            <p style="margin:0 0 20px;">J'ai vu que vous n'aviez pas encore utilisé votre lien partenaire. Avez-vous besoin d'un coup de main pour rédiger votre premier post LinkedIn ou votre newsletter ?</p>

            <p style="margin:0 0 20px;">Voici un modèle de texte qui a généré 5 ventes la semaine dernière chez un de nos partenaires :</p>

            <p style="margin:0 0 20px;padding:12px 20px;border-left:3px solid #1a1a1a;color:#555;font-style:italic;">"Vous en avez marre de la paperasse pour garder votre certification Qualiopi ? J'utilise EduZen : tout est automatisé (émargement, documents, preuves). Essai gratuit 14 jours avec le code [VOTRE_CODE] — ça change la vie en tant qu'OF."</p>

            <p style="margin:0 0 20px;">Votre lien à partager : <a href="${escapeHtml(referralLink)}" style="color:#1a1a1a;word-break:break-all;">${escapeHtml(referralLink)}</a></p>

            <p style="margin:0 0 20px;">Si vous voulez un texte sur mesure pour votre audience (réseaux, email, site), répondez à ce mail et je vous envoie une version personnalisée.</p>

            <p style="margin:0 0 40px;">À très vite,</p>

            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
              Airtone NILE<br>
              <span style="font-size:14px;color:#555;">Fondateur, EduZen</span><br>
              <span style="font-size:14px;color:#555;"><a href="tel:+33610441324" style="color:#555;text-decoration:none;">06 10 44 13 24</a> · <a href="https://www.eduzen.io" style="color:#555;text-decoration:none;">eduzen.io</a></span>
            </p>

          </td>
        </tr>
      </table>
    </td></tr>
  </table>
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
