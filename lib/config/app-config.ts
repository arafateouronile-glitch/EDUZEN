/**
 * Configuration centralisée de l'application EDUZEN
 * 
 * Ce fichier centralise toutes les valeurs de configuration qui étaient hardcodées
 * pour faciliter la maintenance et permettre la personnalisation.
 */

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
  // Project ID par défaut (peut être remplacé par SUPABASE_PROJECT_ID)
  defaultProjectId: process.env.SUPABASE_PROJECT_ID || 'ocdlaouymksskmmhmzdr',
} as const

/**
 * Configuration de sécurité
 */
export const SECURITY_CONFIG = {
  // Clé de chiffrement par défaut (DOIT être remplacée en production)
  // En production, utiliser TEMPLATE_ENCRYPTION_KEY depuis les variables d'environnement
  getEncryptionKey: (): string => {
    const key = process.env.TEMPLATE_ENCRYPTION_KEY
    if (!key || key === 'default-key-change-in-production') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'TEMPLATE_ENCRYPTION_KEY doit être configurée en production. ' +
          'Générez une clé sécurisée et ajoutez-la aux variables d\'environnement.'
        )
      }
      // En développement, utiliser une clé par défaut (mais afficher un avertissement)
      console.warn(
        '⚠️  ATTENTION: Utilisation d\'une clé de chiffrement par défaut. ' +
        'Configurez TEMPLATE_ENCRYPTION_KEY pour la production.'
      )
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
      (process.env.NODE_ENV === 'development' 
        ? APP_DEFAULTS.defaultDevUrl 
        : 'https://eduzen.fr') // URL de production par défaut
    )
  },
  
  getApiUrl: (): string => {
    return `${APP_URLS.getBaseUrl()}/api`
  },
} as const

/**
 * Configuration des emails
 */
export const EMAIL_CONFIG = {
  getFromEmail: (): string => {
    return process.env.RESEND_FROM_EMAIL || APP_DEFAULTS.defaultFromEmail
  },
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
} as const
