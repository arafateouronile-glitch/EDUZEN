/**
 * Utilitaires de pagination serveur
 * 
 * Fournit des helpers pour implémenter la pagination côté serveur
 * avec Supabase et React Query
 */

export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * Calcule les métadonnées de pagination
 */
export function calculatePaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize)
  const hasNextPage = page < totalPages
  const hasPreviousPage = page > 1

  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  }
}

/**
 * Parse les paramètres de pagination depuis une URL ou un objet
 */
export function parsePaginationParams(
  params: URLSearchParams | Record<string, string | number> | PaginationParams
): PaginationParams {
  if ('page' in params && 'pageSize' in params) {
    return {
      page: Number(params.page) || 1,
      pageSize: Number(params.pageSize) || 20,
    }
  }

  if (params instanceof URLSearchParams) {
    return {
      page: Number(params.get('page')) || 1,
      pageSize: Number(params.get('pageSize')) || 20,
    }
  }

  return {
    page: 1,
    pageSize: 20,
  }
}

/**
 * Calcule l'offset pour Supabase
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize
}

/**
 * Crée une réponse paginée
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: calculatePaginationMeta(page, pageSize, total),
  }
}

/**
 * Helper pour créer une requête Supabase paginée
 */
export async function paginateQuery<T>(
  queryBuilder: {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => any
      order: (column: string, options?: { ascending: boolean }) => {
        range: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
        count: (type?: 'exact') => Promise<{ count: number | null; error: any }>
      }
      [key: string]: any
    }
  },
  pagination: PaginationParams,
  countQuery?: () => Promise<{ count: number | null; error: any }>
): Promise<PaginatedResponse<T>> {
  const offset = calculateOffset(pagination.page, pagination.pageSize)
  const from = offset
  const to = offset + pagination.pageSize - 1

  // Récupérer le total si non fourni
  let total = 0
  if (countQuery) {
    const { count, error: countError } = await countQuery()
    if (countError) {
      throw countError
    }
    total = count || 0
  }

  // Récupérer les données
  const { data, error } = await queryBuilder
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw error
  }

  return createPaginatedResponse(data || [], pagination.page, pagination.pageSize, total)
}





