'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { studentService } from '@/lib/services/student.service'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle2, Loader2, Download } from 'lucide-react'
import ExcelJS from 'exceljs'
import { cn } from '@/lib/utils'
import type { FlexibleInsert } from '@/lib/types/supabase-helpers'

interface ImportResult {
  success: number
  errors: Array<{ row: number; message: string; data: any }>
  total: number
}

interface StudentImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Colonnes attendues dans le fichier d'import
 */
const EXPECTED_COLUMNS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'date_of_birth',
  'gender',
  'address',
  'city',
  'postal_code',
] as const

/**
 * Mapping des colonnes françaises vers les colonnes de la base
 */
const COLUMN_MAPPING: Record<string, string> = {
  'Prénom': 'first_name',
  'prénom': 'first_name',
  'Prenom': 'first_name',
  'Nom': 'last_name',
  'nom': 'last_name',
  'Email': 'email',
  'email': 'email',
  'Téléphone': 'phone',
  'téléphone': 'phone',
  'Telephone': 'phone',
  'Date de naissance': 'date_of_birth',
  'date de naissance': 'date_of_birth',
  'Date de naissance (JJ/MM/AAAA)': 'date_of_birth',
  'Genre': 'gender',
  'genre': 'gender',
  'Sexe': 'gender',
  'Adresse': 'address',
  'adresse': 'address',
  'Ville': 'city',
  'ville': 'city',
  'Code postal': 'postal_code',
  'code postal': 'postal_code',
  'Code Postal': 'postal_code',
  'CP': 'postal_code',
  'cp': 'postal_code',
}

/**
 * Parse un fichier Excel (.xlsx)
 */
async function parseExcelFile(file: File): Promise<any[]> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('Le fichier Excel ne contient aucune feuille')
  }

  const rows: any[] = []
  const headerRow = worksheet.getRow(1)
  const headers: string[] = []

  // Lire les en-têtes
  headerRow.eachCell((cell, colNumber) => {
    const header = cell.value?.toString()?.trim() || ''
    // Mapper le header français vers le nom de colonne
    const mappedHeader = COLUMN_MAPPING[header] || header.toLowerCase().replace(/\s+/g, '_')
    headers[colNumber - 1] = mappedHeader
  })

  // Lire les données (à partir de la ligne 2)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // Skip header

    const rowData: any = {}
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1]
      if (header) {
        let value = cell.value?.toString()?.trim() || ''
        // Convertir les dates
        if (header === 'date_of_birth' && value) {
          // Essayer de parser différentes formats de date
          const date = parseDate(value)
          if (date) {
            value = date
          }
        }
        // Convertir le genre
        if (header === 'gender' && value) {
          value = normalizeGender(value)
        }
        rowData[header] = value
      }
    })

    // Ne pas ajouter les lignes vides
    if (Object.keys(rowData).length > 0 && (rowData.first_name || rowData.last_name)) {
      rows.push(rowData)
    }
  })

  return rows
}

/**
 * Parse un fichier CSV
 */
async function parseCSVFile(file: File): Promise<any[]> {
  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('Le fichier CSV doit contenir au moins un en-tête et une ligne de données')
  }

  // Parser la première ligne (en-têtes)
  const headers = parseCSVLine(lines[0]).map(header => {
    const trimmed = header.trim()
    return COLUMN_MAPPING[trimmed] || trimmed.toLowerCase().replace(/\s+/g, '_')
  })

  // Parser les lignes de données
  const rows: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const rowData: any = {}

    headers.forEach((header, index) => {
      if (header) {
        let value = (values[index] || '').trim()
        // Convertir les dates
        if (header === 'date_of_birth' && value) {
          const date = parseDate(value)
          if (date) {
            value = date
          }
        }
        // Convertir le genre
        if (header === 'gender' && value) {
          value = normalizeGender(value)
        }
        rowData[header] = value
      }
    })

    // Ne pas ajouter les lignes vides
    if (Object.keys(rowData).length > 0 && (rowData.first_name || rowData.last_name)) {
      rows.push(rowData)
    }
  }

  return rows
}

/**
 * Parse une ligne CSV en gérant les guillemets
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)

  return result.map(val => val.replace(/^"|"$/g, '').trim())
}

/**
 * Parse une date depuis différents formats
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null

  // Formats supportés: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  ]

  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      if (format === formats[0] || format === formats[2]) {
        // DD/MM/YYYY ou DD-MM-YYYY
        const [, day, month, year] = match
        return `${year}-${month}-${day}`
      } else {
        // YYYY-MM-DD
        return dateStr
      }
    }
  }

  // Essayer de parser avec Date
  const date = new Date(dateStr)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  return null
}

/**
 * Normalise le genre (male/female/other)
 */
function normalizeGender(gender: string): string {
  const normalized = gender.toLowerCase().trim()
  if (normalized === 'm' || normalized === 'masculin' || normalized === 'homme' || normalized === 'h') {
    return 'male'
  }
  if (normalized === 'f' || normalized === 'féminin' || normalized === 'femme' || normalized === 'fem') {
    return 'female'
  }
  return 'other'
}

/**
 * Valide une ligne de données d'étudiant
 */
function validateStudentRow(row: any, rowIndex: number): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!row.first_name || row.first_name.trim() === '') {
    errors.push('Le prénom est requis')
  }
  if (!row.last_name || row.last_name.trim() === '') {
    errors.push('Le nom est requis')
  }
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push('L\'email est invalide')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function StudentImportDialog({ open, onOpenChange }: StudentImportDialogProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isParsing, setIsParsing] = useState(false)

  const importMutation = useMutation({
    mutationFn: async (students: FlexibleInsert<'students'>[]) => {
      if (!user?.organization_id) {
        throw new Error('Organisation non trouvée')
      }

      // Ajouter organization_id et status à chaque étudiant
      const studentsWithOrg = students.map(student => ({
        ...student,
        organization_id: user.organization_id,
        status: 'active' as const,
      }))

      return await studentService.import(user.organization_id, studentsWithOrg)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['students-stats'] })
      
      addToast({
        type: 'success',
        title: 'Import réussi',
        description: `${data.length} étudiant(s) importé(s) avec succès.`,
      })

      // Réinitialiser
      setFile(null)
      setImportResult(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onOpenChange(false)
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur d\'import',
        description: error.message || 'Une erreur est survenue lors de l\'import.',
      })
    },
  })

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')
    const isCSV = selectedFile.name.endsWith('.csv')

    if (!isExcel && !isCSV) {
      addToast({
        type: 'error',
        title: 'Format non supporté',
        description: 'Veuillez sélectionner un fichier Excel (.xlsx, .xls) ou CSV (.csv)',
      })
      return
    }

    setFile(selectedFile)
    setImportResult(null)
    setIsParsing(true)

    try {
      let rows: any[] = []
      if (isExcel) {
        rows = await parseExcelFile(selectedFile)
      } else {
        rows = await parseCSVFile(selectedFile)
      }

      // Valider les lignes
      const validStudents: FlexibleInsert<'students'>[] = []
      const errors: Array<{ row: number; message: string; data: any }> = []

      rows.forEach((row, index) => {
        const validation = validateStudentRow(row, index + 2) // +2 car ligne 1 = header, index 0-based
        if (validation.valid) {
          validStudents.push(row)
        } else {
          errors.push({
            row: index + 2,
            message: validation.errors.join(', '),
            data: row,
          })
        }
      })

      setImportResult({
        success: validStudents.length,
        errors,
        total: rows.length,
      })
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur de parsing',
        description: error instanceof Error ? error.message : 'Impossible de parser le fichier',
      })
      setFile(null)
    } finally {
      setIsParsing(false)
    }
  }

  const handleImport = () => {
    if (!importResult || importResult.success === 0) {
      addToast({
        type: 'warning',
        title: 'Aucune donnée valide',
        description: 'Aucun étudiant valide à importer.',
      })
      return
    }

    // Re-parser le fichier pour obtenir les données valides
    if (!file) return

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    
    setIsParsing(true)
    Promise.resolve()
      .then(async () => {
        const rows = isExcel ? await parseExcelFile(file) : await parseCSVFile(file)
        const validStudents: FlexibleInsert<'students'>[] = []
        
        rows.forEach((row) => {
          const validation = validateStudentRow(row, 0)
          if (validation.valid) {
            validStudents.push(row)
          }
        })

        return validStudents
      })
      .then((students) => {
        importMutation.mutate(students)
      })
      .catch((error) => {
        addToast({
          type: 'error',
          title: 'Erreur',
          description: error.message || 'Une erreur est survenue',
        })
      })
      .finally(() => {
        setIsParsing(false)
      })
  }

  const handleDownloadTemplate = () => {
    // Créer un template Excel avec les colonnes attendues
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Étudiants')

    // En-têtes en français
    const headers = [
      'Prénom',
      'Nom',
      'Email',
      'Téléphone',
      'Date de naissance (JJ/MM/AAAA)',
      'Genre (M/F/Autre)',
      'Adresse',
      'Code postal',
      'Ville',
    ]

    worksheet.addRow(headers)

    // Styliser l'en-tête
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    }

    // Largeur des colonnes
    worksheet.columns.forEach((column, index) => {
      column.width = 20
    })

    // Ajouter une ligne d'exemple
    worksheet.addRow([
      'Jean',
      'Dupont',
      'jean.dupont@example.com',
      '+33 6 12 34 56 78',
      '15/05/2000',
      'M',
      '123 Rue de la République',
      '75001',
      'Paris',
    ])

    // Télécharger
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'template_import_etudiants.xlsx'
      link.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-brand-blue" />
            Importer des étudiants
          </DialogTitle>
          <DialogDescription>
            Importez une liste d'étudiants depuis un fichier Excel (.xlsx) ou CSV (.csv)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Télécharger le template */}
          <div className="flex items-center justify-between p-4 bg-brand-blue-ghost/20 rounded-lg border border-brand-blue/20">
            <div>
              <p className="font-semibold text-sm text-gray-900">Besoin d'un template ?</p>
              <p className="text-xs text-gray-600 mt-1">
                Téléchargez un fichier Excel avec les colonnes pré-remplies
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Télécharger le template
            </Button>
          </div>

          {/* Sélection de fichier */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">Fichier à importer</label>
            <div
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center transition-all',
                file
                  ? 'border-brand-blue bg-brand-blue-ghost/20'
                  : 'border-gray-300 hover:border-brand-blue/50 hover:bg-gray-50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="student-import-file"
              />
              <label
                htmlFor="student-import-file"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-8 w-8 text-brand-blue animate-spin" />
                    <span className="text-sm text-gray-600">Analyse du fichier...</span>
                  </>
                ) : file ? (
                  <>
                    {file.name.endsWith('.csv') ? (
                      <FileText className="h-8 w-8 text-brand-blue" />
                    ) : (
                      <FileSpreadsheet className="h-8 w-8 text-brand-blue" />
                    )}
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        setImportResult(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                    >
                      Changer de fichier
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-semibold text-sm text-gray-900">
                        Cliquez pour sélectionner un fichier
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Formats supportés: .xlsx, .xls, .csv
                      </p>
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Résultats de validation */}
          {importResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {importResult.success} étudiant(s) valide(s) sur {importResult.total}
                  </p>
                  {importResult.errors.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      {importResult.errors.length} erreur(s) détectée(s)
                    </p>
                  )}
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Erreurs de validation
                  </p>
                  {importResult.errors.map((error, index) => (
                    <div
                      key={index}
                      className="p-2 bg-red-50 border border-red-200 rounded text-xs"
                    >
                      <p className="font-semibold text-red-900">Ligne {error.row}</p>
                      <p className="text-red-700 mt-1">{error.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Colonnes attendues */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-900 mb-2">Colonnes attendues :</p>
            <div className="flex flex-wrap gap-2">
              {['Prénom', 'Nom', 'Email', 'Téléphone', 'Date de naissance', 'Genre', 'Adresse', 'Code postal', 'Ville'].map(
                (col) => (
                  <span
                    key={col}
                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                  >
                    {col}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={!importResult || importResult.success === 0 || importMutation.isPending || isParsing}
            className="bg-gradient-to-r from-brand-blue to-brand-cyan"
          >
            {importMutation.isPending || isParsing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importer {importResult?.success || 0} étudiant(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
