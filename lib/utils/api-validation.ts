/**
 * API Validation Middleware
 *
 * Middleware pour valider les inputs des API routes Next.js
 * Protection contre XSS, SQL injection, et autres attaques
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  validateString,
  validateEmail,
  validateUUID,
  validateInteger,
  validateFloat,
  validateJSON,
  sanitizeHTML,
  sanitizeText,
  hasSuspiciousContent,
  type ValidationResult,
} from './input-validation'
import { logger } from './logger'

// ============================================================================
// TYPES
// ============================================================================

export type FieldType =
  | 'string'
  | 'email'
  | 'uuid'
  | 'integer'
  | 'float'
  | 'boolean'
  | 'date'
  | 'json'
  | 'html'
  | 'url'

export interface FieldValidation {
  type: FieldType
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  allowedValues?: string[]
  customValidator?: (value: unknown) => ValidationResult
}

export interface ValidationSchema {
  [key: string]: FieldValidation
}

export interface ValidatedData {
  [key: string]: unknown
}

export interface ValidationError {
  field: string
  errors: string[]
}

// ============================================================================
// VALIDATION DE REQUÊTE
// ============================================================================

/**
 * Extrait et valide les paramètres de recherche (query params)
 */
export async function validateQueryParams(
  request: NextRequest,
  schema: ValidationSchema
): Promise<{ isValid: boolean; data?: ValidatedData; errors?: ValidationError[] }> {
  const searchParams = request.nextUrl.searchParams
  const data: ValidatedData = {}
  const errors: ValidationError[] = []

  for (const [field, validation] of Object.entries(schema)) {
    const value = searchParams.get(field)

    // Vérifier si le champ est requis
    if (validation.required && !value) {
      errors.push({
        field,
        errors: ['Paramètre requis'],
      })
      continue
    }

    // Si non requis et absent, continuer
    if (!value) continue

    // Valider selon le type
    const result = validateField(field, value, validation)

    if (!result.isValid) {
      errors.push({
        field,
        errors: result.errors || ['Validation échouée'],
      })
    } else {
      data[field] = result.sanitized
    }
  }

  // Log des erreurs de validation
  if (errors.length > 0) {
    logger.warn('API Validation - Query params validation failed', {
      errors,
      path: request.nextUrl.pathname,
    })
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return { isValid: true, data }
}

/**
 * Extrait et valide le corps de la requête (body)
 */
export async function validateRequestBody(
  request: NextRequest,
  schema: ValidationSchema
): Promise<{ isValid: boolean; data?: ValidatedData; errors?: ValidationError[] }> {
  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return {
      isValid: false,
      errors: [{ field: '_body', errors: ['Corps de requête invalide (JSON attendu)'] }],
    }
  }

  return validateObject(body, schema, request.nextUrl.pathname)
}

/**
 * Valide un objet selon un schéma
 */
export function validateObject(
  data: Record<string, unknown>,
  schema: ValidationSchema,
  path?: string
): { isValid: boolean; data?: ValidatedData; errors?: ValidationError[] } {
  const sanitized: ValidatedData = {}
  const errors: ValidationError[] = []

  for (const [field, validation] of Object.entries(schema)) {
    const value = data[field]

    // Vérifier si le champ est requis
    if (validation.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        errors: ['Champ requis'],
      })
      continue
    }

    // Si non requis et absent, continuer
    if (value === undefined || value === null) continue

    // Valider selon le type
    const result = validateField(field, value, validation)

    if (!result.isValid) {
      errors.push({
        field,
        errors: result.errors || ['Validation échouée'],
      })
    } else {
      sanitized[field] = result.sanitized
    }
  }

  // Log des erreurs de validation
  if (errors.length > 0) {
    logger.warn('API Validation - Body validation failed', {
      errors,
      path,
    })
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return { isValid: true, data: sanitized }
}

/**
 * Valide un champ individuel selon sa configuration
 */
function validateField(field: string, value: unknown, validation: FieldValidation): ValidationResult {
  // Détecter contenu suspect
  if (typeof value === 'string' && hasSuspiciousContent(value)) {
    logger.warn('API Validation - Suspicious content detected', {
      field,
      contentPreview: value.substring(0, 50),
    })
    return {
      isValid: false,
      errors: ['Contenu suspect détecté'],
    }
  }

  // Validation selon le type
  switch (validation.type) {
    case 'string':
      return validateStringField(value, validation)

    case 'email':
      return validateEmail(String(value))

    case 'uuid':
      return validateUUID(String(value))

    case 'integer':
      return validateInteger(value as string | number, {
        min: validation.min,
        max: validation.max,
      })

    case 'float':
      return validateFloat(value as string | number, {
        min: validation.min,
        max: validation.max,
      })

    case 'boolean':
      return validateBooleanField(value)

    case 'date':
      return validateDateField(value)

    case 'json':
      return validateJSON(String(value))

    case 'html':
      return validateHTMLField(value, validation)

    case 'url':
      return validateURLField(value)

    default:
      return {
        isValid: false,
        errors: ['Type de validation non supporté'],
      }
  }
}

/**
 * Valide un champ string avec options
 */
function validateStringField(value: unknown, validation: FieldValidation): ValidationResult {
  if (typeof value !== 'string') {
    return { isValid: false, errors: ['Chaîne de caractères attendue'] }
  }

  // Vérifier les valeurs autorisées
  if (validation.allowedValues && !validation.allowedValues.includes(value)) {
    return {
      isValid: false,
      errors: [`Valeur non autorisée. Valeurs acceptées: ${validation.allowedValues.join(', ')}`],
    }
  }

  // Validation avec les options
  const result = validateString(value, {
    required: validation.required,
    minLength: validation.minLength,
    maxLength: validation.maxLength,
    pattern: validation.pattern,
  })

  // Validation personnalisée
  if (result.isValid && validation.customValidator) {
    return validation.customValidator(result.sanitized || value)
  }

  return result
}

/**
 * Valide un champ boolean
 */
function validateBooleanField(value: unknown): ValidationResult {
  if (typeof value === 'boolean') {
    return { isValid: true, sanitized: String(value) }
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === '1') {
      return { isValid: true, sanitized: 'true' }
    }
    if (lower === 'false' || lower === '0') {
      return { isValid: true, sanitized: 'false' }
    }
  }

  return { isValid: false, errors: ['Boolean attendu (true/false)'] }
}

/**
 * Valide un champ date
 */
function validateDateField(value: unknown): ValidationResult {
  if (typeof value !== 'string') {
    return { isValid: false, errors: ['Date ISO 8601 attendue'] }
  }

  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return { isValid: false, errors: ['Date invalide'] }
  }

  return { isValid: true, sanitized: date.toISOString() }
}

/**
 * Valide un champ HTML
 */
function validateHTMLField(value: unknown, validation: FieldValidation): ValidationResult {
  if (typeof value !== 'string') {
    return { isValid: false, errors: ['HTML attendu'] }
  }

  const sanitized = sanitizeHTML(value)

  // Vérifier la longueur après sanitization
  if (validation.maxLength && sanitized.length > validation.maxLength) {
    return {
      isValid: false,
      errors: [`Maximum ${validation.maxLength} caractères`],
    }
  }

  return { isValid: true, sanitized }
}

/**
 * Valide un champ URL
 */
function validateURLField(value: unknown): ValidationResult {
  if (typeof value !== 'string') {
    return { isValid: false, errors: ['URL attendue'] }
  }

  try {
    const url = new URL(value)

    // Autoriser uniquement HTTP/HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return {
        isValid: false,
        errors: ['Seuls les protocoles HTTP et HTTPS sont autorisés'],
      }
    }

    return { isValid: true, sanitized: url.toString() }
  } catch {
    return { isValid: false, errors: ['URL invalide'] }
  }
}

// ============================================================================
// HELPERS DE RÉPONSE
// ============================================================================

/**
 * Crée une réponse d'erreur de validation
 */
export function createValidationErrorResponse(errors: ValidationError[]): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation échouée',
      errors: errors.reduce((acc, err) => {
        acc[err.field] = err.errors
        return acc
      }, {} as Record<string, string[]>),
    },
    { status: 400 }
  )
}

/**
 * Middleware wrapper pour valider les query params
 */
export async function withQueryValidation(
  request: NextRequest,
  schema: ValidationSchema,
  handler: (req: NextRequest, data: ValidatedData) => Promise<NextResponse>
): Promise<NextResponse> {
  const validation = await validateQueryParams(request, schema)

  if (!validation.isValid) {
    return createValidationErrorResponse(validation.errors!)
  }

  return handler(request, validation.data!)
}

/**
 * Middleware wrapper pour valider le body
 */
export async function withBodyValidation(
  request: NextRequest,
  schema: ValidationSchema,
  handler: (req: NextRequest, data: ValidatedData) => Promise<NextResponse>
): Promise<NextResponse> {
  const validation = await validateRequestBody(request, schema)

  if (!validation.isValid) {
    return createValidationErrorResponse(validation.errors!)
  }

  return handler(request, validation.data!)
}

// ============================================================================
// SCHEMAS PRÉ-CONFIGURÉS
// ============================================================================

/**
 * Schéma de validation pour pagination
 */
export const paginationSchema: ValidationSchema = {
  page: {
    type: 'integer',
    required: false,
    min: 1,
  },
  limit: {
    type: 'integer',
    required: false,
    min: 1,
    max: 100,
  },
  offset: {
    type: 'integer',
    required: false,
    min: 0,
  },
}

/**
 * Schéma de validation pour tri
 */
export const sortingSchema: ValidationSchema = {
  sort_by: {
    type: 'string',
    required: false,
    pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  },
  order: {
    type: 'string',
    required: false,
    allowedValues: ['asc', 'desc'],
  },
}

/**
 * Schéma de validation pour recherche
 */
export const searchSchema: ValidationSchema = {
  q: {
    type: 'string',
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  ...paginationSchema,
}

/**
 * Schéma de validation pour filtrage par organisation
 */
export const organizationFilterSchema: ValidationSchema = {
  organization_id: {
    type: 'uuid',
    required: true,
  },
}

/**
 * Schéma de validation pour filtrage par date
 */
export const dateRangeSchema: ValidationSchema = {
  start_date: {
    type: 'date',
    required: false,
  },
  end_date: {
    type: 'date',
    required: false,
  },
}
