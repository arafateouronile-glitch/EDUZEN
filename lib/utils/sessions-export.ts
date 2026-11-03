/**
 * Export Excel détaillé des sessions : une feuille de synthèse (une ligne par
 * session) et une feuille par type de détail (apprenants, entreprises,
 * intervenants, séances, tarifs, factures, charges).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { exportSheetsToExcel, type ExcelColumn, type ExcelSheet } from './excel-export'
import { analytics } from './analytics'
import { exportHistoryService } from '@/lib/services/export-history.service.client'
import { logger, sanitizeError } from '@/lib/utils/logger'

type Row = Record<string, any>

export interface SessionsExportData {
  enrollments: Row[]
  reservations: Row[]
  sessionTeachers: Row[]
  slots: Row[]
  modules: Row[]
  invoices: Row[]
  charges: Row[]
  studentEntities: Row[]
  fundingTypes: Row[]
  users: Row[]
}

// Limite de lignes renvoyées par requête PostgREST, et taille de lot d'ids
// pour rester sous la longueur maximale d'une URL.
const PAGE_SIZE = 1000
const ID_CHUNK_SIZE = 100

const MONEY_FORMAT = '#,##0.00'
const DATE_FORMAT = 'dd/mm/yyyy'

const SESSION_STATUS_LABELS: Record<string, string> = {
  planned: 'Planifiée',
  ongoing: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
}
const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  completed: 'Terminé',
  cancelled: 'Annulé',
  dropped: 'Abandonné',
}
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  partial: 'Partiel',
  paid: 'Payé',
  overdue: 'En retard',
  cancelled: 'Annulé',
}
const INVOICE_TYPE_LABELS: Record<string, string> = {
  invoice: 'Facture',
  quote: 'Devis',
  credit_note: 'Avoir',
}
const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  partial: 'Partielle',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
}
const BILLING_MODE_LABELS: Record<string, string> = {
  per_client: 'Par client',
  per_group: 'Par groupe',
  per_student: 'Par apprenant',
  per_hour: 'Par heures',
}
const TIME_SLOT_LABELS: Record<string, string> = {
  morning: 'Matin',
  afternoon: 'Après-midi',
  full_day: 'Journée',
}

const label = (labels: Record<string, string>, value: unknown): string =>
  typeof value === 'string' ? labels[value] ?? value : ''

const toNumber = (value: unknown): number => {
  const n = Number(value ?? 0)
  return Number.isNaN(n) ? 0 : n
}

const uniqueIds = (values: unknown[]): string[] =>
  [...new Set(values.filter((v): v is string => typeof v === 'string' && v.length > 0))]

const groupBy = (rows: Row[], key: string): Map<string, Row[]> => {
  const groups = new Map<string, Row[]>()
  for (const row of rows) {
    const id = row[key]
    if (!id) continue
    const group = groups.get(id)
    if (group) group.push(row)
    else groups.set(id, [row])
  }
  return groups
}

/**
 * Date calendaire écrite en UTC : ExcelJS sérialise les Date en UTC, et une date
 * "2026-01-15" ne doit pas changer de jour selon le fuseau de l'utilisateur.
 */
const toExcelDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00Z`)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

const toTime = (value: unknown): string => (typeof value === 'string' ? value.slice(0, 5) : '')

const yesNo = (value: unknown): string => (value ? 'Oui' : 'Non')

const money = (header: string, key: string): ExcelColumn => ({ header, key, width: 15, numFmt: MONEY_FORMAT })
const date = (header: string, key: string): ExcelColumn => ({ header, key, width: 13, numFmt: DATE_FORMAT })

async function fetchAllByIds(
  supabase: SupabaseClient<any>,
  table: string,
  select: string,
  column: string,
  ids: string[]
): Promise<Row[]> {
  const rows: Row[] = []
  for (let i = 0; i < ids.length; i += ID_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + ID_CHUNK_SIZE)
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .in(column, chunk)
        .order('id')
        .range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      const page = (data ?? []) as unknown as Row[]
      rows.push(...page)
      if (page.length < PAGE_SIZE) break
    }
  }
  return rows
}

export async function fetchSessionsExportData(
  supabase: SupabaseClient<any>,
  sessionIds: string[],
  legacyTeacherIds: string[] = []
): Promise<SessionsExportData> {
  const bySession = (table: string, select: string) =>
    fetchAllByIds(supabase, table, select, 'session_id', sessionIds)

  const [enrollments, reservations, sessionTeachers, slots, modules, charges] = await Promise.all([
    bySession(
      'enrollments',
      'id, session_id, student_id, status, enrollment_date, funding_type_id, paid_amount, payment_status, ' +
        'students(student_number, first_name, last_name, email, phone, date_of_birth, address, postal_code, city)'
    ),
    bySession(
      'session_entity_reservations',
      'id, session_id, entity_id, status, enrollment_date, expected_count, billing_mode, billing_quantity, funding_type_id, ' +
        'total_amount, paid_amount, payment_status, notes, ' +
        'external_entities(name, siret, email, phone, address, postal_code, city, contact_first_name, contact_last_name, contact_email, contact_phone)'
    ),
    bySession(
      'session_teachers',
      'id, session_id, teacher_id, role, is_primary, daily_rate, hourly_rate, intervention_days, total_hours, notes'
    ),
    bySession('session_slots', 'id, session_id, date, time_slot, start_time, end_time, location, teacher_id, notes'),
    bySession('session_modules', 'id, session_id, name, amount, currency, display_order'),
    bySession(
      'session_charges',
      'id, session_id, charge_date, description, amount, currency, vendor, vendor_invoice_number, vendor_invoice_date, ' +
        'payment_method, payment_status, paid_at, notes'
    ),
  ])

  const invoiceSelect =
    'id, enrollment_id, session_entity_reservation_id, document_type, invoice_number, issue_date, due_date, ' +
    'amount, tax_amount, total_amount, currency, status, payments(amount, status)'
  const [enrollmentInvoices, reservationInvoices, studentEntities, fundingTypes, users] = await Promise.all([
    fetchAllByIds(supabase, 'invoices', invoiceSelect, 'enrollment_id', uniqueIds(enrollments.map((e) => e.id))),
    fetchAllByIds(
      supabase,
      'invoices',
      invoiceSelect,
      'session_entity_reservation_id',
      uniqueIds(reservations.map((r) => r.id))
    ),
    fetchAllByIds(
      supabase,
      'student_entities',
      'id, student_id, is_current, external_entities(name)',
      'student_id',
      uniqueIds(enrollments.map((e) => e.student_id))
    ),
    fetchAllByIds(
      supabase,
      'funding_types',
      'id, name',
      'id',
      uniqueIds([...enrollments, ...reservations].map((r) => r.funding_type_id))
    ),
    fetchAllByIds(
      supabase,
      'users',
      'id, full_name, email',
      'id',
      uniqueIds([...sessionTeachers.map((t) => t.teacher_id), ...slots.map((s) => s.teacher_id), ...legacyTeacherIds])
    ),
  ])

  const invoicesById = new Map([...enrollmentInvoices, ...reservationInvoices].map((inv) => [inv.id, inv]))

  return {
    enrollments,
    reservations,
    sessionTeachers,
    slots,
    modules,
    invoices: [...invoicesById.values()],
    charges,
    studentEntities,
    fundingTypes,
    users,
  }
}

const invoiceTotal = (invoice: Row): number =>
  invoice.total_amount != null
    ? toNumber(invoice.total_amount)
    : toNumber(invoice.amount) + toNumber(invoice.tax_amount)

const invoicePaid = (invoice: Row): number =>
  (Array.isArray(invoice.payments) ? invoice.payments : [])
    .filter((p: Row) => p?.status === 'completed')
    .reduce((sum: number, p: Row) => sum + toNumber(p?.amount), 0)

/**
 * Même priorité que l'onglet Finances de la session (gestion-finances.tsx) :
 * facture la plus récente, sinon devis le plus récent, sinon montant par défaut,
 * les avoirs venant toujours en déduction.
 */
const displayTotal = (invoices: Row[], fallback: number): number => {
  const mostRecent = (type: string) =>
    invoices
      .filter((inv) => inv.document_type === type)
      .sort((a, b) => String(b.issue_date ?? '').localeCompare(String(a.issue_date ?? '')))[0]
  const creditNotes = invoices
    .filter((inv) => inv.document_type === 'credit_note')
    .reduce((sum, inv) => sum + invoiceTotal(inv), 0)
  const reference = mostRecent('invoice') ?? mostRecent('quote')
  return (reference ? invoiceTotal(reference) : fallback) + creditNotes
}

const SESSION_COLUMNS: ExcelColumn[] = [
  { header: 'Session', key: 'name', width: 34 },
  { header: 'Code formation', key: 'formationCode', width: 15 },
  { header: 'Formation', key: 'formation', width: 30 },
  { header: 'Programme', key: 'program', width: 30 },
  { header: 'Statut', key: 'status', width: 12 },
  { header: 'Archivée', key: 'archived', width: 10 },
  date('Début', 'startDate'),
  date('Fin', 'endDate'),
  { header: 'Heure début', key: 'startTime', width: 12 },
  { header: 'Heure fin', key: 'endTime', width: 12 },
  date("Date d'examen", 'examDate'),
  { header: 'Lieu', key: 'location', width: 26 },
  { header: 'Capacité max', key: 'capacity', width: 13 },
  { header: 'Apprenants inscrits', key: 'enrolledCount', width: 18 },
  { header: 'Effectif entreprises', key: 'reservedCount', width: 18 },
  { header: 'Places restantes', key: 'remainingSeats', width: 16 },
  { header: 'Formateur principal', key: 'primaryTeacher', width: 26 },
  { header: 'Intervenants', key: 'teachers', width: 36 },
  { header: 'Séances', key: 'slotCount', width: 10 },
  money('Montant apprenants', 'enrollmentsTotal'),
  money('Montant entreprises', 'reservationsTotal'),
  money('Montant total', 'total'),
  money('Encaissé', 'paid'),
  money('Reste à payer', 'remaining'),
  money('Charges', 'chargesTotal'),
  { header: 'Devise', key: 'currency', width: 9 },
]

const SESSION_REF_COLUMNS: ExcelColumn[] = [
  { header: 'Session', key: 'session', width: 34 },
  { header: 'Formation', key: 'formation', width: 30 },
]

/**
 * Construit les feuilles du classeur. Les lignes de détail suivent l'ordre des sessions.
 */
export function buildSessionsSheets(sessions: Row[], data: SessionsExportData): ExcelSheet[] {
  const enrollmentsBySession = groupBy(data.enrollments, 'session_id')
  const reservationsBySession = groupBy(data.reservations, 'session_id')
  const teachersBySession = groupBy(data.sessionTeachers, 'session_id')
  const slotsBySession = groupBy(data.slots, 'session_id')
  const modulesBySession = groupBy(data.modules, 'session_id')
  const chargesBySession = groupBy(data.charges, 'session_id')
  const invoicesByEnrollment = groupBy(data.invoices, 'enrollment_id')
  const invoicesByReservation = groupBy(data.invoices, 'session_entity_reservation_id')

  const userById = new Map(data.users.map((u) => [u.id, u]))
  const fundingNameById = new Map(data.fundingTypes.map((f) => [f.id, f.name]))
  const currentEntityByStudent = new Map(
    data.studentEntities.filter((se) => se.is_current).map((se) => [se.student_id, se.external_entities?.name ?? ''])
  )
  const userName = (id: unknown) => (typeof id === 'string' ? userById.get(id)?.full_name ?? '' : '')

  const sessionRows: Row[] = []
  const enrollmentRows: Row[] = []
  const reservationRows: Row[] = []
  const teacherRows: Row[] = []
  const slotRows: Row[] = []
  const moduleRows: Row[] = []
  const invoiceRows: Row[] = []
  const chargeRows: Row[] = []

  for (const session of sessions) {
    const ref = { session: session.name ?? '', formation: session.formations?.name ?? '' }
    const enrollments = enrollmentsBySession.get(session.id) ?? []
    const reservations = reservationsBySession.get(session.id) ?? []
    const sessionTeachers = teachersBySession.get(session.id) ?? []
    const slots = [...(slotsBySession.get(session.id) ?? [])].sort(
      (a, b) =>
        String(a.date).localeCompare(String(b.date)) || String(a.start_time).localeCompare(String(b.start_time))
    )
    const modules = [...(modulesBySession.get(session.id) ?? [])].sort(
      (a, b) => toNumber(a.display_order) - toNumber(b.display_order)
    )
    const charges = chargesBySession.get(session.id) ?? []
    const modulesTotal = modules.reduce((sum, m) => sum + toNumber(m.amount), 0)

    let enrollmentsTotal = 0
    let reservationsTotal = 0
    let paid = 0

    const pushInvoices = (invoices: Row[], client: string) => {
      for (const inv of invoices) {
        const total = invoiceTotal(inv)
        const invoicePaidAmount = invoicePaid(inv)
        invoiceRows.push({
          ...ref,
          number: inv.invoice_number ?? '',
          type: label(INVOICE_TYPE_LABELS, inv.document_type),
          client,
          issueDate: toExcelDate(inv.issue_date),
          dueDate: toExcelDate(inv.due_date),
          amount: toNumber(inv.amount),
          tax: toNumber(inv.tax_amount),
          total,
          paid: invoicePaidAmount,
          remaining: Math.max(total - invoicePaidAmount, 0),
          currency: inv.currency ?? '',
          status: label(INVOICE_STATUS_LABELS, inv.status),
        })
      }
    }

    for (const enrollment of enrollments) {
      const student = enrollment.students ?? {}
      const invoices = invoicesByEnrollment.get(enrollment.id) ?? []
      const total = displayTotal(invoices, modulesTotal)
      const enrollmentPaid = toNumber(enrollment.paid_amount)
      const fullName = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
      enrollmentsTotal += total
      paid += enrollmentPaid
      enrollmentRows.push({
        ...ref,
        number: student.student_number ?? '',
        lastName: student.last_name ?? '',
        firstName: student.first_name ?? '',
        email: student.email ?? '',
        phone: student.phone ?? '',
        birthDate: toExcelDate(student.date_of_birth),
        address: student.address ?? '',
        postalCode: student.postal_code ?? '',
        city: student.city ?? '',
        company: currentEntityByStudent.get(enrollment.student_id) ?? '',
        status: label(ENROLLMENT_STATUS_LABELS, enrollment.status),
        enrollmentDate: toExcelDate(enrollment.enrollment_date),
        funding: fundingNameById.get(enrollment.funding_type_id) ?? '',
        total,
        paid: enrollmentPaid,
        remaining: total - enrollmentPaid,
        paymentStatus: label(PAYMENT_STATUS_LABELS, enrollment.payment_status),
      })
      pushInvoices(invoices, fullName)
    }

    for (const reservation of reservations) {
      const entity = reservation.external_entities ?? {}
      const invoices = invoicesByReservation.get(reservation.id) ?? []
      const total = displayTotal(invoices, toNumber(reservation.total_amount))
      const reservationPaid = toNumber(reservation.paid_amount)
      reservationsTotal += total
      paid += reservationPaid
      reservationRows.push({
        ...ref,
        company: entity.name ?? '',
        siret: entity.siret ?? '',
        contact: `${entity.contact_first_name ?? ''} ${entity.contact_last_name ?? ''}`.trim(),
        email: entity.contact_email || entity.email || '',
        phone: entity.contact_phone || entity.phone || '',
        address: entity.address ?? '',
        postalCode: entity.postal_code ?? '',
        city: entity.city ?? '',
        status: label(ENROLLMENT_STATUS_LABELS, reservation.status),
        enrollmentDate: toExcelDate(reservation.enrollment_date),
        expectedCount: toNumber(reservation.expected_count),
        billingMode: label(BILLING_MODE_LABELS, reservation.billing_mode),
        billingQuantity: reservation.billing_quantity ?? '',
        funding: fundingNameById.get(reservation.funding_type_id) ?? '',
        total,
        paid: reservationPaid,
        remaining: total - reservationPaid,
        paymentStatus: label(PAYMENT_STATUS_LABELS, reservation.payment_status),
        notes: reservation.notes ?? '',
      })
      pushInvoices(invoices, entity.name ?? '')
    }

    for (const st of sessionTeachers) {
      teacherRows.push({
        ...ref,
        teacher: userName(st.teacher_id),
        email: typeof st.teacher_id === 'string' ? userById.get(st.teacher_id)?.email ?? '' : '',
        role: st.role ?? '',
        primary: yesNo(st.is_primary),
        dailyRate: st.daily_rate ?? '',
        hourlyRate: st.hourly_rate ?? '',
        days: st.intervention_days ?? '',
        hours: st.total_hours ?? '',
        notes: st.notes ?? '',
      })
    }

    for (const slot of slots) {
      slotRows.push({
        ...ref,
        date: toExcelDate(slot.date),
        timeSlot: label(TIME_SLOT_LABELS, slot.time_slot),
        startTime: toTime(slot.start_time),
        endTime: toTime(slot.end_time),
        location: slot.location ?? session.location ?? '',
        teacher: userName(slot.teacher_id),
        notes: slot.notes ?? '',
      })
    }

    for (const sessionModule of modules) {
      moduleRows.push({ ...ref, module: sessionModule.name ?? '', amount: toNumber(sessionModule.amount), currency: sessionModule.currency ?? '' })
    }

    for (const charge of charges) {
      chargeRows.push({
        ...ref,
        chargeDate: toExcelDate(charge.charge_date),
        description: charge.description ?? '',
        amount: toNumber(charge.amount),
        currency: charge.currency ?? '',
        vendor: charge.vendor ?? '',
        vendorInvoice: charge.vendor_invoice_number ?? '',
        vendorInvoiceDate: toExcelDate(charge.vendor_invoice_date),
        paymentMethod: charge.payment_method ?? '',
        paymentStatus: label(PAYMENT_STATUS_LABELS, charge.payment_status),
        paidAt: toExcelDate(charge.paid_at),
        notes: charge.notes ?? '',
      })
    }

    // Les inscriptions annulées ou abandonnées ne comptent pas dans l'effectif ni les places.
    const inactive = ['cancelled', 'dropped']
    const enrolledCount = enrollments.filter((e) => !inactive.includes(e.status)).length
    const reservedCount = reservations
      .filter((r) => !inactive.includes(r.status))
      .reduce((sum, r) => sum + toNumber(r.expected_count), 0)
    const primary = sessionTeachers.find((t) => t.is_primary)?.teacher_id ?? session.teacher_id
    const teacherNames = uniqueIds([...sessionTeachers.map((t) => t.teacher_id), session.teacher_id])
      .map(userName)
      .filter(Boolean)
    const total = enrollmentsTotal + reservationsTotal

    sessionRows.push({
      name: session.name ?? '',
      formationCode: session.formations?.code ?? '',
      formation: session.formations?.name ?? '',
      program: session.formations?.programs?.name ?? '',
      status: label(SESSION_STATUS_LABELS, session.status),
      archived: yesNo(session.archived_at),
      startDate: toExcelDate(session.start_date),
      endDate: toExcelDate(session.end_date),
      startTime: toTime(session.start_time),
      endTime: toTime(session.end_time),
      examDate: toExcelDate(session.exam_date),
      location: session.location ?? '',
      capacity: session.capacity_max ?? '',
      enrolledCount,
      reservedCount,
      remainingSeats: session.capacity_max != null ? session.capacity_max - enrolledCount - reservedCount : '',
      primaryTeacher: userName(primary),
      teachers: teacherNames.join(', '),
      slotCount: slots.length,
      enrollmentsTotal,
      reservationsTotal,
      total,
      paid,
      remaining: total - paid,
      chargesTotal: charges.reduce((sum, c) => sum + toNumber(c.amount), 0),
      currency: session.formations?.currency ?? modules[0]?.currency ?? '',
    })
  }

  return [
    { sheetName: 'Sessions', columns: SESSION_COLUMNS, data: sessionRows },
    {
      sheetName: 'Apprenants',
      columns: [
        ...SESSION_REF_COLUMNS,
        { header: 'N° apprenant', key: 'number', width: 14 },
        { header: 'Nom', key: 'lastName', width: 20 },
        { header: 'Prénom', key: 'firstName', width: 20 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Téléphone', key: 'phone', width: 16 },
        date('Date de naissance', 'birthDate'),
        { header: 'Adresse', key: 'address', width: 30 },
        { header: 'Code postal', key: 'postalCode', width: 12 },
        { header: 'Ville', key: 'city', width: 20 },
        { header: 'Entreprise', key: 'company', width: 26 },
        { header: 'Statut', key: 'status', width: 12 },
        date("Date d'inscription", 'enrollmentDate'),
        { header: 'Financement', key: 'funding', width: 22 },
        money('Montant', 'total'),
        money('Payé', 'paid'),
        money('Reste à payer', 'remaining'),
        { header: 'Statut paiement', key: 'paymentStatus', width: 15 },
      ],
      data: enrollmentRows,
    },
    {
      sheetName: 'Entreprises',
      columns: [
        ...SESSION_REF_COLUMNS,
        { header: 'Entreprise', key: 'company', width: 28 },
        { header: 'SIRET', key: 'siret', width: 17 },
        { header: 'Contact', key: 'contact', width: 24 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Téléphone', key: 'phone', width: 16 },
        { header: 'Adresse', key: 'address', width: 30 },
        { header: 'Code postal', key: 'postalCode', width: 12 },
        { header: 'Ville', key: 'city', width: 20 },
        { header: 'Statut', key: 'status', width: 12 },
        date("Date d'inscription", 'enrollmentDate'),
        { header: 'Effectif', key: 'expectedCount', width: 10 },
        { header: 'Mode de facturation', key: 'billingMode', width: 18 },
        { header: 'Quantité facturée', key: 'billingQuantity', width: 16 },
        { header: 'Financement', key: 'funding', width: 22 },
        money('Montant', 'total'),
        money('Payé', 'paid'),
        money('Reste à payer', 'remaining'),
        { header: 'Statut paiement', key: 'paymentStatus', width: 15 },
        { header: 'Notes', key: 'notes', width: 30 },
      ],
      data: reservationRows,
    },
    {
      sheetName: 'Intervenants',
      columns: [
        ...SESSION_REF_COLUMNS,
        { header: 'Intervenant', key: 'teacher', width: 26 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Rôle', key: 'role', width: 14 },
        { header: 'Principal', key: 'primary', width: 10 },
        money('Tarif journalier', 'dailyRate'),
        money('Tarif horaire', 'hourlyRate'),
        { header: "Jours d'intervention", key: 'days', width: 18 },
        { header: 'Heures', key: 'hours', width: 10 },
        { header: 'Notes', key: 'notes', width: 30 },
      ],
      data: teacherRows,
    },
    {
      sheetName: 'Séances',
      columns: [
        ...SESSION_REF_COLUMNS,
        date('Date', 'date'),
        { header: 'Créneau', key: 'timeSlot', width: 12 },
        { header: 'Heure début', key: 'startTime', width: 12 },
        { header: 'Heure fin', key: 'endTime', width: 12 },
        { header: 'Lieu', key: 'location', width: 26 },
        { header: 'Formateur', key: 'teacher', width: 26 },
        { header: 'Notes', key: 'notes', width: 30 },
      ],
      data: slotRows,
    },
    {
      sheetName: 'Tarifs',
      columns: [
        ...SESSION_REF_COLUMNS,
        { header: 'Module', key: 'module', width: 34 },
        money('Montant', 'amount'),
        { header: 'Devise', key: 'currency', width: 9 },
      ],
      data: moduleRows,
    },
    {
      sheetName: 'Factures et devis',
      columns: [
        ...SESSION_REF_COLUMNS,
        { header: 'Numéro', key: 'number', width: 18 },
        { header: 'Type', key: 'type', width: 10 },
        { header: 'Client', key: 'client', width: 28 },
        date("Date d'émission", 'issueDate'),
        date('Échéance', 'dueDate'),
        money('Montant HT', 'amount'),
        money('TVA', 'tax'),
        money('Total', 'total'),
        money('Payé', 'paid'),
        money('Reste à payer', 'remaining'),
        { header: 'Devise', key: 'currency', width: 9 },
        { header: 'Statut', key: 'status', width: 12 },
      ],
      data: invoiceRows,
    },
    {
      sheetName: 'Charges',
      columns: [
        ...SESSION_REF_COLUMNS,
        date('Date', 'chargeDate'),
        { header: 'Description', key: 'description', width: 34 },
        money('Montant', 'amount'),
        { header: 'Devise', key: 'currency', width: 9 },
        { header: 'Fournisseur', key: 'vendor', width: 24 },
        { header: 'N° facture fournisseur', key: 'vendorInvoice', width: 20 },
        date('Date facture', 'vendorInvoiceDate'),
        { header: 'Moyen de paiement', key: 'paymentMethod', width: 17 },
        { header: 'Statut paiement', key: 'paymentStatus', width: 15 },
        date('Payée le', 'paidAt'),
        { header: 'Notes', key: 'notes', width: 30 },
      ],
      data: chargeRows,
    },
  ]
}

/**
 * Télécharge le classeur pour les sessions données et renvoie leur nombre.
 * Toute erreur de chargement interrompt l'export : un fichier partiel ferait
 * passer des données manquantes pour des montants à zéro.
 */
export async function exportSessionsToExcel(
  supabase: SupabaseClient<any>,
  sessions: Row[],
  context: { organizationId: string; userId?: string }
): Promise<number> {
  if (sessions.length === 0) throw new Error('Aucune session à exporter')

  const data = await fetchSessionsExportData(
    supabase,
    sessions.map((s) => s.id),
    uniqueIds(sessions.map((s) => s.teacher_id))
  )
  const filename = `sessions_${new Date().toISOString().split('T')[0]}.xlsx`
  await exportSheetsToExcel(filename, buildSessionsSheets(sessions, data))
  analytics.export.excel('Sessions', sessions.length)

  if (context.userId) {
    // L'historique est optionnel : il ne doit jamais faire échouer l'export
    try {
      await exportHistoryService.create({
        organizationId: context.organizationId,
        userId: context.userId,
        exportType: 'excel',
        entityType: 'other',
        filename,
        recordCount: sessions.length,
      })
    } catch (error) {
      logger.debug("Erreur lors de l'enregistrement de l'historique d'export", sanitizeError(error))
    }
  }

  return sessions.length
}
