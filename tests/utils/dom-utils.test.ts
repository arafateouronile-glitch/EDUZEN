/**
 * Tests pour lib/utils/dom-utils.ts
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getPortalRoot, safeRemoveChild } from '@/lib/utils/dom-utils'

describe('dom-utils', () => {
  beforeEach(() => {
    const existing = document.getElementById('eduzen-portal-root')
    if (existing) existing.remove()
  })

  afterEach(() => {
    const existing = document.getElementById('eduzen-portal-root')
    if (existing) existing.remove()
  })

  describe('getPortalRoot', () => {
    it('devrait créer et retourner un div avec id eduzen-portal-root', () => {
      const root = getPortalRoot()
      expect(root.tagName).toBe('DIV')
      expect(root.id).toBe('eduzen-portal-root')
      expect(root.getAttribute('aria-hidden')).toBe('true')
      expect(root.style.position).toBe('fixed')
      expect(document.body.contains(root)).toBe(true)
    })

    it('devrait retourner la même racine si elle existe déjà', () => {
      const root1 = getPortalRoot()
      const root2 = getPortalRoot()
      expect(root1).toBe(root2)
      const all = document.querySelectorAll('#eduzen-portal-root')
      expect(all.length).toBe(1)
    })
  })

  describe('safeRemoveChild', () => {
    it('ne devrait rien faire si node est null ou undefined', () => {
      expect(() => safeRemoveChild(null)).not.toThrow()
      expect(() => safeRemoveChild(undefined)).not.toThrow()
    })

    it('devrait supprimer le nœud du parent s\'il a un parent', () => {
      const parent = document.createElement('div')
      const child = document.createElement('span')
      parent.appendChild(child)
      expect(parent.contains(child)).toBe(true)
      safeRemoveChild(child)
      expect(parent.contains(child)).toBe(false)
    })

    it('ne devrait pas lever si le nœud n\'a plus de parent', () => {
      const parent = document.createElement('div')
      const child = document.createElement('span')
      parent.appendChild(child)
      parent.removeChild(child)
      expect(() => safeRemoveChild(child)).not.toThrow()
    })
  })
})
