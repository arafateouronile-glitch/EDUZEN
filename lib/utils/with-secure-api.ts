/**
 * Secure API Route Wrapper
 *
 * Combines multiple security layers for API routes:
 * - Rate limiting (distributed with Upstash Redis)
 * - CSRF protection (Double Submit Cookie + Origin Verification)
 * - Request validation (Zod schemas)
 *
 * @example
 * // In an API route:
 * import { withSecureAPI } from '@/lib/utils/with-secure-api'
 * import { z } from 'zod'
 *
 * const schema = z.object({ email: z.string().email() })
 *
 * export const POST = withSecureAPI({
 *   rateLimit: 'MUTATION',
 *   csrfProtection: true,
 *   schema,
 *   handler: async (req, data) => {
 *     // data is typed from schema
 *     return NextResponse.json({ success: true })
 *   }
 * })
 */

import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { applyRateLimit, RATE_LIMITS } from './rate-limit'
import { csrfProtection, verifyOrigin } from './csrf'

type RateLimitType = keyof typeof RATE_LIMITS

interface SecureAPIOptions<T extends ZodSchema = ZodSchema> {
  /** Rate limit type to apply */
  rateLimit?: RateLimitType
  /** Enable CSRF protection (recommended for mutations) */
  csrfProtection?: boolean
  /** Zod schema for request body validation */
  schema?: T
  /** Function to extract user ID for rate limiting */
  getUserId?: (req: NextRequest) => Promise<string | undefined>
  /** Skip CSRF in development mode */
  skipCSRFInDev?: boolean
}

type HandlerWithData<T> = (
  req: NextRequest,
  data: T
) => Promise<Response>

type HandlerWithoutData = (req: NextRequest) => Promise<Response>

/**
 * Creates a secure API route handler with rate limiting, CSRF protection, and validation
 */
export function withSecureAPI<T extends ZodSchema>(
  options: SecureAPIOptions<T> & { schema: T },
  handler: HandlerWithData<z.infer<T>>
): (req: NextRequest) => Promise<Response>

export function withSecureAPI(
  options: SecureAPIOptions,
  handler: HandlerWithoutData
): (req: NextRequest) => Promise<Response>

export function withSecureAPI<T extends ZodSchema>(
  options: SecureAPIOptions<T>,
  handler: HandlerWithData<z.infer<T>> | HandlerWithoutData
): (req: NextRequest) => Promise<Response> {
  const {
    rateLimit: rateLimitType,
    csrfProtection: enableCSRF = false,
    schema,
    getUserId,
    skipCSRFInDev = true,
  } = options

  return async (req: NextRequest): Promise<Response> => {
    try {
      // 1. Apply rate limiting if configured
      if (rateLimitType) {
        let userId: string | undefined
        if (getUserId) {
          try {
            userId = await getUserId(req)
          } catch (error) {
            logger.warn('Error extracting user ID for rate limit', {
              error: sanitizeError(error),
            })
          }
        }

        const config = RATE_LIMITS[rateLimitType]
        const result = applyRateLimit(req, config, userId)

        if (!result.allowed) {
          return NextResponse.json(
            {
              error: 'Too Many Requests',
              message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
              retryAfter: result.retryAfter,
            },
            {
              status: 429,
              headers: result.headers,
            }
          )
        }
      }

      // 2. Apply CSRF protection for mutations
      if (enableCSRF) {
        const safeMethods = ['GET', 'HEAD', 'OPTIONS']
        const isUnsafeMethod = !safeMethods.includes(req.method)
        const isDev = process.env.NODE_ENV === 'development'

        if (isUnsafeMethod && !(isDev && skipCSRFInDev)) {
          // Verify origin first
          if (!verifyOrigin(req)) {
            logger.warn('CSRF: Invalid origin', {
              origin: req.headers.get('origin'),
              referer: req.headers.get('referer'),
            })
            return NextResponse.json(
              { error: 'Forbidden', message: 'Invalid origin' },
              { status: 403 }
            )
          }

          // Verify CSRF token
          const cookieToken = req.cookies.get('csrf_token')?.value
          const headerToken = req.headers.get('x-csrf-token')

          // In production, require CSRF tokens for mutations
          if (!isDev || !skipCSRFInDev) {
            if (!cookieToken || !headerToken || cookieToken !== headerToken) {
              logger.warn('CSRF: Token mismatch or missing', {
                hasCookie: !!cookieToken,
                hasHeader: !!headerToken,
              })
              return NextResponse.json(
                { error: 'Forbidden', message: 'Invalid or missing CSRF token' },
                { status: 403 }
              )
            }
          }
        }
      }

      // 3. Validate request body if schema provided
      let validatedData: z.infer<T> | undefined
      if (schema) {
        try {
          const body = await req.json()
          validatedData = schema.parse(body)
        } catch (error) {
          if (error instanceof ZodError) {
            return NextResponse.json(
              {
                error: 'Validation Error',
                message: 'Invalid request data',
                details: error.errors.map(e => ({
                  path: e.path.join('.'),
                  message: e.message,
                })),
              },
              { status: 400 }
            )
          }
          if (error instanceof SyntaxError) {
            return NextResponse.json(
              { error: 'Bad Request', message: 'Invalid JSON in request body' },
              { status: 400 }
            )
          }
          throw error
        }
      }

      // 4. Execute the handler
      if (schema && validatedData !== undefined) {
        return await (handler as HandlerWithData<z.infer<T>>)(req, validatedData)
      } else {
        return await (handler as HandlerWithoutData)(req)
      }
    } catch (error) {
      logger.error('Secure API error', error, { error: sanitizeError(error) })
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'An unexpected error occurred' },
        { status: 500 }
      )
    }
  }
}

/**
 * Shorthand for mutation endpoints (POST, PUT, DELETE)
 * Applies CSRF protection and mutation rate limiting by default
 */
export function withSecureMutation<T extends ZodSchema>(
  schema: T,
  handler: HandlerWithData<z.infer<T>>
): (req: NextRequest) => Promise<Response> {
  return withSecureAPI(
    {
      rateLimit: 'GENERAL' as RateLimitType,
      csrfProtection: true,
      schema,
    },
    handler
  )
}

/**
 * Shorthand for read endpoints (GET)
 * Applies general rate limiting, no CSRF needed for safe methods
 */
export function withSecureRead(
  handler: HandlerWithoutData
): (req: NextRequest) => Promise<Response> {
  return withSecureAPI(
    {
      rateLimit: 'GENERAL',
      csrfProtection: false,
    },
    handler
  )
}

/**
 * Shorthand for auth endpoints
 * Applies strict auth rate limiting and CSRF protection
 */
export function withSecureAuth<T extends ZodSchema>(
  schema: T,
  handler: HandlerWithData<z.infer<T>>
): (req: NextRequest) => Promise<Response> {
  return withSecureAPI(
    {
      rateLimit: 'AUTH',
      csrfProtection: true,
      schema,
      skipCSRFInDev: false, // Always require CSRF for auth, even in dev
    },
    handler
  )
}
