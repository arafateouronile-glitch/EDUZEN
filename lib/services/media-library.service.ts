/**
 * Service pour gérer la bibliothèque de médias
 * TODO: Implémenter le service de bibliothèque de médias
 */

export type MediaItem = {
  id: string
  name: string
  url: string
  type: string
  size: number
  createdAt: string
}

export type MediaCategory = {
  id: string
  name: string
}

export const mediaLibraryService = {
  /**
   * Récupère tous les médias d'une organisation
   */
  async getMediaItems(organizationId: string, categoryId?: string) {
    // TODO: Implémenter la récupération des médias
    console.warn('mediaLibraryService.getMediaItems not implemented')
    return []
  },
  
  /**
   * Upload un média
   */
  async uploadMedia(file: File, organizationId: string, categoryId?: string) {
    // TODO: Implémenter l'upload de média
    console.warn('mediaLibraryService.uploadMedia not implemented')
    return null
  },
}
