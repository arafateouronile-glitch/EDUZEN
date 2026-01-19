'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { documentService } from '@/lib/services/document.service'
import { generatePDFFromHTML } from '@/lib/utils/pdf-generator'
import { generateHTML } from '@/lib/utils/document-generation/html-generator'
import { extractDocumentVariables, mapDocumentTypeToTemplateType } from '@/lib/utils/document-generation/variable-extractor'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import { TemplateSelector } from '@/components/document-editor/template-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Download, FileText, Users, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import type { StudentWithRelations, SessionWithRelations } from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { createZipFromPDFs } from '@/lib/utils/pdf-generator'

type Organization = TableRow<'organizations'>
type Student = TableRow<'students'>
type Session = TableRow<'sessions'>

export default function GenerateBatchDocumentPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const { addToast } = useToast()

  const [documentType, setDocumentType] = useState<string>('attestation')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<{
    current: number
    total: number
    currentStudent?: string
  } | null>(null)

  // Récupérer l'organisation
  const { data: organization } = useQuery({
    queryKey: ['organization', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les sessions
  const { data: sessions } = useQuery<Array<{ id: string; [key: string]: any }>>({
    queryKey: ['sessions', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, formation_id, formations(name, duration_hours, programs(name)), start_date, end_date, enrollments(*, students(*))')
        .eq('formations.organization_id', user.organization_id)
        .order('start_date', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data || []) as Array<{ id: string; [key: string]: any }>
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les étudiants de la session sélectionnée
  const selectedSession = sessions?.find((s) => s.id === selectedSessionId) as { id: string; enrollments?: Array<{ students?: any }>; [key: string]: any } | undefined
  const sessionStudents = selectedSession?.enrollments
    ?.map((enrollment: any) => enrollment.students)
    .filter((student: any) => student && student.status === 'active') || []

  // Récupérer l'année académique actuelle
  const { data: academicYear } = useQuery({
    queryKey: ['academic-year', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('organization_id', user.organization_id)
        .eq('is_current', true)
        .maybeSingle()
      if (error) {
        console.warn('Erreur lors de la récupération de l\'année académique:', error)
        return null
      }
      return data || null
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer le template sélectionné
  const { data: selectedTemplate } = useQuery({
    queryKey: ['document-template', selectedTemplateId],
    queryFn: async () => {
      if (!selectedTemplateId) return null
      return documentTemplateService.getTemplateById(selectedTemplateId)
    },
    enabled: !!selectedTemplateId,
  })

  const handleGenerateBatch = async () => {
    if (!documentType || !organization || !selectedTemplate || !selectedSessionId) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Veuillez sélectionner un type de document, un modèle, et une session.',
      })
      return
    }

    const studentsToProcess = selectedStudentIds.length > 0
      ? sessionStudents.filter((s: any) => selectedStudentIds.includes(s.id))
      : sessionStudents

    if (studentsToProcess.length === 0) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Aucun étudiant sélectionné pour la génération.',
      })
      return
    }

    setIsGenerating(true)
    setGenerationProgress({ current: 0, total: studentsToProcess.length })

    const pdfBlobs: { blob: Blob; filename: string }[] = []
    const session = selectedSession as SessionWithRelations

    try {
      for (let i = 0; i < studentsToProcess.length; i++) {
        const student = studentsToProcess[i] as StudentWithRelations
        setGenerationProgress({
          current: i + 1,
          total: studentsToProcess.length,
          currentStudent: `${student.first_name} ${student.last_name}`,
        })

        try {
          // Extraire les variables
          const variables = extractDocumentVariables({
            student,
            organization: organization as Organization,
            session,
            invoice: undefined,
            academicYear,
            language,
            issueDate: new Date().toISOString(),
          })

          // Générer le HTML avec le template
          const result = await generateHTML(
            selectedTemplate,
            variables,
            undefined,
            user?.organization_id || ''
          )

          // Générer le nom de fichier
          const filename = `${documentType}_${student.last_name}_${student.first_name}.pdf`

          // Créer un élément temporaire pour la génération PDF
          const tempDiv = document.createElement('div')
          tempDiv.style.position = 'absolute'
          tempDiv.style.left = '-9999px'
          tempDiv.style.top = '0'
          tempDiv.style.width = '794px'
          tempDiv.style.minHeight = '1123px'
          tempDiv.style.backgroundColor = '#ffffff'
          tempDiv.style.overflow = 'visible'
          tempDiv.style.fontFamily = 'Arial, sans-serif'
          document.body.appendChild(tempDiv)

          // Extraire le contenu du body
          const parser = new DOMParser()
          const doc = parser.parseFromString(result.html, 'text/html')
          const bodyContent = doc.body.innerHTML
          tempDiv.innerHTML = bodyContent

          // Trouver l'élément principal du document
          let element = tempDiv.querySelector('.document-container') || tempDiv.querySelector('[id$="-document"]') || tempDiv.firstElementChild

          if (!element || !(element instanceof HTMLElement)) {
            element = tempDiv
          }

          const elementId = `temp-pdf-batch-${student.id}-${Date.now()}`
          if (element instanceof HTMLElement) {
            element.id = elementId
            if (!element.style.width) {
              element.style.width = '794px'
            }
            if (!element.style.minHeight) {
              element.style.minHeight = '1123px'
            }
            element.style.backgroundColor = '#ffffff'
          }

          // Attendre que le DOM soit mis à jour
          await new Promise((resolve) => setTimeout(resolve, 500))

          // Vérifier que l'élément est visible
          if (element instanceof HTMLElement) {
            const rect = element.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) {
              element = tempDiv
              tempDiv.id = elementId
              tempDiv.style.width = '794px'
              tempDiv.style.minHeight = '1123px'
            }
          }

          // Générer le PDF
          const blob = await generatePDFFromHTML(elementId, filename)
          pdfBlobs.push({ blob, filename })

          // Nettoyer l'élément temporaire
          if (tempDiv.parentNode === document.body) {
            document.body.removeChild(tempDiv)
          }
        } catch (error) {
          console.error(`Erreur lors de la génération pour ${student.first_name} ${student.last_name}:`, error)
          // Continuer avec les autres étudiants même en cas d'erreur
        }
      }

      // Créer un ZIP avec tous les PDFs
      if (pdfBlobs.length > 0) {
        const zipFilename = `documents_${documentType}_${selectedSession?.name || 'batch'}_${Date.now()}.zip`
        await createZipFromPDFs(
          pdfBlobs.map((item) => ({ name: item.filename, blob: item.blob })),
          zipFilename
        )

        addToast({
          type: 'success',
          title: 'Génération terminée',
          description: `${pdfBlobs.length} document(s) généré(s) avec succès.`,
        })
      } else {
        addToast({
          type: 'error',
          title: 'Erreur',
          description: 'Aucun document n\'a pu être généré.',
        })
      }
    } catch (error) {
      console.error('Erreur lors de la génération en masse:', error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération en masse.',
      })
    } finally {
      setIsGenerating(false)
      setGenerationProgress(null)
      // Nettoyer tous les éléments temporaires
      const tempDivs = document.querySelectorAll('[id^="temp-pdf-batch-"]')
      tempDivs.forEach((div) => {
        if (div.parentNode === document.body) {
          document.body.removeChild(div)
        }
      })
    }
  }

  const documentTypes = [
    { value: 'attestation', label: 'Attestation de scolarité', icon: FileText },
    { value: 'certificate', label: 'Certificat de formation', icon: FileText },
  ]

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const selectAllStudents = () => {
    setSelectedStudentIds(sessionStudents.map((s: any) => s.id))
  }

  const deselectAllStudents = () => {
    setSelectedStudentIds([])
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/documents">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Génération en masse</h1>
          <p className="mt-2 text-sm text-gray-600">
            Générez plusieurs documents à la fois pour une session
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Type de document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {documentTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setDocumentType(type.value)}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        documentType === type.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-6 w-6 mb-2 text-primary" />
                      <div className="font-medium">{type.label}</div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {documentType && (
            <>
              {/* Sélecteur de template */}
              <TemplateSelector
                documentType={mapDocumentTypeToTemplateType(documentType)}
                selectedTemplateId={selectedTemplateId}
                onTemplateSelect={setSelectedTemplateId}
                onCreateNew={() => {
                  router.push(`/dashboard/settings/document-templates/${mapDocumentTypeToTemplateType(documentType)}/edit`)
                }}
                onDuplicate={async (templateId) => {
                  try {
                    const duplicated = await documentTemplateService.duplicateTemplate(templateId)
                    setSelectedTemplateId(duplicated.id)
                    addToast({
                      type: 'success',
                      title: 'Modèle dupliqué',
                      description: 'Le modèle a été dupliqué avec succès.',
                    })
                  } catch (error) {
                    console.error('Erreur lors de la duplication:', error)
                    addToast({
                      type: 'error',
                      title: 'Erreur',
                      description: 'Erreur lors de la duplication du modèle.',
                    })
                  }
                }}
              />

              {/* Sélection de session */}
              <Card>
                <CardHeader>
                  <CardTitle>Session de formation</CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => {
                      setSelectedSessionId(e.target.value)
                      setSelectedStudentIds([])
                    }}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    required
                  >
                    <option value="">Sélectionner une session</option>
                    {sessions?.map((session) => (
                      <option key={session.id} value={session.id}>
                        {(session as SessionWithRelations).name} - {(session as SessionWithRelations).formations?.programs?.name}
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>

              {/* Sélection des étudiants */}
              {selectedSessionId && sessionStudents.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Étudiants ({sessionStudents.length})</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={selectAllStudents}
                        >
                          Tout sélectionner
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={deselectAllStudents}
                        >
                          Tout désélectionner
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {sessionStudents.map((student: any) => (
                        <label
                          key={student.id}
                          className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => toggleStudentSelection(student.id)}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                          <div className="flex-1">
                            <p className="font-medium">
                              {student.first_name} {student.last_name}
                            </p>
                            {student.student_number && (
                              <p className="text-sm text-gray-500">
                                N° {student.student_number}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                      {selectedStudentIds.length > 0
                        ? `${selectedStudentIds.length} étudiant(s) sélectionné(s)`
                        : 'Aucun étudiant sélectionné (tous seront générés)'}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <label className="block text-sm font-medium mb-2">Langue</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-touch-target"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-4">
                <Link href="/dashboard/documents">
                  <Button variant="outline">Annuler</Button>
                </Link>
                <Button
                  onClick={handleGenerateBatch}
                  disabled={
                    isGenerating ||
                    !selectedTemplateId ||
                    !selectedSessionId ||
                    sessionStudents.length === 0
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Génération...' : 'Générer en masse'}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Informations */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {generationProgress && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progression</span>
                    <span className="text-sm text-gray-600">
                      {generationProgress.current} / {generationProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  {generationProgress.currentStudent && (
                    <p className="text-sm text-gray-600 mt-2">
                      En cours: {generationProgress.currentStudent}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {sessionStudents.length} étudiant(s) dans la session
                  </span>
                </div>
                {selectedStudentIds.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success-primary" />
                    <span className="text-sm text-gray-600">
                      {selectedStudentIds.length} étudiant(s) sélectionné(s)
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500">
                  Les documents générés seront regroupés dans un fichier ZIP.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
