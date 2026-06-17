'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
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

interface ImportResult {
  success: number
  errors: Array<{ row: number; message: string }>
  total: number
}

interface EntityImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ENTITY_COLUMNS = [
  'name',
  'type',
  'email',
  'phone',
  'address',
  'city',
  'postal_code',
  'country',
  'siret',
  'siren',
  'vat_number',
  'legal_form',
  'website',
  'activity_sector',
  'employee_count',
  'contact_first_name',
  'contact_last_name',
  'contact_email',
  'contact_phone',
  'contact_job_title',
] as const

const COLUMN_MAPPING: Record<string, string> = {
  'Nom': 'name',
  'nom': 'name',
  'Raison sociale': 'name',
  'Type': 'type',
  'type': 'type',
  'Email': 'email',
  'email': 'email',
  'Téléphone': 'phone',
  'téléphone': 'phone',
  'Telephone': 'phone',
  'Tel': 'phone',
  'Adresse': 'address',
  'adresse': 'address',
  'Ville': 'city',
  'ville': 'city',
  'Code postal': 'postal_code',
  'code postal': 'postal_code',
  'Code Postal': 'postal_code',
  'CP': 'postal_code',
  'Pays': 'country',
  'pays': 'country',
  'SIRET': 'siret',
  'siret': 'siret',
  'SIREN': 'siren',
  'siren': 'siren',
  'N° TVA': 'vat_number',
  'TVA': 'vat_number',
  'Numéro TVA': 'vat_number',
  'Forme juridique': 'legal_form',
  'forme juridique': 'legal_form',
  'Site web': 'website',
  'site web': 'website',
  'Website': 'website',
  'Secteur': 'activity_sector',
  'secteur': 'activity_sector',
  "Secteur d'activité": 'activity_sector',
  'Effectif': 'employee_count',
  'effectif': 'employee_count',
  'Nombre de salariés': 'employee_count',
  'Contact prénom': 'contact_first_name',
  'Contact Prénom': 'contact_first_name',
  'Prénom contact': 'contact_first_name',
  'Contact nom': 'contact_last_name',
  'Contact Nom': 'contact_last_name',
  'Nom contact': 'contact_last_name',
  'Contact email': 'contact_email',
  'Email contact': 'contact_email',
  'Contact téléphone': 'contact_phone',
  'Téléphone contact': 'contact_phone',
  'Contact poste': 'contact_job_title',
  'Poste contact': 'contact_job_title',
  'Fonction': 'contact_job_title',
}

const KNOWN_FIELDS = new Set<string>(ENTITY_COLUMNS)

function normalizeType(value: string): string {
  const v = value.toLowerCase().trim()
  if (v === 'entreprise' || v === 'company' || v === 'société' || v === 'societe') return 'company'
  if (v === 'organisme' || v === 'organization' || v === 'organisation') return 'organization'
  if (v === 'établissement' || v === 'etablissement' || v === 'institution') return 'institution'
  if (v === 'partenaire' || v === 'partner') return 'partner'
  return 'other'
}

async function parseExcelFile(file: File): Promise<any[]> {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) throw new Error('Le fichier Excel ne contient aucune feuille')

  const rows: any[] = []
  const headerRow = worksheet.getRow(1)
  const headers: string[] = []

  headerRow.eachCell((cell, colNumber) => {
    const header = cell.value?.toString()?.trim() || ''
    const mapped = COLUMN_MAPPING[header] || header.toLowerCase().replace(/\s+/g, '_')
    headers[colNumber - 1] = KNOWN_FIELDS.has(mapped) ? mapped : ''
  })

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const rowData: any = {}
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1]
      if (header) {
        let value = cell.value?.toString()?.trim() || ''
        if (header === 'type' && value) value = normalizeType(value)
        if (header === 'postal_code' && value) value = value.replace(/\s+/g, '').slice(0, 10)
        if (value !== '') rowData[header] = value
      }
    })
    if (rowData.name) rows.push(rowData)
  })

  return rows
}

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

async function parseCSVFile(file: File): Promise<any[]> {
  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length < 2) throw new Error('Le fichier CSV doit contenir au moins un en-tête et une ligne de données')

  const headers = parseCSVLine(lines[0]).map(header => {
    const trimmed = header.trim()
    const mapped = COLUMN_MAPPING[trimmed] || trimmed.toLowerCase().replace(/\s+/g, '_')
    return KNOWN_FIELDS.has(mapped) ? mapped : ''
  })

  const rows: any[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const rowData: any = {}
    headers.forEach((header, index) => {
      if (header) {
        let value = (values[index] || '').trim()
        if (header === 'type' && value) value = normalizeType(value)
        if (header === 'postal_code' && value) value = value.replace(/\s+/g, '').slice(0, 10)
        if (value !== '') rowData[header] = value
      }
    })
    if (rowData.name) rows.push(rowData)
  }
  return rows
}

export function EntityImportDialog({ open, onOpenChange }: EntityImportDialogProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [isParsing, setIsParsing] = useState(false)

  const importMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')
      const payload = rows.map(row => ({
        ...row,
        organization_id: user.organization_id,
        type: row.type || 'company',
        is_active: true,
      }))
      const { data, error } = await supabase
        .from('external_entities')
        .insert(payload)
        .select()
      if (error) throw new Error(error.message)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['external-entities'] })
      addToast({
        type: 'success',
        title: 'Import réussi',
        description: `${data?.length || 0} entité(s) importée(s) avec succès.`,
      })
      setFile(null)
      setImportResult(null)
      setParsedRows([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      onOpenChange(false)
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: "Erreur d'import",
        description: error.message || 'Une erreur est survenue.',
      })
    },
  })

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')
    const isCSV = selectedFile.name.endsWith('.csv')

    if (!isExcel && !isCSV) {
      addToast({ type: 'error', title: 'Format non supporté', description: 'Fichier Excel (.xlsx) ou CSV (.csv) requis' })
      return
    }

    setFile(selectedFile)
    setImportResult(null)
    setParsedRows([])
    setIsParsing(true)

    try {
      const rows = isExcel ? await parseExcelFile(selectedFile) : await parseCSVFile(selectedFile)
      const errors: Array<{ row: number; message: string }> = []
      const valid: any[] = []

      rows.forEach((row, index) => {
        if (!row.name || row.name.trim() === '') {
          errors.push({ row: index + 2, message: 'Le nom est requis' })
        } else {
          valid.push(row)
        }
      })

      setParsedRows(valid)
      setImportResult({ success: valid.length, errors, total: rows.length })
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur de parsing', description: error instanceof Error ? error.message : 'Impossible de lire le fichier' })
      setFile(null)
    } finally {
      setIsParsing(false)
    }
  }

  const handleDownloadTemplate = () => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Entités')

    const headers = [
      'Nom', 'Type', 'Email', 'Téléphone', 'Adresse', 'Ville', 'Code postal',
      'Pays', 'SIRET', 'SIREN', 'N° TVA', 'Forme juridique', 'Site web',
      "Secteur d'activité", 'Effectif',
      'Contact prénom', 'Contact nom', 'Contact email', 'Contact téléphone', 'Contact poste',
    ]

    worksheet.addRow(headers)
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
    worksheet.columns.forEach(col => { col.width = 20 })

    worksheet.addRow([
      'Acme Corp', 'Entreprise', 'contact@acme.fr', '+33 1 23 45 67 89',
      '10 rue de la Paix', 'Paris', '75001', 'France',
      '12345678901234', '123456789', 'FR12345678901', 'SAS', 'https://acme.fr',
      'Informatique', '50-100',
      'Marie', 'Dupont', 'marie@acme.fr', '+33 6 12 34 56 78', 'DRH',
    ])

    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'template_import_entites.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    })
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setFile(null)
      setImportResult(null)
      setParsedRows([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-brand-blue" />
            Importer des entreprises
          </DialogTitle>
          <DialogDescription>
            Importez une liste d'entreprises/organismes depuis un fichier Excel (.xlsx) ou CSV (.csv)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template */}
          <div className="flex items-center justify-between p-4 bg-brand-blue-ghost/20 rounded-lg border border-brand-blue/20">
            <div>
              <p className="font-semibold text-sm text-gray-900">Besoin d'un template ?</p>
              <p className="text-xs text-gray-600 mt-1">Téléchargez un fichier Excel avec les colonnes pré-remplies</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger le template
            </Button>
          </div>

          {/* Sélection fichier */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900">Fichier à importer</label>
            <div className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-all',
              file ? 'border-brand-blue bg-brand-blue-ghost/20' : 'border-gray-300 hover:border-brand-blue/50 hover:bg-gray-50'
            )}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="entity-import-file"
              />
              <label htmlFor="entity-import-file" className="cursor-pointer flex flex-col items-center gap-3">
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
                      <p className="text-xs text-gray-600 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        setImportResult(null)
                        setParsedRows([])
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    >
                      Changer de fichier
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-semibold text-sm text-gray-900">Cliquez pour sélectionner un fichier</p>
                      <p className="text-xs text-gray-600 mt-1">Formats supportés : .xlsx, .xls, .csv</p>
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
                    {importResult.success} entité(s) valide(s) sur {importResult.total}
                  </p>
                  {importResult.errors.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">{importResult.errors.length} erreur(s) détectée(s)</p>
                  )}
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-2">
                  <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Erreurs de validation
                  </p>
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <p className="font-semibold text-red-900">Ligne {error.row}</p>
                      <p className="text-red-700 mt-1">{error.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Types acceptés */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-semibold text-gray-900 mb-2">Valeurs acceptées pour le champ Type :</p>
            <div className="flex flex-wrap gap-2">
              {['Entreprise', 'Organisme', 'Établissement', 'Partenaire', 'Autre'].map(t => (
                <span key={t} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700">{t}</span>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Annuler</Button>
          <Button
            onClick={() => importMutation.mutate(parsedRows)}
            disabled={!importResult || importResult.success === 0 || importMutation.isPending || isParsing}
            className="bg-gradient-to-r from-brand-blue to-brand-cyan"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importer {importResult?.success || 0} entité(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
