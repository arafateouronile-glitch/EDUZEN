'use client'

import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { importService, type ImportMapping, type ImportResult } from '@/lib/services/import.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

type ImportStep = 'upload' | 'mapping' | 'validation' | 'result'

export function ImportAssistant() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [step, setStep] = useState<ImportStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, any>[]>([])
  const [mapping, setMapping] = useState<ImportMapping[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Parse le fichier
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    try {
      const { headers: fileHeaders, rows: fileRows } = await importService.parseFile(selectedFile)
      
      setHeaders(fileHeaders)
      setRows(fileRows)

      // Détecter automatiquement le mapping
      const detectedMapping = importService.detectColumnMapping(fileHeaders)
      setMapping(detectedMapping)

      setStep('mapping')
    } catch (error) {
      logger.error('Erreur parsing fichier', error)
      addToast({
        title: 'Erreur',
        description: 'Impossible de lire le fichier. Vérifiez le format (CSV).',
        type: 'error',
      })
    }
  }

  // Mise à jour du mapping
  const updateMapping = (sourceColumn: string, targetField: keyof import('@/lib/services/import.service').StudentImportRow | '') => {
    setMapping((prev) =>
      prev.map((m) =>
        m.sourceColumn === sourceColumn
          ? { ...m, targetField: targetField as any, confidence: targetField ? 1 : 0 }
          : m
      )
    )
  }

  // Validation
  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')

      // Filtrer les mappings valides
      const validMapping = mapping.filter((m) => m.targetField)

      const result = await importService.importStudents(
        user.organization_id,
        rows,
        validMapping
      )

      setImportResult(result)
      setStep('result')

      return result
    },
    onSuccess: (result) => {
      if (result.success && result.importedRows > 0) {
        addToast({
          title: 'Import réussi',
          description: `${result.importedRows} stagiaires importés avec succès`,
          type: 'success',
        })
      } else if (result.errors.length > 0) {
        addToast({
          title: 'Import partiel',
          description: `${result.importedRows} importés, ${result.errors.length} erreurs détectées`,
          type: 'warning',
        })
      }
    },
    onError: (error) => {
      logger.error('Erreur import', error)
      addToast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'import',
        type: 'error',
      })
    },
  })

  const handleValidate = () => {
    setStep('validation')
    validateMutation.mutate()
  }

  const handleReset = () => {
    setFile(null)
    setHeaders([])
    setRows([])
    setMapping([])
    setImportResult(null)
    setStep('upload')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const targetFields: Array<{ value: keyof import('@/lib/services/import.service').StudentImportRow; label: string }> = [
    { value: 'first_name', label: 'Prénom' },
    { value: 'last_name', label: 'Nom' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Téléphone' },
    { value: 'date_of_birth', label: 'Date de naissance' },
    { value: 'address', label: 'Adresse' },
    { value: 'city', label: 'Ville' },
    { value: 'postal_code', label: 'Code postal' },
    { value: 'country', label: 'Pays' },
    { value: 'student_number', label: 'Numéro étudiant' },
    { value: 'status', label: 'Statut' },
  ]

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Importation de stagiaires</CardTitle>
        <CardDescription>
          Importez vos stagiaires depuis un fichier Excel ou CSV
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-brand-blue font-medium">
                    Cliquez pour sélectionner un fichier
                  </span>
                  <span className="text-gray-500 block mt-2">
                    ou glissez-déposez votre fichier ici
                  </span>
                </Label>
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-sm text-gray-500 mt-4">
                  Formats supportés : CSV, Excel (.xlsx, .xls)
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Mapping détecté automatiquement :</strong> Nous avons détecté que certaines
                  colonnes correspondent à nos champs. Vérifiez et ajustez si nécessaire.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 font-medium text-sm text-gray-600 pb-2 border-b">
                  <div>Colonne source</div>
                  <div>Champ cible</div>
                  <div>Confiance</div>
                </div>

                {headers.map((header) => {
                  const currentMapping = mapping.find((m) => m.sourceColumn === header)
                  const confidence = currentMapping?.confidence || 0

                  return (
                    <div key={header} className="grid grid-cols-3 gap-4 items-center">
                      <div className="font-medium">{header}</div>
                      <select
                        value={currentMapping?.targetField || ''}
                        onChange={(e) => updateMapping(header, e.target.value as any)}
                        className="px-3 py-2 border rounded-md"
                      >
                        <option value="">-- Non mappé --</option>
                        {targetFields.map((field) => (
                          <option key={field.value} value={field.value}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        {confidence > 0.7 ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : confidence > 0 ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-500">
                          {Math.round(confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réinitialiser
                </Button>
                <Button
                  onClick={handleValidate}
                  disabled={mapping.filter((m) => m.targetField).length === 0}
                >
                  Valider et importer
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Validation */}
          {step === 'validation' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 text-center py-12"
            >
              <Loader2 className="w-16 h-16 mx-auto text-brand-blue animate-spin" />
              <p className="text-lg font-medium">Import en cours...</p>
              <p className="text-sm text-gray-500">
                Validation et importation des {rows.length} lignes
              </p>
            </motion.div>
          )}

          {/* Step 4: Result */}
          {step === 'result' && importResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-brand-blue">
                        {importResult.totalRows}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Lignes totales</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {importResult.importedRows}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Importés</div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">
                        {importResult.errors.length}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Erreurs</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <h4 className="font-medium text-red-800 mb-2">Erreurs détectées :</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((error, index) => (
                      <div key={index} className="text-sm text-red-700">
                        <strong>Ligne {error.row}:</strong> {error.errors.join(', ')}
                      </div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <div className="text-sm text-red-600 italic">
                        ... et {importResult.errors.length - 10} autres erreurs
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      // Télécharger un fichier CSV avec les erreurs
                      const csv = [
                        ['Ligne', 'Erreurs', ...headers],
                        ...importResult.errors.map((e) => [
                          e.row,
                          e.errors.join('; '),
                          ...headers.map((h) => e.data[h] || ''),
                        ]),
                      ]
                        .map((row) => row.map((cell) => `"${cell}"`).join(','))
                        .join('\n')

                      const blob = new Blob([csv], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'erreurs-import.csv'
                      a.click()
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger les erreurs (CSV)
                  </Button>
                </div>
              )}

              {importResult.warnings.length > 0 && (
                <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <h4 className="font-medium text-yellow-800 mb-2">Avertissements :</h4>
                  <div className="space-y-1">
                    {importResult.warnings.map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        {warning.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Nouvel import
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
