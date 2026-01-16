/**
 * Service pour gérer les paramètres du catalogue public (site vitrine)
 */

import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'

type PublicCatalogSettings = TableRow<'public_catalog_settings'>
type PublicCatalogSettingsInsert = TableInsert<'public_catalog_settings'>
type PublicCatalogSettingsUpdate = TableUpdate<'public_catalog_settings'>

export interface PublicCatalogSettingsFormData {
  is_enabled: boolean
  site_title?: string
  site_description?: string
  site_keywords?: string[]
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  background_color?: string
  text_color?: string
  logo_url?: string
  favicon_url?: string
  cover_image_url?: string
  footer_image_url?: string
  hero_title?: string
  hero_subtitle?: string
  hero_description?: string
  hero_button_text?: string
  hero_button_link?: string
  about_title?: string
  about_content?: string
  about_image_url?: string
  contact_email?: string
  contact_phone?: string
  contact_address?: string
  show_contact_form?: boolean
  footer_text?: string
  footer_links?: Array<{ label: string; url: string }>
  social_links?: {
    facebook?: string
    linkedin?: string
    twitter?: string
    instagram?: string
    youtube?: string
  }
  google_analytics_id?: string
  google_tag_manager_id?: string
  meta_title?: string
  meta_description?: string
  meta_image_url?: string
  custom_domain?: string
}

export class PublicCatalogSettingsService {
  private supabase = createClient()

  /**
   * Récupère les paramètres du catalogue pour une organisation
   */
  async getSettings(organizationId: string): Promise<PublicCatalogSettings | null> {
    const { data, error } = await this.supabase
      .from('public_catalog_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Crée ou met à jour les paramètres du catalogue
   */
  async upsertSettings(
    organizationId: string,
    settings: FlexibleInsert<'public_catalog_settings'> | FlexibleUpdate<'public_catalog_settings'>
  ): Promise<PublicCatalogSettings> {
    // Vérifier si des settings existent déjà
    const existing = await this.getSettings(organizationId)

    if (existing) {
      // Mise à jour
      const { data, error } = await this.supabase
        .from('public_catalog_settings')
        .update(settings as PublicCatalogSettingsUpdate)
        .eq('organization_id', organizationId)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Création
      const { data, error } = await this.supabase
        .from('public_catalog_settings')
        .insert({
          organization_id: organizationId,
          ...settings,
        } as PublicCatalogSettingsInsert)
        .select()
        .single()

      if (error) throw error
      return data
    }
  }

  /**
   * Récupère les paramètres publics (pour le site vitrine)
   * Utilisé par les pages publiques
   */
  async getPublicSettings(organizationId?: string): Promise<PublicCatalogSettings | null> {
    let query = this.supabase
      .from('public_catalog_settings')
      .select('*')
      .eq('is_enabled', true)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Active ou désactive le site vitrine
   */
  async setEnabled(organizationId: string, enabled: boolean): Promise<PublicCatalogSettings> {
    return this.upsertSettings(organizationId, { is_enabled: enabled })
  }
}

export const publicCatalogSettingsService = new PublicCatalogSettingsService()



