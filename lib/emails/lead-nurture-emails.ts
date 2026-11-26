/**
 * Emails envoyés aux leads des outils gratuits (/outils) : envoi du document,
 * puis séquence marketing en 5 emails (J+2, J+5, J+9, J+14, J+21), écrits par
 * le fondateur. Chaque email porte un lien de désabonnement.
 */

import { BOOK_BTN, wrap } from '@/lib/emails/onboarding-emails'
import { OUTILS, type OutilKey } from '@/lib/outils/tools'

export const LEAD_EMAIL_FROM = 'Airtone NILE — EduZen <contact@eduzen.io>'
export const LEAD_EMAIL_REPLY_TO = 'contact@eduzen.io'

const SITE = 'https://www.eduzen.io'
const TRIAL_URL = `${SITE}/demo`
const QUALIOPI_TOOL_URL = `${SITE}/outils/${OUTILS.qualiopi.slug}`

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function button(url: string, label: string): string {
  return `<p style="margin:0 0 28px;text-align:center;"><a href="${url}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">${label}</a></p>`
}

function unsubscribeFooter(url: string): string {
  return `<p style="margin:32px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#9ca3af;line-height:1.5;">
    Vous recevez cet email car vous avez utilisé un outil gratuit d'EduZen.
    <a href="${url}" style="color:#9ca3af;">Se désabonner</a> en un clic.
  </p>`
}

const hello = (prenom: string | null) => `<p style="margin:0 0 20px;">Bonjour${prenom ? ` ${esc(prenom)}` : ''},</p>`

export interface LeadEmail {
  subject: string
  html: string
}

/** Email d'envoi du document généré (pièce jointe) */
export function buildLeadDeliveryEmail(input: {
  prenom: string | null
  tool: OutilKey
  unsubscribeUrl: string
  qualiopiScore?: number | null
}): LeadEmail {
  const meta = OUTILS[input.tool]
  const scoreLine =
    input.tool === 'qualiopi' && input.qualiopiScore != null
      ? `<p style="margin:0 0 20px;">Votre score : <strong>${input.qualiopiScore}%</strong>. Le rapport joint détaille, indicateur par indicateur, ce qu'il reste à mettre en place avant l'audit.</p>`
      : ''
  return {
    subject: `Votre ${meta.documentName}`,
    html: wrap(
      `
      ${hello(input.prenom)}
      <p style="margin:0 0 20px;">Vous trouverez ci-joint votre <strong>${meta.documentName}</strong>, généré avec l'outil gratuit d'EduZen.</p>
      ${scoreLine}
      <p style="margin:0 0 20px;">Relisez-le avant de l'utiliser : il reprend les informations que vous avez saisies, et vous pouvez le compléter à votre guise.</p>
      <p style="margin:0 0 20px;">Dans EduZen, ce document se génère tout seul pour chaque apprenant et chaque session, avec vos informations déjà remplies — et part par email en un clic.</p>
      ${button(TRIAL_URL, 'Essayer EduZen gratuitement →')}
      <p style="margin:0 0 40px;">Bonne journée,</p>
    `,
      unsubscribeFooter(input.unsubscribeUrl)
    ),
  }
}

const TOOL_PAIN: Record<OutilKey, string> = {
  convention: 'une convention par client, à recopier à la main pour chaque session',
  reglement: 'un règlement intérieur à remettre et faire signer à chaque apprenant',
  certificat: 'un certificat de réalisation à remplir pour chaque apprenant, à chaque fin de formation',
  emargement: "des feuilles d'émargement à imprimer, faire signer, scanner et archiver",
  qualiopi: 'des preuves Qualiopi à rassembler à la main avant chaque audit',
}

/** Email n° `step` (0 à 4) de la séquence marketing */
export function buildLeadNurtureEmail(step: number, input: {
  prenom: string | null
  firstTool: OutilKey
  hasQualiopiScore: boolean
  unsubscribeUrl: string
}): LeadEmail | null {
  const footer = unsubscribeFooter(input.unsubscribeUrl)
  const p = hello(input.prenom)

  switch (step) {
    case 0:
      return {
        subject: 'Ce que votre document ne fait pas tout seul',
        html: wrap(`
          ${p}
          <p style="margin:0 0 20px;">Il y a deux jours, vous avez généré un document avec un de nos outils gratuits. J'espère qu'il vous a fait gagner du temps.</p>
          <p style="margin:0 0 20px;">Mais je connais la suite : ${TOOL_PAIN[input.firstTool]}. Multiplié par le nombre de sessions, c'est des heures chaque mois.</p>
          <p style="margin:0 0 20px;">C'est exactement pour ça que j'ai créé EduZen : vous saisissez une session une fois, et <strong>conventions, convocations, émargements, certificats et évaluations</strong> se génèrent et partent tout seuls, au bon moment.</p>
          ${button(TRIAL_URL, 'Voir comment ça marche →')}
          <p style="margin:0 0 40px;">À bientôt,</p>
        `, footer),
      }
    case 1:
      return {
        subject: 'Les 3 indicateurs Qualiopi qui font échouer le plus d’audits',
        html: wrap(`
          ${p}
          <p style="margin:0 0 20px;">Après des dizaines d'échanges avec des organismes de formation, ce sont toujours les mêmes indicateurs qui posent problème le jour de l'audit :</p>
          <p style="margin:0 0 12px;"><strong>Indicateur 11 — l'évaluation de l'atteinte des objectifs.</strong> Pas de trace des évaluations de fin de formation, ou pas pour tous les apprenants.</p>
          <p style="margin:0 0 12px;"><strong>Indicateur 30 — le recueil des appréciations.</strong> Questionnaires de satisfaction envoyés, mais réponses jamais analysées.</p>
          <p style="margin:0 0 20px;"><strong>Indicateur 32 — l'amélioration continue.</strong> Les réclamations et les retours existent, mais aucune action n'est documentée.</p>
          <p style="margin:0 0 20px;">${input.hasQualiopiScore
            ? 'Vous avez déjà fait l’auto-évaluation : reprenez votre rapport et regardez où vous en êtes sur ces trois-là.'
            : 'Pour savoir où vous en êtes sur les 32 indicateurs, notre simulateur gratuit vous donne un score et un plan d’action en 5 minutes.'}</p>
          ${input.hasQualiopiScore ? '' : button(QUALIOPI_TOOL_URL, 'Faire mon auto-évaluation →')}
          <p style="margin:0 0 40px;">Bonne semaine,</p>
        `, footer),
      }
    case 2:
      return {
        subject: 'Comment un organisme a arrêté de courir après les signatures',
        html: wrap(`
          ${p}
          <p style="margin:0 0 20px;">Un organisme de formation en sécurité incendie que nous accompagnons passait chaque semaine une demi-journée sur l'administratif : feuilles d'émargement papier, conventions à relancer, certificats à remplir un par un.</p>
          <p style="margin:0 0 20px;">Aujourd'hui, les apprenants signent l'émargement sur leur téléphone avec un QR code, les conventions partent en signature électronique, et les certificats de réalisation sont générés automatiquement à la fin de chaque session.</p>
          <p style="margin:0 0 20px;">Le jour de l'audit Qualiopi, toutes les preuves étaient déjà classées par indicateur.</p>
          ${button(TRIAL_URL, 'Tester EduZen sur mes sessions →')}
          <p style="margin:0 0 40px;">À bientôt,</p>
        `, footer),
      }
    case 3:
      return {
        subject: '14 jours pour tester EduZen sur vos vraies sessions',
        html: wrap(`
          ${p}
          <p style="margin:0 0 20px;">Je vous propose d'essayer EduZen gratuitement pendant <strong>14 jours</strong>, sur vos vraies formations, sans carte bancaire.</p>
          <p style="margin:0 0 20px;">Et si vous préférez qu'on regarde ensemble votre organisation actuelle et ce qu'EduZen peut automatiser, je vous réserve 30 minutes :</p>
          ${BOOK_BTN}
          ${button(TRIAL_URL, 'Démarrer mon essai gratuit →')}
          <p style="margin:0 0 40px;">À très vite,</p>
        `, footer),
      }
    case 4:
      return {
        subject: 'Je ferme votre dossier ?',
        html: wrap(`
          ${p}
          <p style="margin:0 0 20px;">C'est mon dernier message : je ne veux pas encombrer votre boîte.</p>
          <p style="margin:0 0 20px;">Si la gestion administrative de vos formations ou la préparation de Qualiopi vous prend encore trop de temps, répondez simplement à cet email avec un mot sur votre situation. Je vous répondrai personnellement.</p>
          <p style="margin:0 0 20px;">Et nos outils gratuits restent à votre disposition sur <a href="${SITE}/outils" style="color:#1a1a1a;">eduzen.io/outils</a>.</p>
          <p style="margin:0 0 40px;">Belle continuation,</p>
        `, footer),
      }
    default:
      return null
  }
}
