/**
 * Tests unitaires pour EDUZENClient
 */

import EDUZENClient from '../index'

// Mock fetch
global.fetch = jest.fn()

describe('EDUZENClient', () => {
  let client: EDUZENClient

  beforeEach(() => {
    client = new EDUZENClient({
      baseUrl: 'https://app.eduzen.com/api',
      apiKey: 'test-api-key',
    })
    jest.clearAllMocks()
  })

  describe('Configuration', () => {
    it('should initialize with default base URL', () => {
      const defaultClient = new EDUZENClient()
      expect(defaultClient).toBeInstanceOf(EDUZENClient)
    })

    it('should set API key', () => {
      client.setAPIKey('new-api-key')
      expect(client).toBeInstanceOf(EDUZENClient)
    })

    it('should set access token', () => {
      client.setAccessToken('new-access-token')
      expect(client).toBeInstanceOf(EDUZENClient)
    })
  })

  describe('2FA', () => {
    it('should generate 2FA secret', async () => {
      const mockResponse = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeUrl: 'data:image/png;base64,...',
        backupCodes: ['A1B2C3D4', 'E5F6G7H8'],
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await client.generate2FASecret()

      expect(response.data).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/2fa/generate-secret'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        })
      )
    })

    it('should verify 2FA activation', async () => {
      const mockResponse = {
        success: true,
        message: '2FA activée avec succès',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await client.verify2FAActivation('123456')

      expect(response.data).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/2fa/verify-activation'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ code: '123456' }),
        })
      )
    })
  })

  describe('Users', () => {
    it('should create a user', async () => {
      const mockResponse = {
        user: {
          id: 'user-123',
          email: 'teacher@example.com',
          full_name: 'Jane Smith',
          role: 'teacher',
          is_active: true,
        },
        message: 'Utilisateur créé avec succès',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await client.createUser({
        email: 'teacher@example.com',
        full_name: 'Jane Smith',
        organization_id: 'org-123',
        role: 'teacher',
      })

      expect(response.data).toEqual(mockResponse)
    })
  })

  describe('Students', () => {
    it('should get students', async () => {
      const mockResponse = {
        data: [
          {
            id: 'student-123',
            first_name: 'Jane',
            last_name: 'Doe',
            student_number: 'ORG-24-0001',
            email: 'jane@example.com',
            status: 'active',
          },
        ],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalItems: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const response = await client.getStudents({
        organization_id: 'org-123',
        page: 1,
        limit: 10,
      })

      expect(response.data).toEqual(mockResponse.data)
      expect(response.pagination).toEqual(mockResponse.pagination)
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      const mockError = {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: {
          field: 'email',
          message: 'Email invalide',
        },
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockError,
      })

      const response = await client.createUser({
        email: 'invalid-email',
        full_name: 'Test',
        organization_id: 'org-123',
      })

      expect(response.error).toBeDefined()
      expect(response.error?.message).toBe('Validation error')
      expect(response.error?.code).toBe('VALIDATION_ERROR')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const response = await client.getStudents({
        organization_id: 'org-123',
      })

      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe('NETWORK_ERROR')
    })
  })
})





