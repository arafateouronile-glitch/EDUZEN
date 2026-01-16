/**
 * Hook personnalisé pour utiliser les traductions next-intl
 * Fournit un accès simplifié aux traductions avec typage
 */

import { useTranslations as useNextIntlTranslations } from 'next-intl'

export function useTranslations(namespace?: string) {
  return useNextIntlTranslations(namespace)
}



