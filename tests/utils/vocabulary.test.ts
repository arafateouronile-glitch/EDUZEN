/**
 * Tests unitaires pour les utilitaires de vocabulaire
 */

import { describe, it, expect } from 'vitest'
import { getVocabulary, type OrganizationType } from '@/lib/utils/vocabulary'

describe('getVocabulary', () => {
  it('devrait retourner le vocabulaire pour "training_organization"', () => {
    const vocab = getVocabulary('training_organization')

    expect(vocab).toHaveProperty('student', 'Stagiaire')
    expect(vocab).toHaveProperty('course', 'Formation')
    expect(vocab).toHaveProperty('class')
  })

  it('devrait retourner le vocabulaire pour "school"', () => {
    const vocab = getVocabulary('school')

    expect(vocab).toHaveProperty('student')
    expect(vocab).toHaveProperty('teacher')
    expect(vocab).toHaveProperty('class')
  })

  it('devrait retourner le vocabulaire pour "both"', () => {
    const vocab = getVocabulary('both')

    expect(vocab).toHaveProperty('student')
    expect(vocab).toHaveProperty('teacher')
    expect(vocab).toHaveProperty('class')
  })

  it('devrait retourner le vocabulaire par défaut pour un type inconnu', () => {
    const vocab = getVocabulary('unknown' as OrganizationType)

    // Devrait retourner le vocabulaire par défaut (training_organization)
    expect(vocab).toHaveProperty('student')
    expect(vocab).toHaveProperty('teacher')
  })

  it('devrait avoir toutes les propriétés requises', () => {
    const vocab = getVocabulary('school')

    expect(vocab).toHaveProperty('student')
    expect(vocab).toHaveProperty('students')
    expect(vocab).toHaveProperty('teacher')
    expect(vocab).toHaveProperty('class')
    expect(vocab).toHaveProperty('course')
    expect(vocab).toHaveProperty('session')
    expect(vocab).toHaveProperty('enrollment')
    expect(vocab).toHaveProperty('attendance')
    expect(vocab).toHaveProperty('payment')
  })

  it('devrait avoir des valeurs différentes selon le type', () => {
    const trainingVocab = getVocabulary('training_organization')
    const schoolVocab = getVocabulary('school')

    // Les vocabulaires devraient être différents
    expect(trainingVocab.student).toBe('Stagiaire')
    expect(schoolVocab.student).not.toBe('Stagiaire')
  })

  it('devrait retourner un objet Vocabulary valide', () => {
    const vocab = getVocabulary('school')

    expect(typeof vocab).toBe('object')
    expect(vocab).not.toBeNull()
    expect(Object.keys(vocab).length).toBeGreaterThan(0)
  })
})
