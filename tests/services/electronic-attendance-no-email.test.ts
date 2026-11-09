/**
 * Émargement : les apprenants sans email doivent figurer sur la feuille (signature
 * par QR / lien public) sans qu'on tente de leur envoyer un email.
 */
import { describe, it, expect, vi } from 'vitest'
import { ElectronicAttendanceService } from '@/lib/services/electronic-attendance.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/** Chaîne PostgREST minimale : chaque méthode renvoie la chaîne, qui se résout sur `result` */
function chainResolving(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'order']) chain[m] = vi.fn(() => chain)
  chain.single = vi.fn(() => Promise.resolve(result))
  chain.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject)
  return chain
}

function serviceWith(result: { data: unknown; error: unknown }) {
  const supabase = { from: vi.fn(() => chainResolving(result)) } as unknown as SupabaseClient<Database>
  return new ElectronicAttendanceService(supabase)
}

type Internals = {
  getEligibleEnrolledStudents: (sessionId: string) => Promise<{
    students: Array<{ id: string; email?: string | null }>
    skippedNoEmail: Array<{ id: string; name: string }>
  }>
  sendAttendanceRequestEmails: (
    requests: Array<Record<string, unknown>>,
    session: Record<string, unknown>,
    title: string
  ) => Promise<{ failedRecipients: unknown[] }>
  sendAttendanceRequestEmail: (...args: unknown[]) => Promise<void>
}

describe('Émargement des apprenants sans email', () => {
  it('garde les inscrits sans email dans la liste et les signale', async () => {
    const service = serviceWith({
      data: [
        { student_id: 'a', students: { id: 'a', first_name: 'Ana', last_name: 'Diallo', email: 'ana@x.fr' } },
        { student_id: 'b', students: { id: 'b', first_name: 'Kossi', last_name: 'Akpemado', email: null } },
      ],
      error: null,
    })

    const { students, skippedNoEmail } = await (service as unknown as Internals).getEligibleEnrolledStudents('s1')

    expect(students.map((s) => s.id)).toEqual(['a', 'b'])
    expect(skippedNoEmail).toEqual([{ id: 'b', name: 'Kossi Akpemado' }])
  })

  it("n'envoie l'email qu'aux lignes qui ont une adresse", async () => {
    const service = serviceWith({ data: null, error: null }) as unknown as Internals
    const send = vi.spyOn(service, 'sendAttendanceRequestEmail').mockResolvedValue(undefined)

    await service.sendAttendanceRequestEmails(
      [
        { student_email: 'ana@x.fr', student_name: 'Ana Diallo', signature_token: 't1' },
        { student_email: '', student_name: 'Kossi Akpemado', signature_token: 't2' },
      ],
      { date: '2026-11-06', start_time: null },
      'Excel'
    )

    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][0]).toBe('ana@x.fr')
  })

  it("refuse le rappel d'un apprenant sans email au lieu d'envoyer à une adresse vide", async () => {
    const service = serviceWith({
      data: { id: 'r1', status: 'pending', student_email: '', student_name: 'Kossi Akpemado', signature_token: 't2', attendance_session: null },
      error: null,
    })

    await expect(service.sendAttendanceReminder('r1')).rejects.toThrow(/pas d'email/i)
  })
})
