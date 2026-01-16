/**
 * Mock Supabase client for testing
 * Provides a fluent query builder that supports chaining
 */
import { vi } from 'vitest'

export const createMockSupabaseClient = () => {
  // Shared state for mock responses
  let mockData: any = null
  let mockError: any = null

  // Query builder that supports full chaining
  const queryBuilder = {
    from(table: string) {
      return queryBuilder
    },
    select(columns: string = '*') {
      return queryBuilder
    },
    eq(column: string, value: any) {
      return queryBuilder
    },
    in(column: string, values: any[]) {
      return queryBuilder
    },
    insert(data: any) {
      return queryBuilder
    },
    update(data: any) {
      return queryBuilder
    },
    upsert(data: any, options?: any) {
      return queryBuilder
    },
    delete() {
      return queryBuilder
    },
    order(column: string, options?: any) {
      return queryBuilder
    },
    limit(count: number) {
      return queryBuilder
    },
    single: vi.fn().mockImplementation(async () => ({
      data: mockData,
      error: mockError,
    })),
    maybeSingle: vi.fn().mockImplementation(async () => ({
      data: mockData,
      error: mockError,
    })),
  }

  // Convert all methods to vi.fn() to support spy features
  const spyBuilder = {
    from: vi.fn(queryBuilder.from),
    select: vi.fn(queryBuilder.select),
    eq: vi.fn(queryBuilder.eq),
    in: vi.fn(queryBuilder.in),
    insert: vi.fn(queryBuilder.insert),
    update: vi.fn(queryBuilder.update),
    upsert: vi.fn(queryBuilder.upsert),
    delete: vi.fn(queryBuilder.delete),
    order: vi.fn(queryBuilder.order),
    limit: vi.fn(queryBuilder.limit),
    single: queryBuilder.single,
    maybeSingle: queryBuilder.maybeSingle,
  }

  return {
    client: spyBuilder,
    setMockData(data: any) {
      mockData = data
    },
    setMockError(error: any) {
      mockError = error
    },
    resetMocks() {
      mockData = null
      mockError = null
      queryBuilder.single.mockClear()
      queryBuilder.maybeSingle.mockClear()
    },
  }
}
