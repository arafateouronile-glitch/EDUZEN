import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { documentTemplateService } from './document-template.service.client'
import { qualiopiService } from './qualiopi.service'
import { sessionService } from './session.service'
import { programService } from './program.service'
import { formationService } from './formation.service'
import { logger, sanitizeError } from '@/lib/utils/logger'
import type { DocumentType } from '@/lib/types/document-templates'
import { BRAND_COLORS } from '@/lib/config/app-config'

export interface OrganizationSetupConfig {
  organizationId: string
  userId: string
  qualiopiDomains?: string[]
  primaryColor?: string
  logoUrl?: string
}

/**
 * Service d'initialisation automatique d'une nouvelle organisation
 * Crée un environnement de démonstration "prêt à l'emploi"
 */
export class OrganizationSetupService {
  private supabase: SupabaseClient<any>

  constructor(supabaseClient?: SupabaseClient<any>) {
    this.supabase = supabaseClient || createClient()
  }

  /**
   * Initialise complètement une nouvelle organisation
   */
  async initializeNewOrg(config: OrganizationSetupConfig): Promise<void> {
    try {
      logger.info('OrganizationSetup - Début de l\'initialisation', { organizationId: config.organizationId })

      // 1. Créer les templates de documents par défaut
      await this.createDefaultTemplates(config.organizationId)

      // 2. Initialiser la checklist Qualiopi selon le type d'OF
      if (config.qualiopiDomains && config.qualiopiDomains.length > 0) {
        await this.initializeQualiopiChecklist(config.organizationId, config.qualiopiDomains)
      } else {
        // Initialiser avec tous les domaines par défaut
        await this.initializeQualiopiChecklist(config.organizationId, [
          'actions_formation',
          'vae',
          'apprentissage',
        ])
      }

      // 3. Créer une session de démonstration "Bac à sable"
      await this.createDemoSession(config.organizationId)

      // 4. Mettre à jour les paramètres de l'organisation (couleur, logo)
      if (config.primaryColor || config.logoUrl) {
        await this.updateOrganizationSettings(config.organizationId, {
          primaryColor: config.primaryColor,
          logoUrl: config.logoUrl,
        })
      }

      logger.info('OrganizationSetup - Initialisation terminée avec succès', { organizationId: config.organizationId })
    } catch (error) {
      logger.error('OrganizationSetup - Erreur lors de l\'initialisation', error, {
        organizationId: config.organizationId,
        error: sanitizeError(error),
      })
      throw error
    }
  }

  /**
   * Crée les templates de documents par défaut
   */
  private async createDefaultTemplates(organizationId: string): Promise<void> {
    const defaultTemplates: Array<{
      type: DocumentType
      name: string
      content: any
    }> = [
      {
        type: 'convention',
        name: 'Convention de Formation',
        content: {
          html: `
            <div style="padding: 40px; font-family: Arial, sans-serif;">
              <h1 style="text-align: center; color: ${BRAND_COLORS.primary}; margin-bottom: 30px;">CONVENTION DE FORMATION</h1>
              
              <div style="margin-bottom: 20px;">
                <p><strong>Entre :</strong></p>
                <p>{{organization.name}}</p>
                <p>{{organization.address}}</p>
              </div>
              
              <div style="margin-bottom: 20px;">
                <p><strong>Et :</strong></p>
                <p>{{student.first_name}} {{student.last_name}}</p>
                <p>{{student.email}}</p>
              </div>
              
              <div style="margin-top: 40px;">
                <p><strong>Formation :</strong> {{session.name}}</p>
                <p><strong>Dates :</strong> Du {{session.start_date}} au {{session.end_date}}</p>
                <p><strong>Prix :</strong> {{invoice.total_amount}} {{invoice.currency}}</p>
              </div>
              
              <div style="margin-top: 40px; text-align: center;">
                <p>Signature de l'organisme</p>
                <div style="height: 80px; border-bottom: 1px solid #000; margin: 20px 0;"></div>
                
                <p>Signature du stagiaire</p>
                <div style="height: 80px; border-bottom: 1px solid #000; margin: 20px 0;"></div>
              </div>
            </div>
          `,
          elements: [],
          pageSize: 'A4',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
        },
      },
      {
        type: 'convocation',
        name: 'Convocation',
        content: {
          html: `
            <div style="padding: 40px; font-family: Arial, sans-serif;">
              <h1 style="text-align: center; color: ${BRAND_COLORS.primary}; margin-bottom: 30px;">CONVOCATION</h1>
              
              <p>Madame, Monsieur,</p>
              
              <p>Nous avons le plaisir de vous convoquer à la formation suivante :</p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #f5f5f5;">
                <p><strong>Formation :</strong> {{session.name}}</p>
                <p><strong>Date de début :</strong> {{session.start_date}}</p>
                <p><strong>Date de fin :</strong> {{session.end_date}}</p>
                <p><strong>Lieu :</strong> {{session.location}}</p>
              </div>
              
              <p>Nous vous remercions de bien vouloir confirmer votre présence.</p>
              
              <p style="margin-top: 40px;">Cordialement,</p>
              <p>{{organization.name}}</p>
            </div>
          `,
          elements: [],
          pageSize: 'A4',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
        },
      },
      {
        type: 'attestation',
        name: 'Attestation de Formation',
        content: {
          html: `
            <div style="padding: 40px; font-family: Arial, sans-serif; text-align: center;">
              <h1 style="color: ${BRAND_COLORS.primary}; margin-bottom: 40px;">ATTESTATION DE FORMATION</h1>

              <p style="font-size: 16px; margin: 30px 0;">
                L'organisme <strong>{{organization.name}}</strong> atteste que
              </p>

              <p style="font-size: 20px; font-weight: bold; margin: 30px 0;">
                {{student.first_name}} {{student.last_name}}
              </p>

              <p style="font-size: 16px; margin: 30px 0;">
                a suivi avec assiduité la formation
              </p>

              <p style="font-size: 18px; font-weight: bold; margin: 30px 0; color: ${BRAND_COLORS.primary};">
                {{session.name}}
              </p>

              <p style="font-size: 16px; margin: 30px 0;">
                du {{session.start_date}} au {{session.end_date}}
              </p>

              <div style="margin-top: 60px;">
                <p>Fait à {{organization.address}}, le {{date}}</p>
                <div style="height: 80px; margin: 40px 0;"></div>
                <p>Signature et cachet</p>
              </div>
            </div>
          `,
          elements: [],
          pageSize: 'A4',
          margins: { top: 20, right: 20, bottom: 20, left: 20 },
        },
      },
      {
        type: 'devis',
        name: 'Devis de Formation',
        content: {
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #333; line-height: 1.4;">
              <!-- Corps du document -->
              <table style="width: 100%; margin-bottom: 24px;">
                <tr>
                  <td style="width: 50%; vertical-align: top;">
                    <p style="font-size: 11pt; font-weight: 600; color: ${BRAND_COLORS.primary}; margin: 0 0 4px 0;">DEVIS N° {{numero_devis}}</p>
                    <p style="margin: 0; color: #666; font-size: 9pt;">Date : {{date_emission}}</p>
                    <p style="margin: 0; color: #666; font-size: 9pt;">Validité : {{validite_devis}}</p>
                  </td>
                  <td style="width: 50%; vertical-align: top; text-align: right;">
                    <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 3px solid ${BRAND_COLORS.primary};">
                      <p style="font-weight: 600; margin: 0 0 4px 0; color: ${BRAND_COLORS.primary};">Client</p>
                      <p style="margin: 0; font-weight: 500;">{{eleve_prenom}} {{eleve_nom}}</p>
                      <p style="margin: 0; font-size: 9pt; color: #666;">{{eleve_adresse}}</p>
                      <p style="margin: 0; font-size: 9pt; color: #666;">{{eleve_email}}</p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Titre de la formation -->
              <div style="background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.primaryLight} 100%); color: white; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12pt; font-weight: 600;">{{formation_nom}}</p>
                <p style="margin: 4px 0 0 0; font-size: 9pt; opacity: 0.9;">{{formation_description}}</p>
              </div>

              <!-- Détails de la prestation -->
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background: #f1f3f5;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 9pt; font-weight: 600; color: ${BRAND_COLORS.primary}; border-bottom: 2px solid ${BRAND_COLORS.primary};">Désignation</th>
                    <th style="padding: 10px 12px; text-align: center; font-size: 9pt; font-weight: 600; color: ${BRAND_COLORS.primary}; border-bottom: 2px solid ${BRAND_COLORS.primary}; width: 80px;">Durée</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 9pt; font-weight: 600; color: ${BRAND_COLORS.primary}; border-bottom: 2px solid ${BRAND_COLORS.primary}; width: 100px;">Prix HT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">
                      <p style="margin: 0; font-weight: 500;">{{formation_nom}}</p>
                      <p style="margin: 4px 0 0 0; font-size: 9pt; color: #666;">Formation {{session_modalite}}</p>
                      <p style="margin: 2px 0 0 0; font-size: 9pt; color: #666;">Du {{session_debut}} au {{session_fin}}</p>
                    </td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e9ecef;">{{formation_duree}}</td>
                    <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e9ecef; font-weight: 500;">{{montant_ht}} €</td>
                  </tr>
                </tbody>
              </table>

              <!-- Totaux -->
              <table style="width: 280px; margin-left: auto; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 12px; text-align: left; color: #666;">Total HT</td>
                  <td style="padding: 8px 12px; text-align: right; font-weight: 500;">{{montant_ht}} €</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; text-align: left; color: #666;">TVA ({{taux_tva}}%)</td>
                  <td style="padding: 8px 12px; text-align: right;">{{tva}} €</td>
                </tr>
                <tr style="background: ${BRAND_COLORS.primary}; color: white;">
                  <td style="padding: 10px 12px; text-align: left; font-weight: 600; border-radius: 4px 0 0 4px;">Total TTC</td>
                  <td style="padding: 10px 12px; text-align: right; font-weight: 600; font-size: 11pt; border-radius: 0 4px 4px 0;">{{montant_ttc}} €</td>
                </tr>
              </table>

              <!-- Conditions -->
              <div style="background: #f8f9fa; padding: 14px; border-radius: 6px; margin-bottom: 20px;">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: ${BRAND_COLORS.primary}; font-size: 9pt;">CONDITIONS</p>
                <ul style="margin: 0; padding-left: 18px; font-size: 9pt; color: #555;">
                  <li style="margin-bottom: 4px;">Devis valable {{validite_devis}}</li>
                  <li style="margin-bottom: 4px;">Règlement : {{mode_paiement}}</li>
                  <li style="margin-bottom: 4px;">Ce devis est à retourner signé avec la mention "Bon pour accord"</li>
                </ul>
              </div>

              <!-- Signatures -->
              <table style="width: 100%; margin-top: 16px;">
                <tr>
                  <td style="width: 48%; vertical-align: top;">
                    <p style="font-size: 9pt; color: #666; margin: 0 0 8px 0;">Signature de l'organisme :</p>
                    <div style="height: 60px; border: 1px dashed #ccc; border-radius: 4px;"></div>
                  </td>
                  <td style="width: 4%;"></td>
                  <td style="width: 48%; vertical-align: top;">
                    <p style="font-size: 9pt; color: #666; margin: 0 0 8px 0;">Bon pour accord, date et signature :</p>
                    <div style="height: 60px; border: 1px dashed #ccc; border-radius: 4px;"></div>
                  </td>
                </tr>
              </table>
            </div>
          `,
          elements: [],
          pageSize: 'A4',
          margins: { top: 25, right: 20, bottom: 25, left: 20 },
        },
      },
    ]

    for (const template of defaultTemplates) {
      try {
        // Vérifier si un template par défaut existe déjà
        const existing = await documentTemplateService.getDefaultTemplate(organizationId, template.type)
        
        if (!existing) {
          await documentTemplateService.createTemplate({
            organization_id: organizationId,
            type: template.type,
            name: template.name,
            content: template.content,
            header: null,
            footer: null,
            is_default: true,
            is_active: true,
          })
          logger.info(`OrganizationSetup - Template ${template.type} créé`, { organizationId })
        }
      } catch (error) {
        logger.warn(`OrganizationSetup - Erreur lors de la création du template ${template.type}`, {
          error: sanitizeError(error),
          organizationId,
        })
        // Continuer même en cas d'erreur sur un template
      }
    }
  }

  /**
   * Initialise la checklist Qualiopi selon les domaines d'action
   */
  private async initializeQualiopiChecklist(
    organizationId: string,
    domains: string[]
  ): Promise<void> {
    try {
      // Initialiser tous les indicateurs Qualiopi
      await qualiopiService.initializeIndicators(organizationId)

      // Filtrer les indicateurs selon les domaines sélectionnés
      // (Cette logique peut être étendue pour personnaliser les indicateurs)
      logger.info('OrganizationSetup - Checklist Qualiopi initialisée', {
        organizationId,
        domains,
      })
    } catch (error) {
      logger.warn('OrganizationSetup - Erreur lors de l\'initialisation Qualiopi', {
        error: sanitizeError(error),
        organizationId,
      })
      // Ne pas faire échouer l'initialisation complète si Qualiopi échoue
    }
  }

  /**
   * Crée une session de démonstration "Bac à sable"
   */
  private async createDemoSession(organizationId: string): Promise<void> {
    try {
      // Créer un programme de démonstration
      const demoProgram = await programService.createProgram({
        organization_id: organizationId,
        name: 'Formation de Démonstration',
        code: 'DEMO-001',
        subtitle: 'Session d\'essai pour découvrir EDUZEN',
        description: 'Cette formation de démonstration vous permet de tester toutes les fonctionnalités d\'EDUZEN.',
        category: 'demo',
        program_version: '1.0',
        version_date: new Date().toISOString().split('T')[0],
        duration_days: 1,
        published_online: false,
        eligible_cpf: false,
        // certification_issued: false, // Propriété non disponible dans le type programs
        is_active: true,
      })

      // Créer une formation associée
      const demoFormation = await formationService.createFormation({
        organization_id: organizationId,
        program_id: demoProgram.id,
        name: 'Formation de Démonstration',
        code: 'DEMO-FORM-001',
        description: 'Formation de démonstration',
        duration_hours: 7,
        is_active: true,
      })

      // Créer une session de démonstration
      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 7) // Dans 7 jours
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 1)

      await sessionService.createSession({
        formation_id: demoFormation.id,
        name: 'Session Démonstration - Bac à sable',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'planned',
        capacity_max: 10, // Utiliser capacity_max au lieu de max_students
        // description: 'Session de démonstration...', // Propriété non disponible dans le type sessions
      })

      logger.info('OrganizationSetup - Session de démonstration créée', { organizationId })
    } catch (error) {
      logger.warn('OrganizationSetup - Erreur lors de la création de la session de démonstration', {
        error: sanitizeError(error),
        organizationId,
      })
      // Ne pas faire échouer l'initialisation complète
    }
  }

  /**
   * Met à jour les paramètres de l'organisation (couleur, logo)
   */
  private async updateOrganizationSettings(
    organizationId: string,
    settings: {
      primaryColor?: string
      logoUrl?: string
    }
  ): Promise<void> {
    try {
      const { data: org } = await this.supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single()

      if (!org) {
        throw new Error('Organisation non trouvée')
      }

      const currentSettings = (org.settings as any) || {}
      const updatedSettings = {
        ...currentSettings,
        ...(settings.primaryColor && { primaryColor: settings.primaryColor }),
        ...(settings.logoUrl && { logoUrl: settings.logoUrl }),
      }

      const { error } = await this.supabase
        .from('organizations')
        .update({ settings: updatedSettings })
        .eq('id', organizationId)

      if (error) throw error

      logger.info('OrganizationSetup - Paramètres de l\'organisation mis à jour', {
        organizationId,
        settings: updatedSettings,
      })
    } catch (error) {
      logger.warn('OrganizationSetup - Erreur lors de la mise à jour des paramètres', {
        error: sanitizeError(error),
        organizationId,
      })
    }
  }
}

export const organizationSetupService = new OrganizationSetupService()
