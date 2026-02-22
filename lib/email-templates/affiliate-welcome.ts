/**
 * Template email de bienvenue partenaire EDUZEN.
 * Intégré avec Resend / Loops / Nodemailer.
 */

export interface AffiliateWelcomeParams {
  /** Prénom ou nom d'affichage */
  firstName: string
  /** Lien personnel ?ref=... */
  referralLink: string
  /** Code promo (ex: JEAN10) */
  promoCode: string
  /** Réduction en % (ex: 10) */
  promoDiscountPercent?: number
  /** URL du portail partenaire */
  dashboardUrl: string
  /** URL du kit à télécharger (logos, bannières, scripts) */
  kitUrl: string
  /** Taux de commission (ex: 30) */
  commissionPercent?: number
  /** Seuil minimum pour paiement en € (ex: 50) */
  paymentThresholdEur?: number
  /** Durée cookie en jours (ex: 60) */
  cookieDays?: number
}

const DEFAULT_COMMISSION = 30
const DEFAULT_THRESHOLD = 50
const DEFAULT_COOKIE_DAYS = 60

export function getAffiliateWelcomeEmailSubject(): string {
  return 'Bienvenue dans l\'équipe EDUZEN 🚀 (Vos outils de partenaire)'
}

export function getAffiliateWelcomeEmailHtml(params: AffiliateWelcomeParams): string {
  const {
    firstName,
    referralLink,
    promoCode,
    promoDiscountPercent,
    dashboardUrl,
    kitUrl,
    commissionPercent = DEFAULT_COMMISSION,
    paymentThresholdEur = DEFAULT_THRESHOLD,
    cookieDays = DEFAULT_COOKIE_DAYS,
  } = params

  const codeLabel = promoDiscountPercent
    ? `${promoCode} (-${promoDiscountPercent}%)`
    : promoCode

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.6;">
  <p>Bonjour <strong>${escapeHtml(firstName)}</strong>,</p>
  <p>Je suis ravi de vous accueillir officiellement parmi les partenaires privilégiés d'EDUZEN.</p>
  <p>Nous avons conçu EDUZEN avec une mission claire : libérer les organismes de formation de la paperasse et sécuriser leur certification Qualiopi grâce à notre technologie de pointe (992 tests d'intégrité quotidiens).</p>
  <p>En tant qu'expert du secteur, vous êtes le meilleur ambassadeur pour porter ce message.</p>

  <h2 style="color: #274472; font-size: 1.25rem; margin-top: 28px;">🛠️ Vos Outils de Croissance</h2>
  <p>Votre espace partenaire est désormais activé. Voici vos accès directs pour commencer dès aujourd'hui :</p>
  <ul style="padding-left: 20px;">
    <li><strong>Votre Lien Personnel :</strong><br><a href="${escapeHtml(referralLink)}" style="color: #34B9EE; word-break: break-all;">${escapeHtml(referralLink)}</a></li>
    <li><strong>Votre Code Promo :</strong> <code style="background: #f0f0f0; padding: 2px 8px; border-radius: 4px;">${escapeHtml(codeLabel)}</code> — Idéal pour vos réseaux sociaux ou newsletters.</li>
    <li><strong>Votre Dashboard :</strong> <a href="${escapeHtml(dashboardUrl)}" style="color: #34B9EE;">Accéder au Portail Partenaire</a></li>
  </ul>

  <h2 style="color: #274472; font-size: 1.25rem; margin-top: 28px;">📁 Votre Kit Marketing "Prêt à l'emploi"</h2>
  <p>Ne perdez pas de temps à créer des visuels. Nous avons tout préparé pour vous :</p>
  <p>👉 <a href="${escapeHtml(kitUrl)}" style="color: #34B9EE; font-weight: 600;">Télécharger le Kit Partenaire</a> (Logos, Bannières, Scripts de vente)</p>

  <h2 style="color: #274472; font-size: 1.25rem; margin-top: 28px;">💰 Rappel de vos avantages</h2>
  <ul style="padding-left: 20px;">
    <li><strong>Commission :</strong> ${commissionPercent}% de commission récurrente sur chaque abonnement, à vie.</li>
    <li><strong>Paiement :</strong> Automatique chaque mois dès que vous atteignez ${paymentThresholdEur} €.</li>
    <li><strong>Cookie :</strong> ${cookieDays} jours (vous touchez la commission même si le client achète deux mois après son clic).</li>
  </ul>

  <p style="margin-top: 28px;">Si vous avez besoin d'une démo personnalisée pour un gros client ou d'un accès "test" spécifique, répondez simplement à cet email. Je suis là pour vous aider à réussir.</p>
  <p><strong>En avant vers la sérénité administrative !</strong></p>
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
