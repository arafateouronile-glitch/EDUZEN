import { createClient } from '@/lib/supabase/client'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import crypto from 'crypto'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type User2FA = TableRow<'user_2fa'>
type User2FAInsert = TableInsert<'user_2fa'>
type User2FAUpdate = TableUpdate<'user_2fa'>

class TwoFactorAuthService {
  private supabase = createClient()

  /**
   * Génère un secret TOTP pour un utilisateur
   */
  async generateSecret(userId: string, email: string): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    // Générer un secret unique
    const secret = authenticator.generateSecret()
    
    // Créer l'URL TOTP pour le QR code
    const serviceName = 'EDUZEN'
    const otpAuthUrl = authenticator.keyuri(email, serviceName, secret)

    // Générer le QR code
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl)

    // Générer des codes de récupération
    const backupCodes = this.generateBackupCodes(10)

    // Stocker le secret (temporairement, pas encore activé)
    const { data: existing, error: existingError } = await this.supabase
      .from('user_2fa')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    // Si la table n'existe pas ou erreur 406, ignorer
    if (existingError && (existingError.code === 'PGRST116' || existingError.code === 'PGRST301' || existingError.status === 406)) {
      // Table n'existe pas, créer un nouvel enregistrement
      await this.supabase
        .from('user_2fa')
        .insert({
          user_id: userId,
          secret,
          backup_codes: backupCodes.map(code => this.hashCode(code)),
          is_enabled: false,
          is_verified: false,
        })
        .catch(() => {
          // Ignorer les erreurs d'insertion si la table n'existe pas
        })
      return {
        secret,
        qrCodeUrl,
        backupCodes,
      }
    }

    if (existing) {
      await this.supabase
        .from('user_2fa')
        .update({
          secret,
          backup_codes: backupCodes.map(code => this.hashCode(code)),
          is_verified: false,
        })
        .eq('user_id', userId)
    } else {
      await this.supabase
        .from('user_2fa')
        .insert({
          user_id: userId,
          secret,
          backup_codes: backupCodes.map(code => this.hashCode(code)),
          is_enabled: false,
          is_verified: false,
        })
    }

    return {
      secret,
      qrCodeUrl,
      backupCodes, // Retourner les codes en clair pour l'affichage
    }
  }

  /**
   * Vérifie un code TOTP
   */
  async verifyCode(userId: string, code: string, ipAddress?: string, userAgent?: string): Promise<{ valid: boolean; isBackupCode?: boolean }> {
    // Récupérer la configuration 2FA
    const { data: config, error } = await this.supabase
      .from('user_2fa')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // Ignorer les erreurs 406, PGRST116, PGRST301
    if (error && (error.code === 'PGRST116' || error.code === 'PGRST301' || error.status === 406)) {
      return { valid: false }
    }

    if (error || !config || !config.is_enabled) {
      return { valid: false }
    }

    // Vérifier si c'est un code de récupération
    const isBackupCode = await this.verifyBackupCode(config, code)
    
    if (isBackupCode) {
      // Enregistrer la tentative réussie
      await this.recordAttempt(userId, code, true, ipAddress, userAgent)
      return { valid: true, isBackupCode: true }
    }

    // Vérifier le code TOTP
    const isValid = authenticator.verify({
      token: code,
      secret: config.secret,
    })

    // Enregistrer la tentative
    await this.recordAttempt(userId, code, isValid, ipAddress, userAgent)

    if (isValid) {
      // Mettre à jour last_used_at
      await this.supabase
        .from('user_2fa')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', userId)
    }

    return { valid: isValid, isBackupCode: false }
  }

  /**
   * Vérifie un code lors de l'activation (pour confirmer que l'utilisateur a bien configuré son app)
   */
  async verifyActivationCode(userId: string, code: string): Promise<boolean> {
    const { data: config, error } = await this.supabase
      .from('user_2fa')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // Ignorer les erreurs 406, PGRST116, PGRST301
    if (error && (error.code === 'PGRST116' || error.code === 'PGRST301' || error.status === 406)) {
      return false
    }

    if (error || !config) {
      return false
    }

    const isValid = authenticator.verify({
      token: code,
      secret: config.secret,
    })

    if (isValid) {
      // Marquer comme vérifié et activé
      await this.supabase
        .from('user_2fa')
        .update({
          is_verified: true,
          is_enabled: true,
        })
        .eq('user_id', userId)
    }

    return isValid
  }

  /**
   * Active la 2FA pour un utilisateur
   */
  async enable2FA(userId: string): Promise<void> {
    await this.supabase
      .from('user_2fa')
      .update({ is_enabled: true })
      .eq('user_id', userId)
  }

  /**
   * Désactive la 2FA pour un utilisateur
   */
  async disable2FA(userId: string): Promise<void> {
    await this.supabase
      .from('user_2fa')
      .update({
        is_enabled: false,
        is_verified: false,
        secret: null,
        backup_codes: null,
      })
      .eq('user_id', userId)
  }

  /**
   * Récupère la configuration 2FA d'un utilisateur
   */
  async getConfig(userId: string): Promise<User2FA | null> {
    const { data, error } = await this.supabase
      .from('user_2fa')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    // Ignorer les erreurs 406, PGRST116, PGRST301
    if (error) {
      if (error.code === 'PGRST116' || error.code === 'PGRST301' || error.status === 406) {
        return null
      }
      throw error
    }

    return data
  }

  /**
   * Génère de nouveaux codes de récupération
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const backupCodes = this.generateBackupCodes(10)

    await this.supabase
      .from('user_2fa')
      .update({
        backup_codes: backupCodes.map(code => this.hashCode(code)),
      })
      .eq('user_id', userId)

    return backupCodes
  }

  /**
   * Crée une session 2FA temporaire après vérification réussie
   */
  async create2FASession(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    await this.supabase
      .from('user_2fa_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      })

    return sessionToken
  }

  /**
   * Vérifie une session 2FA
   */
  async verify2FASession(sessionToken: string): Promise<{ valid: boolean; userId?: string }> {
    const { data, error } = await this.supabase
      .from('user_2fa_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    // Ignorer les erreurs 406, PGRST116, PGRST301
    if (error && (error.code === 'PGRST116' || error.code === 'PGRST301' || error.status === 406)) {
      return { valid: false }
    }

    if (error || !data) {
      return { valid: false }
    }

    return { valid: true, userId: data.user_id }
  }

  /**
   * Supprime une session 2FA
   */
  async delete2FASession(sessionToken: string): Promise<void> {
    await this.supabase
      .from('user_2fa_sessions')
      .delete()
      .eq('session_token', sessionToken)
  }

  /**
   * Vérifie si un code est un code de récupération valide
   */
  private async verifyBackupCode(config: User2FA, code: string): Promise<boolean> {
    if (!config.backup_codes || config.backup_codes.length === 0) {
      return false
    }

    const hashedCode = this.hashCode(code)
    const isValid = config.backup_codes.includes(hashedCode)

    if (isValid) {
      // Supprimer le code de récupération utilisé
      const updatedCodes = config.backup_codes.filter(c => c !== hashedCode)
      await this.supabase
        .from('user_2fa')
        .update({ backup_codes: updatedCodes })
        .eq('user_id', config.user_id)
    }

    return isValid
  }

  /**
   * Enregistre une tentative de vérification
   */
  private async recordAttempt(
    userId: string,
    code: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.supabase
      .from('user_2fa_attempts')
      .insert({
        user_id: userId,
        code: this.hashCode(code),
        success,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
  }

  /**
   * Génère des codes de récupération
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase()
      codes.push(code)
    }
    return codes
  }

  /**
   * Hash un code pour le stockage
   */
  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex')
  }
}

export const twoFactorAuthService = new TwoFactorAuthService()
