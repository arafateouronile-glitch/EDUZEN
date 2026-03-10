/**
 * Tests unitaires pour docx-generator.service (réduction services sans tests)
 * Vérification des exports et signature des fonctions principales.
 */
import { describe, it, expect } from 'vitest'
import {
  generateWordFromStoredTemplate,
  generateWordFromBuffer,
  generateDocxFromTemplate,
} from '@/lib/services/docx-generator.service'

describe('docx-generator.service', () => {
  it('exporte generateWordFromStoredTemplate comme fonction async', () => {
    expect(typeof generateWordFromStoredTemplate).toBe('function')
    expect(generateWordFromStoredTemplate.constructor?.name).toBe('AsyncFunction')
  })

  it('exporte generateWordFromBuffer comme fonction async', () => {
    expect(typeof generateWordFromBuffer).toBe('function')
    expect(generateWordFromBuffer.constructor?.name).toBe('AsyncFunction')
  })

  it('exporte generateDocxFromTemplate comme fonction async', () => {
    expect(typeof generateDocxFromTemplate).toBe('function')
    expect(generateDocxFromTemplate.constructor?.name).toBe('AsyncFunction')
  })
})
