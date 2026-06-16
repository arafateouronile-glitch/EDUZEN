import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserOrgId, getUserProfile, assertAdminPermission } from '@/lib/utils/with-auth'
import type { Database } from '@/types/database.types'

function makeSupabase(resolveValue: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
  }
  return { from: vi.fn().mockReturnValue(chain), _chain: chain } as {
    from: ReturnType<typeof vi.fn>
    _chain: typeof chain
  }
}

describe('getUserOrgId', () => {
  it('retourne organization_id quand le user existe', async () => {
    const { from, _chain } = makeSupabase({ data: { organization_id: 'org-1' }, error: null })
    const result = await getUserOrgId({ from } as unknown as SupabaseClient<Database>, 'user-1')
    expect(result).toBe('org-1')
    expect(from).toHaveBeenCalledWith('users')
    expect(_chain.select).toHaveBeenCalledWith('organization_id')
    expect(_chain.eq).toHaveBeenCalledWith('id', 'user-1')
    expect(_chain.maybeSingle).toHaveBeenCalled()
  })

  it('retourne null si le user n\'existe pas', async () => {
    const { from } = makeSupabase({ data: null, error: { code: 'PGRST116' } })
    const result = await getUserOrgId({ from } as unknown as SupabaseClient<Database>, 'unknown')
    expect(result).toBeNull()
  })

  it('retourne null si organization_id est null', async () => {
    const { from } = makeSupabase({ data: { organization_id: null }, error: null })
    const result = await getUserOrgId({ from } as unknown as SupabaseClient<Database>, 'user-2')
    expect(result).toBeNull()
  })
})

describe('getUserProfile', () => {
  it('retourne organization_id et role', async () => {
    const { from } = makeSupabase({ data: { organization_id: 'org-1', role: 'admin' }, error: null })
    const result = await getUserProfile({ from } as unknown as SupabaseClient<Database>, 'user-1')
    expect(result).toEqual({ organization_id: 'org-1', role: 'admin' })
  })

  it('retourne null si le user n\'existe pas', async () => {
    const { from } = makeSupabase({ data: null, error: { code: 'PGRST116' } })
    const result = await getUserProfile({ from } as unknown as SupabaseClient<Database>, 'unknown')
    expect(result).toBeNull()
  })
})

describe('assertAdminPermission', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne null pour un super_admin (accès autorisé)', async () => {
    const { from } = makeSupabase({ data: { role: 'super_admin', permissions: {} }, error: null })
    const result = await assertAdminPermission({ from } as unknown as SupabaseClient<Database>, 'admin-1')
    expect(result).toBeNull()
  })

  it('retourne null pour un admin avec la permission requise', async () => {
    const { from } = makeSupabase({ data: { role: 'admin', permissions: { manage_blog: true } }, error: null })
    const result = await assertAdminPermission({ from } as unknown as SupabaseClient<Database>, 'admin-1', 'manage_blog')
    expect(result).toBeNull()
  })

  it('retourne 403 si admin absent de platform_admins', async () => {
    const { from } = makeSupabase({ data: null, error: null })
    const result = await assertAdminPermission({ from } as unknown as SupabaseClient<Database>, 'user-1')
    expect(result).not.toBeNull()
    expect(result?.status).toBe(403)
  })

  it('retourne 403 si admin n\'a pas la permission spécifique', async () => {
    const { from } = makeSupabase({ data: { role: 'admin', permissions: { manage_blog: false } }, error: null })
    const result = await assertAdminPermission({ from } as unknown as SupabaseClient<Database>, 'admin-1', 'manage_users')
    expect(result).not.toBeNull()
    expect(result?.status).toBe(403)
  })

  it('retourne null pour un admin sans permission requise (aucune permission passée)', async () => {
    const { from } = makeSupabase({ data: { role: 'admin', permissions: {} }, error: null })
    const result = await assertAdminPermission({ from } as unknown as SupabaseClient<Database>, 'admin-1')
    expect(result).toBeNull()
  })
})
