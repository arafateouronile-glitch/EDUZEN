/**
 * Service pour gérer les layouts globaux de documents
 */

import { createClient } from '@/lib/supabase/server'

export class GlobalDocumentLayoutService {
  private async getSupabase() {
    return await createClient()
  }

  /**
   * Récupère le layout global actif pour une organisation
   */
  async getActiveLayout(organizationId: string) {
    try {
      const supabase = await this.getSupabase()
      const { data, error } = await supabase
        .from('global_document_layouts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle()

      if (error) {
        // Si la table n'existe pas, retourner null silencieusement
        if (error.code === 'PGRST116' || error.code === '42P01') {
          return null
        }
        throw error
      }

      return data
    } catch (error: any) {
      // Si la table n'existe pas, retourner null silencieusement
      if (error?.code === 'PGRST116' || error?.code === '42P01' || error?.message?.includes('does not exist')) {
        return null
      }
      throw error
    }
  }
}

export const globalDocumentLayoutService = new GlobalDocumentLayoutService()
