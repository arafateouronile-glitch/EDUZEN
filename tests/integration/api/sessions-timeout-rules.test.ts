import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/sessions/timeout-rules/route'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}))

describe('API /api/sessions/timeout-rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET devrait retourner 200 avec les règles de timeout par défaut', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('rules')
    expect(data.rules).toMatchObject({
      session_timeout: expect.any(Number),
      idle_timeout: expect.any(Number),
      max_sessions_per_user: expect.any(Number),
      require_reauthentication: expect.any(Boolean),
    })
    expect(data.rules.session_timeout).toBe(30 * 60 * 1000)
    expect(data.rules.idle_timeout).toBe(15 * 60 * 1000)
    expect(data.rules.max_sessions_per_user).toBe(5)
  })
})
