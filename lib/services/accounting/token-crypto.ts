/**
 * Chiffrement au repos des jetons OAuth des connecteurs comptables (serveur uniquement).
 *
 * `lib/utils/secure-storage.ts` ne convient pas ici : il est marqué `'use client'` et
 * dérive sa clé d'empreintes du navigateur — impossible à exécuter dans une route API
 * ou un cron. On réutilise donc le même schéma que `lib/services/template-security.service.ts`
 * (AES `crypto-js` + `SECURITY_CONFIG.getEncryptionKey()` alimentée par `TEMPLATE_ENCRYPTION_KEY`).
 *
 * Rétro-compatibilité : le texte chiffré est préfixé par `enc:v1:`. `decryptToken` renvoie
 * la valeur telle quelle si le préfixe est absent (jetons en clair écrits avant ce changement),
 * ce qui évite toute migration de données.
 */

import * as CryptoJS from 'crypto-js'
import { SECURITY_CONFIG } from '@/lib/config/app-config'

const ENCRYPTED_PREFIX = 'enc:v1:'

/** Chiffre une valeur ; renvoie `null`/`undefined` inchangés. */
export function encryptToken(plain: string): string
export function encryptToken(plain: string | null | undefined): string | null | undefined
export function encryptToken(plain: string | null | undefined): string | null | undefined {
  if (plain == null || plain === '') return plain
  if (plain.startsWith(ENCRYPTED_PREFIX)) return plain // déjà chiffré
  const ciphertext = CryptoJS.AES.encrypt(plain, SECURITY_CONFIG.getEncryptionKey()).toString()
  return ENCRYPTED_PREFIX + ciphertext
}

/**
 * Déchiffre une valeur produite par `encryptToken`.
 * - `null`/`''` -> renvoyé inchangé
 * - sans préfixe `enc:v1:` -> renvoyé inchangé (jeton en clair légué)
 * - déchiffrement impossible (mauvaise clé, données corrompues) -> `null`
 */
export function decryptToken(stored: string | null | undefined): string | null | undefined {
  if (stored == null || stored === '') return stored
  if (!stored.startsWith(ENCRYPTED_PREFIX)) return stored // valeur en clair héritée
  try {
    const bytes = CryptoJS.AES.decrypt(stored.slice(ENCRYPTED_PREFIX.length), SECURITY_CONFIG.getEncryptionKey())
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted || null
  } catch {
    return null
  }
}

export function isEncryptedToken(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX)
}
