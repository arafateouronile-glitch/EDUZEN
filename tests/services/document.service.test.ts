/**
 * Tests unitaires pour DocumentService
 * Tests de la standardisation ErrorHandler (Phase 1.2)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DocumentService } from '@/lib/services/document.service'
import { AppError, ErrorCode } from '@/lib/errors'
import { resetMockSupabase } from '@/tests/__mocks__/supabase-query-builder'

// Mock Supabase client with hoisting to avoid initialization issues
const { mockSupabase, mockStorageBucket } = vi.hoisted(() => {
  // Create storage bucket mock
  const mockStorageBucket = {
    upload: vi.fn(),
    remove: vi.fn(),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'http://example.com/file.pdf' } })),
    download: vi.fn(),
    list: vi.fn(),
    move: vi.fn(),
    copy: vi.fn(),
    createSignedUrl: vi.fn(),
    createSignedUrls: vi.fn(),
  }

  // Create Supabase mock with proper chaining
  // The key is that select() and insert() need to return objects that have single() method
  const createSelectChain = () => {
    const chain: any = {
      eq: vi.fn(),
      in: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      range: vi.fn(),
    }
    // Make chainable - eq(), in(), order(), limit() return the chain itself
    chain.eq.mockReturnValue(chain)
    chain.in.mockReturnValue(chain)
    chain.order.mockReturnValue(chain)
    chain.limit.mockReturnValue(chain)
    // single() and range() return promises (will be mocked in tests)
    chain.single.mockResolvedValue({ data: null, error: null })
    chain.maybeSingle.mockResolvedValue({ data: null, error: null })
    chain.range.mockResolvedValue({ data: [], error: null, count: 0 })
    return chain
  }

  const createInsertChain = () => {
    const chain: any = {
      select: vi.fn(),
      single: vi.fn(),
    }
    // select() returns a chain with single()
    chain.select.mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    chain.single.mockResolvedValue({ data: null, error: null })
    return chain
  }

  const createDeleteChain = () => {
    const chain: any = {
      eq: vi.fn(),
    }
    // eq() returns a promise (awaitable)
    chain.eq.mockResolvedValue({ data: null, error: null })
    return chain
  }

  const mock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    storage: {
      from: vi.fn(() => mockStorageBucket),
    },
  }

  // from() returns the mock itself
  mock.from.mockReturnValue(mock)
  
  // select() returns a chain with eq(), order(), range(), single()
  mock.select.mockReturnValue(createSelectChain())
  
  // insert() returns a chain with select().single()
  mock.insert.mockReturnValue(createInsertChain())
  
  // delete() returns a chain with eq()
  mock.delete.mockReturnValue(createDeleteChain())
  
  // update() returns the mock itself (chainable)
  mock.update.mockReturnValue(mock)
  
  // eq() on the main mock returns the mock itself
  mock.eq.mockReturnValue(mock)
  
  // order() and limit() return the mock itself
  mock.order.mockReturnValue(mock)
  mock.limit.mockReturnValue(mock)

  // single() and range() on main mock return promises
  mock.single.mockResolvedValue({ data: null, error: null })
  mock.range.mockResolvedValue({ data: [], error: null, count: 0 })

  return { mockSupabase: mock, mockStorageBucket }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

describe('DocumentService - ErrorHandler Standardization', () => {
  let service: DocumentService

  beforeEach(() => {
    service = new DocumentService()
    vi.clearAllMocks()
    
    // Recréer les chaînes après clearAllMocks
    const createSelectChain = () => {
      const chain: any = {
        eq: vi.fn(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
        order: vi.fn(),
        limit: vi.fn(),
        range: vi.fn(),
      }
      chain.eq.mockReturnValue(chain)
      chain.order.mockReturnValue(chain)
      chain.limit.mockReturnValue(chain)
      chain.single.mockResolvedValue({ data: null, error: null })
      chain.maybeSingle.mockResolvedValue({ data: null, error: null })
      chain.range.mockResolvedValue({ data: [], error: null, count: 0 })
      return chain
    }

    const createInsertChain = () => {
      const chain: any = {
        select: vi.fn(),
        single: vi.fn(),
      }
      // select() returns an object with single()
      const selectResult = {
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      chain.select.mockReturnValue(selectResult)
      chain.single.mockResolvedValue({ data: null, error: null })
      return chain
    }

    const createDeleteChain = () => {
      const chain: any = {
        eq: vi.fn(),
      }
      chain.eq.mockResolvedValue({ data: null, error: null })
      return chain
    }

    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(createSelectChain())
    mockSupabase.insert.mockReturnValue(createInsertChain())
    mockSupabase.delete.mockReturnValue(createDeleteChain())
    mockSupabase.update.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.order.mockReturnValue(mockSupabase)
    mockSupabase.limit.mockReturnValue(mockSupabase)
    mockSupabase.single.mockResolvedValue({ data: null, error: null })
    mockSupabase.range.mockResolvedValue({ data: [], error: null, count: 0 })
    mockSupabase.storage.from.mockReturnValue(mockStorageBucket as any)
  })

  describe('getAll', () => {
    it('devrait récupérer tous les documents avec pagination', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          organization_id: 'org-1',
          type: 'contract',
          file_name: 'contract.pdf',
          file_url: 'http://example.com/contract.pdf',
          created_at: new Date().toISOString(),
        },
        {
          id: 'doc-2',
          organization_id: 'org-1',
          type: 'invoice',
          file_name: 'invoice.pdf',
          file_url: 'http://example.com/invoice.pdf',
          created_at: new Date().toISOString(),
        },
      ]

      // Mock the full chain: from -> select -> eq -> order -> range
      // select() returns a chain with eq(), order(), range()
      const selectChain = mockSupabase.select()
      // After eq() and order(), we get range()
      selectChain.range.mockResolvedValueOnce({
        data: mockDocuments,
        error: null,
        count: 2,
      })

      const result = await service.getAll('org-1', { page: 1, limit: 10 })

      expect(result).toEqual({
        data: mockDocuments,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
      expect(mockSupabase.from).toHaveBeenCalledWith('documents')
      expect(mockSupabase.select).toHaveBeenCalledWith('*, students(*)', { count: 'exact' })
      // eq() is called on the select chain, not on mockSupabase
      expect(selectChain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    })

    it('devrait gérer les erreurs de base de données avec errorHandler', async () => {
      const dbError = { message: 'Database connection failed', code: '08000' }
      const selectChain = mockSupabase.select()
      selectChain.range.mockResolvedValueOnce({
        data: null,
        error: dbError,
      })

      await expect(service.getAll('org-1')).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('devrait récupérer un document par ID', async () => {
      const mockDocument = {
        id: 'doc-1',
        organization_id: 'org-1',
        type: 'contract',
        file_name: 'contract.pdf',
        file_url: 'http://example.com/contract.pdf',
        created_at: new Date().toISOString(),
      }

      // Mock the chain: from -> select -> eq -> single
      const selectChain = mockSupabase.select()
      selectChain.single.mockResolvedValueOnce({
        data: mockDocument,
        error: null,
      })

      const result = await service.getById('doc-1')

      expect(result).toEqual(mockDocument)
      // eq() is called on the select chain
      expect(selectChain.eq).toHaveBeenCalledWith('id', 'doc-1')
    })

    it('devrait lever une erreur NOT_FOUND si le document n\'existe pas', async () => {
      // Mock the chain: from -> select -> eq -> single
      // select() returns a chain with single()
      const selectChain = mockSupabase.select()
      selectChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })

      await expect(service.getById('non-existent')).rejects.toThrow(AppError)
      await expect(service.getById('non-existent')).rejects.toMatchObject({
        code: ErrorCode.DB_NOT_FOUND,
      })
    })
  })

  describe('create', () => {
    it('devrait créer un document avec succès', async () => {
      const createData = {
        organization_id: 'org-1',
        title: 'Contract Document',
        type: 'contract',
        file_name: 'contract.pdf',
        file_url: 'http://example.com/contract.pdf',
        format: 'PDF',
        page_count: 1,
        generated_by: 'user-1',
        metadata: {},
      }

      const mockDocument = {
        id: 'doc-1',
        ...createData,
        created_at: new Date().toISOString(),
      }

      // Mock the chain: from -> insert -> select -> single
      // insert() returns a chain with select(), which returns an object with single()
      const insertChain = mockSupabase.insert()
      // Create a fresh select result with single() for this test
      const selectResult = {
        single: vi.fn().mockResolvedValueOnce({
          data: mockDocument,
          error: null,
        }),
      }
      insertChain.select.mockReturnValueOnce(selectResult)

      const result = await service.create(createData)

      expect(result).toEqual(mockDocument)
      expect(mockSupabase.insert).toHaveBeenCalledWith(createData)
    })

    it('devrait valider les champs requis', async () => {
      const invalidData = {
        organization_id: '',
        type: 'contract',
      } as any

      await expect(service.create(invalidData)).rejects.toThrow(AppError)
      await expect(service.create(invalidData)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_ERROR,
      })
    })

    it('devrait gérer les contraintes uniques', async () => {
      const createData = {
        organization_id: 'org-1',
        title: 'Duplicate Document',
        type: 'contract',
        file_name: 'contract.pdf',
        file_url: 'http://example.com/contract.pdf',
        format: 'PDF',
        page_count: 1,
        generated_by: 'user-1',
        metadata: {},
      }

      // Mock the chain: from -> insert -> select -> single
      // The error should come from single() which is awaited
      // We need to mock twice because toThrow and toMatchObject both call create()
      const insertChain1 = mockSupabase.insert()
      const selectChain1 = insertChain1.select()
      selectChain1.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
        },
      })

      const insertChain2 = mockSupabase.insert()
      const selectChain2 = insertChain2.select()
      selectChain2.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint',
        },
      })

      await expect(service.create(createData)).rejects.toThrow(AppError)
      await expect(service.create(createData)).rejects.toMatchObject({
        code: ErrorCode.VALIDATION_UNIQUE_CONSTRAINT,
      })
    })
  })

  describe('uploadFile', () => {
    it('devrait uploader un fichier vers Supabase Storage', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const path = 'org-1/test.pdf'

      mockStorageBucket.upload.mockResolvedValueOnce({
        data: { path },
        error: null,
      })

      const result = await service.uploadFile(file, path)

      expect(result).toEqual({ path })
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('documents')
      expect(mockStorageBucket.upload).toHaveBeenCalledWith(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
    })

    it('devrait gérer les erreurs de storage', async () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const path = 'org-1/test.pdf'

      mockStorageBucket.upload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Storage quota exceeded' },
      })

      await expect(service.uploadFile(file, path)).rejects.toThrow()
    })
  })

  describe('delete', () => {
    it('devrait supprimer un document et son fichier', async () => {
      // Mock the chain: from -> delete -> eq
      const deleteChain = mockSupabase.delete()
      deleteChain.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      await service.delete('doc-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('documents')
      expect(mockSupabase.delete).toHaveBeenCalled()
      // Note: eq() is called on the delete chain, not on mockSupabase directly
    })

    it('devrait gérer les contraintes de clé étrangère', async () => {
      // Mock the chain: from -> delete -> eq
      // delete() returns an object with eq(), which is awaited
      const deleteChain = mockSupabase.delete()
      deleteChain.eq.mockResolvedValueOnce({
        data: null,
        error: {
          code: '23503',
          message: 'violates foreign key constraint',
        },
      })

      await expect(service.delete('doc-1')).rejects.toThrow(AppError)
      
      // Mock again for the second call in the matchObject assertion
      const deleteChain2 = mockSupabase.delete()
      deleteChain2.eq.mockResolvedValueOnce({
        data: null,
        error: {
          code: '23503',
          message: 'violates foreign key constraint',
        },
      })
      
      await expect(service.delete('doc-1')).rejects.toMatchObject({
        code: ErrorCode.DB_FOREIGN_KEY_CONSTRAINT,
      })
    })
  })

  describe('Error handling patterns', () => {
    it('devrait propager les AppError sans les wrapper', async () => {
      const appError = new AppError('Custom error', ErrorCode.VALIDATION_ERROR)

      // Mock the chain to throw an AppError
      mockSupabase.eq.mockRejectedValueOnce(appError)

      await expect(service.getById('doc-1')).rejects.toThrow(AppError)
      await expect(service.getById('doc-1')).rejects.toBeInstanceOf(AppError)
    })

    it('devrait logger les opérations avec succès', async () => {
      const mockDocument = {
        id: 'doc-1',
        organization_id: 'org-1',
        title: 'Test Document',
        type: 'contract',
        file_url: 'http://example.com/contract.pdf',
        file_name: 'test.pdf',
        created_at: new Date().toISOString(),
      }

      // Mock the chain: from -> insert -> select -> single
      const insertChain = mockSupabase.insert()
      const selectChain = insertChain.select()
      selectChain.single.mockResolvedValueOnce({
        data: mockDocument,
        error: null,
      })

      const result = await service.create(mockDocument as any)

      expect(result).toEqual(mockDocument)
      // Logger should have been called with success message
    })
  })
})
