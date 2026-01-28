import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { routing } from './routing'
import { logger, sanitizeError } from '@/lib/utils/logger'

export default getRequestConfig(async ({ requestLocale }) => {
  // Cette fonction sera appelée pour chaque requête
  // requestLocale est fourni par le middleware next-intl (peut être null si le middleware n'est pas appelé)
  let locale = await requestLocale

  // Si requestLocale est null, essayer de récupérer la locale depuis les cookies
  // Cela permet de gérer les routes avec préfixe de locale (/en/* ou /fr/*) même avec localePrefix: 'never'
  if (!locale) {
    try {
      const cookieStore = await cookies()
      const localeCookie = cookieStore.get('NEXT_LOCALE')?.value
      if (localeCookie && routing.locales.includes(localeCookie as any)) {
        locale = localeCookie
      }
    } catch (error) {
      // En cas d'erreur lors de la lecture des cookies, utiliser la locale par défaut
      logger.error('Error reading locale cookie', sanitizeError(error))
    }
  }

  // Assurer que la locale est valide
  // Si requestLocale est null/undefined ou n'est pas dans la liste des locales, utiliser la locale par défaut
  // Cela garantit que la locale fonctionne même si le middleware next-intl n'est pas appelé pour certaines routes
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  try {
    return {
      locale,
      messages: (await import(`../messages/${locale}.json`)).default,
    }
  } catch (error) {
    // En cas d'erreur lors du chargement des messages, utiliser la locale par défaut
    logger.error('Error loading messages for locale', sanitizeError(error), { locale })
    return {
      locale: routing.defaultLocale,
      messages: (await import(`../messages/${routing.defaultLocale}.json`)).default,
    }
  }
})

