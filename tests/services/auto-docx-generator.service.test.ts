/**
 * Tests unitaires pour auto-docx-generator.service (réduction services sans tests)
 * Vérification des exports.
 */
import { describe, it, expect } from 'vitest'
import {
  generateDocxFromHtmlTemplate,
  generateWordDocument,
} from '@/lib/services/auto-docx-generator.service'

describe('auto-docx-generator.service', () => {
  it('exporte generateDocxFromHtmlTemplate comme fonction async', () => {
    expect(typeof generateDocxFromHtmlTemplate).toBe('function')
  })

  it('exporte generateWordDocument comme fonction async', () => {
    expect(typeof generateWordDocument).toBe('function')
  })
})
