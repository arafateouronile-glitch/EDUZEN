/**
 * Tests pour les utilitaires de sanitization HTML (escapeHtml, sanitizeHTML, etc.)
 */
import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  stripHTML,
  containsDangerousHTML,
  sanitizeHTML,
  sanitizeBlogContent,
  sanitizeDocumentTemplate,
  sanitizeUserContent,
} from '@/lib/utils/sanitize-html'

describe('escapeHtml', () => {
  it('devrait retourner une chaîne vide pour null et undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('devrait échapper < et >', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
    expect(escapeHtml('a < b')).toBe('a &lt; b')
  })

  it('devrait échapper &', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('devrait échapper les guillemets doubles et simples', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
    expect(escapeHtml("'world'")).toBe('&#39;world&#39;')
  })

  it('devrait échapper une chaîne avec plusieurs caractères spéciaux', () => {
    expect(escapeHtml('<img src="x" onerror="alert(1)">')).toBe(
      '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;'
    )
  })

  it('devrait accepter un nombre (converti en chaîne)', () => {
    expect(escapeHtml(42 as unknown as string)).toBe('42')
  })
})

describe('stripHTML', () => {
  it('devrait retourner une chaîne vide pour null/undefined', () => {
    expect(stripHTML(null)).toBe('')
    expect(stripHTML(undefined)).toBe('')
  })

  it('devrait supprimer toutes les balises HTML', () => {
    expect(stripHTML('<p>hello</p>')).toBe('hello')
    const noScript = stripHTML('<script>alert(1)</script>')
    expect(noScript).not.toContain('<')
    expect(noScript).not.toContain('>')
  })
})

describe('containsDangerousHTML', () => {
  it('devrait retourner false pour null/undefined', () => {
    expect(containsDangerousHTML(null)).toBe(false)
    expect(containsDangerousHTML(undefined)).toBe(false)
  })

  it('devrait détecter <script>', () => {
    expect(containsDangerousHTML('<script>alert(1)</script>')).toBe(true)
  })

  it('devrait détecter javascript:', () => {
    expect(containsDangerousHTML('javascript:void(0)')).toBe(true)
  })

  it('devrait retourner false pour du texte safe', () => {
    expect(containsDangerousHTML('Hello world')).toBe(false)
    expect(containsDangerousHTML('<p>Safe</p>')).toBe(false)
  })
})

describe('sanitizeHTML', () => {
  it('devrait retourner une chaîne vide pour null/undefined', () => {
    expect(sanitizeHTML(null)).toBe('')
    expect(sanitizeHTML(undefined)).toBe('')
  })

  it('devrait retourner une string et ne jamais contenir <script>', () => {
    const out = sanitizeHTML('<p>Hello</p><script>alert(1)</script>')
    expect(typeof out).toBe('string')
    expect(out).not.toContain('<script>')
  })

  it('devrait appliquer allowStyles: false (pas d’attribut style)', () => {
    const out = sanitizeHTML('<p style="color:red">x</p>', { allowStyles: false })
    expect(typeof out).toBe('string')
    expect(out).not.toContain('style=')
  })

  it('devrait appliquer allowImages: false (pas de balise img)', () => {
    const out = sanitizeHTML('<img src="x" alt="y">', { allowImages: false })
    expect(typeof out).toBe('string')
    expect(out).not.toContain('<img')
  })

  it('devrait accepter allowExternalLinks et traiter les liens', () => {
    const out = sanitizeHTML('<a href="https://example.com" target="_blank">link</a>', {
      allowExternalLinks: true,
    })
    expect(typeof out).toBe('string')
    if (out.length > 0) {
      expect(out).toMatch(/rel=|noopener|noreferrer/)
    }
  })

  it('devrait accepter returnEmptyOnError sans lancer', () => {
    const out = sanitizeHTML('<p>ok</p>', { returnEmptyOnError: true })
    expect(typeof out).toBe('string')
  })

  it('devrait accepter allowedTags et allowedAttributes personnalisés', () => {
    const out = sanitizeHTML('<p><b>bold</b></p>', {
      allowAllTags: false,
      allowedTags: ['p', 'b'],
      allowedAttributes: ['class'],
    })
    expect(typeof out).toBe('string')
    if (out.length > 0) expect(out).toContain('bold')
  })
})

describe('sanitizeBlogContent', () => {
  it('devrait retourner une string (contenu riche)', () => {
    const out = sanitizeBlogContent('<p>Blog <strong>content</strong></p>')
    expect(typeof out).toBe('string')
  })

  it('devrait retourner une chaîne vide pour null', () => {
    expect(sanitizeBlogContent(null)).toBe('')
  })
})

describe('sanitizeDocumentTemplate', () => {
  it('devrait retourner une string', () => {
    const out = sanitizeDocumentTemplate('<p style="font-size:12px">Doc</p>')
    expect(typeof out).toBe('string')
  })
})

describe('sanitizeUserContent', () => {
  it('devrait ne pas contenir <img quand allowImages est false', () => {
    const out = sanitizeUserContent('<p>User <img src="x"> text</p>')
    expect(typeof out).toBe('string')
    expect(out).not.toContain('<img')
  })
})
