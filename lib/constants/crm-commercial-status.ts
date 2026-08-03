export type ProspectCommercialStatus = 'devis_envoye' | 'en_reflexion' | 'devis_signe' | 'convention_envoyee' | 'convention_signee' | 'perdu'

export const COMMERCIAL_STATUS_LABELS: Record<ProspectCommercialStatus, string> = {
  devis_envoye:       'Devis envoyé',
  en_reflexion:       'En réflexion',
  devis_signe:        'Devis signé',
  convention_envoyee: 'Convention envoyée',
  convention_signee:  'Convention signée',
  perdu:              'Perdu',
}

/** Ordre de progression automatique — en_reflexion/perdu sont des états manuels hors chaîne. */
export const COMMERCIAL_STATUS_AUTO_ORDER: ProspectCommercialStatus[] = [
  'devis_envoye',
  'devis_signe',
  'convention_envoyee',
  'convention_signee',
]
