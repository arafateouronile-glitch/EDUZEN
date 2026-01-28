/**
 * Chaîne de preuve irréfutable pour signatures et émargements
 * Hash SHA-256 : email + signature_data + metadata + secret
 * Conforme OPCO/Qualiopi.
 */

import { createHash } from 'crypto'

export interface SignatureMetadata {
  ip?: string
  user_agent?: string
  fingerprint?: string
  timestamp_utc: string
  geolocation?: { lat: number; lng: number; accuracy?: number }
}

/**
 * Génère le hash d'intégrité SHA-256 pour une preuve numérique.
 * Payload : email + signature_data + JSON(metadata) + secret
 */
export function computeIntegrityHash(
  signerEmail: string,
  signatureData: string,
  metadata: SignatureMetadata,
  secretKey: string
): string {
  const meta = {
    ip: metadata.ip ?? '',
    user_agent: metadata.user_agent ?? '',
    fingerprint: metadata.fingerprint ?? '',
    timestamp_utc: metadata.timestamp_utc,
    geolocation: metadata.geolocation ? JSON.stringify(metadata.geolocation) : '',
  }
  const payload = [
    signerEmail.trim().toLowerCase(),
    signatureData,
    JSON.stringify(meta),
    secretKey,
  ].join('|')
  return createHash('sha256').update(payload, 'utf8').digest('hex')
}

/**
 * Vérifie que le secret est configuré (éviter erreurs en prod).
 */
export function getSignatureEvidenceSecret(): string {
  const secret = process.env.SIGNATURE_EVIDENCE_SECRET ?? process.env.EDUZEN_SIGNATURE_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      'SIGNATURE_EVIDENCE_SECRET ou EDUZEN_SIGNATURE_SECRET (min 16 caractères) requis pour la chaîne de preuve.'
    )
  }
  return secret
}
