/**
 * Service pour gérer la bibliothèque de médias
 * 
 * NOTE: Service non implémenté - Fonctionnalité prévue pour une future version
 * Ce service permettra de gérer une bibliothèque centralisée de médias (images, documents, vidéos)
 * avec upload, catégorisation, favoris, et gestion des permissions.
 */

import { logger } from '@/lib/utils/logger'

export type MediaItem = {
  id: string
  title?: string
  file_name: string
  file_path: string
  category: MediaCategory
  file_size: number
  alt_text?: string
  is_favorite?: boolean
  is_logo?: boolean
  created_at?: string
  updated_at?: string
}

export type MediaCategory = 'image' | 'logo' | 'document' | 'video' | 'audio' | 'other'

export const mediaLibraryService = {
  /**
   * Récupère tous les médias d'une organisation
   */
  /**
   * Récupère tous les médias d'une organisation
   * @deprecated Service non implémenté - Fonctionnalité prévue pour une future version
   */
  async getAll(organizationId: string, filters?: Record<string, any>): Promise<MediaItem[]> {
    logger.warn('MediaLibraryService - getAll not implemented', { organizationId })
    return []
  },
  
  /**
   * Upload un fichier
   * @deprecated Service non implémenté - Fonctionnalité prévue pour une future version
   */
  async uploadFile(file: File, organizationId: string, userId: string, options?: { category?: MediaCategory }): Promise<MediaItem | null> {
    logger.warn('MediaLibraryService - uploadFile not implemented', { organizationId, userId })
    return null
  },

  /**
   * Obtient l'URL publique d'un fichier
   * @deprecated Service non implémenté - Fonctionnalité prévue pour une future version
   */
  getPublicUrl(filePath: string): string {
    logger.warn('MediaLibraryService - getPublicUrl not implemented', { filePath })
    return filePath
  },

  /**
   * Toggle le statut favori d'un média
   * @deprecated Service non implémenté - Fonctionnalité prévue pour une future version
   */
  async toggleFavorite(mediaId: string, isFavorite: boolean): Promise<void> {
    logger.warn('MediaLibraryService - toggleFavorite not implemented', { mediaId, isFavorite })
  },

  /**
   * Supprime un média
   * @deprecated Service non implémenté - Fonctionnalité prévue pour une future version
   */
  async delete(mediaId: string): Promise<void> {
    logger.warn('MediaLibraryService - delete not implemented', { mediaId })
  },
}
