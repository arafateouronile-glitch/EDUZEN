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
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${escapeHtml(firstName)},</p>

            <p style="margin:0 0 20px;">Je suis ravi de vous accueillir officiellement parmi les partenaires d'EduZen.</p>

            <p style="margin:0 0 20px;">Nous avons conçu EduZen avec une mission claire : libérer les organismes de formation de la paperasse et sécuriser leur certification Qualiopi grâce à notre technologie (992 tests d'intégrité quotidiens). En tant qu'expert du secteur, vous êtes le meilleur ambassadeur pour porter ce message.</p>

            <p style="margin:0 0 12px;"><strong>Vos accès partenaire</strong></p>

            <p style="margin:0 0 8px;">Votre lien personnel : <a href="${escapeHtml(referralLink)}" style="color:#1a1a1a;word-break:break-all;">${escapeHtml(referralLink)}</a></p>

            <p style="margin:0 0 8px;">Votre code promo : <strong>${escapeHtml(codeLabel)}</strong> — idéal pour vos réseaux sociaux ou newsletters.</p>

            <p style="margin:0 0 20px;">Votre tableau de bord : <a href="${escapeHtml(dashboardUrl)}" style="color:#1a1a1a;">Accéder au portail partenaire</a></p>

            <p style="margin:0 0 20px;">Votre kit marketing (logos, bannières, scripts de vente) est disponible ici : <a href="${escapeHtml(kitUrl)}" style="color:#1a1a1a;">Télécharger le kit partenaire</a></p>

            <p style="margin:0 0 12px;"><strong>Rappel de vos avantages</strong></p>

            <p style="margin:0 0 8px;">Commission : ${commissionPercent}% récurrente sur chaque abonnement, à vie.</p>
            <p style="margin:0 0 8px;">Paiement : automatique chaque mois dès ${paymentThresholdEur} €.</p>
            <p style="margin:0 0 20px;">Cookie : ${cookieDays} jours — vous touchez la commission même si le client achète deux mois après son clic.</p>

            <p style="margin:0 0 20px;">Si vous avez besoin d'une démo personnalisée pour un gros client ou d'un accès test spécifique, répondez simplement à cet email. Je suis là pour vous aider à réussir.</p>

            <p style="margin:0 0 40px;">En avant,</p>

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
