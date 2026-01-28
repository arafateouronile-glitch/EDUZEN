/**
 * HTML Sanitization Utility
 *
 * Provides secure HTML sanitization using DOMPurify to prevent XSS attacks.
 * This module should be used whenever rendering user-generated or external HTML content.
 *
 * @example
 * import { sanitizeHTML } from '@/lib/utils/sanitize-html'
 *
 * // In a React component:
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(untrustedContent) }} />
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Default allowed tags for general content
 */
const DEFAULT_ALLOWED_TAGS = [
  // Text formatting
  'p', 'br', 'span', 'div', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'sub', 'sup', 'small', 'mark', 'ins', 'del',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Lists
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  // Tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // Links and media
  'a', 'img', 'figure', 'figcaption',
  // Semantic
  'article', 'section', 'aside', 'header', 'footer', 'nav', 'main',
  // Block
  'blockquote', 'pre', 'code', 'hr',
  // Other
  'address', 'time', 'abbr', 'cite', 'q',
]

/**
 * Default allowed attributes
 */
const DEFAULT_ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'id', 'name',
  'style', 'width', 'height', 'target', 'rel',
  'colspan', 'rowspan', 'scope', 'headers',
  'datetime', 'cite', 'lang', 'dir',
  'data-*', // Allow data attributes
]

/**
 * Configuration options for HTML sanitization
 */
export interface SanitizeOptions {
  /** Allow all safe tags (default: true) */
  allowAllTags?: boolean
  /** Custom list of allowed tags */
  allowedTags?: string[]
  /** Custom list of allowed attributes */
  allowedAttributes?: string[]
  /** Allow inline styles (default: true for document templates) */
  allowStyles?: boolean
  /** Allow links to open in new tabs (adds rel="noopener noreferrer") */
  allowExternalLinks?: boolean
  /** Allow images from any source (default: true) */
  allowImages?: boolean
  /** Return empty string instead of throwing on error */
  returnEmptyOnError?: boolean
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 *
 * @param dirty - The untrusted HTML content to sanitize
 * @param options - Configuration options for sanitization
 * @returns Sanitized HTML safe for rendering
 *
 * @example
 * // Basic usage
 * const safeHTML = sanitizeHTML(userContent)
 *
 * // With custom options
 * const safeHTML = sanitizeHTML(userContent, {
 *   allowedTags: ['p', 'br', 'strong'],
 *   allowStyles: false
 * })
 */
export function sanitizeHTML(dirty: string | null | undefined, options: SanitizeOptions = {}): string {
  if (!dirty) return ''

  const {
    allowAllTags = true,
    allowedTags = DEFAULT_ALLOWED_TAGS,
    allowedAttributes = DEFAULT_ALLOWED_ATTR,
    allowStyles = true,
    allowExternalLinks = true,
    allowImages = true,
    returnEmptyOnError = true,
  } = options

  try {
    // Configure DOMPurify
    const config: any = {
      ALLOWED_TAGS: allowAllTags ? undefined : allowedTags,
      ALLOWED_ATTR: allowedAttributes,
      ALLOW_DATA_ATTR: true,
      ALLOW_ARIA_ATTR: true,
      // Prevent DOM clobbering attacks
      SANITIZE_DOM: true,
      // Keep safe URI schemes
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    }

    // Handle styles
    if (!allowStyles) {
      config.FORBID_ATTR = [...(config.FORBID_ATTR || []), 'style']
    }

    // Handle images
    if (!allowImages) {
      config.FORBID_TAGS = [...(config.FORBID_TAGS || []), 'img']
    }

    const sanitized = DOMPurify.sanitize(dirty, config)
    // Convertir TrustedHTML en string si nécessaire
    let clean: string = typeof sanitized === 'string' ? sanitized : String(sanitized)

    // Post-process: Add security attributes to external links
    if (allowExternalLinks && clean.includes('<a ')) {
      // Add rel="noopener noreferrer" to links with target="_blank"
      clean = clean.replace(
        /<a\s+([^>]*?)target="_blank"([^>]*?)>/gi,
        (match: string, before: string, after: string) => {
          if (match.includes('rel=')) {
            // Ensure noopener noreferrer is present
            return match.replace(
              /rel="([^"]*)"/,
              (_: string, rel: string) => {
                const rels = new Set(rel.split(/\s+/))
                rels.add('noopener')
                rels.add('noreferrer')
                return `rel="${Array.from(rels).join(' ')}"`
              }
            )
          }
          return `<a ${before}target="_blank" rel="noopener noreferrer"${after}>`
        }
      )
    }

    return clean
  } catch (error) {
    if (returnEmptyOnError) {
      return ''
    }
    throw error
  }
}

/**
 * Sanitizes HTML for blog/article content with rich formatting support
 */
export function sanitizeBlogContent(dirty: string | null | undefined): string {
  return sanitizeHTML(dirty, {
    allowAllTags: true,
    allowStyles: true,
    allowExternalLinks: true,
    allowImages: true,
  })
}

/**
 * Sanitizes HTML for document templates (preserves styles for PDF generation)
 */
export function sanitizeDocumentTemplate(dirty: string | null | undefined): string {
  return sanitizeHTML(dirty, {
    allowAllTags: true,
    allowStyles: true,
    allowImages: true,
    allowExternalLinks: false, // Documents shouldn't have external links
  })
}

/**
 * Sanitizes HTML for user comments/messages (minimal formatting)
 */
export function sanitizeUserContent(dirty: string | null | undefined): string {
  return sanitizeHTML(dirty, {
    allowAllTags: false,
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'code'],
    allowStyles: false,
    allowImages: false,
    allowExternalLinks: true,
  })
}

/**
 * Strips all HTML tags, returning plain text only
 */
export function stripHTML(dirty: string | null | undefined): string {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

/**
 * Checks if a string contains potentially dangerous HTML
 */
export function containsDangerousHTML(html: string | null | undefined): boolean {
  if (!html) return false

  const dangerousPatterns = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick, onerror
    /<iframe\b/i,
    /<object\b/i,
    /<embed\b/i,
    /<form\b/i,
    /data:\s*text\/html/i,
  ]

  return dangerousPatterns.some(pattern => pattern.test(html))
}
