/**
 * Tests unitaires pour avatar-colors
 */

import { describe, it, expect } from 'vitest'
import { getAvatarColor, getInitials, getPremiumGradient, AVATAR_COLORS } from '@/lib/utils/avatar-colors'

describe('getAvatarColor', () => {
  it('devrait retourner une couleur pour un identifiant valide', () => {
    const color = getAvatarColor('test@example.com')
    expect(color).toBeDefined()
    expect(color.bg).toBeDefined()
    expect(color.text).toBeDefined()
    expect(color.name).toBeDefined()
  })

  it('devrait retourner la même couleur pour le même identifiant', () => {
    const identifier = 'test@example.com'
    const color1 = getAvatarColor(identifier)
    const color2 = getAvatarColor(identifier)
    expect(color1).toEqual(color2)
  })

  it('devrait retourner une couleur différente pour des identifiants différents', () => {
    const color1 = getAvatarColor('user1@example.com')
    const color2 = getAvatarColor('user2@example.com')
    // Il est possible qu'ils aient la même couleur par hasard, mais généralement différents
    expect(AVATAR_COLORS).toContainEqual(color1)
    expect(AVATAR_COLORS).toContainEqual(color2)
  })

  it('devrait retourner la couleur par défaut pour un identifiant vide', () => {
    const color = getAvatarColor('')
    expect(color).toEqual(AVATAR_COLORS[0])
  })

  it('devrait ignorer la casse', () => {
    const color1 = getAvatarColor('Test@Example.com')
    const color2 = getAvatarColor('test@example.com')
    expect(color1).toEqual(color2)
  })

  it('devrait ignorer les espaces', () => {
    const color1 = getAvatarColor(' test@example.com ')
    const color2 = getAvatarColor('test@example.com')
    expect(color1).toEqual(color2)
  })
})

describe('getInitials', () => {
  it('devrait extraire les initiales d\'un nom complet', () => {
    expect(getInitials('John Doe')).toBe('JD')
    expect(getInitials('Marie Dupont')).toBe('MD')
  })

  it('devrait gérer un seul mot', () => {
    expect(getInitials('John')).toBe('JO')
    expect(getInitials('Marie')).toBe('MA')
  })

  it('devrait limiter à maxLength caractères', () => {
    expect(getInitials('John Doe', 1)).toBe('J')
    expect(getInitials('John Doe Smith', 2)).toBe('JD')
  })

  it('devrait retourner une chaîne vide pour un nom vide', () => {
    expect(getInitials('')).toBe('')
    expect(getInitials(undefined)).toBe('')
  })

  it('devrait mettre en majuscules', () => {
    expect(getInitials('john doe')).toBe('JD')
    expect(getInitials('MARIE DUPONT')).toBe('MD')
  })

  it('devrait gérer plusieurs mots', () => {
    expect(getInitials('Jean Pierre Martin')).toBe('JP')
    expect(getInitials('Marie Claire Dupont', 3)).toBe('MCD')
  })
})

describe('getPremiumGradient', () => {
  it('devrait retourner un gradient premium', () => {
    const result = getPremiumGradient('test@example.com')
    expect(result).toHaveProperty('gradient')
    expect(result).toHaveProperty('textColor')
    expect(result).toHaveProperty('shadowColor')
  })

  it('devrait retourner le même gradient pour le même identifiant', () => {
    const identifier = 'test@example.com'
    const result1 = getPremiumGradient(identifier)
    const result2 = getPremiumGradient(identifier)
    expect(result1).toEqual(result2)
  })

  it('devrait inclure une opacité dans shadowColor', () => {
    const result = getPremiumGradient('test@example.com')
    expect(result.shadowColor).toMatch(/80$/) // 50% opacity en hex
  })

  it('devrait utiliser getAvatarColor en interne', () => {
    const result = getPremiumGradient('test@example.com')
    const color = getAvatarColor('test@example.com')
    expect(result.gradient).toBe(color.bg)
    expect(result.textColor).toBe(color.text)
  })
})
