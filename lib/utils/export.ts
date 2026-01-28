/**
 * Utilitaires pour l'export de données (Excel, CSV)
 */

import { exportToExcel as excelJSExport, exportToCSV as csvExport } from './excel-export'
import { formatDate } from './format'
import { analytics } from './analytics'
import { exportHistoryService } from '@/lib/services/export-history.service'
import { logger } from '@/lib/utils/logger'

export type ExportFormat = 'xlsx' | 'csv'

export interface ExportOptions {
  filename?: string
  sheetName?: string
  format?: ExportFormat
}

/**
 * Exporte des données vers Excel ou CSV
 * 
 * @param data - Données à exporter
 * @param options - Options d'export (filename, sheetName, format, entityType, organizationId, userId)
 */
export async function exportData<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions & {
    entityType?: 'students' | 'documents' | 'payments' | 'other'
    organizationId?: string
    userId?: string
  } = {}
): Promise<void> {
  if (!data || data.length === 0) {
    throw new Error('Aucune donnée à exporter')
  }

  const {
    filename = `export_${new Date().toISOString().split('T')[0]}`,
    sheetName = 'Données',
    format = 'xlsx',
    entityType = 'other',
    organizationId,
    userId,
  } = options

  const fullFilename = `${filename}.${format === 'csv' ? 'csv' : 'xlsx'}`

  if (format === 'csv') {
    csvExport(fullFilename, data)
    analytics.export.csv(sheetName, data.length)
  } else {
    // Convertir les données en format avec colonnes définies
    const columns = Object.keys(data[0] || {}).map((key) => ({
      header: key,
      key,
      width: 20,
    }))
    await excelJSExport({
      filename: fullFilename,
      sheetName,
      columns,
      data,
    })
    analytics.export.excel(sheetName, data.length)
  }

  // Enregistrer dans l'historique si organizationId et userId sont fournis
  // Note: L'historique est optionnel - si la table n'existe pas, on ignore silencieusement
  if (organizationId && userId) {
    try {
      const result = await exportHistoryService.create({
        organizationId,
        userId,
        exportType: format === 'csv' ? 'csv' : 'excel',
        entityType: entityType || 'other',
        filename: fullFilename,
        recordCount: data.length,
      })
      // Si result est null, la table n'existe pas - c'est OK, on continue
    } catch (error: any) {
      // Ne pas bloquer l'export si l'enregistrement de l'historique échoue
      // Le service gère déjà les erreurs de table manquante, mais on garde cette sécurité
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        // Table n'existe pas encore - ignorer silencieusement
        return
      }
      // Pour les autres erreurs, logger en mode debug uniquement
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Erreur lors de l\'enregistrement de l\'historique d\'export:', error)
      }
    }
  }
}

// Les fonctions exportToExcel et exportToCSV sont maintenant importées depuis excel-export.ts

/**
 * Prépare les données d'étudiants pour l'export
 */
export function prepareStudentsExport(students: any[]) {
  return students.map((student) => ({
    'Numéro': student.student_number || '',
    'Prénom': student.first_name || '',
    'Nom': student.last_name || '',
    'Email': student.email || '',
    'Téléphone': student.phone || '',
    'Date de naissance': student.date_of_birth ? formatDate(student.date_of_birth) : '',
    'Statut': student.status === 'active' ? 'Actif' : 'Inactif',
    'Date d\'inscription': student.enrollment_date ? formatDate(student.enrollment_date) : '',
    'Classe': student.classes?.name || '',
    'Niveau': student.classes?.level || '',
  }))
}

/**
 * Prépare les données de documents pour l'export
 */
export function prepareDocumentsExport(documents: any[]) {
  return documents.map((doc) => ({
    'Titre': doc.title || '',
    'Type': doc.type || '',
    'Étudiant': doc.students
      ? `${doc.students.first_name || ''} ${doc.students.last_name || ''}`.trim()
      : '',
    'Date de création': doc.created_at ? formatDate(doc.created_at) : '',
    'URL': doc.file_url || '',
  }))
}

/**
 * Prépare les données de paiements pour l'export
 */
export function preparePaymentsExport(payments: any[]) {
  return payments.map((payment) => ({
    'ID': payment.id || '',
    'Montant': payment.amount || '',
    'Devise': payment.currency || '',
    'Statut': payment.status || '',
    'Méthode': payment.payment_method || '',
    'Date': payment.paid_at ? formatDate(payment.paid_at) : '',
    'Description': payment.description || '',
  }))
}

