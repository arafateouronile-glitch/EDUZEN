import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/v1/docs/route'

vi.mock('@/lib/config/app-config', () => ({
  APP_URLS: {
    getBaseUrl: vi.fn(() => 'https://api.eduzen.com'),
  },
}))

describe('API /api/v1/docs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait retourner 200 avec une spec OpenAPI 3.0', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.openapi).toBe('3.0.0')
    expect(data.info).toMatchObject({
      title: 'EDUZEN API',
      version: '1.0.0',
    })
    expect(data.paths).toBeDefined()
    expect(Object.keys(data.paths).length).toBeGreaterThan(0)
  })

  it('devrait inclure les schémas et security schemes', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.components?.schemas?.Student).toBeDefined()
    expect(data.components?.schemas?.DocumentTemplate).toBeDefined()
    expect(data.components?.securitySchemes?.ApiKeyAuth).toMatchObject({
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    })
  })
})
