const SIGNATURE = `
  <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
    Airtone NILE<br>
    <span style="font-size:14px;color:#555;">Fondateur, EduZen</span><br>
    <span style="font-size:14px;color:#555;"><a href="tel:+33610441324" style="color:#555;text-decoration:none;">06 10 44 13 24</a> · <a href="https://www.eduzen.io" style="color:#555;text-decoration:none;">eduzen.io</a></span>
  </p>`

const CALENDLY = 'https://calendly.com/airtonenile/30min'

const BOOK_BTN = `
  <p style="margin:0 0 28px;text-align:center;">
    <a href="${CALENDLY}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">📅 Réserver 30 minutes →</a>
  </p>`

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">
            ${body}
            ${SIGNATURE}
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildWelcomeEmail({ prenom, organisme }: { prenom: string; organisme: string }): string {
  return wrap(`
    <p style="margin:0 0 20px;">Bonjour ${prenom},</p>
    <p style="margin:0 0 20px;">Je suis Airtone, fondateur d'EduZen. Je voulais vous écrire personnellement pour vous souhaiter la bienvenue — je suis vraiment content que vous ayez rejoint l'écosystème.</p>
    <p style="margin:0 0 20px;">Pour bien démarrer, voici ce que je vous recommande de faire en premier :</p>
    <p style="margin:0 0 12px;">1. <strong>Configurez votre organisme</strong> dans les réglages — logo, adresse, NDA, coordonnées. Ces infos s'afficheront automatiquement sur tous vos documents.</p>
    <p style="margin:0 0 12px;">2. <strong>Créez un programme</strong>, puis une formation, puis une session. C'est dans cet ordre que ça fonctionne.</p>
    <p style="margin:0 0 20px;">3. Si vous voulez aller plus vite, <strong>demandez à Jeane</strong> — notre assistante IA — de tout créer pour vous directement depuis le tableau de bord.</p>
    <p style="margin:0 0 20px;">Et si vous êtes bloqué ou que vous avez besoin d'aide, répondez directement à cet email ou appelez-moi au <a href="tel:+33610441324" style="color:#1a1a1a;">06 10 44 13 24</a>. Je réponds personnellement.</p>
    <p style="margin:0 0 40px;">Belle aventure avec EduZen,</p>
  `)
}

export function buildCheckInEmail({ prenom }: { prenom: string }): string {
  return wrap(`
    <p style="margin:0 0 20px;">Bonjour ${prenom},</p>
    <p style="margin:0 0 20px;">C'est Airtone. Ça fait maintenant 48 heures que vous avez rejoint EduZen — je voulais juste prendre de vos nouvelles.</p>
    <p style="margin:0 0 20px;">Est-ce que tout se passe bien ? Avez-vous réussi à configurer votre organisme et à créer vos premières formations ?</p>
    <p style="margin:0 0 20px;">Si vous avez des questions, si quelque chose bloque, ou si vous voulez juste vous assurer que vous tirez le meilleur parti de l'application — je vous propose qu'on prenne <strong>30 minutes ensemble</strong>. Pas de présentation, pas de démo. Juste un appel pour débloquer ce dont vous avez besoin.</p>
    ${BOOK_BTN}
    <p style="margin:0 0 20px;">Ou répondez simplement à cet email — je m'adapte à votre agenda.</p>
    <p style="margin:0 0 40px;">À très vite,</p>
  `)
}

export function buildMidTrialEmail({ prenom }: { prenom: string }): string {
  return wrap(`
    <p style="margin:0 0 20px;">Bonjour ${prenom},</p>
    <p style="margin:0 0 20px;">Votre essai EduZen a une semaine — vous êtes à mi-parcours.</p>
    <p style="margin:0 0 20px;">Est-ce que vous avez eu le temps de créer votre premier programme et vos sessions ? Si ce n'est pas encore fait, c'est le bon moment.</p>
    <p style="margin:0 0 20px;">Les organismes qui tirent le plus de valeur d'EduZen dans les premières semaines sont ceux qui ont au moins un programme complet avec une session active. À partir de là, la génération de documents, les émargements et le suivi Qualiopi deviennent naturels.</p>
    <p style="margin:0 0 20px;">Si quelque chose bloque, je vous propose qu'on se parle 30 minutes — je vous montre en direct ce qui peut vraiment faire la différence pour votre organisme.</p>
    ${BOOK_BTN}
    <p style="margin:0 0 20px;">Ou répondez à cet email si vous préférez — je lis tous les messages personnellement.</p>
    <p style="margin:0 0 40px;">À bientôt,</p>
  `)
}

export function buildTrialEndingSoonEmail({ prenom, appUrl }: { prenom: string; appUrl: string }): string {
  return wrap(`
    <p style="margin:0 0 20px;">Bonjour ${prenom},</p>
    <p style="margin:0 0 20px;">Votre essai gratuit se termine dans 3 jours.</p>
    <p style="margin:0 0 20px;">Est-ce qu'EduZen vous a été utile ? Est-ce qu'il y a quelque chose qui n'a pas fonctionné comme prévu, ou une fonctionnalité que vous n'avez pas eu le temps de tester ?</p>
    <p style="margin:0 0 20px;">Si vous avez des doutes sur la suite, on peut en parler directement — réservez 30 minutes et on fait le point ensemble avant la fin de votre essai.</p>
    ${BOOK_BTN}
    <p style="margin:0 0 20px;">Ou si vous êtes prêt à continuer :</p>
    <p style="margin:0 0 28px;text-align:center;">
      <a href="${appUrl}/dashboard/subscribe" style="display:inline-block;background:#274472;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:6px;">Choisir ma formule →</a>
    </p>
    <p style="margin:0 0 40px;">À très vite,</p>
  `)
}

export function buildTrialLastDayEmail({ prenom, appUrl }: { prenom: string; appUrl: string }): string {
  return wrap(`
    <p style="margin:0 0 20px;">Bonjour ${prenom},</p>
    <p style="margin:0 0 20px;">Votre essai se termine demain.</p>
    <p style="margin:0 0 20px;">Si vous avez 30 minutes cette semaine, je vous appelle personnellement pour faire le point — voir ce qui a marché, ce qui n'a pas marché, et comment EduZen peut vraiment s'adapter à votre façon de travailler.</p>
    <p style="margin:0 0 20px;">Pas de pression, pas de discours de vente. Juste un appel entre nous.</p>
    ${BOOK_BTN}
    <p style="margin:0 0 20px;">Ou si vous êtes prêt à continuer maintenant :</p>
    <p style="margin:0 0 28px;text-align:center;">
      <a href="${appUrl}/dashboard/subscribe" style="display:inline-block;background:#274472;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:6px;">Continuer avec EduZen →</a>
    </p>
    <p style="margin:0 0 40px;">À bientôt j'espère,</p>
  `)
}

export function buildPostConversionEmail({ prenom, planName }: { prenom: string; planName: string }): string {
  return wrap(`
    <p style="margin:0 0 20px;">Bonjour ${prenom},</p>
    <p style="margin:0 0 20px;">Votre abonnement ${planName} est actif. Merci de votre confiance — c'est une vraie joie de vous compter parmi nos clients.</p>
    <p style="margin:0 0 20px;">Maintenant que vous êtes lancé, voici les 3 choses que les clients les plus efficaces font en premier :</p>
    <p style="margin:0 0 12px;">1. <strong>Finalisez la configuration de votre organisme</strong> — logo, NDA, adresse. Ces infos apparaissent sur tous vos documents.</p>
    <p style="margin:0 0 12px;">2. <strong>Créez un modèle de convention personnalisé</strong> dans les réglages → Modèles de documents. Une fois fait, chaque nouvelle convention se génère en 45 secondes.</p>
    <p style="margin:0 0 20px;">3. <strong>Invitez votre équipe</strong> si vous avez des formateurs ou une assistante — chacun peut avoir son propre accès.</p>
    <p style="margin:0 0 20px;">Si vous avez des questions ou si vous voulez qu'on fasse un point ensemble, répondez à cet email ou appelez-moi au <a href="tel:+33610441324" style="color:#1a1a1a;">06 10 44 13 24</a>.</p>
    <p style="margin:0 0 40px;">Merci encore,</p>
  `)
}

export function firstName(fullName: string | null, email: string | null): string {
  return fullName?.trim().split(/\s+/)[0] || email?.split('@')[0] || 'vous'
}
