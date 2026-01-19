/**
 * Content Security Policy (CSP) Utilities
 *
 * Fournit des fonctions pour générer des CSP sécurisées avec support
 * pour les nonces et la configuration par environnement.
 */

import crypto from 'crypto'

/**
 * Génère un nonce cryptographiquement sécurisé
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64')
}

/**
 * Configuration CSP par environnement
 */
interface CSPConfig {
  /** Autoriser eval() - à éviter en production */
  allowEval?: boolean
  /** Autoriser les styles inline */
  allowInlineStyles?: boolean
  /** Nonce pour les scripts inline */
  scriptNonce?: string
  /** Nonce pour les styles inline */
  styleNonce?: string
  /** Domaines additionnels pour les scripts */
  additionalScriptSrc?: string[]
  /** Domaines additionnels pour les connexions */
  additionalConnectSrc?: string[]
  /** Mode report-only (ne bloque pas, juste rapporte) */
  reportOnly?: boolean
  /** URL pour les rapports de violation */
  reportUri?: string
}

/**
 * Génère une CSP stricte pour la production
 */
export function generateCSP(config: CSPConfig = {}): string {
  const isProduction = process.env.NODE_ENV === 'production'
  const {
    allowEval = !isProduction, // Autorisé en dev pour le hot reload
    allowInlineStyles = true, // Nécessaire pour Tailwind/CSS-in-JS
    scriptNonce,
    styleNonce,
    additionalScriptSrc = [],
    additionalConnectSrc = [],
    reportUri,
  } = config

  // Construire les directives
  const directives: string[] = []

  // default-src: Politique par défaut restrictive
  directives.push("default-src 'self'")

  // script-src: Scripts autorisés
  const scriptSrc = ["'self'"]

  // En production avec nonce
  if (isProduction && scriptNonce) {
    scriptSrc.push(`'nonce-${scriptNonce}'`)
  }

  // En développement, autoriser unsafe-eval pour le hot reload
  if (allowEval) {
    scriptSrc.push("'unsafe-eval'")
  }

  // Si pas de nonce en production, utiliser strict-dynamic pour les scripts chargés
  // Note: strict-dynamic ignore 'self' et host-sources, mais utilise nonce/hash
  if (isProduction && !scriptNonce) {
    // Fallback: utiliser unsafe-inline (moins sécurisé)
    // TODO: Implémenter les nonces côté Next.js
    scriptSrc.push("'unsafe-inline'")
  }

  // Domaines externes autorisés pour les scripts
  scriptSrc.push(
    'https://*.supabase.co',
    'https://plausible.io',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    ...additionalScriptSrc
  )

  directives.push(`script-src ${scriptSrc.join(' ')}`)

  // style-src: Styles autorisés
  const styleSrc = ["'self'"]

  if (allowInlineStyles) {
    if (styleNonce) {
      styleSrc.push(`'nonce-${styleNonce}'`)
    } else {
      // Tailwind et CSS-in-JS nécessitent unsafe-inline pour les styles
      styleSrc.push("'unsafe-inline'")
    }
  }

  styleSrc.push('https://fonts.googleapis.com')
  directives.push(`style-src ${styleSrc.join(' ')}`)

  // img-src: Images autorisées
  directives.push("img-src 'self' data: https: blob: https://*.supabase.co")

  // font-src: Polices autorisées
  directives.push("font-src 'self' data: https://fonts.gstatic.com")

  // connect-src: Connexions autorisées (fetch, WebSocket, etc.)
  const connectSrc = [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://plausible.io',
    'https://www.google-analytics.com',
    'https://analytics.google.com',
    ...additionalConnectSrc,
  ]

  // En développement, autoriser localhost pour WebSocket
  if (!isProduction) {
    connectSrc.push('ws://localhost:*', 'wss://localhost:*')
  }

  directives.push(`connect-src ${connectSrc.join(' ')}`)

  // frame-src: Iframes autorisées
  directives.push("frame-src 'self' https://*.supabase.co")

  // media-src: Médias autorisés
  directives.push("media-src 'self' https://*.supabase.co blob:")

  // object-src: Interdire les plugins (Flash, Java, etc.)
  directives.push("object-src 'none'")

  // base-uri: Limiter à self pour prévenir injection de base
  directives.push("base-uri 'self'")

  // form-action: Actions de formulaire limitées à self
  directives.push("form-action 'self'")

  // frame-ancestors: Interdire l'embedding (prévenir clickjacking)
  directives.push("frame-ancestors 'none'")

  // Politiques additionnelles en production
  if (isProduction) {
    // Forcer HTTPS
    directives.push('upgrade-insecure-requests')
    // Bloquer le contenu mixte
    directives.push('block-all-mixed-content')
  }

  // Report URI pour les violations
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`)
  }

  return directives.join('; ')
}

/**
 * Headers de sécurité recommandés
 */
export function getSecurityHeaders(csp?: string): Record<string, string> {
  const isProduction = process.env.NODE_ENV === 'production'

  const headers: Record<string, string> = {
    // CSP
    'Content-Security-Policy': csp || generateCSP(),

    // Prévenir le clickjacking
    'X-Frame-Options': 'DENY',

    // Prévenir le sniffing MIME
    'X-Content-Type-Options': 'nosniff',

    // Protection XSS (obsolète mais encore utile pour vieux navigateurs)
    'X-XSS-Protection': '1; mode=block',

    // Contrôler les informations de référent
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Permissions API
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()',
      'payment=()',
      'usb=()',
    ].join(', '),
  }

  // HSTS en production uniquement
  if (isProduction) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  }

  return headers
}

/**
 * Crée un meta tag CSP pour les pages statiques
 */
export function createCSPMetaTag(config: CSPConfig = {}): string {
  const csp = generateCSP(config)
  return `<meta http-equiv="Content-Security-Policy" content="${csp}">`
}
