/**
 * Calendrier éditorial : 30 articles publiés un par jour à 8 h (Paris).
 * Le corps de chaque article est dans articles/<slug>.html.
 * Import en base : scripts/blog/schedule-calendar.ts
 */

export type BlogCategorySlug =
  | 'qualiopi-reglementation'
  | 'gestion-des-organismes-de-formation'
  | 'comparatifs-guides'
  | 'secteurs-formation'

export type CalendarArticle = {
  day: number
  slug: string
  title: string
  meta_title: string
  meta_description: string
  excerpt: string
  category: BlogCategorySlug
  keyword: string
}

const Q: BlogCategorySlug = 'qualiopi-reglementation'
const G: BlogCategorySlug = 'gestion-des-organismes-de-formation'

export const BLOG_CALENDAR: CalendarArticle[] = [
  {
    day: 1,
    slug: 'convention-de-formation-professionnelle-mentions-obligatoires',
    title: 'Convention de formation professionnelle : mentions obligatoires et modèle gratuit',
    meta_title: 'Convention de formation : mentions obligatoires + modèle',
    meta_description:
      'Convention de formation professionnelle : mentions obligatoires, signataires, erreurs fréquentes et modèle gratuit à générer en ligne pour votre organisme.',
    excerpt:
      "Ce que doit contenir une convention de formation selon le Code du travail, qui la signe, quand l'envoyer, et un générateur gratuit pour la produire en 2 minutes.",
    category: Q,
    keyword: 'convention de formation professionnelle',
  },
  {
    day: 2,
    slug: 'difference-convention-contrat-de-formation',
    title: 'Convention ou contrat de formation : quelle différence et lequel utiliser ?',
    meta_title: 'Convention ou contrat de formation : quelle différence ?',
    meta_description:
      'Convention ou contrat de formation professionnelle ? Qui paie, délai de rétractation, acompte limité : les règles pour choisir le bon document à chaque fois.',
    excerpt:
      "Entreprise qui finance ou particulier qui paie lui-même : le document n'est pas le même. Les différences, les mentions propres au contrat et les pièges à éviter.",
    category: Q,
    keyword: 'contrat de formation professionnelle',
  },
  {
    day: 3,
    slug: 'reglement-interieur-organisme-de-formation',
    title: "Règlement intérieur d'un organisme de formation : contenu obligatoire et modèle",
    meta_title: 'Règlement intérieur organisme de formation : guide + modèle',
    meta_description:
      "Règlement intérieur d'organisme de formation : contenu imposé par le Code du travail, sanctions, représentation des stagiaires et modèle gratuit à générer.",
    excerpt:
      "Hygiène et sécurité, discipline, procédure de sanction, représentation des stagiaires : tout ce que votre règlement intérieur doit prévoir, avec un modèle prêt à l'emploi.",
    category: Q,
    keyword: 'règlement intérieur organisme de formation',
  },
  {
    day: 4,
    slug: 'certificat-de-realisation-formation',
    title: 'Certificat de réalisation de formation : qui le délivre, quand et avec quel modèle',
    meta_title: 'Certificat de réalisation : quand et comment le délivrer',
    meta_description:
      "Certificat de réalisation d'une action de formation : rôle, financeurs concernés, mentions, signature et modèle officiel du Ministère du Travail à générer.",
    excerpt:
      "Le certificat de réalisation conditionne le paiement par l'OPCO ou la Caisse des dépôts. Ce qu'il doit contenir, qui le signe, et comment éviter les rejets.",
    category: Q,
    keyword: 'certificat de réalisation',
  },
  {
    day: 5,
    slug: 'attestation-fin-de-formation-vs-certificat-de-realisation',
    title: 'Attestation de fin de formation ou certificat de réalisation : ne les confondez plus',
    meta_title: 'Attestation de fin de formation vs certificat de réalisation',
    meta_description:
      "Attestation de fin de formation et certificat de réalisation : à qui chacun est destiné, mentions obligatoires, délais et erreurs qui bloquent un paiement.",
    excerpt:
      "Deux documents de fin de formation, deux destinataires, deux objectifs. Le tableau comparatif pour savoir lequel remettre, à qui, et ce qu'il doit contenir.",
    category: Q,
    keyword: 'attestation de fin de formation',
  },
  {
    day: 6,
    slug: 'convocation-formation-modele',
    title: 'Convocation à une formation : contenu, délai d’envoi et modèle',
    meta_title: 'Convocation à une formation : contenu, délai et modèle',
    meta_description:
      'Convocation de stagiaire à une formation : informations à indiquer, délai d’envoi conseillé, lien avec Qualiopi et modèle de convocation à reprendre.',
    excerpt:
      "Une bonne convocation réduit les absences et rassure le stagiaire. Les informations à ne pas oublier, le bon moment pour l'envoyer et un modèle complet.",
    category: G,
    keyword: 'convocation formation',
  },
  {
    day: 7,
    slug: 'bilan-pedagogique-et-financier-bpf',
    title: 'Bilan pédagogique et financier (BPF) : le guide pour le remplir sans erreur',
    meta_title: 'Bilan pédagogique et financier (BPF) : guide pour le remplir',
    meta_description:
      "Bilan pédagogique et financier : qui doit le déposer, date limite, cadres à remplir, erreurs fréquentes et conséquences d'un oubli pour votre NDA.",
    excerpt:
      "Le BPF est obligatoire chaque année pour tout organisme déclaré. Cadre par cadre, ce qu'il faut renseigner et comment préparer les chiffres tout au long de l'année.",
    category: Q,
    keyword: 'bilan pédagogique et financier',
  },
  {
    day: 8,
    slug: 'declaration-activite-organisme-de-formation-nda',
    title: "Déclaration d'activité d'organisme de formation (NDA) : étapes et pièces à fournir",
    meta_title: "Numéro de déclaration d'activité (NDA) : étapes et pièces",
    meta_description:
      "Obtenir un numéro de déclaration d'activité d'organisme de formation : quand le demander, pièces à fournir, délais, motifs de refus et risques de caducité.",
    excerpt:
      "Le NDA est la première démarche officielle d'un organisme de formation. Le bon moment pour le demander, le dossier à préparer et ce qui peut le faire perdre.",
    category: Q,
    keyword: 'déclaration d’activité organisme de formation',
  },
  {
    day: 9,
    slug: 'creer-organisme-de-formation-etapes',
    title: 'Créer un organisme de formation : les 8 étapes, du statut à Qualiopi',
    meta_title: 'Créer un organisme de formation : les 8 étapes clés',
    meta_description:
      'Créer un organisme de formation : choix du statut, NDA, Qualiopi, offre, tarifs, outils et premiers clients. La feuille de route complète pour démarrer.',
    excerpt:
      "Statut juridique, déclaration d'activité, certification, catalogue, outils de gestion : la feuille de route complète pour lancer votre organisme de formation.",
    category: G,
    keyword: 'créer un organisme de formation',
  },
  {
    day: 10,
    slug: 'rediger-programme-de-formation-qualiopi',
    title: 'Rédiger un programme de formation conforme Qualiopi : la méthode et un exemple',
    meta_title: 'Programme de formation Qualiopi : méthode et exemple',
    meta_description:
      'Rédiger un programme de formation conforme Qualiopi : rubriques attendues, objectifs, prérequis, modalités, accessibilité et exemple de programme complet.',
    excerpt:
      "Le programme est la première preuve que regarde un auditeur. Les rubriques indispensables, la façon de les rédiger et un exemple complet à adapter.",
    category: Q,
    keyword: 'programme de formation',
  },
  {
    day: 11,
    slug: 'objectifs-pedagogiques-smart-verbes-action',
    title: "Objectifs pédagogiques : méthode SMART et liste de verbes d'action",
    meta_title: "Objectifs pédagogiques : méthode SMART et verbes d'action",
    meta_description:
      "Rédiger des objectifs pédagogiques évaluables : méthode SMART, taxonomie de Bloom, liste de verbes d'action et exemples avant/après pour vos formations.",
    excerpt:
      "« Comprendre » ou « connaître » ne sont pas des objectifs évaluables. La méthode pour écrire des objectifs mesurables, avec une liste de verbes et des exemples.",
    category: G,
    keyword: 'objectifs pédagogiques',
  },
  {
    day: 12,
    slug: 'positionnement-stagiaires-qualiopi-indicateur-8',
    title: 'Positionnement des stagiaires à l’entrée en formation : répondre à l’indicateur 8',
    meta_title: 'Positionnement des stagiaires : indicateur 8 Qualiopi',
    meta_description:
      "Positionnement à l'entrée en formation : tests, entretiens, questionnaires, preuves attendues par l'auditeur pour l'indicateur 8 Qualiopi et exemples.",
    excerpt:
      "Évaluer le niveau d'un stagiaire avant la formation n'est pas une formalité. Les outils de positionnement, les preuves à conserver et les erreurs vues en audit.",
    category: Q,
    keyword: 'positionnement formation',
  },
  {
    day: 13,
    slug: 'evaluation-a-chaud-a-froid-formation',
    title: 'Évaluation à chaud et à froid d’une formation : différences et modèles de questions',
    meta_title: 'Évaluation à chaud et à froid : différences et modèles',
    meta_description:
      'Évaluation à chaud et à froid en formation : objectifs, moment idéal, exemples de questions, taux de réponse et exploitation des résultats pour Qualiopi.',
    excerpt:
      "À chaud, on mesure la satisfaction ; à froid, l'utilité réelle. Comment construire les deux questionnaires, quand les envoyer et quoi faire des réponses.",
    category: G,
    keyword: 'évaluation à chaud à froid',
  },
  {
    day: 14,
    slug: 'evaluation-des-acquis-formation-indicateur-11',
    title: 'Évaluer les acquis en formation : quiz, mises en situation et grilles (indicateur 11)',
    meta_title: 'Évaluation des acquis en formation : méthodes et preuves',
    meta_description:
      "Évaluer les acquis des stagiaires : quiz, études de cas, mises en situation, grilles critériées et preuves attendues pour l'indicateur 11 de Qualiopi.",
    excerpt:
      "L'indicateur 11 demande de prouver que les objectifs sont atteints. Les méthodes d'évaluation adaptées à chaque type d'objectif et les preuves à garder.",
    category: Q,
    keyword: 'évaluation des acquis',
  },
  {
    day: 15,
    slug: 'questionnaire-satisfaction-formation',
    title: 'Questionnaire de satisfaction de formation : 20 questions à poser (indicateur 30)',
    meta_title: 'Questionnaire de satisfaction formation : 20 questions',
    meta_description:
      'Questionnaire de satisfaction de formation : 20 questions types, échelles de réponse, parties prenantes à interroger et analyse attendue par Qualiopi.',
    excerpt:
      "Stagiaires, entreprises, financeurs, formateurs : l'indicateur 30 demande de recueillir l'avis de tous. Les questions à poser et comment en tirer quelque chose.",
    category: G,
    keyword: 'questionnaire de satisfaction formation',
  },
  {
    day: 16,
    slug: 'gestion-reclamations-qualiopi-indicateur-31',
    title: 'Gestion des réclamations en formation : la procédure attendue par Qualiopi',
    meta_title: 'Réclamations Qualiopi (indicateur 31) : procédure type',
    meta_description:
      "Gestion des réclamations en organisme de formation : procédure, registre, délais de réponse, exemples et preuves attendues pour l'indicateur 31 Qualiopi.",
    excerpt:
      "Même sans aucune réclamation reçue, l'auditeur vérifiera votre procédure. Comment la rédiger, tenir un registre et répondre dans les temps.",
    category: Q,
    keyword: 'gestion des réclamations formation',
  },
  {
    day: 17,
    slug: 'amelioration-continue-qualiopi-indicateur-32',
    title: "Amélioration continue Qualiopi : comment la prouver (indicateur 32)",
    meta_title: 'Amélioration continue Qualiopi : prouver l’indicateur 32',
    meta_description:
      "Amélioration continue en formation : transformer avis, réclamations et évaluations en actions tracées. Plan d'amélioration et preuves pour l'indicateur 32.",
    excerpt:
      "Recueillir des avis ne suffit pas : il faut montrer ce que vous en avez fait. La méthode pour tenir un plan d'amélioration simple et convaincant en audit.",
    category: Q,
    keyword: 'amélioration continue Qualiopi',
  },
  {
    day: 18,
    slug: 'audit-surveillance-qualiopi',
    title: 'Audit de surveillance Qualiopi : déroulé, calendrier et préparation',
    meta_title: 'Audit de surveillance Qualiopi : déroulé et préparation',
    meta_description:
      "Audit de surveillance Qualiopi : quand il a lieu, comment il se déroule, ce que l'auditeur vérifie et la checklist pour le préparer sereinement.",
    excerpt:
      "Entre l'audit initial et le renouvellement, l'audit de surveillance vérifie que la qualité est vivante. Son déroulé et une préparation en 4 semaines.",
    category: Q,
    keyword: 'audit de surveillance Qualiopi',
  },
  {
    day: 19,
    slug: 'non-conformite-qualiopi-mineure-majeure',
    title: "Non-conformité Qualiopi mineure ou majeure : que faire après l'audit ?",
    meta_title: 'Non-conformité Qualiopi mineure ou majeure : que faire ?',
    meta_description:
      "Non-conformité Qualiopi : différence entre mineure et majeure, délais pour la lever, plan d'actions correctives et preuves à transmettre au certificateur.",
    excerpt:
      "Une non-conformité n'est pas un échec, à condition de bien y répondre. Comment la qualifier, construire le plan d'actions et éviter qu'elle ne s'aggrave.",
    category: Q,
    keyword: 'non-conformité Qualiopi',
  },
  {
    day: 20,
    slug: 'accessibilite-handicap-formation-referent',
    title: 'Accessibilité et handicap en formation : référent, adaptations et indicateur 26',
    meta_title: 'Handicap en formation : référent et indicateur 26 Qualiopi',
    meta_description:
      "Accueillir des personnes en situation de handicap en formation : rôle du référent handicap, adaptations possibles, partenaires et preuves pour l'indicateur 26.",
    excerpt:
      "Référent handicap, information dans le programme, adaptations pédagogiques, réseau de partenaires : ce que l'indicateur 26 attend concrètement de vous.",
    category: Q,
    keyword: 'référent handicap formation',
  },
  {
    day: 21,
    slug: 'veille-qualiopi-indicateurs-23-24-25',
    title: 'Veille Qualiopi : organiser la veille réglementaire, métiers et pédagogique',
    meta_title: 'Veille Qualiopi (indicateurs 23, 24, 25) : méthode simple',
    meta_description:
      "Organiser la veille Qualiopi : veille légale, veille métiers et compétences, veille pédagogique. Sources, outils, fréquence et preuves d'exploitation.",
    excerpt:
      "Trois indicateurs, trois veilles différentes. Les sources à suivre, une organisation qui tient en une heure par mois et la façon de prouver que vous l'exploitez.",
    category: Q,
    keyword: 'veille Qualiopi',
  },
  {
    day: 22,
    slug: 'formation-a-distance-foad-preuves-assiduite',
    title: 'Formation à distance (FOAD) : prouver l’assiduité et sécuriser les financements',
    meta_title: 'FOAD : prouver l’assiduité d’une formation à distance',
    meta_description:
      "Formation à distance : obligations, assistance technique et pédagogique, preuves d'assiduité acceptées (connexions, travaux, évaluations) et émargement.",
    excerpt:
      "À distance, pas de feuille signée en salle. Les éléments que le Code du travail exige pour une FOAD et les preuves d'assiduité que les financeurs acceptent.",
    category: G,
    keyword: 'formation à distance preuves assiduité',
  },
  {
    day: 23,
    slug: 'sous-traitance-formation-qualiopi',
    title: 'Sous-traitance en formation : contrat, responsabilités et indicateur 27',
    meta_title: 'Sous-traitance en formation : contrat et Qualiopi',
    meta_description:
      "Sous-traiter une formation ou intervenir en sous-traitance : contrat, répartition des responsabilités, NDA et preuves attendues pour l'indicateur 27.",
    excerpt:
      "Quand un formateur ou un autre organisme intervient pour vous, la qualité reste votre responsabilité. Le contrat à prévoir et les contrôles à documenter.",
    category: Q,
    keyword: 'sous-traitance formation',
  },
  {
    day: 24,
    slug: 'formateur-independant-statut-contrat',
    title: 'Formateur indépendant : statut, NDA, contrat et facturation',
    meta_title: 'Formateur indépendant : statut, NDA et facturation',
    meta_description:
      'Devenir formateur indépendant : choisir son statut, déclarer son activité, travailler en direct ou en sous-traitance, fixer son tarif et facturer.',
    excerpt:
      "Micro-entreprise ou société, en direct ou en sous-traitance, avec ou sans Qualiopi : les choix à faire pour exercer comme formateur indépendant.",
    category: G,
    keyword: 'formateur indépendant',
  },
  {
    day: 25,
    slug: 'financement-opco-prise-en-charge-formation',
    title: 'Financement OPCO : comment obtenir la prise en charge d’une formation',
    meta_title: 'Financement OPCO : obtenir la prise en charge',
    meta_description:
      'Prise en charge OPCO : qui peut en bénéficier, quand faire la demande, pièces à fournir, subrogation et documents de fin de formation pour être payé.',
    excerpt:
      "De la demande de prise en charge au paiement, les étapes d'un financement OPCO et les documents à fournir pour ne pas attendre votre règlement des mois.",
    category: G,
    keyword: 'prise en charge OPCO',
  },
  {
    day: 26,
    slug: 'devis-formation-modele-mentions',
    title: 'Devis de formation : mentions à indiquer et modèle',
    meta_title: 'Devis de formation : mentions à indiquer et modèle',
    meta_description:
      "Devis de formation professionnelle : mentions à indiquer, présentation du prix, TVA, validité, lien avec la convention et modèle pour vos clients entreprises.",
    excerpt:
      "Un devis clair accélère la décision et la demande de financement. Les mentions à prévoir, la présentation du prix et le passage du devis à la convention.",
    category: G,
    keyword: 'devis formation',
  },
  {
    day: 27,
    slug: 'facture-formation-mentions-obligatoires-tva',
    title: 'Facturer une formation : mentions obligatoires et exonération de TVA',
    meta_title: 'Facture de formation : mentions obligatoires et TVA',
    meta_description:
      "Facture de formation professionnelle : mentions obligatoires, exonération de TVA (article 261 du CGI), facturation à l'OPCO et erreurs de paiement.",
    excerpt:
      "Mentions légales, exonération de TVA, facture au client ou à l'OPCO : les règles pour facturer une formation et être payé sans relance.",
    category: G,
    keyword: 'facture formation',
  },
  {
    day: 28,
    slug: 'calculer-prix-formation',
    title: 'Fixer le prix d’une formation : la méthode de calcul pas à pas',
    meta_title: 'Prix d’une formation : la méthode de calcul pas à pas',
    meta_description:
      "Calculer le prix d'une formation : coûts directs et indirects, seuil de rentabilité, tarif intra ou inter, prix par jour ou par stagiaire et positionnement.",
    excerpt:
      "Trop bas, vous travaillez à perte ; trop haut, vous perdez le client. La méthode pour calculer un prix rentable en intra comme en inter-entreprises.",
    category: G,
    keyword: 'prix formation',
  },
  {
    day: 29,
    slug: 'taux-abandon-formation-prevention',
    title: 'Abandons en formation : causes, taux et leviers de prévention (indicateur 12)',
    meta_title: 'Abandon en formation : causes et prévention (indicateur 12)',
    meta_description:
      "Prévenir les abandons en formation : causes fréquentes, signaux d'alerte, actions de prévention et preuves attendues par Qualiopi pour l'indicateur 12.",
    excerpt:
      "Chaque abandon coûte au stagiaire, au financeur et à vous. Les signaux à surveiller, les actions qui marchent et la façon de les documenter.",
    category: Q,
    keyword: 'abandon formation',
  },
  {
    day: 30,
    slug: 'dossier-preuves-qualiopi-organiser',
    title: 'Dossier de preuves Qualiopi : comment l’organiser indicateur par indicateur',
    meta_title: 'Dossier de preuves Qualiopi : l’organiser pas à pas',
    meta_description:
      "Organiser son dossier de preuves Qualiopi : arborescence par critère, preuves types par indicateur, mise à jour continue et auto-évaluation gratuite.",
    excerpt:
      "Le jour de l'audit, retrouver une preuve en 30 secondes change tout. Une arborescence simple, les preuves types par critère et un simulateur pour vous situer.",
    category: 'comparatifs-guides',
    keyword: 'preuves Qualiopi',
  },
]
