/**
 * Content Security Policy (CSP) Utilities
 *
 * Fournit des fonctions pour générer des CSP sécurisées avec support
 * pour les nonces et la configuration par environnement.
 *
 * IMPLÉMENTATION DES NONCES CSP AVEC NEXT.JS:
 *
 * 1. Le middleware génère un nonce unique par requête
 * 2. Le nonce est passé via le header 'x-nonce'
 * 3. Le layout récupère le nonce et le passe aux scripts
 * 4. La CSP autorise uniquement les scripts avec ce nonce
 *
 * Cette approche remplace 'unsafe-inline' par des nonces cryptographiques,
 * offrant une protection XSS beaucoup plus forte.
 */

// Header utilisé pour passer le nonce entre middleware et composants
export const CSP_NONCE_HEADER = 'x-nonce'

/**
 * Génère un nonce cryptographiquement sécurisé (base64, 128 bits)
 * Compatible avec Edge Runtime (utilise Web Crypto API)
 */
export function generateNonce(): string {
  // Utiliser crypto global disponible dans Edge Runtime (Web Crypto API)
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
}

/**
 * Génère un nonce pour une utilisation côté Edge (compatible avec crypto.subtle)
 * @deprecated Utilisez generateNonce() qui est maintenant compatible avec Edge Runtime
 */
export async function generateNonceEdge(): Promise<string> {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
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
 *
 * @param config - Configuration CSP
 * @returns La chaîne CSP formatée
 */
export function generateCSP(config: CSPConfig = {}): string {
  const isProduction = process.env.NODE_ENV === 'production'
  const {
    allowEval = !isProduction, // Autorisé en dev pour le hot reload Next.js
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

  // Avec nonce : les navigateurs modernes honorent le nonce et ignorent unsafe-inline
  // On garde unsafe-inline pour les browsers anciens (fallback) et pour GTM/Clarity/Meta Pixel
  // qui injectent des scripts inline sans nonce.
  // Note: strict-dynamic est intentionnellement omis car il désactive le allowlist de domaines,
  // ce qui bloque GTM, Apollo, Meta Pixel et Microsoft Clarity.
  if (scriptNonce) {
    scriptSrc.push(`'nonce-${scriptNonce}'`)
    scriptSrc.push("'unsafe-inline'") // ignoré par les browsers qui supportent nonce (CSP3)
  } else {
    scriptSrc.push("'unsafe-inline'")
  }

  // En développement uniquement : unsafe-eval pour le hot reload Next.js
  if (allowEval) {
    scriptSrc.push("'unsafe-eval'")
  }

  // Domaines externes autorisés pour les scripts
  // Note: avec strict-dynamic, ces domaines sont ignorés mais gardés pour fallback
  // https://unpkg.com : worker PDF.js (page signature) quand worker-src blob: est utilisé en fallback
  // https://js.stripe.com : Stripe.js pour les paiements
  // https://scripts.clarity.ms : Microsoft Clarity chargé via GTM
  scriptSrc.push(
    'https://*.supabase.co',
    'https://*.sentry.io',
    'https://plausible.io',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://unpkg.com',
    'https://js.stripe.com',
    'https://*.apollo.io',
    'https://scripts.clarity.ms',
    'https://*.clarity.ms',
    'https://connect.facebook.net',
    ...additionalScriptSrc
  )

  directives.push(`script-src ${scriptSrc.join(' ')}`)

  // worker-src: Workers (ex. PDF.js sur /sign) — blob: pour worker inline, unpkg pour worker externe
  directives.push("worker-src 'self' blob: https://unpkg.com")

  // style-src: Styles autorisés
  const styleSrc = ["'self'"]

  if (allowInlineStyles) {
    // IMPORTANT: Les nonces ne fonctionnent pas pour les attributs style inline dans React
    // (style={{...}}) car les nonces ne s'appliquent qu'aux balises <style>
    // Donc on utilise uniquement 'unsafe-inline' pour les styles, pas de nonce
    // Le nonce est réservé pour les scripts uniquement
    styleSrc.push("'unsafe-inline'")
  }

  styleSrc.push('https://fonts.googleapis.com', 'https://js.stripe.com')
  directives.push(`style-src ${styleSrc.join(' ')}`)

  // img-src: Images autorisées
  directives.push("img-src 'self' data: https: blob: https://*.supabase.co https://www.facebook.com")

  // font-src: Polices autorisées (Stripe charge des polices depuis plusieurs domaines)
  directives.push("font-src 'self' data: https://fonts.gstatic.com https://*.stripe.com https://js.stripe.com https://checkout.stripe.com https://m.stripe.network https://*.stripe.network")

  // connect-src: Connexions autorisées (fetch, WebSocket, etc.)
  // blob: requis pour que le worker PDF.js puisse charger le PDF depuis une URL blob (page signature)
  // Stripe nécessite plusieurs domaines pour fonctionner correctement
  const connectSrc = [
    "'self'",
    'blob:',
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://plausible.io',
    'https://www.google-analytics.com',
    'https://analytics.google.com',
    'https://region1.google-analytics.com',
    'https://region1.analytics.google.com',
    'https://api.stripe.com',
    'https://*.stripe.com',
    'https://*.stripe.network',
    'https://*.apollo.io',
    'https://aplo-evnt.com',
    'https://*.clarity.ms',
    'https://www.clarity.ms',
    'https://www.facebook.com',
    'https://*.facebook.com',
    'https://connect.facebook.net',
    ...additionalConnectSrc,
  ]

  // En développement, autoriser localhost pour WebSocket
  if (!isProduction) {
    connectSrc.push('ws://localhost:*', 'wss://localhost:*')
  }

  directives.push(`connect-src ${connectSrc.join(' ')}`)

  // frame-src: Iframes autorisées (Stripe pour 3D Secure, CardElement et Checkout + YouTube pour la démo + Meta Pixel via GTM)
  directives.push("frame-src 'self' https://*.supabase.co https://js.stripe.com https://*.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.stripe.network https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://www.facebook.com https://*.facebook.com")

  // media-src: Médias autorisés
  directives.push("media-src 'self' https://*.supabase.co blob:")

  // object-src: Interdire les plugins (Flash, Java, etc.)
  directives.push("object-src 'none'")

  // base-uri: Limiter à self pour prévenir injection de base
  directives.push("base-uri 'self'")

  // form-action: Actions de formulaire limitées à self + Meta Pixel (GTM envoie vers facebook.com/tr/)
  directives.push("form-action 'self' https://www.facebook.com")

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
    // payment=(self) autorise Stripe Payment Request API (Apple Pay, Google Pay)
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()',
      'payment=(self "https://js.stripe.com")',
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

/**
 * Génère les headers de sécurité avec un nonce pour la CSP
 * À utiliser dans le middleware Next.js
 */
export function getSecurityHeadersWithNonce(nonce: string): Record<string, string> {
  const csp = generateCSP({ scriptNonce: nonce, styleNonce: nonce })

  const headers = getSecurityHeaders(csp)

  // Ajouter le header pour passer le nonce aux composants
  headers[CSP_NONCE_HEADER] = nonce

  return headers
}

/**
 * Type pour le contexte de nonce dans les composants React
 */
export interface NonceContextValue {
  nonce: string | undefined
}

/**
 * Extrait le nonce des headers de la requête
 * À utiliser dans les Server Components
 */
export function getNonceFromHeaders(headers: Headers): string | undefined {
  return headers.get(CSP_NONCE_HEADER) || undefined
}
