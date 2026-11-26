/**
 * Validation des formulaires des outils gratuits (/outils). Les valeurs sont
 * échappées au rendu (generateHTML, generateAttendanceSheetHtml) ; ici on
 * borne les longueurs et on n'accepte le logo qu'en data: URL (jamais d'URL
 * distante, que le générateur irait télécharger).
 */

import { z } from 'zod'
import type { OutilKey } from '@/lib/outils/tools'

const text = (max: number) => z.string().trim().max(max)
const optionalText = (max: number) => text(max).optional().default('')
const required = (max: number, label: string) => text(max).min(1, `${label} est obligatoire`)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide')

/** Logo PNG/JPEG en data: URL, ~300 Ko max */
export const LOGO_MAX_CHARS = 420_000
const logo = z
  .string()
  .max(LOGO_MAX_CHARS, 'Logo trop lourd (300 Ko maximum)')
  .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/, 'Logo invalide (PNG ou JPG)')
  .optional()
  .or(z.literal(''))

export const organismeSchema = z.object({
  nom: required(200, "Le nom de l'organisme"),
  adresse: optionalText(200),
  code_postal: optionalText(10),
  ville: optionalText(100),
  siret: optionalText(20),
  nda: optionalText(30),
  region: optionalText(60),
  representant: optionalText(120),
  email: z.string().trim().max(200).email('Email de l’organisme invalide').optional().or(z.literal('')),
  telephone: optionalText(30),
  logo,
})

export const leadSchema = z.object({
  first_name: required(100, 'Le prénom'),
  last_name: required(100, 'Le nom'),
  email: z.string().trim().toLowerCase().max(200).email('Email invalide'),
})

const conventionFields = z.object({
  beneficiaire: required(200, 'Le bénéficiaire'),
  formation_nom: required(200, "L'intitulé de la formation"),
  formation_duree: required(60, 'La durée'),
  formation_objectifs: optionalText(2000),
  formation_contenu: optionalText(4000),
  formation_prerequis: optionalText(1000),
  formation_public: optionalText(1000),
  session_debut: isoDate,
  session_fin: isoDate,
  session_lieu: optionalText(200),
  session_effectif: optionalText(20),
  montant_ht: optionalText(20),
})

const reglementFields = z.object({
  horaires_ouverture: optionalText(200),
  horaires_cours: optionalText(200),
  annee: optionalText(20),
})

const certificatFields = z.object({
  eleve_nom: required(100, "Le nom de l'apprenant"),
  eleve_prenom: required(100, "Le prénom de l'apprenant"),
  entreprise_nom: optionalText(200),
  formation_nom: required(200, "L'intitulé de la formation"),
  formation_duree: required(60, 'La durée'),
  session_debut: isoDate,
  session_fin: isoDate,
})

export const MAX_EMARGEMENT_LEARNERS = 60
export const MAX_EMARGEMENT_DAYS = 31

const emargementFields = z.object({
  formation_nom: required(200, "L'intitulé de la formation"),
  session_debut: isoDate,
  session_fin: isoDate,
  session_lieu: optionalText(200),
  formateur: optionalText(120),
  apprenants: required(8000, 'La liste des apprenants'),
})

const qualiopiAnswer = z.enum(['oui', 'partiel', 'non', 'na'])
const qualiopiFields = z.object({
  answers: z.record(z.string().regex(/^\d{1,2}$/), qualiopiAnswer),
})

export const FIELD_SCHEMAS = {
  convention: conventionFields,
  reglement: reglementFields,
  certificat: certificatFields,
  emargement: emargementFields,
  qualiopi: qualiopiFields,
} satisfies Record<OutilKey, z.ZodTypeAny>

export type OutilFields<K extends OutilKey> = z.infer<(typeof FIELD_SCHEMAS)[K]>

export function outilRequestSchema(tool: OutilKey) {
  // Le simulateur Qualiopi ne demande que le nom de l'organisme
  const organisme = tool === 'qualiopi' ? organismeSchema.pick({ nom: true }) : organismeSchema
  return z
    .object({ organisme, lead: leadSchema, fields: FIELD_SCHEMAS[tool] })
    .superRefine((value, ctx) => {
      const fields = value.fields as { session_debut?: string; session_fin?: string }
      if (fields.session_debut && fields.session_fin && fields.session_fin < fields.session_debut) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fields', 'session_fin'], message: 'La date de fin précède la date de début' })
      }
    })
}

export type OutilRequest = z.infer<ReturnType<typeof outilRequestSchema>>

/** « Nom Prénom ; Entreprise » par ligne → apprenants de la feuille d'émargement */
export function parseLearners(raw: string): Array<{ last_name: string; first_name: string; company: string | null }> {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, companyPart] = line.split(/[;\t]/)
      const words = namePart.trim().split(/\s+/)
      const last = words.shift() ?? ''
      return { last_name: last, first_name: words.join(' '), company: companyPart?.trim() || null }
    })
}
