/**
 * Tests unitaires pour l'export Excel des sessions
 */

import { describe, it, expect, vi } from 'vitest'
import ExcelJS from 'exceljs'
import { buildSessionsSheets, type SessionsExportData } from '@/lib/utils/sessions-export'

vi.mock('@/lib/services/export-history.service.client', () => ({
  exportHistoryService: { create: vi.fn() },
}))

const emptyData: SessionsExportData = {
  enrollments: [],
  reservations: [],
  sessionTeachers: [],
  slots: [],
  modules: [],
  invoices: [],
  charges: [],
  studentEntities: [],
  fundingTypes: [],
  users: [],
}

const session = {
  id: 's1',
  name: 'Session Hiver',
  status: 'planned',
  start_date: '2026-01-15',
  end_date: '2026-01-16',
  capacity_max: 10,
  teacher_id: 'u1',
  formations: { name: 'Excel', code: 'EXC', currency: 'EUR', programs: { name: 'Bureautique' } },
}

const sheet = (sheets: ReturnType<typeof buildSessionsSheets>, name: string) =>
  sheets.find((s) => s.sheetName === name)!

describe('buildSessionsSheets', () => {
  it('garde une ligne par session même sans aucun détail', () => {
    const sheets = buildSessionsSheets([session], emptyData)
    const row = sheet(sheets, 'Sessions').data[0]

    expect(sheets.map((s) => s.sheetName)).toEqual([
      'Sessions', 'Apprenants', 'Entreprises', 'Intervenants', 'Séances', 'Tarifs', 'Factures et devis', 'Charges',
    ])
    expect(row).toMatchObject({ name: 'Session Hiver', formation: 'Excel', program: 'Bureautique', status: 'Planifiée', total: 0 })
    expect(row.remainingSeats).toBe(10)
  })

  it('calcule le montant comme l\'onglet Finances : facture récente > devis > modules, moins les avoirs', () => {
    const data: SessionsExportData = {
      ...emptyData,
      modules: [{ id: 'm1', session_id: 's1', name: 'Module', amount: 100, currency: 'EUR' }],
      enrollments: [
        { id: 'e1', session_id: 's1', student_id: 'st1', status: 'confirmed', paid_amount: 50, students: { first_name: 'A', last_name: 'B' } },
        { id: 'e2', session_id: 's1', student_id: 'st2', status: 'confirmed', paid_amount: 0, students: { first_name: 'C', last_name: 'D' } },
        { id: 'e3', session_id: 's1', student_id: 'st3', status: 'pending', paid_amount: 0, students: { first_name: 'E', last_name: 'F' } },
      ],
      invoices: [
        { id: 'i1', enrollment_id: 'e1', document_type: 'invoice', total_amount: 300, issue_date: '2026-01-01', payments: [] },
        { id: 'i2', enrollment_id: 'e1', document_type: 'invoice', total_amount: 400, issue_date: '2026-02-01', payments: [{ amount: 50, status: 'completed' }, { amount: 99, status: 'pending' }] },
        { id: 'i3', enrollment_id: 'e1', document_type: 'quote', total_amount: 999, issue_date: '2026-03-01', payments: [] },
        { id: 'i4', enrollment_id: 'e1', document_type: 'credit_note', total_amount: -40, issue_date: '2026-03-02', payments: [] },
        { id: 'i5', enrollment_id: 'e2', document_type: 'quote', total_amount: 250, issue_date: '2026-01-01', payments: [] },
      ],
    }
    const sheets = buildSessionsSheets([session], data)
    const learners = sheet(sheets, 'Apprenants').data

    expect(learners.map((l) => l.total)).toEqual([360, 250, 100])
    expect(learners[0].remaining).toBe(310)
    expect(sheet(sheets, 'Sessions').data[0]).toMatchObject({ enrollmentsTotal: 710, total: 710, paid: 50, remaining: 660 })

    const invoices = sheet(sheets, 'Factures et devis').data
    expect(invoices).toHaveLength(5)
    expect(invoices.find((i) => i.total === 400)).toMatchObject({ paid: 50, remaining: 350, client: 'A B', type: 'Facture' })
  })

  it('exclut annulés et abandons de l\'effectif, et additionne les entreprises', () => {
    const data: SessionsExportData = {
      ...emptyData,
      enrollments: [
        { id: 'e1', session_id: 's1', status: 'confirmed', students: {} },
        { id: 'e2', session_id: 's1', status: 'cancelled', students: {} },
        { id: 'e3', session_id: 's1', status: 'dropped', students: {} },
      ],
      reservations: [
        { id: 'r1', session_id: 's1', status: 'confirmed', expected_count: 4, total_amount: 800, paid_amount: 200, external_entities: { name: 'ACME' } },
        { id: 'r2', session_id: 's1', status: 'cancelled', expected_count: 9, total_amount: 0, external_entities: { name: 'Old' } },
      ],
    }
    const row = sheet(buildSessionsSheets([session], data), 'Sessions').data[0]

    expect(row).toMatchObject({ enrolledCount: 1, reservedCount: 4, remainingSeats: 5, reservationsTotal: 800, paid: 200 })
  })

  it('résout les formateurs, y compris le principal historique sans ligne session_teachers', () => {
    const data: SessionsExportData = {
      ...emptyData,
      users: [
        { id: 'u1', full_name: 'Legacy Prof', email: 'l@x.fr' },
        { id: 'u2', full_name: 'Autre Prof', email: 'a@x.fr' },
      ],
      sessionTeachers: [{ id: 't2', session_id: 's1', teacher_id: 'u2', is_primary: false, daily_rate: 500 }],
      slots: [
        { id: 'sl2', session_id: 's1', date: '2026-01-16', start_time: '09:00:00', teacher_id: 'u2' },
        { id: 'sl1', session_id: 's1', date: '2026-01-15', start_time: '09:00:00', end_time: '12:30:00', time_slot: 'morning' },
      ],
    }
    const sheets = buildSessionsSheets([session], data)

    expect(sheet(sheets, 'Sessions').data[0]).toMatchObject({ primaryTeacher: 'Legacy Prof', teachers: 'Autre Prof, Legacy Prof', slotCount: 2 })
    expect(sheet(sheets, 'Séances').data[0]).toMatchObject({ timeSlot: 'Matin', startTime: '09:00', endTime: '12:30' })
    expect(sheet(sheets, 'Séances').data[1]).toMatchObject({ teacher: 'Autre Prof' })
  })

  it('calcule le coût global et la marge, et liste les apprenants actifs', () => {
    const data: SessionsExportData = {
      ...emptyData,
      modules: [{ id: 'm1', session_id: 's1', name: 'Module', amount: 1000, currency: 'EUR' }],
      enrollments: [
        { id: 'e1', session_id: 's1', status: 'confirmed', students: { first_name: 'Zoé', last_name: 'Martin' } },
        { id: 'e2', session_id: 's1', status: 'confirmed', students: { first_name: 'Paul', last_name: 'Adam' } },
        { id: 'e3', session_id: 's1', status: 'cancelled', students: { first_name: 'Ex', last_name: 'Annulé' } },
      ],
      sessionTeachers: [
        { id: 't1', session_id: 's1', teacher_id: 'u1', daily_rate: 500, intervention_days: 2 },
        { id: 't2', session_id: 's1', teacher_id: 'u2', hourly_rate: 50, total_hours: 4 },
        { id: 't3', session_id: 's1', teacher_id: 'u3', daily_rate: 500 },
      ],
      charges: [
        { id: 'c1', session_id: 's1', amount: 300, payment_status: 'paid' },
        { id: 'c2', session_id: 's1', amount: 999, payment_status: 'cancelled' },
      ],
    }
    const sheets = buildSessionsSheets([session], data)

    expect(sheet(sheets, 'Sessions').data[0]).toMatchObject({
      learners: 'Adam Paul, Martin Zoé',
      total: 3000,
      teachersCost: 1200,
      chargesTotal: 300,
      globalCost: 1500,
      margin: 1500,
    })
    expect(sheet(sheets, 'Intervenants').data.map((t) => t.cost)).toEqual([1000, 200, ''])
  })

  it('écrit des dates calendaires exactes et produit un classeur lisible', async () => {
    const sheets = buildSessionsSheets([session], emptyData)
    const workbook = new ExcelJS.Workbook()
    for (const s of sheets) {
      const worksheet = workbook.addWorksheet(s.sheetName)
      worksheet.columns = s.columns.map((c) => ({
        header: c.header,
        key: c.key,
        ...(c.numFmt ? { style: { numFmt: c.numFmt } } : {}),
      }))
      worksheet.addRows(s.data)
    }

    const reread = new ExcelJS.Workbook()
    await reread.xlsx.load(await workbook.xlsx.writeBuffer())
    const start = reread.getWorksheet('Sessions')!.getRow(2).getCell(7)

    expect(reread.worksheets).toHaveLength(8)
    expect((start.value as Date).toISOString()).toBe('2026-01-15T00:00:00.000Z')
    expect(start.numFmt).toBe('dd/mm/yyyy')
  })
})
