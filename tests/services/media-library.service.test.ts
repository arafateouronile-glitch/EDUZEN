/**
 * Tests unitaires pour mediaLibraryService (réduction services sans tests)
 * Service non implémenté - tests des comportements actuels
 */
import { describe, it, expect } from 'vitest'
import { mediaLibraryService } from '@/lib/services/media-library.service'

describe('mediaLibraryService', () => {
  describe('getAll', () => {
    it('retourne un tableau vide (non implémenté)', async () => {
      const result = await mediaLibraryService.getAll('org-1')
      expect(result).toEqual([])
    })
  })

  describe('getPublicUrl', () => {
    it('retourne le filePath tel quel (non implémenté)', () => {
      expect(mediaLibraryService.getPublicUrl('/path/to/file.png')).toBe('/path/to/file.png')
    })
  })

  describe('uploadFile', () => {
    it('retourne null (non implémenté)', async () => {
      const file = new File([''], 'test.png', { type: 'image/png' })
      const result = await mediaLibraryService.uploadFile(file, 'org-1', 'user-1')
      expect(result).toBeNull()
    })
  })
})
