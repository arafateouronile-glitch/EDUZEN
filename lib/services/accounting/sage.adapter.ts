/**
 * Adapter pour Sage
 * TODO: Implémenter l'intégration Sage
 */

import type { AccountingAdapter, AccountingConfig, InvoiceData, PaymentData, ExpenseData, SyncResult } from './accounting.types'

export class SageAdapter implements AccountingAdapter {
  async authenticate(config: AccountingConfig, authCode?: string): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
    throw new Error('Sage adapter n\'est pas encore implémenté')
  }

  async refreshToken(config: AccountingConfig): Promise<{ access_token: string; refresh_token?: string; expires_in?: number }> {
    throw new Error('Sage adapter n\'est pas encore implémenté')
  }

  async getCompanyInfo(config: AccountingConfig): Promise<{ company_id: string; company_name: string; data?: Record<string, unknown> }> {
    throw new Error('Sage adapter n\'est pas encore implémenté')
  }

  async syncInvoice(config: AccountingConfig, invoiceData: InvoiceData): Promise<{ external_id: string; data?: Record<string, unknown> }> {
    throw new Error('Sage adapter n\'est pas encore implémenté')
  }

  async syncPayment(config: AccountingConfig, paymentData: PaymentData): Promise<{ external_id: string; data?: Record<string, unknown> }> {
    throw new Error('Sage adapter n\'est pas encore implémenté')
  }

  async syncExpense(config: AccountingConfig, expenseData: ExpenseData): Promise<{ external_id: string; data?: Record<string, unknown> }> {
    throw new Error('Sage adapter n\'est pas encore implémenté')
  }

  async syncBatch(config: AccountingConfig, data: { invoices?: InvoiceData[]; payments?: PaymentData[]; expenses?: ExpenseData[] }): Promise<SyncResult> {
    throw new Error('Sage adapter n\'est pas encore implémenté')
  }
}
