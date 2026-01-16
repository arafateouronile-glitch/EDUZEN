/**
 * Utilitaire d'export Excel avec ExcelJS
 * Remplace xlsx (vulnérable) par exceljs (sécurisé)
 */

import ExcelJS from 'exceljs'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
}

export interface ExcelExportOptions {
  filename: string
  sheetName: string
  columns: ExcelColumn[]
  data: Record<string, any>[]
}

/**
 * Exporte des données vers un fichier Excel (.xlsx)
 * @param options Configuration de l'export
 */
export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
  const { filename, sheetName, columns, data } = options

  // Créer un nouveau workbook
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  // Définir les colonnes avec largeurs
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }))

  // Ajouter les données
  worksheet.addRows(data)

  // Styliser l'en-tête
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }, // Indigo-600
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' }
  headerRow.height = 25

  // Bordures pour toutes les cellules
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
    })
  })

  // Générer le fichier et déclencher le téléchargement
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

/**
 * Exporte des données vers CSV
 * @param filename Nom du fichier
 * @param data Données à exporter
 */
export function exportToCSV(filename: string, data: Record<string, any>[]): void {
  if (!data || data.length === 0) {
    throw new Error('Aucune donnée à exporter')
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header]
          if (
            typeof value === 'string' &&
            (value.includes(',') || value.includes('"') || value.includes('\n'))
          ) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value ?? ''
        })
        .join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}
