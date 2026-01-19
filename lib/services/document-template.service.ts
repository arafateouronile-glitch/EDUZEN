import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { templateCollaborationService } from './template-collaboration.service'
import { templateSecurityService } from './template-security.service'
import { convertTemplateContent } from '@/lib/utils/document-generation/template-converter'
import type {
  DocumentTemplate,
  DocumentType,
  CreateTemplateInput,
  UpdateTemplateInput,
  CopyHeaderFooterInput,
  GeneratedDocument,
  GenerateDocumentInput
} from '@/lib/types/document-templates'

export class DocumentTemplateService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupère tous les templates d'une organisation
   */
  async getAllTemplates(organizationId: string, filters?: {
    type?: DocumentType
    isActive?: boolean
  }) {
    let query = this.supabase
      .from('document_templates')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    
    // Convertir les template literals ${variable} en balises {variable} pour chaque template
    const templates = (data || []) as DocumentTemplate[]
    return templates.map(template => convertTemplateContent(template))
  }

  /**
   * Récupère un template par son ID
   * Vérifie les permissions et déchiffre si nécessaire
   */
  async getTemplateById(id: string, userId?: string) {
    // Vérifier les permissions si userId est fourni
    if (userId) {
      const hasViewPermission = await templateSecurityService.hasPermission(
        id,
        userId,
        'view'
      )
      if (!hasViewPermission) {
        throw new Error('Permission refusée')
      }

      // Logger l'accès
      try {
        await templateSecurityService.logAudit(id, userId, 'view', {})
      } catch (auditError) {
        // Ne pas faire échouer la récupération si l'audit échoue
        console.warn('Erreur lors du logging de l\'audit:', auditError)
      }
    }

    const { data, error } = await this.supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    const template = data as DocumentTemplate

    // Vérifier si le template est chiffré et le déchiffrer si nécessaire
    const isEncrypted = await templateSecurityService.isTemplateEncrypted(id)
    if (isEncrypted && userId) {
      try {
        const decrypted = await templateSecurityService.decryptTemplate(id)
        template.header = decrypted.header as any
        template.content = decrypted.content as any
        template.footer = decrypted.footer as any
      } catch (decryptError) {
        console.error('Erreur lors du déchiffrement:', decryptError)
        // Ne pas exposer le contenu chiffré
        template.header = null
        template.content = { html: '', elements: [], pageSize: 'A4', margins: { top: 20, right: 20, bottom: 20, left: 20 } } as any
        template.footer = null
      }
    }

    // Convertir les template literals ${variable} en balises {variable}
    return convertTemplateContent(template)
  }

  /**
   * Récupère tous les templates d'un type pour une organisation
   */
  async getTemplatesByType(type: DocumentType, organizationId: string) {
    const { data, error } = await this.supabase
      .from('document_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('type', type)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Convertir les template literals ${variable} en balises {variable} pour chaque template
    const templates = (data || []) as DocumentTemplate[]
    return templates.map(template => convertTemplateContent(template))
  }

  /**
   * Récupère le template par défaut d'un type pour une organisation
   */
  async getDefaultTemplate(organizationId: string, type: DocumentType) {
    const { data, error } = await this.supabase
      .from('document_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('type', type)
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    
    // Convertir les template literals ${variable} en balises {variable}
    if (!data) return null
    return convertTemplateContent(data) as DocumentTemplate
  }

  /**
   * Crée un nouveau template
   */
  async createTemplate(input: CreateTemplateInput) {
    // Si on crée un template par défaut, s'assurer qu'il n'y en a pas déjà un
    if (input.is_default) {
      const existingDefault = await this.getDefaultTemplate(
        input.organization_id,
        input.type
      )
      if (existingDefault) {
        // Désactiver l'ancien template par défaut
        await this.supabase
          .from('document_templates')
          .update({ is_default: false })
          .eq('id', existingDefault.id)
      }
    }

    // Récupérer l'utilisateur actuel pour logger l'activité
    const { data: currentUser } = await this.supabase.auth.getUser()

    const { data, error } = await this.supabase
      .from('document_templates')
      .insert({
        organization_id: input.organization_id,
        type: input.type,
        name: input.name,
        header: input.header || null,
        header_enabled: input.header_enabled ?? true,
        header_height: input.header_height ?? 100,
        content: input.content,
        footer: input.footer || null,
        footer_enabled: input.footer_enabled ?? true,
        footer_height: input.footer_height ?? 60,
        page_size: input.page_size || 'A4',
        margins: input.margins || { top: 20, right: 20, bottom: 20, left: 20 },
        is_default: input.is_default ?? false,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    
    const newTemplate = data as DocumentTemplate
    
    // Logger l'activité de création
    if (currentUser?.user?.id) {
      try {
        await templateCollaborationService.logActivity(
          newTemplate.id,
          currentUser.user.id,
          'created',
          { template_name: newTemplate.name, template_type: newTemplate.type }
        )
      } catch (logError) {
        // Ne pas faire échouer la création si le logging échoue
        console.warn('Erreur lors du logging de l\'activité:', logError)
      }
    }
    
    // Créer la version initiale du template
    try {
      await this.createTemplateVersion(newTemplate.id, 'Version initiale', 'Version créée lors de la création du template')
    } catch (versionError) {
      // Ne pas faire échouer la création du template si la version échoue
      console.warn('Erreur lors de la création de la version initiale:', versionError)
    }
    
    return newTemplate
  }

  /**
   * Met à jour un template
   * Note: Le trigger SQL crée automatiquement une version avant la mise à jour
   */
  async updateTemplate(input: UpdateTemplateInput) {
    const { id, ...updates } = input

    // Récupérer le template existant pour calculer les changements
    const existingTemplate = await this.getTemplateById(id)
    if (!existingTemplate) {
      throw new Error('Template non trouvé')
    }

    // Récupérer l'utilisateur actuel pour logger l'activité
    const { data: currentUser } = await this.supabase.auth.getUser()

    // Calculer les changements pour l'historique
    const changes: Record<string, { from: unknown; to: unknown }> = {}
    if (updates.name !== undefined && updates.name !== existingTemplate.name) {
      changes.name = { from: existingTemplate.name, to: updates.name }
    }
    if (updates.content !== undefined && JSON.stringify(updates.content) !== JSON.stringify(existingTemplate.content)) {
      changes.content = { from: existingTemplate.content, to: updates.content }
    }

    const updateData: Record<string, unknown> = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.header !== undefined) updateData.header = updates.header
    if (updates.header_enabled !== undefined) updateData.header_enabled = updates.header_enabled
    if (updates.header_height !== undefined) updateData.header_height = updates.header_height
    if (updates.content !== undefined) updateData.content = updates.content
    if (updates.footer !== undefined) updateData.footer = updates.footer
    if (updates.footer_enabled !== undefined) updateData.footer_enabled = updates.footer_enabled
    if (updates.footer_height !== undefined) updateData.footer_height = updates.footer_height
    if (updates.page_size !== undefined) updateData.page_size = updates.page_size
    if (updates.margins !== undefined) updateData.margins = updates.margins
    if (updates.is_default !== undefined) updateData.is_default = updates.is_default
    if ((updates as any).is_active !== undefined) updateData.is_active = (updates as any).is_active

    const { data, error } = await this.supabase
      .from('document_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Logger l'activité de mise à jour
    if (currentUser?.user?.id) {
      try {
        await templateCollaborationService.logActivity(
          id,
          currentUser.user.id,
          'updated',
          { changes: Object.keys(changes) },
          changes
        )
      } catch (logError) {
        // Ne pas faire échouer la mise à jour si le logging échoue
        console.warn('Erreur lors du logging de l\'activité:', logError)
      }

      // Notifier les utilisateurs avec accès
      try {
        const shares = await templateCollaborationService.getTemplateShares(id)
        for (const share of shares) {
          try {
            await templateCollaborationService.createNotification(
              share.shared_with_user_id,
              id,
              'template_updated',
              { message: `Le template "${data.name}" a été mis à jour` }
            )
          } catch (notifError) {
            // Ne pas faire échouer la mise à jour si la notification échoue
            console.warn('Erreur lors de la création de la notification:', notifError)
          }
        }
      } catch (shareError) {
        // Ne pas faire échouer la mise à jour si la récupération des partages échoue
        console.warn('Erreur lors de la récupération des partages:', shareError)
      }
    }

    return data as DocumentTemplate
  }

  /**
   * Récupère une version spécifique d'un template
   */
  async getTemplateVersionById(templateId: string, versionId: string) {
    try {
      const { data, error } = await this.supabase
        .from('document_template_versions')
        .select('*')
        .eq('template_id', templateId)
        .eq('id', versionId)
        .single()

      if (error) {
        // Si la table n'existe pas ou la version n'existe pas, retourner null
        if (error.code === 'PGRST205' || error.code === '42P01' || error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      console.error('Erreur lors de la récupération de la version:', error)
      return null
    }
  }

  /**
   * Récupère toutes les versions d'un template
   */
  async getTemplateVersions(templateId: string) {
    try {
      const { data, error } = await this.supabase
        .from('document_template_versions')
        .select('*')
        .eq('template_id', templateId)
        .order('version_number', { ascending: false })

      if (error) {
        // Si la table n'existe pas, on retourne un tableau vide
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('Table document_template_versions n\'existe pas encore. Migration requise.')
          return []
        }
        throw error
      }
      return data || []
    } catch (error: unknown) {
      // Gérer les erreurs de table manquante
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === 'PGRST205' || errorObj?.code === '42P01' || errorObj?.message?.includes('does not exist')) {
        console.warn('Table document_template_versions n\'existe pas encore. Migration requise.')
        return []
      }
      throw error
    }
  }

  /**
   * Récupère une version spécifique d'un template
   */
  async getTemplateVersion(templateId: string, versionNumber: number) {
    try {
      const { data, error } = await this.supabase
        .from('document_template_versions')
        .select('*')
        .eq('template_id', templateId)
        .eq('version_number', versionNumber)
        .single()

      if (error) {
        // Si la table n'existe pas, on retourne null
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('Table document_template_versions n\'existe pas encore. Migration requise.')
          return null
        }
        throw error
      }
      return data
    } catch (error: unknown) {
      // Gérer les erreurs de table manquante
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === 'PGRST205' || errorObj?.code === '42P01' || errorObj?.message?.includes('does not exist')) {
        console.warn('Table document_template_versions n\'existe pas encore. Migration requise.')
        return null
      }
      throw error
    }
  }

  /**
   * Crée manuellement une version d'un template
   */
  async createTemplateVersion(templateId: string, name?: string, description?: string) {
    try {
      const template = await this.getTemplateById(templateId)

      // Obtenir le prochain numéro de version
      const versions = await this.getTemplateVersions(templateId)
      const nextVersion = versions.length > 0 
        ? Math.max(...versions.map(v => v.version_number)) + 1 
        : 1

      const { data, error } = await this.supabase
        .from('document_template_versions')
        .insert({
          template_id: templateId,
          version_number: nextVersion,
          name: name || `Version ${nextVersion} - ${new Date().toLocaleString('fr-FR')}`,
          description,
          header: template.header,
          header_enabled: template.header_enabled,
          header_height: template.header_height,
          content: template.content,
          footer: template.footer,
          footer_enabled: template.footer_enabled,
          footer_height: template.footer_height,
          page_size: template.page_size,
          margins: template.margins,
        })
        .select()
        .single()

      if (error) {
        // Si la table n'existe pas, on retourne null
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('Table document_template_versions n\'existe pas encore. Migration requise.')
          return null
        }
        throw error
      }
      return data
    } catch (error: unknown) {
      // Gérer les erreurs de table manquante
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === 'PGRST205' || errorObj?.code === '42P01' || errorObj?.message?.includes('does not exist')) {
        console.warn('Table document_template_versions n\'existe pas encore. Migration requise.')
        return null
      }
      throw error
    }
  }

  /**
   * Restaure un template à une version précédente
   */
  async restoreTemplateVersion(templateId: string, versionNumber: number) {
    const version = await this.getTemplateVersion(templateId, versionNumber)
    
    if (!version) {
      throw new Error(`Version ${versionNumber} non trouvée pour le template ${templateId}`)
    }

    // Mettre à jour le template avec les données de la version
    return this.updateTemplate({
      id: templateId,
      header: version.header,
      header_enabled: version.header_enabled,
      header_height: version.header_height,
      content: version.content,
      footer: version.footer,
      footer_enabled: version.footer_enabled,
      footer_height: version.footer_height,
      page_size: version.page_size as 'A4' | 'Letter' | 'Legal',
      margins: version.margins,
    })
  }

  /**
   * Supprime un template
   */
  async deleteTemplate(id: string) {
    const { error } = await this.supabase
      .from('document_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Duplique un template
   */
  async duplicateTemplate(id: string, newName?: string) {
    const template = await this.getTemplateById(id)
    
    const { data, error } = await this.supabase
      .from('document_templates')
      .insert({
        organization_id: template.organization_id,
        type: template.type,
        name: newName || `${template.name} (copie)`,
        header: template.header,
        header_enabled: template.header_enabled,
        header_height: template.header_height,
        content: template.content,
        footer: template.footer,
        footer_enabled: template.footer_enabled,
        footer_height: template.footer_height,
        page_size: template.page_size as 'A4' | 'Letter' | 'Legal',
        margins: template.margins,
        is_default: false,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    return data as DocumentTemplate
  }

  /**
   * Définit un template comme défaut (et désactive les autres du même type)
   */
  async setAsDefault(id: string, organizationId: string) {
    const template = await this.getTemplateById(id)

    // Désactiver les autres templates par défaut du même type
    await this.supabase
      .from('document_templates')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('type', template.type)
      .neq('id', id)

    // Activer ce template comme défaut
    return this.updateTemplate({ id, is_default: true })
  }

  /**
   * Copie le header/footer d'un template vers un autre
   */
  async copyHeaderFooter(targetId: string, input: CopyHeaderFooterInput) {
    const sourceTemplate = await this.getTemplateById(input.sourceTemplateId)

    const updates: Partial<UpdateTemplateInput> = { id: targetId }

    if (input.copyHeader) {
      updates.header = sourceTemplate.header
      updates.header_enabled = sourceTemplate.header_enabled
      updates.header_height = sourceTemplate.header_height
    }

    if (input.copyFooter) {
      updates.footer = sourceTemplate.footer
      updates.footer_enabled = sourceTemplate.footer_enabled
      updates.footer_height = sourceTemplate.footer_height
    }

    return this.updateTemplate(updates as UpdateTemplateInput)
  }

  /**
   * Récupère tous les documents générés d'une organisation
   */
  async getGeneratedDocuments(organizationId: string, filters?: {
    type?: DocumentType
    relatedEntityType?: string
    relatedEntityId?: string
  }) {
    let query = this.supabase
      .from('generated_documents')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.relatedEntityType) {
      query = query.eq('related_entity_type', filters.relatedEntityType)
    }

    if (filters?.relatedEntityId) {
      query = query.eq('related_entity_id', filters.relatedEntityId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return (data || []) as GeneratedDocument[]
  }

  /**
   * Crée un enregistrement de document généré
   */
  async createGeneratedDocument(input: {
    organization_id: string
    template_id: string
    type: DocumentType
    file_name: string
    file_url: string
    format: 'PDF' | 'DOCX'
    page_count: number
    related_entity_type?: string
    related_entity_id?: string
    metadata?: Record<string, unknown>
    generated_by?: string
  }) {
    const { data, error } = await this.supabase
      .from('generated_documents')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data as GeneratedDocument
  }
}

export const documentTemplateService = new DocumentTemplateService()

