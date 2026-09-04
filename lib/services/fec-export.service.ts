/**
 * Service d'export FEC (Fichier des Écritures Comptables)
 * Format standard français pour l'export comptable conforme à la norme fiscale
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { buildSaleLines, resolveSaleTiers } from '@/lib/services/accounting/sale-lines'

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
 * Utilise le client admin (clé service, bypass RLS) : la route appelante
 * (/api/accounting/fec-export) authentifie déjà l'utilisateur et vérifie son
 * rôle avant d'appeler ce service — avec un client anon sans session, les
 * policies RLS bloquaient silencieusement toutes les lignes (export toujours
 * vide, sans erreur).
 */
export class FECExportService {
  private _supabase: ReturnType<typeof createAdminClient> | null = null

  private getSupabase(): ReturnType<typeof createAdminClient> {
    if (!this._supabase) {
      this._supabase = createAdminClient()
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
   * Récupère les écritures comptables depuis les factures, avoirs et paiements
   */
  private async getAccountingEntries(options: FECExportOptions): Promise<FECEntry[]> {
    const entries: FECEntry[] = []
    // Numéro d'écriture séquentiel unique sur l'ensemble du fichier (attendu
    // par la norme FEC) — les deux/trois lignes d'une même facture partagent
    // le même numéro, PieceRef reste le vrai numéro de facture/avoir.
    let ecritureCounter = 1
    const nextEcritureNum = () => String(ecritureCounter++).padStart(6, '0')

    // Récupérer les factures ET les avoirs (un avoir omis fausserait l'export)
    let invoicesQuery = this.getSupabase()
      .from('invoices')
      .select('*, students(id, first_name, last_name, student_number), external_entities(id, name)')
      .eq('organization_id', options.organizationId)
      .in('document_type', ['invoice', 'credit_note']) // Factures + avoirs, pas les devis
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

    // Convertir les factures/avoirs en écritures comptables.
    // La logique de ventilation (411 débit TTC / 701 crédit HT / 445 crédit TVA,
    // inversée pour un avoir) est partagée avec le connecteur Fulll via
    // `buildSaleLines` — voir lib/services/accounting/sale-lines.ts.
    for (const invoice of invoices || []) {
      const invoiceDate = invoice.issue_date ? new Date(invoice.issue_date) : new Date(invoice.created_at || new Date().toISOString())
      const formattedDate = this.formatDateFEC(invoiceDate)
      const ecritureNum = nextEcritureNum()

      const student = invoice.students as { id?: string; first_name?: string | null; last_name?: string | null; student_number?: string | null } | null
      const entity = invoice.external_entities as { id?: string; name?: string | null } | null

      const saleLines = buildSaleLines(
        {
          documentType: invoice.document_type === 'credit_note' ? 'credit_note' : 'invoice',
          // Libellé d'écriture : numéro de pièce, sinon numéro d'écriture séquentiel
          invoiceNumber: invoice.invoice_number || ecritureNum,
          amountHT: invoice.amount || 0,
          taxAmount: invoice.tax_amount,
          totalTTC: invoice.total_amount || null,
          currency: invoice.currency,
          tiers: resolveSaleTiers(student, entity),
        },
        { journalCode: options.journalCode || 'VT' }
      )

      for (const line of saleLines) {
        const lineAmount = line.debit || line.credit
        entries.push({
          JournalCode: line.journalCode,
          JournalLib: line.journalLabel,
          EcritureNum: ecritureNum,
          EcritureDate: formattedDate,
          CompteNum: line.account,
          CompteLib: line.accountLabel,
          CompAuxNum: line.auxAccount,
          CompAuxLib: line.auxAccountLabel,
          PieceRef: invoice.invoice_number || '',
          PieceDate: formattedDate,
          EcritureLib: line.label,
          Debit: this.formatAmount(line.debit),
          Credit: this.formatAmount(line.credit),
          ValidDate: formattedDate,
          Idevise: invoice.currency || 'EUR',
          Montantdevise: invoice.currency && invoice.currency !== 'EUR' ? this.formatAmount(lineAmount) : undefined,
        })
      }
    }

    // Récupérer les paiements si demandé
    if (options.includePayments) {
      let paymentsQuery = this.getSupabase()
        .from('payments')
        .select('*, invoices(invoice_number, issue_date, student_id, entity_id, students(id, first_name, last_name, student_number), external_entities(id, name))')
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
        const ecritureNum = nextEcritureNum()
        type InvoiceForFec = {
          invoice_number?: string
          student_id?: string
          students?: { id?: string; first_name?: string | null; last_name?: string | null; student_number?: string | null }
          external_entities?: { id?: string; name?: string | null }
        }
        const invoice = payment.invoices as InvoiceForFec | null
        const tiers = resolveSaleTiers(invoice?.students, invoice?.external_entities)

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

        entries.push({
          JournalCode: options.journalCode || 'BQ',
          JournalLib: 'Banque',
          EcritureNum: ecritureNum,
          EcritureDate: formattedDate,
          CompteNum: '411000', // Compte client
          CompteLib: 'Clients',
          CompAuxNum: tiers.num,
          CompAuxLib: tiers.lib,
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

