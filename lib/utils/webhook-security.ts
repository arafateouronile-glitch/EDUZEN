/**
 * Utilitaires de sécurité pour les webhooks
 * Validation de signatures, protection contre replay attacks
 */

import crypto from 'crypto'

/**
 * Interface pour la configuration de validation de webhook
 */
interface WebhookSecurityConfig {
  secret: string
  signatureHeader?: string // Header contenant la signature (défaut: 'x-signature')
  timestampHeader?: string // Header contenant le timestamp (défaut: 'x-timestamp')
  nonceHeader?: string // Header contenant le nonce (défaut: 'x-nonce')
  maxAge?: number // Âge maximum du timestamp en secondes (défaut: 300 = 5 minutes)
}

/**
 * Valide la signature d'un webhook
 * 
 * @param payload - Corps de la requête (string ou Buffer)
 * @param signature - Signature reçue dans le header
 * @param secret - Secret partagé pour valider la signature
 * @param algorithm - Algorithme de hash (défaut: 'sha256')
 */
export function validateWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  if (!signature || !secret) {
    return false
  }

  // Normaliser la signature (enlever le préfixe si présent)
  const normalizedSignature = signature.replace(/^(sha256=|sha1=|hmac=)/i, '')

  // Calculer la signature attendue
  const hmac = crypto.createHmac(algorithm, secret)
  hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload))
  const expectedSignature = hmac.digest('hex')

  // Comparaison sécurisée (timing-safe)
  return crypto.timingSafeEqual(
    Buffer.from(normalizedSignature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Valide un timestamp pour prévenir les replay attacks
 * 
 * @param timestamp - Timestamp de la requête (en secondes ou ISO string)
 * @param maxAge - Âge maximum autorisé en secondes (défaut: 300 = 5 minutes)
 */
export function validateTimestamp(
  timestamp: string | number,
  maxAge: number = 300
): boolean {
  let timestampSeconds: number

  if (typeof timestamp === 'string') {
    // Si c'est une string ISO, la convertir
    timestampSeconds = Math.floor(new Date(timestamp).getTime() / 1000)
  } else {
    timestampSeconds = timestamp
  }

  const now = Math.floor(Date.now() / 1000)
  const age = now - timestampSeconds

  // Vérifier que le timestamp n'est pas dans le futur (tolérance de 60 secondes)
  if (age < -60) {
    return false
  }

  // Vérifier que le timestamp n'est pas trop ancien
  return age <= maxAge
}

/**
 * Store en mémoire pour les nonces (à remplacer par Redis en production)
 */
const nonceStore = new Map<string, number>()

/**
 * Nettoie les nonces expirés toutes les 5 minutes
 */
setInterval(() => {
  const now = Date.now()
  for (const [nonce, timestamp] of nonceStore.entries()) {
    if (now - timestamp > 300000) { // 5 minutes
      nonceStore.delete(nonce)
    }
  }
}, 5 * 60 * 1000)

/**
 * Valide un nonce pour prévenir les replay attacks
 * 
 * @param nonce - Nonce unique de la requête
 * @param maxAge - Âge maximum du nonce en millisecondes (défaut: 5 minutes)
 */
export function validateNonce(nonce: string, maxAge: number = 300000): boolean {
  if (!nonce || nonce.length < 16) {
    return false // Nonce trop court
  }

  const now = Date.now()
  const storedTimestamp = nonceStore.get(nonce)

  // Si le nonce existe déjà, c'est un replay
  if (storedTimestamp !== undefined) {
    return false
  }

  // Stocker le nonce avec le timestamp actuel
  nonceStore.set(nonce, now)

  return true
}

/**
 * Valide complètement un webhook (signature + timestamp + nonce)
 * 
 * @param request - Requête HTTP
 * @param config - Configuration de sécurité
 * @param body - Corps de la requête (string ou Buffer)
 */
export async function validateWebhook(
  request: Request,
  config: WebhookSecurityConfig,
  body: string | Buffer
): Promise<{
  valid: boolean
  error?: string
  details?: {
    signatureValid: boolean
    timestampValid: boolean
    nonceValid: boolean
  }
}> {
  const {
    secret,
    signatureHeader = 'x-signature',
    timestampHeader = 'x-timestamp',
    nonceHeader = 'x-nonce',
    maxAge = 300,
  } = config

  const signature = request.headers.get(signatureHeader)
  const timestamp = request.headers.get(timestampHeader)
  const nonce = request.headers.get(nonceHeader)

  const details = {
    signatureValid: false,
    timestampValid: false,
    nonceValid: false,
  }

  // 1. Valider la signature
  if (!signature) {
    return {
      valid: false,
      error: 'Signature manquante',
      details,
    }
  }

  details.signatureValid = validateWebhookSignature(body, signature, secret)
  if (!details.signatureValid) {
    return {
      valid: false,
      error: 'Signature invalide',
      details,
    }
  }

  // 2. Valider le timestamp (si présent)
  if (timestamp) {
    details.timestampValid = validateTimestamp(timestamp, maxAge)
    if (!details.timestampValid) {
      return {
        valid: false,
        error: 'Timestamp invalide ou expiré',
        details,
      }
    }
  }

  // 3. Valider le nonce (si présent)
  if (nonce) {
    details.nonceValid = validateNonce(nonce)
    if (!details.nonceValid) {
      return {
        valid: false,
        error: 'Nonce invalide ou déjà utilisé (replay attack)',
        details,
      }
    }
  }

  return {
    valid: true,
    details,
  }
}

/**
 * Génère un nonce unique
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Génère un timestamp en secondes
 */
export function generateTimestamp(): number {
  return Math.floor(Date.now() / 1000)
}



