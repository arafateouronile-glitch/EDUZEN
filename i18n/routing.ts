import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  // Liste des locales supportées
  locales: ['fr', 'en'],

  // Locale par défaut
  defaultLocale: 'fr',

  // Préfixe de locale : 'never' signifie qu'aucune locale n'a de préfixe dans l'URL
  // La locale est détectée automatiquement ou via les cookies
  // Cette configuration évite les redirections vers des routes préfixées qui n'existent pas
  localePrefix: 'never',
})

// Créer les helpers de navigation
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)

