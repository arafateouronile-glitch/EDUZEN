/**
 * Service d'export FEC (Fichier des Écritures Comptables)
 * Format standard français pour l'export comptable conforme à la norme fiscale
 */

import { createClient as createServerClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Invoice = TableRow<'invoices'>
type Payment = TableRow<'payments'>

/**
 * Interface pour une écriture comptable au format FEC
 */
export interface FECEntry {
  // Colonnes obligatoires selon la norme FEC
  JournalCode: string // Code journal (ex: "VT" pour Ventes)
  JournalLib: string // Libellé journal
  EcritureNum: string // Numéro d'écriture
  EcritureDate: string // Date d'écriture (format YYYYMMDD)
  CompteNum: string // Numéro de compte comptable
  CompteLib: string // Libellé du compte
  CompAuxNum?: string // Numéro de compte auxiliaire (client/fournisseur)
  CompAuxLib?: string // Libellé compte auxiliaire
  PieceRef?: string // Référence pièce (numéro de facture)
  PieceDate?: string // Date pièce (format YYYYMMDD)
  EcritureLib: string // Libellé écriture
  Debit: string // Montant débit (format avec point décimal)
  Credit: string // Montant crédit (format avec point décimal)
  EcritureLet?: string // Lettrage
  DateLet?: string // Date lettrage (format YYYYMMDD)
  ValidDate?: string // Date de validation (format YYYYMMDD)
  Montantdevise?: string // Montant en devise
  Idevise?: string // Code devise
}

/**
 * Options pour l'export FEC
 */
export interface FECExportOptions {
  organizationId: string
  startDate?: string // Date de début (ISO format)
  endDate?: string // Date de fin (ISO format)
  includePayments?: boolean // Inclure les paiements
  journalCode?: string // Code journal par défaut
}

/**
 * Service d'export FEC
 * Client Supabase créé à la demande pour éviter d'exiger les env vars au build (Collecting page data).
 */
export class FECExportService {
  private _supabase: ReturnType<typeof createServerClient<Database>> | null = null

  private getSupabase(): ReturnType<typeof createServerClient<Database>> {
    if (!this._supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) throw new Error('supabaseUrl is required')
      this._supabase = createServerClient<Database>(url, key)
    }
    return this._supabase
  }

  /**
   * Génère le fichier FEC au format texte
   */
  async generateFEC(options: FECExportOptions): Promise<string> {
    const entries = await this.getAccountingEntries(options)
    
    // En-tête avec les colonnes (format FEC standard)
    const headers = [
      'JournalCode',
      'JournalLib',
      'EcritureNum',
      'EcritureDate',
      'CompteNum',
      'CompteLib',
      'CompAuxNum',
      'CompAuxLib',
      'PieceRef',
      'PieceDate',
      'EcritureLib',
      'Debit',
      'Credit',
      'EcritureLet',
      'DateLet',
      'ValidDate',
      'Montantdevise',
      'Idevise',
    ]

    // Convertir les entrées en lignes de texte (séparées par |)
    const lines = entries.map((entry) => {
      return [
        entry.JournalCode || '',
        entry.JournalLib || '',
        entry.EcritureNum || '',
        entry.EcritureDate || '',
        entry.CompteNum || '',
        entry.CompteLib || '',
        entry.CompAuxNum || '',
        entry.CompAuxLib || '',
        entry.PieceRef || '',
        entry.PieceDate || '',
        entry.EcritureLib || '',
        entry.Debit || '0.00',
        entry.Credit || '0.00',
        entry.EcritureLet || '',
        entry.DateLet || '',
        entry.ValidDate || '',
        entry.Montantdevise || '',
        entry.Idevise || '',
      ].join('|')
    })

    // Retourner le fichier complet (en-tête + données)
    return [headers.join('|'), ...lines].join('\n')
  }

  /**
   * Récupère les écritures comptables depuis les factures et paiements
   */
  private async getAccountingEntries(options: FECExportOptions): Promise<FECEntry[]> {
    const entries: FECEntry[] = []

    // Récupérer les factures
    let invoicesQuery = this.getSupabase()
      .from('invoices')
      .select('*, students(id, first_name, last_name, student_number)')
      .eq('organization_id', options.organizationId)
      .eq('document_type', 'invoice') // Seulement les factures, pas les devis
      .order('issue_date', { ascending: true })

    if (options.startDate) {
      invoicesQuery = invoicesQuery.gte('issue_date', options.startDate)
    }
    if (options.endDate) {
      invoicesQuery = invoicesQuery.lte('issue_date', options.endDate)
    }

    const { data: invoices, error: invoicesError } = await invoicesQuery

    if (invoicesError) {
      throw new Error(`Erreur lors de la récupération des factures: ${invoicesError.message}`)
    }

    // Convertir les factures en écritures comptables
    for (const invoice of invoices || []) {
      const invoiceDate = invoice.issue_date ? new Date(invoice.issue_date) : new Date(invoice.created_at || new Date().toISOString())
      const formattedDate = this.formatDateFEC(invoiceDate)
      const ecritureNum = invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase()

      // Écriture 1 : Débit Client / Crédit Ventes (HT)
      const amountHT = invoice.amount || 0
      const taxAmount = invoice.tax_amount || 0
      const amountTTC = invoice.total_amount || amountHT + taxAmount

      entries.push({
        JournalCode: options.journalCode || 'VT',
        JournalLib: 'Ventes',
        EcritureNum: ecritureNum,
        EcritureDate: formattedDate,
        CompteNum: '411000', // Compte client (à adapter selon le plan comptable)
        CompteLib: 'Clients',
        CompAuxNum: invoice.student_id ? invoice.student_id.slice(0, 10) : undefined,
        CompAuxLib: invoice.students
          ? `${(invoice.students as { first_name?: string; last_name?: string }).first_name || ''} ${(invoice.students as { first_name?: string; last_name?: string }).last_name || ''}`.trim()
          : undefined,
        PieceRef: invoice.invoice_number || '',
        PieceDate: formattedDate,
        EcritureLib: `Facture ${invoice.invoice_number || ecritureNum}`,
        Debit: this.formatAmount(amountTTC),
        Credit: '0.00',
        ValidDate: formattedDate,
        Idevise: invoice.currency || 'EUR',
        Montantdevise: invoice.currency && invoice.currency !== 'EUR' ? this.formatAmount(amountTTC) : undefined,
      })

      // Écriture 2 : Débit Ventes / Crédit Produit des ventes (HT)
      entries.push({
        JournalCode: options.journalCode || 'VT',
        JournalLib: 'Ventes',
        EcritureNum: ecritureNum,
        EcritureDate: formattedDate,
        CompteNum: '701000', // Produits des ventes (à adapter)
        CompteLib: 'Ventes de produits finis',
        PieceRef: invoice.invoice_number || '',
        PieceDate: formattedDate,
        EcritureLib: `Facture ${invoice.invoice_number || ecritureNum}`,
        Debit: '0.00',
        Credit: this.formatAmount(amountHT),
        ValidDate: formattedDate,
        Idevise: invoice.currency || 'EUR',
        Montantdevise: invoice.currency && invoice.currency !== 'EUR' ? this.formatAmount(amountHT) : undefined,
      })

      // Écriture 3 : TVA collectée (si applicable)
      if (taxAmount > 0) {
        entries.push({
          JournalCode: options.journalCode || 'VT',
          JournalLib: 'Ventes',
          EcritureNum: ecritureNum,
          EcritureDate: formattedDate,
          CompteNum: '445710', // TVA collectée (à adapter selon le taux)
          CompteLib: 'TVA collectée',
          PieceRef: invoice.invoice_number || '',
          PieceDate: formattedDate,
          EcritureLib: `TVA Facture ${invoice.invoice_number || ecritureNum}`,
          Debit: '0.00',
          Credit: this.formatAmount(taxAmount),
          ValidDate: formattedDate,
          Idevise: invoice.currency || 'EUR',
          Montantdevise: invoice.currency && invoice.currency !== 'EUR' ? this.formatAmount(taxAmount) : undefined,
        })
      }
    }

    // Récupérer les paiements si demandé
    if (options.includePayments) {
      let paymentsQuery = this.getSupabase()
        .from('payments')
        .select('*, invoices(invoice_number, issue_date, student_id, students(id, first_name, last_name))')
        .eq('organization_id', options.organizationId)
        .eq('status', 'paid') // Seulement les paiements effectués
        .order('paid_at', { ascending: true })

      if (options.startDate) {
        paymentsQuery = paymentsQuery.gte('paid_at', options.startDate)
      }
      if (options.endDate) {
        paymentsQuery = paymentsQuery.lte('paid_at', options.endDate)
      }

      const { data: payments, error: paymentsError } = await paymentsQuery

      if (paymentsError) {
        throw new Error(`Erreur lors de la récupération des paiements: ${paymentsError.message}`)
      }

      // Convertir les paiements en écritures comptables
      for (const payment of payments || []) {
        const paymentDate = payment.paid_at ? new Date(payment.paid_at) : new Date(payment.created_at || new Date().toISOString())
        const formattedDate = this.formatDateFEC(paymentDate)
        const ecritureNum = `PAY-${payment.id.slice(0, 8).toUpperCase()}`
        type InvoiceForFec = { invoice_number?: string; student_id?: string; students?: { first_name?: string; last_name?: string } }
        const invoice = payment.invoices as InvoiceForFec | null

        // Écriture : Débit Banque / Crédit Client
        entries.push({
          JournalCode: options.journalCode || 'BQ',
          JournalLib: 'Banque',
          EcritureNum: ecritureNum,
          EcritureDate: formattedDate,
          CompteNum: '512000', // Compte banque (à adapter)
          CompteLib: 'Banque',
          PieceRef: invoice?.invoice_number || payment.id,
          PieceDate: formattedDate,
          EcritureLib: `Paiement ${invoice?.invoice_number || payment.id}`,
          Debit: this.formatAmount(payment.amount || 0),
          Credit: '0.00',
          ValidDate: formattedDate,
          Idevise: payment.currency || 'EUR',
          Montantdevise: payment.currency && payment.currency !== 'EUR' ? this.formatAmount(payment.amount || 0) : undefined,
        })

        const invoiceData = invoice
        entries.push({
          JournalCode: options.journalCode || 'BQ',
          JournalLib: 'Banque',
          EcritureNum: ecritureNum,
          EcritureDate: formattedDate,
          CompteNum: '411000', // Compte client
          CompteLib: 'Clients',
          CompAuxNum: invoiceData?.student_id ? invoiceData.student_id.slice(0, 10) : undefined,
          CompAuxLib: invoiceData?.students
            ? `${invoiceData.students.first_name || ''} ${invoiceData.students.last_name || ''}`.trim()
            : undefined,
          PieceRef: invoice?.invoice_number || payment.id,
          PieceDate: formattedDate,
          EcritureLib: `Paiement ${invoice?.invoice_number || payment.id}`,
          Debit: '0.00',
          Credit: this.formatAmount(payment.amount || 0),
          ValidDate: formattedDate,
          Idevise: payment.currency || 'EUR',
          Montantdevise: payment.currency && payment.currency !== 'EUR' ? this.formatAmount(payment.amount || 0) : undefined,
        })
      }
    }

    return entries
  }

  /**
   * Formate une date au format FEC (YYYYMMDD)
   */
  private formatDateFEC(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  }

  /**
   * Formate un montant au format FEC (avec point décimal, 2 décimales)
   */
  private formatAmount(amount: number): string {
    return amount.toFixed(2).replace(',', '.')
  }

  /**
   * Génère le nom de fichier FEC selon la norme
   */
  generateFECFilename(organizationId: string, options?: { startDate?: string; endDate?: string }): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    
    let filename = `FEC_${organizationId.slice(0, 8)}_${year}${month}`
    
    if (options?.startDate && options?.endDate) {
      const start = new Date(options.startDate)
      const end = new Date(options.endDate)
      filename += `_${this.formatDateFEC(start)}_${this.formatDateFEC(end)}`
    }
    
    return `${filename}.txt`
  }
}

export const fecExportService = new FECExportService()

