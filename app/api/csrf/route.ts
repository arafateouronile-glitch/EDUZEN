import { createCSRFTokenRoute } from '@/lib/utils/csrf'

/**
 * GET /api/csrf
 * Génère et retourne un nouveau token CSRF
 */
export const GET = createCSRFTokenRoute()
