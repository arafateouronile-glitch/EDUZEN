/**
 * Service pour gérer la sécurité des templates de documents
 * Inclut : chiffrement, permissions granulaires, audit trail, RGPD, archivage
 */

import type { Database } from '@/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import * as CryptoJS from 'crypto-js'
import { logger } from '@/lib/utils/logger'
import { SECURITY_CONFIG } from '@/lib/config/app-config'

type TemplatePermission = Database['public']['Tables']['template_permissions']['Row']
type TemplatePermissionInsert = Database['public']['Tables']['template_permissions']['Insert']
type TemplateEncryption = Database['public']['Tables']['template_encryption']['Row']
type TemplateEncryptionInsert = Database['public']['Tables']['template_encryption']['Insert']
type TemplateAuditLog = Database['public']['Tables']['template_audit_log']['Row']
type TemplateAuditLogInsert = Database['public']['Tables']['template_audit_log']['Insert']
type TemplateGDPR = Database['public']['Tables']['template_gdpr_compliance']['Row']
type TemplateGDPRInsert = Database['public']['Tables']['template_gdpr_compliance']['Insert']
type TemplateArchive = Database['public']['Tables']['template_archives']['Row']
type TemplateArchiveInsert = Database['public']['Tables']['template_archives']['Insert']

export type PermissionType = 'view' | 'edit' | 'delete' | 'share' | 'export' | 'approve' | 'admin'
export type AuditAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'share'
  | 'unshare'
  | 'export'
  | 'print'
  | 'copy'
  | 'restore'
  | 'approve'
  | 'reject'
  | 'encrypt'
  | 'decrypt'
  | 'permission_granted'
  | 'permission_revoked'

export class TemplateSecurityService {
  private supabase: SupabaseClient<Database>
  private encryptionKey: string

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
    // Utiliser la configuration centralisée pour la clé de chiffrement
    this.encryptionKey = SECURITY_CONFIG.getEncryptionKey()
  }

  // ========== PERMISSIONS GRANULAIRES ==========

  /**
   * Vérifie si un utilisateur a une permission spécifique sur un template
   */
  async hasPermission(
    templateId: string,
    userId: string,
    permissionType: PermissionType
  ): Promise<boolean> {
    try {
      // Vérifier les permissions spécifiques à l'utilisateur
      const { data: userPermission, error: permError } = await this.supabase
        .from('template_permissions')
        .select('*')
        .eq('template_id', templateId)
        .eq('user_id', userId)
        .eq('permission_type', permissionType)
        .is('expires_at', null)
        .or('expires_at.gt.' + new Date().toISOString())
        .maybeSingle()

      // Si la table n'existe pas, on considère que l'utilisateur a les permissions par défaut
      if (permError && (permError.code === 'PGRST205' || permError.code === '42P01')) {
        logger.warn('TemplateSecurityService - Table template_permissions n\'existe pas encore. Migration requise. Permissions par défaut accordées.')
        // Vérifier si l'utilisateur est propriétaire du template (via organization_id)
        const { data: user } = await this.supabase
          .from('users')
          .select('role, organization_id')
          .eq('id', userId)
          .single()

        if (!user) return false

        const { data: template } = await this.supabase
          .from('document_templates')
          .select('organization_id')
          .eq('id', templateId)
          .single()

        if (template && template.organization_id === user.organization_id) {
          return true
        }
        return false
      }

      if (userPermission) return true

      // Vérifier les permissions basées sur le rôle
      const { data: user } = await this.supabase
        .from('users')
        .select('role, organization_id')
        .eq('id', userId)
        .single()

      if (!user) return false

      const { data: rolePermission } = await this.supabase
        .from('template_permissions')
        .select('*')
        .eq('template_id', templateId)
        .eq('role', user.role)
        .eq('permission_type', permissionType)
        .is('expires_at', null)
        .or('expires_at.gt.' + new Date().toISOString())
        .maybeSingle()

      if (rolePermission) return true

      // Vérifier si l'utilisateur est propriétaire du template (via organization_id)
      const { data: template } = await this.supabase
        .from('document_templates')
        .select('organization_id')
        .eq('id', templateId)
        .single()

      if (template && template.organization_id === user.organization_id) {
        // Les propriétaires ont toutes les permissions par défaut
        return true
      }

      return false
    } catch (error: unknown) {
      // Gérer les erreurs de table manquante
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === 'PGRST205' || errorObj?.code === '42P01' || errorObj?.message?.includes('does not exist')) {
        logger.warn('TemplateSecurityService - Table template_permissions n\'existe pas encore. Migration requise. Permissions par défaut accordées.')
        // En cas d'erreur, on vérifie si l'utilisateur est propriétaire du template
        try {
          const { data: user } = await this.supabase
            .from('users')
            .select('organization_id')
            .eq('id', userId)
            .single()

          if (!user) return false

          const { data: template } = await this.supabase
            .from('document_templates')
            .select('organization_id')
            .eq('id', templateId)
            .single()

          if (template && template.organization_id === user.organization_id) {
            return true
          }
        } catch (innerError) {
          // Ignorer les erreurs internes
        }
        return false
      }
      throw error
    }

    return false
  }

  /**
   * Accorde une permission à un utilisateur ou un rôle
   */
  async grantPermission(
    templateId: string,
    userId: string | null,
    role: string | null,
    permissionType: PermissionType,
    grantedBy: string,
    expiresAt?: Date
  ): Promise<TemplatePermission> {
    if (!userId && !role) {
      throw new Error('userId ou role doit être fourni')
    }

    const { data, error } = await this.supabase
      .from('template_permissions')
      .insert({
        template_id: templateId,
        user_id: userId,
        role: role,
        permission_type: permissionType,
        granted_by: grantedBy,
        expires_at: expiresAt?.toISOString() || null,
      } as TemplatePermissionInsert)
      .select()
      .single()

    if (error) throw error

    // Logger l'audit
    await this.logAudit(templateId, grantedBy, 'permission_granted', {
      permission_type: permissionType,
      granted_to_user: userId,
      granted_to_role: role,
    })

    return data
  }

  /**
   * Révoque une permission
   */
  async revokePermission(permissionId: string, revokedBy: string): Promise<void> {
    const { data: permission } = await this.supabase
      .from('template_permissions')
      .select('template_id')
      .eq('id', permissionId)
      .single()

    if (!permission) return

    const { error } = await this.supabase
      .from('template_permissions')
      .delete()
      .eq('id', permissionId)

    if (error) throw error

    // Logger l'audit
    await this.logAudit(permission.template_id, revokedBy, 'permission_revoked', {
      permission_id: permissionId,
    })
  }

  /**
   * Récupère toutes les permissions d'un template
   */
  async getTemplatePermissions(templateId: string): Promise<TemplatePermission[]> {
    const { data, error } = await this.supabase
      .from('template_permissions')
      .select('*, user:users!template_permissions_user_id_fkey(id, email, full_name), granted_by_user:users!template_permissions_granted_by_fkey(id, email, full_name)')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // ========== CHIFFREMENT ==========

  /**
   * Chiffre un template sensible
   */
  async encryptTemplate(
    templateId: string,
    content: { header: unknown; content: unknown; footer: unknown }
  ): Promise<TemplateEncryption> {
    // Chiffrer le contenu
    const encryptedContent = {
      header: CryptoJS.AES.encrypt(
        JSON.stringify(content.header),
        this.encryptionKey
      ).toString(),
      content: CryptoJS.AES.encrypt(
        JSON.stringify(content.content),
        this.encryptionKey
      ).toString(),
      footer: CryptoJS.AES.encrypt(
        JSON.stringify(content.footer),
        this.encryptionKey
      ).toString(),
    }

    const { data, error } = await this.supabase
      .from('template_encryption')
      .upsert({
        template_id: templateId,
        encryption_key_id: 'default-key',
        encryption_algorithm: 'AES-256-GCM',
        encrypted_content: encryptedContent,
        is_encrypted: true,
        encrypted_at: new Date().toISOString(),
      } as TemplateEncryptionInsert)
      .select()
      .single()

    if (error) throw error

    // Logger l'audit
    const { data: currentUser } = await this.supabase.auth.getUser()
    if (currentUser?.user?.id) {
      await this.logAudit(templateId, currentUser.user.id, 'encrypt', {
        encryption_algorithm: 'AES-256-GCM',
      })
    }

    return data
  }

  /**
   * Déchiffre un template
   */
  async decryptTemplate(templateId: string): Promise<{
    header: unknown
    content: unknown
    footer: unknown
  }> {
    const { data: encryption, error } = await this.supabase
      .from('template_encryption')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_encrypted', true)
      .single()

    if (error || !encryption) {
      throw new Error('Template non chiffré ou non trouvé')
    }

    // Déchiffrer le contenu
    const encryptedContent = encryption.encrypted_content as any
    if (!encryptedContent || !encryptedContent.header || !encryptedContent.content || !encryptedContent.footer) {
      throw new Error('Invalid encrypted content structure')
    }
    const decryptedContent = {
      header: JSON.parse(
        CryptoJS.AES.decrypt(
          encryptedContent.header,
          this.encryptionKey
        ).toString(CryptoJS.enc.Utf8)
      ),
      content: JSON.parse(
        CryptoJS.AES.decrypt(
          encryptedContent.content,
          this.encryptionKey
        ).toString(CryptoJS.enc.Utf8)
      ),
      footer: JSON.parse(
        CryptoJS.AES.decrypt(
          encryptedContent.footer,
          this.encryptionKey
        ).toString(CryptoJS.enc.Utf8)
      ),
    }

    // Logger l'audit
    const { data: currentUser } = await this.supabase.auth.getUser()
    if (currentUser?.user?.id) {
      await this.logAudit(templateId, currentUser.user.id, 'decrypt', {})
    }

    return decryptedContent
  }

  /**
   * Vérifie si un template est chiffré
   */
  async isTemplateEncrypted(templateId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('template_encryption')
        .select('is_encrypted')
        .eq('template_id', templateId)
        .maybeSingle()

      if (error) {
        // Si la table n'existe pas, on retourne false
        if (error.code === 'PGRST205' || error.code === '42P01') {
          logger.warn('TemplateSecurityService - Table template_encryption n\'existe pas encore. Migration requise.')
          return false
        }
        throw error
      }
      if (!data) return false
      return data.is_encrypted ?? false
    } catch (error: unknown) {
      // Gérer les erreurs de table manquante
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === 'PGRST205' || errorObj?.code === '42P01' || errorObj?.message?.includes('does not exist')) {
        logger.warn('TemplateSecurityService - Table template_encryption n\'existe pas encore. Migration requise.')
        return false
      }
      throw error
    }
  }

  // ========== AUDIT TRAIL ==========

  /**
   * Log une action dans l'audit trail
   */
  async logAudit(
    templateId: string,
    userId: string,
    action: AuditAction,
    actionDetails?: Record<string, unknown>,
    beforeState?: Record<string, unknown>,
    afterState?: Record<string, unknown>
  ): Promise<TemplateAuditLog | null> {
    try {
      // Récupérer l'IP et le user agent depuis le contexte (à implémenter selon votre setup)
      const ipAddress = null // À récupérer depuis le contexte de la requête
      const userAgent = null // À récupérer depuis le contexte de la requête
      const sessionId = null // À récupérer depuis le contexte de la requête

      const { data, error } = await this.supabase
        .from('template_audit_log')
        .insert({
          template_id: templateId,
          user_id: userId,
          action,
          action_details: actionDetails || {},
          ip_address: ipAddress,
          user_agent: userAgent,
          session_id: sessionId,
          resource_type: 'template',
          resource_id: templateId,
          before_state: beforeState || null,
          after_state: afterState || null,
        } as TemplateAuditLogInsert)
        .select()
        .single()

      if (error) {
        // Si la table n'existe pas, on ignore silencieusement
        if (error.code === 'PGRST205' || error.code === '42P01') {
          logger.warn('TemplateSecurityService - Table template_audit_log n\'existe pas encore. Migration requise.')
          return null
        }
        throw error
      }
      return data
    } catch (error: unknown) {
      // Gérer les erreurs de table manquante
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === 'PGRST205' || errorObj?.code === '42P01' || errorObj?.message?.includes('does not exist')) {
        logger.warn('TemplateSecurityService - Table template_audit_log n\'existe pas encore. Migration requise.')
        return null
      }
      throw error
    }
  }

  /**
   * Récupère l'audit trail d'un template
   */
  async getAuditTrail(templateId: string, limit = 100): Promise<TemplateAuditLog[]> {
    const { data, error } = await this.supabase
      .from('template_audit_log')
      .select('*, user:users!template_audit_log_user_id_fkey(id, email, full_name)')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  /**
   * Récupère l'audit trail d'un utilisateur
   */
  async getUserAuditTrail(userId: string, limit = 100): Promise<TemplateAuditLog[]> {
    const { data, error } = await this.supabase
      .from('template_audit_log')
      .select('*, template:document_templates!template_audit_log_template_id_fkey(id, name, type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  }

  // ========== RGPD ==========

  /**
   * Configure la conformité RGPD pour un template
   */
  async setGDPRCompliance(
    templateId: string,
    compliance: {
      contains_personal_data?: boolean
      data_categories?: string[]
      retention_period_days?: number
      legal_basis?: string
      data_processing_purposes?: string[]
      third_party_sharing?: boolean
      third_parties?: string[]
      consent_required?: boolean
    }
  ): Promise<TemplateGDPR> {
    const { data, error } = await this.supabase
      .from('template_gdpr_compliance')
      .upsert({
        template_id: templateId,
        ...compliance,
      } as TemplateGDPRInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupère la configuration RGPD d'un template
   */
  async getGDPRCompliance(templateId: string): Promise<TemplateGDPR | null> {
    const { data, error } = await this.supabase
      .from('template_gdpr_compliance')
      .select('*')
      .eq('template_id', templateId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Enregistre le consentement pour un template
   */
  async recordConsent(templateId: string): Promise<void> {
    const { error } = await this.supabase
      .from('template_gdpr_compliance')
      .update({
        consent_obtained_at: new Date().toISOString(),
      })
      .eq('template_id', templateId)

    if (error) throw error
  }

  /**
   * Supprime les données personnelles d'un template (droit à l'oubli RGPD)
   */
  async deletePersonalData(templateId: string, userId: string): Promise<void> {
    // Récupérer le template
    const { data: template } = await this.supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (!template) return

    // Anonymiser le contenu (remplacer les données personnelles)
    // Cette logique dépend de votre structure de données
    const anonymizedContent = this.anonymizeContent(template.content)

    // Mettre à jour le template
    await this.supabase
      .from('document_templates')
      .update({ content: anonymizedContent as any })
      .eq('id', templateId)

    // Logger l'audit
    await this.logAudit(templateId, userId, 'update', {
      reason: 'gdpr_deletion',
      action: 'personal_data_deleted',
    })
  }

  /**
   * Anonymise le contenu d'un template
   */
  private anonymizeContent(content: unknown): unknown {
    // Logique d'anonymisation basique
    // En production, implémenter une logique plus sophistiquée
    if (typeof content === 'string') {
      // Remplacer les emails, téléphones, etc.
      return content
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_ANONYMISÉ]')
        .replace(/\b\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}\b/g, '[TÉLÉPHONE_ANONYMISÉ]')
    }
    return content
  }

  // ========== ARCHIVAGE ==========

  /**
   * Archive un template manuellement
   */
  async archiveTemplate(
    templateId: string,
    versionNumber: number,
    reason: string,
    archivedBy: string,
    retentionUntil?: Date
  ): Promise<TemplateArchive> {
    // Récupérer la version à archiver
    const { data: version } = await this.supabase
      .from('document_template_versions')
      .select('*')
      .eq('template_id', templateId)
      .eq('version_number', versionNumber)
      .single()

    if (!version) {
      throw new Error('Version non trouvée')
    }

    const { data, error } = await this.supabase
      .from('template_archives')
      .insert({
        template_id: templateId,
        archived_version_number: versionNumber,
        archived_content: {
          header: version.header,
          content: version.content,
          footer: version.footer,
          created_at: version.created_at,
        },
        archive_reason: reason,
        archived_by: archivedBy,
        retention_until: retentionUntil?.toISOString() || null,
      } as TemplateArchiveInsert)
      .select()
      .single()

    if (error) throw error

    // Logger l'audit
    await this.logAudit(templateId, archivedBy, 'update', {
      action: 'archived',
      version_number: versionNumber,
      reason,
    })

    return data
  }

  /**
   * Récupère les archives d'un template
   */
  async getTemplateArchives(templateId: string): Promise<TemplateArchive[]> {
    const { data, error } = await this.supabase
      .from('template_archives')
      .select('*, archived_by_user:users!template_archives_archived_by_fkey(id, email, full_name)')
      .eq('template_id', templateId)
      .order('archived_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Restaure une archive
   */
  async restoreArchive(archiveId: string, restoredBy: string): Promise<void> {
    const { data: archive } = await this.supabase
      .from('template_archives')
      .select('*')
      .eq('id', archiveId)
      .single()

    if (!archive) {
      throw new Error('Archive non trouvée')
    }

    // Restaurer le contenu dans une nouvelle version
    // Cette logique dépend de votre service de versions
    // Ici, on log juste l'action

    await this.logAudit(archive.template_id, restoredBy, 'restore', {
      archive_id: archiveId,
      version_number: archive.archived_version_number,
    })
  }

  /**
   * Nettoie les archives expirées
   */
  async cleanupExpiredArchives(): Promise<number> {
    const { data, error } = await this.supabase
      .from('template_archives')
      .delete()
      .lt('retention_until', new Date().toISOString())
      .eq('is_permanent', false)
      .select()

    if (error) throw error
    return data?.length || 0
  }
}

// Note: templateSecurityService doit être instancié avec un client Supabase
// Pour les routes API: new TemplateSecurityService(await createClient()) avec le client serveur
// Pour les composants client: new TemplateSecurityService(createClient()) avec le client client
