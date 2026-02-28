/**
 * Définitions des automatisations prédéfinies (presets)
 * Partagées entre la page session/automatisation et la page settings/email-schedules
 */

import type {
  EmailScheduleTriggerType,
  EmailScheduleTargetType,
} from '@/lib/services/email-schedule.service'

export interface PresetAutomation {
  email_type: string
  name: string
  description: string
  trigger_type: EmailScheduleTriggerType
  trigger_days: number
  trigger_time: string
  send_to_students: boolean
  send_to_teachers: boolean
  send_to_coordinators: boolean
  target_type: EmailScheduleTargetType
  category: 'avant' | 'apres' | 'paiement'
  /** Couleur Tailwind bg pour l'icône (ex: 'bg-blue-100') */
  colorClass: string
  /** Couleur Tailwind text pour l'icône (ex: 'text-blue-600') */
  textColorClass: string
}

export const PRESET_AUTOMATIONS: PresetAutomation[] = [
  // ── Avant la session ─────────────────────────────────────────────────────
  {
    email_type: 'convocation_j14',
    name: 'Convocation J-14',
    description: 'Envoi automatique de la convocation 14 jours avant le début de la session.',
    trigger_type: 'before_session_start',
    trigger_days: 14,
    trigger_time: '08:00',
    send_to_students: true,
    send_to_teachers: false,
    send_to_coordinators: false,
    target_type: 'session',
    category: 'avant',
    colorClass: 'bg-blue-100',
    textColorClass: 'text-blue-600',
  },
  {
    email_type: 'rappel_j7',
    name: 'Rappel J-7',
    description: 'Rappel envoyé aux participants et formateurs 7 jours avant la session.',
    trigger_type: 'before_session_start',
    trigger_days: 7,
    trigger_time: '09:00',
    send_to_students: true,
    send_to_teachers: true,
    send_to_coordinators: false,
    target_type: 'session',
    category: 'avant',
    colorClass: 'bg-indigo-100',
    textColorClass: 'text-indigo-600',
  },
  {
    email_type: 'rappel_j3',
    name: 'Rappel J-3',
    description: 'Rappel de dernière chance 3 jours avant le début de la session.',
    trigger_type: 'before_session_start',
    trigger_days: 3,
    trigger_time: '09:00',
    send_to_students: true,
    send_to_teachers: false,
    send_to_coordinators: false,
    target_type: 'session',
    category: 'avant',
    colorClass: 'bg-yellow-100',
    textColorClass: 'text-yellow-600',
  },
  // ── Après la session ──────────────────────────────────────────────────────
  {
    email_type: 'evaluation_post_formation',
    name: 'Évaluation post-formation',
    description: "Envoi du questionnaire de satisfaction le lendemain de la fin de la session.",
    trigger_type: 'after_session_end',
    trigger_days: 1,
    trigger_time: '10:00',
    send_to_students: true,
    send_to_teachers: false,
    send_to_coordinators: false,
    target_type: 'session',
    category: 'apres',
    colorClass: 'bg-orange-100',
    textColorClass: 'text-orange-600',
  },
  {
    email_type: 'attestation_presence',
    name: 'Attestation de présence',
    description: "Envoi automatique de l'attestation de présence 3 jours après la fin.",
    trigger_type: 'after_session_end',
    trigger_days: 3,
    trigger_time: '10:00',
    send_to_students: true,
    send_to_teachers: false,
    send_to_coordinators: false,
    target_type: 'session',
    category: 'apres',
    colorClass: 'bg-green-100',
    textColorClass: 'text-green-600',
  },
  {
    email_type: 'certificat_realisation',
    name: 'Certificat de réalisation',
    description: 'Envoi du certificat de réalisation 5 jours après la fin de la session.',
    trigger_type: 'after_session_end',
    trigger_days: 5,
    trigger_time: '10:00',
    send_to_students: true,
    send_to_teachers: false,
    send_to_coordinators: false,
    target_type: 'session',
    category: 'apres',
    colorClass: 'bg-emerald-100',
    textColorClass: 'text-emerald-600',
  },
  {
    email_type: 'relance_evaluation',
    name: 'Relance évaluation',
    description: "Relance pour les participants n'ayant pas répondu au questionnaire (J+7).",
    trigger_type: 'after_session_end',
    trigger_days: 7,
    trigger_time: '10:00',
    send_to_students: true,
    send_to_teachers: false,
    send_to_coordinators: false,
    target_type: 'session',
    category: 'apres',
    colorClass: 'bg-amber-100',
    textColorClass: 'text-amber-600',
  },
  // ── Paiement ──────────────────────────────────────────────────────────────
  {
    email_type: 'relance_paiement',
    name: 'Relance paiement',
    description: 'Relance coordinateur pour les paiements en attente 30 jours après la session.',
    trigger_type: 'after_session_end',
    trigger_days: 30,
    trigger_time: '09:00',
    send_to_students: false,
    send_to_teachers: false,
    send_to_coordinators: true,
    target_type: 'session',
    category: 'paiement',
    colorClass: 'bg-red-100',
    textColorClass: 'text-red-600',
  },
]

export const PRESET_EMAIL_TYPES = new Set(PRESET_AUTOMATIONS.map((p) => p.email_type))

export const PRESET_CATEGORIES: {
  key: PresetAutomation['category']
  label: string
}[] = [
  { key: 'avant', label: 'Avant la session' },
  { key: 'apres', label: 'Après la session' },
  { key: 'paiement', label: 'Paiement' },
]
