'use client'

/**
 * Secure Storage - Stockage client sécurisé
 *
 * Fournit une couche de sécurité pour le stockage côté client avec:
 * - Chiffrement des données sensibles
 * - Expiration automatique
 * - Validation des données
 * - Protection contre la falsification
 *
 * IMPORTANT: Même avec chiffrement, évitez de stocker des données
 * hautement sensibles (tokens d'auth, mots de passe) côté client.
 * Préférez les cookies httpOnly gérés par le serveur.
 */

import CryptoJS from 'crypto-js'

// Clé de chiffrement (générée à partir d'un identifiant unique du navigateur)
// Note: Cette approche n'est pas parfaite mais offre une protection contre
// les attaques XSS basiques qui tentent d'exfiltrer les données brutes
function getEncryptionKey(): string {
  if (typeof window === 'undefined') {
    return 'server-side-placeholder'
  }

  // Créer une clé basée sur des caractéristiques du navigateur
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|')

  // Hash pour créer une clé de longueur fixe
  return CryptoJS.SHA256(fingerprint).toString()
}

// Préfixe pour identifier les données chiffrées
const ENCRYPTED_PREFIX = 'enc:v1:'

// Types
interface StoredData<T> {
  value: T
  expiresAt?: number
  createdAt: number
  checksum: string
}

interface SecureStorageOptions {
  /** Durée de vie en millisecondes */
  ttl?: number
  /** Utiliser sessionStorage au lieu de localStorage */
  useSession?: boolean
}

/**
 * Calcule un checksum pour détecter la falsification
 */
function calculateChecksum(value: unknown, createdAt: number): string {
  const data = JSON.stringify({ value, createdAt })
  return CryptoJS.MD5(data).toString().substring(0, 8)
}

/**
 * Chiffre une valeur
 */
function encrypt(data: string): string {
  const key = getEncryptionKey()
  const encrypted = CryptoJS.AES.encrypt(data, key).toString()
  return ENCRYPTED_PREFIX + encrypted
}

/**
 * Déchiffre une valeur
 */
function decrypt(encryptedData: string): string | null {
  if (!encryptedData.startsWith(ENCRYPTED_PREFIX)) {
    return null
  }

  const key = getEncryptionKey()
  const encrypted = encryptedData.substring(ENCRYPTED_PREFIX.length)

  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, key)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)

    if (!decrypted) {
      return null
    }

    return decrypted
  } catch {
    return null
  }
}

/**
 * Classe principale pour le stockage sécurisé
 */
class SecureStorage {
  private storage: Storage | null = null

  constructor(useSession: boolean = false) {
    if (typeof window !== 'undefined') {
      this.storage = useSession ? sessionStorage : localStorage
    }
  }

  /**
   * Stocke une valeur de manière sécurisée
   */
  set<T>(key: string, value: T, options: SecureStorageOptions = {}): boolean {
    if (!this.storage) {
      return false
    }

    try {
      const now = Date.now()
      const expiresAt = options.ttl ? now + options.ttl : undefined

      const storedData: StoredData<T> = {
        value,
        expiresAt,
        createdAt: now,
        checksum: calculateChecksum(value, now),
      }

      const serialized = JSON.stringify(storedData)
      const encrypted = encrypt(serialized)

      this.storage.setItem(key, encrypted)
      return true
    } catch (error) {
      console.error('SecureStorage: Error storing data', error)
      return false
    }
  }

  /**
   * Récupère une valeur stockée
   */
  get<T>(key: string): T | null {
    if (!this.storage) {
      return null
    }

    try {
      const encrypted = this.storage.getItem(key)

      if (!encrypted) {
        return null
      }

      const decrypted = decrypt(encrypted)

      if (!decrypted) {
        // Donnée corrompue ou clé différente, supprimer
        this.remove(key)
        return null
      }

      const storedData: StoredData<T> = JSON.parse(decrypted)

      // Vérifier l'expiration
      if (storedData.expiresAt && Date.now() > storedData.expiresAt) {
        this.remove(key)
        return null
      }

      // Vérifier le checksum
      const expectedChecksum = calculateChecksum(storedData.value, storedData.createdAt)
      if (storedData.checksum !== expectedChecksum) {
        // Donnée falsifiée, supprimer
        this.remove(key)
        return null
      }

      return storedData.value
    } catch (error) {
      console.error('SecureStorage: Error reading data', error)
      this.remove(key)
      return null
    }
  }

  /**
   * Supprime une valeur
   */
  remove(key: string): void {
    if (!this.storage) {
      return
    }
    this.storage.removeItem(key)
  }

  /**
   * Vérifie si une clé existe et n'est pas expirée
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }

  /**
   * Nettoie toutes les données expirées
   */
  cleanup(): void {
    if (!this.storage) {
      return
    }

    const keysToRemove: string[] = []

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i)
      if (key) {
        const encrypted = this.storage.getItem(key)
        if (encrypted?.startsWith(ENCRYPTED_PREFIX)) {
          const decrypted = decrypt(encrypted)
          if (decrypted) {
            try {
              const storedData: StoredData<unknown> = JSON.parse(decrypted)
              if (storedData.expiresAt && Date.now() > storedData.expiresAt) {
                keysToRemove.push(key)
              }
            } catch {
              // Donnée corrompue
              keysToRemove.push(key)
            }
          }
        }
      }
    }

    keysToRemove.forEach((key) => this.remove(key))
  }

  /**
   * Efface toutes les données sécurisées
   */
  clear(): void {
    if (!this.storage) {
      return
    }

    const keysToRemove: string[] = []

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i)
      if (key) {
        const value = this.storage.getItem(key)
        if (value?.startsWith(ENCRYPTED_PREFIX)) {
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach((key) => this.remove(key))
  }
}

// Instances pré-configurées
export const secureLocalStorage = new SecureStorage(false)
export const secureSessionStorage = new SecureStorage(true)

// Export de la classe pour des usages personnalisés
export { SecureStorage }

// Durées TTL courantes
export const TTL = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const

/**
 * Hook pour utiliser le stockage sécurisé dans les composants React
 */
export function useSecureStorage<T>(
  key: string,
  defaultValue: T,
  options: SecureStorageOptions = {}
): [T, (value: T) => void, () => void] {
  const storage = options.useSession ? secureSessionStorage : secureLocalStorage

  // Récupérer la valeur initiale
  const getStoredValue = (): T => {
    const stored = storage.get<T>(key)
    return stored !== null ? stored : defaultValue
  }

  // État local (pas de useState pour éviter les imports React)
  let currentValue = getStoredValue()

  const setValue = (value: T): void => {
    currentValue = value
    storage.set(key, value, options)
  }

  const removeValue = (): void => {
    currentValue = defaultValue
    storage.remove(key)
  }

  return [currentValue, setValue, removeValue]
}
