/**
 * Configuration centralisée de l'application EDUZEN
 * 
 * Ce fichier centralise toutes les valeurs de configuration qui étaient hardcodées
 * pour faciliter la maintenance et permettre la personnalisation.
 */
import { logger } from '@/lib/utils/logger'

/**
 * Couleurs de marque EDUZEN
 * Utilisées dans les composants UI, templates de documents, etc.
 */
export const BRAND_COLORS = {
  // Couleur principale - Deep Blue
  primary: '#274472',
  primaryDark: '#1d3556',
  primaryDarker: '#15263f',
  primaryLight: '#3b5c8a',
  primaryLighter: '#4f749d',
  primaryPale: '#d1d9e2',
  primaryGhost: '#e8ecf0',
  
  // Couleur secondaire - Cyan Vibrant
  secondary: '#34B9EE',
  secondaryDark: '#2A95BF',
  secondaryDarker: '#1F7190',
  secondaryLight: '#5CCBF3',
  secondaryLighter: '#8DDBF7',
  secondaryPale: '#BFEAFB',
  secondaryGhost: '#E5F6FD',
  
  // Couleur accent - Purple
  accent: '#8B5CF6',
  accentDark: '#7C3AED',
  accentDarker: '#6D28D9',
  accentLight: '#A78BFA',
  accentLighter: '#C4B5FD',
  accentPale: '#EDE9FE',
  accentGhost: '#F5F3FF',
  
  // Couleur texte sur fond primaire
  textOnPrimary: '#0f2847',
  
  // Alias pour compatibilité
  brandBlue: '#274472',
  brandCyan: '#34B9EE',
  brandPurple: '#8B5CF6',
} as const

/**
 * Valeurs par défaut de l'application
 */
export const APP_DEFAULTS = {
  // Devise par défaut (peut être remplacée par la devise de l'organisation)
  defaultCurrency: 'EUR',
  
  // Email par défaut (fallback si RESEND_FROM_EMAIL n'est pas configuré)
  defaultFromEmail: 'EDUZEN <onboarding@resend.dev>',
  
  // Port par défaut en développement
  defaultDevPort: 3001,
  
  // URL par défaut en développement
  defaultDevUrl: 'http://localhost:3001',
} as const

/**
 * Configuration Supabase
 */
export const SUPABASE_CONFIG = {
  defaultProjectId: process.env.SUPABASE_PROJECT_ID || '',
} as const

/**
 * Configuration de sécurité
 */
export const SECURITY_CONFIG = {
  // Clé de chiffrement par défaut (DOIT être remplacée en production)
  // En production, utiliser TEMPLATE_ENCRYPTION_KEY depuis les variables d'environnement
  getEncryptionKey: (): string => {
    // Vérifier si on est côté serveur
    const isServer = typeof window === 'undefined'
    
    const key = process.env.TEMPLATE_ENCRYPTION_KEY
    if (!key || key === 'default-key-change-in-production') {
      // Côté serveur en production : lancer une erreur
      if (isServer && process.env.NODE_ENV === 'production') {
        throw new Error(
          'TEMPLATE_ENCRYPTION_KEY doit être configurée en production. ' +
          'Générez une clé sécurisée et ajoutez-la aux variables d\'environnement.'
        )
      }
      
      // Côté client : utiliser une clé par défaut (le chiffrement se fera côté serveur via API)
      // Côté serveur en développement : utiliser une clé par défaut avec avertissement
      if (isServer) {
        logger.warn(
          'ATTENTION: Utilisation d\'une clé de chiffrement par défaut. Configurez TEMPLATE_ENCRYPTION_KEY pour la production.'
        )
      }
      
      return 'default-key-change-in-production'
    }
    return key
  },
} as const

/**
 * Configuration des URLs de l'application
 */
export const APP_URLS = {
  getBaseUrl: (): string => {
    return (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      (process.env.NODE_ENV === 'development'
        ? APP_DEFAULTS.defaultDevUrl
        : 'https://www.eduzen.io')
    )
  },
  
  getApiUrl: (): string => {
    return `${APP_URLS.getBaseUrl()}/api`
  },
} as const

/**
 * Adresse e-mail de contact/support affichée aux utilisateurs (pages d'erreur,
 * liens mailto, documentation API...). Source unique pour éviter que chaque
 * écran hardcode sa propre variante (support@, contact@, mauvais domaine...).
 */
export const SUPPORT_EMAIL = 'contact@eduzen.io'

/**
 * Configuration des emails
 */
export const EMAIL_CONFIG = {
  getFromEmail: (): string => {
    return process.env.RESEND_FROM_EMAIL || APP_DEFAULTS.defaultFromEmail
  },
} as const

/**
 * Configuration du connecteur comptable Fulll (fulll.fr / api.fulll.io)
 *
 * L'API Fulll est réservée aux partenaires : `FULLL_CLIENT_ID` / `FULLL_CLIENT_SECRET`
 * proviennent d'une application OAuth2 déclarée auprès de Fulll. Tant que l'onboarding
 * partenaire n'est pas fait, ces variables sont absentes et le connecteur reste inactif.
 *
 * Certains chemins/paramètres sont marqués TODO(fulll-docs) : à confirmer contre la
 * documentation Stoplight (accessible seulement avec un compte partenaire).
 */
export const FULLL_CONFIG = {
  getBaseUrl: (): string => process.env.FULLL_API_BASE_URL || 'https://api.fulll.io',
  // OAuth2 authorization-code
  tokenPath: '/cred/oauth2/token',
  authorizePath: '/cred/oauth2/authorize', // TODO(fulll-docs): confirmer host/path d'autorisation + PKCE
  oauthScope: 'accounting', // TODO(fulll-docs): confirmer la/les scope(s)
  // Endpoints comptables
  salesInvoicePath: '/accounting/v1/sales_invoice',
  entriesPath: '/accounting/v1/entries',
  customersPath: '/accounting/v1/customers',
  currenciesPath: '/accounting/v1/currencies',
  paymentTypesPath: '/accounting/v1/payment_types',
  booksPath: '/accounting/v1/books',
  accountsPath: '/accounting/v1/accounts',
  jobsPath: '/accounting/v1/jobs', // TODO(fulll-docs): confirmer le path de suivi des jobs d'import
  getClientId: (): string | undefined => process.env.FULLL_CLIENT_ID,
  getClientSecret: (): string | undefined => process.env.FULLL_CLIENT_SECRET,
  isConfigured: (): boolean => Boolean(process.env.FULLL_CLIENT_ID && process.env.FULLL_CLIENT_SECRET),
  getRedirectUri: (): string =>
    process.env.FULLL_OAUTH_REDIRECT_URI || `${APP_URLS.getBaseUrl()}/api/accounting/callback/fulll`,
} as const

/**
 * Export de toutes les configurations
 */
export const APP_CONFIG = {
  colors: BRAND_COLORS,
  defaults: APP_DEFAULTS,
  supabase: SUPABASE_CONFIG,
  security: SECURITY_CONFIG,
  urls: APP_URLS,
  email: EMAIL_CONFIG,
  fulll: FULLL_CONFIG,
} as const
