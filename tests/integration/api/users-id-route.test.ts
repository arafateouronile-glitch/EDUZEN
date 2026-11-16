import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH, DELETE } from '@/app/api/users/[id]/route'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

type Row = { id: string; role: string; organization_id: string | null; email: string | null }

/** Client admin : lecture des users par id, écritures enregistrées */
function fakeAdmin(users: Row[], deleteError: { code: string; message: string } | null = null) {
  const calls = { updates: [] as unknown[], deletes: 0, bans: [] as unknown[], authDeletes: 0 }
  const client = {
    from: () => {
      let id: string | null = null
      let op: 'select' | 'update' | 'delete' = 'select'
      let payload: unknown = null
      const chain: any = {
        select: () => chain,
        update: (v: unknown) => { op = 'update'; payload = v; return chain },
        delete: () => { op = 'delete'; return chain },
        eq: (_c: string, v: string) => {
          id = v
          if (op === 'update') { calls.updates.push(payload); return Promise.resolve({ error: null }) }
          if (op === 'delete') { calls.deletes++; return Promise.resolve({ error: deleteError }) }
          return chain
        },
        maybeSingle: async () => ({ data: users.find((u) => u.id === id) ?? null }),
      }
      return chain
    },
    auth: {
      admin: {
        updateUserById: async (_id: string, attrs: unknown) => { calls.bans.push(attrs); return { error: null } },
        deleteUser: async () => { calls.authDeletes++; return { error: null } },
      },
    },
  }
  return { client, calls }
}

async function setup(callerId: string | null, users: Row[], deleteError: { code: string; message: string } | null = null) {
  const { createClient } = await import('@/lib/supabase/server')
  const { createAdminClient } = await import('@/lib/supabase/admin')
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: callerId ? { id: callerId } : null }, error: null }) },
  } as any)
  const admin = fakeAdmin(users, deleteError)
  vi.mocked(createAdminClient).mockReturnValue(admin.client as any)
  return admin.calls
}

const admin: Row = { id: 'admin', role: 'admin', organization_id: 'org', email: 'a@x.fr' }
const teacher: Row = { id: 'teacher', role: 'teacher', organization_id: 'org', email: 't@x.fr' }
const outsider: Row = { id: 'other', role: 'teacher', organization_id: 'org2', email: 'o@x.fr' }
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const patch = (body: unknown) =>
  new NextRequest('http://localhost/api/users/x', { method: 'PATCH', body: JSON.stringify(body) })

describe('API /api/users/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 sans session', async () => {
    await setup(null, [])
    expect((await PATCH(patch({ is_active: false }), params('teacher'))).status).toBe(401)
  })

  it("403 si l'appelant n'est pas administrateur", async () => {
    await setup('teacher', [teacher, { ...teacher, id: 't2' }])
    expect((await PATCH(patch({ is_active: false }), params('t2'))).status).toBe(403)
  })

  it("404 pour un utilisateur d'une autre organisation", async () => {
    await setup('admin', [admin, outsider])
    expect((await PATCH(patch({ is_active: false }), params('other'))).status).toBe(404)
  })

  it('désactive un utilisateur et bloque sa connexion', async () => {
    const calls = await setup('admin', [admin, teacher])
    const res = await PATCH(patch({ is_active: false }), params('teacher'))
    expect(res.status).toBe(200)
    expect(calls.updates[0]).toMatchObject({ is_active: false })
    expect(calls.bans[0]).toMatchObject({ ban_duration: '876000h' })
  })

  it('refuse de désactiver son propre compte', async () => {
    await setup('admin', [admin])
    expect((await PATCH(patch({ is_active: false }), params('admin'))).status).toBe(400)
  })

  it('supprime un utilisateur sans historique', async () => {
    const calls = await setup('admin', [admin, teacher])
    const res = await DELETE(new NextRequest('http://localhost/api/users/teacher', { method: 'DELETE' }), params('teacher'))
    expect(await res.json()).toMatchObject({ deleted: true })
    expect(calls.authDeletes).toBe(1)
  })

  it("désactive à la place si l'utilisateur a de l'historique", async () => {
    const calls = await setup('admin', [admin, teacher], { code: '23503', message: 'fk' })
    const res = await DELETE(new NextRequest('http://localhost/api/users/teacher', { method: 'DELETE' }), params('teacher'))
    expect(await res.json()).toMatchObject({ deactivated: true })
    expect(calls.updates[0]).toMatchObject({ is_active: false })
    expect(calls.authDeletes).toBe(0)
  })
})
