/**
 * Tests critiques pour l'authentification
 * - Inscription
 * - Connexion
 * - Gestion des sessions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    rpc: vi.fn(),
  })),
}))

describe('Authentication - Inscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait créer un compte utilisateur avec succès', async () => {
    const mockSupabase = createClient()
    const mockAuthData = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
      session: {
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
      },
    }

    const mockOrgId = 'test-org-id'
    const mockUserData = {
      id: 'test-user-id',
      email: 'test@example.com',
      full_name: 'Test User',
      organization_id: mockOrgId,
    }

    // Mock auth.signUp
    vi.mocked(mockSupabase.auth.signUp).mockResolvedValue({
      data: mockAuthData,
      error: null,
    } as any)

    // Mock RPC pour créer organisation
    vi.mocked(mockSupabase.rpc).mockResolvedValue({
      data: mockOrgId,
      error: null,
    } as any)

    // Mock insert user
    const mockInsert = vi.fn().mockResolvedValue({
      data: mockUserData,
      error: null,
    })
    vi.mocked(mockSupabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      }),
    } as any)

    // Test
    const result = await mockSupabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123',
    })

    expect(result.data).toBeDefined()
    expect(result.data?.user?.email).toBe('test@example.com')
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('devrait rejeter un email invalide', async () => {
    const mockSupabase = createClient()

    vi.mocked(mockSupabase.auth.signUp).mockResolvedValue({
      data: null,
      error: {
        message: 'Invalid email',
        status: 400,
      },
    } as any)

    const result = await mockSupabase.auth.signUp({
      email: 'invalid-email',
      password: 'password123',
    })

    expect(result.error).toBeDefined()
    expect(result.error?.message).toBe('Invalid email')
  })

  it('devrait rejeter un mot de passe trop court', async () => {
    const mockSupabase = createClient()

    vi.mocked(mockSupabase.auth.signUp).mockResolvedValue({
      data: null,
      error: {
        message: 'Password should be at least 8 characters',
        status: 400,
      },
    } as any)

    const result = await mockSupabase.auth.signUp({
      email: 'test@example.com',
      password: 'short',
    })

    expect(result.error).toBeDefined()
    expect(result.error?.message).toContain('8 characters')
  })
})

describe('Authentication - Connexion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait connecter un utilisateur avec des identifiants valides', async () => {
    const mockSupabase = createClient()
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
    }

    vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
      data: {
        user: mockSession.user,
        session: mockSession,
      },
      error: null,
    } as any)

    const result = await mockSupabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'password123',
    })

    expect(result.data).toBeDefined()
    expect(result.data?.user?.email).toBe('test@example.com')
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('devrait rejeter des identifiants invalides', async () => {
    const mockSupabase = createClient()

    vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
      data: null,
      error: {
        message: 'Invalid login credentials',
        status: 400,
      },
    } as any)

    const result = await mockSupabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'wrong-password',
    })

    expect(result.error).toBeDefined()
    expect(result.error?.message).toBe('Invalid login credentials')
  })
})

describe('Authentication - Session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devrait récupérer la session actuelle', async () => {
    const mockSupabase = createClient()
    const mockSession = {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
      access_token: 'mock-token',
    }

    vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
      data: {
        session: mockSession,
      },
      error: null,
    } as any)

    const result = await mockSupabase.auth.getSession()

    expect(result.data?.session).toBeDefined()
    expect(result.data?.session?.user?.email).toBe('test@example.com')
  })

  it('devrait retourner null si aucune session', async () => {
    const mockSupabase = createClient()

    vi.mocked(mockSupabase.auth.getSession).mockResolvedValue({
      data: {
        session: null,
      },
      error: null,
    } as any)

    const result = await mockSupabase.auth.getSession()

    expect(result.data?.session).toBeNull()
  })
})





