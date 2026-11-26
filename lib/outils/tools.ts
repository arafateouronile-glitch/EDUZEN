/**
 * Outils gratuits en libre-service (/outils) : métadonnées partagées entre les
 * pages publiques, l'API et les emails marketing (sans dépendance serveur).
 */

export const OUTIL_KEYS = ['convention', 'reglement', 'certificat', 'emargement', 'qualiopi'] as const
export type OutilKey = (typeof OUTIL_KEYS)[number]

export interface OutilMeta {
  key: OutilKey
  slug: string
  title: string
  /** Nom du document dans les messages (« Votre … ») */
  documentName: string
  shortDescription: string
  fileName: string
}

export const OUTILS: Record<OutilKey, OutilMeta> = {
  convention: {
    key: 'convention',
    slug: 'convention-de-formation',
    title: 'Générateur de convention de formation',
    documentName: 'convention de formation',
    shortDescription: 'Une convention de formation professionnelle complète et conforme, prête à signer, en 2 minutes.',
    fileName: 'convention-de-formation.pdf',
  },
  reglement: {
    key: 'reglement',
    slug: 'reglement-interieur',
    title: 'Modèle de règlement intérieur',
    documentName: 'règlement intérieur',
    shortDescription: 'Le règlement intérieur obligatoire de votre organisme de formation, personnalisé à vos horaires.',
    fileName: 'reglement-interieur.pdf',
  },
  certificat: {
    key: 'certificat',
    slug: 'certificat-de-realisation',
    title: 'Générateur de certificat de réalisation',
    documentName: 'certificat de réalisation',
    shortDescription: 'Le certificat de réalisation au modèle officiel du Ministère du Travail, rempli pour votre apprenant.',
    fileName: 'certificat-de-realisation.pdf',
  },
  emargement: {
    key: 'emargement',
    slug: 'feuille-emargement',
    title: "Générateur de feuilles d'émargement",
    documentName: "feuille d'émargement",
    shortDescription: "Des feuilles d'émargement par demi-journée, avec vos apprenants et vos dates, prêtes à imprimer.",
    fileName: 'feuille-emargement.pdf',
  },
  qualiopi: {
    key: 'qualiopi',
    slug: 'auto-evaluation-qualiopi',
    title: "Simulateur d'auto-évaluation Qualiopi",
    documentName: "rapport d'auto-évaluation Qualiopi",
    shortDescription: 'Évaluez votre conformité sur les 32 indicateurs Qualiopi et recevez votre plan d’action détaillé.',
    fileName: 'auto-evaluation-qualiopi.pdf',
  },
}

export function outilBySlug(slug: string): OutilMeta | null {
  return Object.values(OUTILS).find((o) => o.slug === slug) ?? null
}

export function isOutilKey(value: string): value is OutilKey {
  return (OUTIL_KEYS as readonly string[]).includes(value)
}

/** Mention ajoutée en pied de chaque document généré */
export const EDUZEN_MENTION = 'Document généré gratuitement avec EduZen — eduzen.io'

export type QualiopiAnswer = 'oui' | 'partiel' | 'non' | 'na'
export const QUALIOPI_ANSWER_LABELS: Record<QualiopiAnswer, string> = {
  oui: 'Oui',
  partiel: 'En partie',
  non: 'Non',
  na: 'Non concerné',
}
