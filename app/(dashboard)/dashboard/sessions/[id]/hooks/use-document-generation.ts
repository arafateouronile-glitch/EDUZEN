'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { generatePDFFromHTML, createZipFromPDFs, generatePDFBlobFromHTML } from '@/lib/utils/pdf-generator'
import {
  generateConventionHTML,
  generateContractHTML,
  generateConvocationHTML,
  generateProgramHTML,
  generateTermsHTML,
  generatePrivacyPolicyHTML,
  generateSessionReportHTML,
} from '@/lib/utils/document-templates'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/hooks/use-auth'
import { logger } from '@/lib/utils/logger'
import { emailService } from '@/lib/services/email.service'
import { formatDate } from '@/lib/utils'
import { APP_URLS } from '@/lib/config/app-config'
import { DocumentTemplateService } from '@/lib/services/document-template.service'
import { createClient } from '@/lib/supabase/client'
import { extractDocumentVariables } from '@/lib/utils/document-generation/variable-extractor'
import { autoAdvanceProspectCommercialStatus } from '@/lib/actions/learner-crm-actions'
import type { DocumentTemplate } from '@/lib/types/document-templates'
import type { 
  SessionWithRelations, 
  EnrollmentWithRelations,
  FormationWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Program = TableRow<'programs'>
type Organization = TableRow<'organizations'>
type Company = TableRow<'companies'>

/** Mappe une ligne external_entities → Company pour compatibilité avec extractDocumentVariables */
function mapExternalEntityToCompany(ext: Record<string, unknown>): Company {
  return {
    id: ext.id as string,
    name: ext.name as string,
    address: ext.address as string | null,
    city: ext.city as string | null,
    postal_code: ext.postal_code as string | null,
    phone: ext.phone as string | null,
    email: ext.email as string | null,
    billing_email: ext.contact_email as string | null,
    siret: ext.siret as string | null,
    siren: ext.siren as string | null,
    website: ext.website as string | null,
    metadata: { tva_number: ext.vat_number },
    organization_id: ext.organization_id as string,
    is_active: ext.is_active as boolean,
    billing_address: null,
    country: ext.country as string | null,
    legal_form: ext.legal_form as string | null,
    logo_url: null,
    notes: null,
    opco_contact_email: null,
    opco_id: null,
    opco_name: null,
    created_at: ext.created_at as string,
    updated_at: ext.updated_at as string,
    deleted_at: null,
    deleted_by: null,
    external_entity_id: null,
  } as Company
}

/** Récupère l'entité principale d'un étudiant (external_entities via student_entities) */
async function fetchStudentCompany(studentId: string): Promise<Company | null> {
  try {
    const supabase = createClient()
    // Priorité : external_entities (table principale pour les entreprises/entités)
    const { data: seData } = await supabase
      .from('student_entities')
      .select('external_entities(*)')
      .eq('student_id', studentId)
      .eq('is_current', true)
      .limit(1)
      .single()
    if (seData?.external_entities && !Array.isArray(seData.external_entities)) {
      return mapExternalEntityToCompany(seData.external_entities as Record<string, unknown>)
    }
    // Fallback : company_employees
    const { data: ceData } = await supabase
      .from('company_employees')
      .select('companies(*)')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .limit(1)
      .single()
    if (ceData?.companies && !Array.isArray(ceData.companies)) {
      return ceData.companies as Company
    }
    return null
  } catch {
    return null
  }
}

/**
 * Prépare le corps d'un email pour l'envoi : convertit les retours à la
 * ligne en <br> uniquement si le contenu est du texte brut. Un contenu déjà
 * en HTML (ex: un modèle d'email sélectionné, avec <!DOCTYPE>/<head>/<style>)
 * ne doit pas être touché — y injecter des <br> casse la structure du
 * document (des <br> entre <html>/<head>, voire au milieu d'un bloc <style>)
 * et peut aussi déclencher à tort le détecteur de contenu suspect de l'API.
 */
function toEmailBodyHTML(body: string): string {
  return /<[a-z][\s\S]*>/i.test(body) ? body : body.replace(/\n/g, '<br>')
}

/**
 * Marque l'inscription comme ayant reçu sa convocation/son contrat par email
 * (colonnes enrollments.convocation_sent_at / contract_sent_at). Ne doit pas
 * faire échouer l'envoi si la mise à jour du statut échoue — c'est un
 * indicateur secondaire, pas une condition de succès de l'envoi lui-même.
 */
async function markEnrollmentDocumentSent(
  enrollmentId: string,
  field: 'convocation_sent_at' | 'contract_sent_at'
): Promise<void> {
  try {
    const { error } = await createClient()
      .from('enrollments')
      .update({ [field]: new Date().toISOString() })
      .eq('id', enrollmentId)
    if (error) {
      logger.error('Erreur lors de la mise à jour du statut d\'envoi', error, { enrollmentId, field })
    }
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du statut d\'envoi', error as Error, { enrollmentId, field })
  }
}

/**
 * Récupère une entreprise inscrite à une session sans liste nominative
 * (session_entity_reservations, cf. config-apprenants.tsx) et la mappe en
 * Company pour compatibilité avec extractDocumentVariables.
 */
async function fetchEntityCompany(entityId: string): Promise<Company | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from('external_entities')
      .select('*')
      .eq('id', entityId)
      .single()
    if (!data) return null
    return mapExternalEntityToCompany(data as Record<string, unknown>)
  } catch {
    return null
  }
}

/** Entreprise inscrite à une session sans liste nominative (session_entity_reservations) */
export interface SessionEntityReservation {
  id: string
  entity_id: string
  expected_count: number
  total_amount?: number | null
  external_entities?: { name?: string | null; type?: string | null } | null
}

interface DocumentGenerationProps {
  sessionData: SessionWithRelations | undefined
  formation: FormationWithRelations | null | undefined
  program: Program | null | undefined
  organization: Organization | undefined
  enrollments?: EnrollmentWithRelations[]
  grades?: any[]
  attendanceStats?: any
}

export function useDocumentGeneration({
  sessionData,
  formation,
  program,
  organization,
  enrollments = [],
  grades = [],
  attendanceStats = null,
}: DocumentGenerationProps) {
  const { addToast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isGeneratingZip, setIsGeneratingZip] = useState(false)
  const [zipGenerationProgress, setZipGenerationProgress] = useState({ current: 0, total: 0 })
  const [lastZipGeneration, setLastZipGeneration] = useState<Date | null>(null)

  const handleGenerateConvention = async (templateId?: string) => {
    if (!sessionData || !formation || !organization) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Données manquantes pour générer la convention.',
      })
      return
    }

    try {
      // Récupérer le template depuis la base de données
      const templateService = new DocumentTemplateService(createClient())
      let template: DocumentTemplate | null = null
      
      if (templateId) {
        template = await templateService.getTemplateById(templateId)
      } else {
        template = await templateService.getDefaultTemplate(organization.id, 'convention')
      }

      if (!template) {
        // Fallback : utiliser generateConventionHTML qui génère un template par défaut
        const html = await generateConventionHTML({
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
            price: (formation as FormationWithRelations & { price?: number }).price || undefined,
            duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
          templateId,
        })

        // Créer un élément temporaire pour générer le PDF
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.style.width = '210mm'
        tempDiv.style.minHeight = '297mm'
        document.body.appendChild(tempDiv)

        // Attendre que le DOM soit mis à jour
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Chercher l'élément de document avec plusieurs méthodes
        let element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
        if (!element) {
          element = tempDiv.querySelector('#convention-document') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('.document-container') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('body > div') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('div') as HTMLElement
        }
        if (!element) {
          document.body.removeChild(tempDiv)
          throw new Error('Élément de document non trouvé dans le HTML généré')
        }

        const elementId = `temp-convention-${Date.now()}`
        element.id = elementId
        
        // Attendre que l'ID soit appliqué
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        const pdfBlob = await generatePDFBlobFromHTML(elementId)
        document.body.removeChild(tempDiv)

        // Télécharger le PDF
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `convention_${sessionData.name.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addToast({
          type: 'success',
          title: 'Convention générée',
          description: 'La convention a été générée et téléchargée avec succès.',
        })
        return
      }

      // Préparer les variables pour le template
      const variables = extractDocumentVariables({
        session: {
          ...sessionData,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        } as any,
        organization: organization as any,
        program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
        language: 'fr',
        issueDate: new Date().toISOString(),
      })

      // Utiliser l'API pour générer le PDF (même système que la page de génération)
      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template,
          variables,
          documentId: undefined,
          organizationId: organization.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
      }

      // Télécharger le PDF
      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `convention_${sessionData.name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      addToast({
        type: 'success',
        title: 'Convention générée',
        description: 'La convention a été générée et téléchargée avec succès.',
      })
    } catch (error) {
      logger.error('Erreur lors de la génération de la convention', error as Error, {
        sessionId: sessionData?.id,
        formationId: formation?.id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération de la convention.',
      })
    }
  }

  const handleGenerateContract = async (enrollment: EnrollmentWithRelations, templateId?: string) => {
    if (!sessionData || !formation || !organization || !enrollment) return

    const student = enrollment.students
    if (!student) return

    try {
      // Récupérer le template depuis la base de données
      const templateService = new DocumentTemplateService(createClient())
      let template: DocumentTemplate | null = null
      
      if (templateId) {
        template = await templateService.getTemplateById(templateId)
      } else {
        template = await templateService.getDefaultTemplate(organization.id, 'contrat')
      }

      if (!template) {
        // Fallback : utiliser generateContractHTML qui génère un template par défaut
        const html = await generateContractHTML({
        student: {
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email || undefined,
          phone: student.phone || undefined,
          address: student.address || undefined,
          date_of_birth: student.date_of_birth || undefined,
        },
        session: {
          name: sessionData.name,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        },
        formation: {
          name: formation.name,
          code: formation.code || undefined,
          price: (formation as FormationWithRelations & { price?: number }).price || undefined,
          duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
        },
        program: program ? { name: program.name } : undefined,
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        enrollment: {
          enrollment_date: enrollment.enrollment_date || '',
          total_amount: enrollment.total_amount || 0,
          paid_amount: enrollment.paid_amount || 0,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
        organizationId: organization.id,
        templateId,
      })

      // Créer un élément temporaire pour générer le PDF
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '210mm'
      tempDiv.style.minHeight = '297mm'
      document.body.appendChild(tempDiv)

      // Attendre que le DOM soit mis à jour
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Chercher l'élément de document avec plusieurs méthodes
      let element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
      if (!element) {
        element = tempDiv.querySelector('#contract-document') as HTMLElement
      }
      if (!element) {
        element = tempDiv.querySelector('.document-container') as HTMLElement
      }
      if (!element) {
        element = tempDiv.querySelector('body > div') as HTMLElement
      }
      if (!element) {
        element = tempDiv.querySelector('div') as HTMLElement
      }
      if (!element) {
        document.body.removeChild(tempDiv)
        throw new Error('Élément de document non trouvé dans le HTML généré')
      }

      const elementId = `temp-contract-${Date.now()}`
      element.id = elementId
      
      // Attendre que l'ID soit appliqué
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      const pdfBlob = await generatePDFBlobFromHTML(elementId)
      document.body.removeChild(tempDiv)

      // Télécharger le PDF
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contrat_${student.last_name}_${student.first_name}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addToast({
        type: 'success',
        title: 'Contrat généré',
        description: 'Le contrat a été généré et téléchargé avec succès.',
      })
        return
      }

      // Préparer les variables pour le template
      const studentCompany = await fetchStudentCompany(student.id)
      const variables = extractDocumentVariables({
        student: student as any,
        session: {
          ...sessionData,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        } as any,
        organization: organization as any,
        program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
        company: studentCompany,
        language: 'fr',
        issueDate: new Date().toISOString(),
        enrollmentAmount: enrollment.total_amount || undefined,
      })

      // Utiliser l'API pour générer le PDF (même système que la page de génération)
      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template,
          variables,
          documentId: undefined,
          organizationId: organization.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
      }

      // Télécharger le PDF
      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contrat_${student.last_name}_${student.first_name}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      addToast({
        type: 'success',
        title: 'Contrat généré',
        description: 'Le contrat a été généré et téléchargé avec succès.',
      })
    } catch (error) {
      logger.error('Erreur lors de la génération du contrat', error as Error, {
        enrollmentId: enrollment.id,
        studentId: enrollment.student_id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération du contrat.',
      })
    }
  }

  const handleGenerateConvocation = async (enrollment: EnrollmentWithRelations, templateId?: string) => {
    if (!sessionData || !formation || !organization || !enrollment) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Données manquantes pour générer la convocation.',
      })
      return
    }

    const student = enrollment.students
    if (!student) return

    try {
      // Récupérer le template depuis la base de données
      const templateService = new DocumentTemplateService(createClient())
      let template: DocumentTemplate | null = null
      
      // S'assurer que templateId est une string valide
      const validTemplateId = typeof templateId === 'string' && templateId.trim() !== '' ? templateId : undefined
      
      if (validTemplateId) {
        template = await templateService.getTemplateById(validTemplateId)
      } else {
        template = await templateService.getDefaultTemplate(organization.id, 'convocation')
      }

      if (!template) {
        // Fallback : utiliser generateConvocationHTML qui génère un template par défaut
        const html = await generateConvocationHTML({
          student: {
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email || undefined,
            phone: student.phone || undefined,
          },
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            start_time: sessionData.start_time || undefined,
            end_time: sessionData.end_time || undefined,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
        })

        // Créer un élément temporaire pour générer le PDF
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.style.width = '210mm'
        tempDiv.style.minHeight = '297mm'
        document.body.appendChild(tempDiv)

        // Attendre que le DOM soit mis à jour
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Chercher l'élément de document avec plusieurs méthodes
        let element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
        if (!element) {
          element = tempDiv.querySelector('#convocation-document') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('.document-container') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('body > div') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('div') as HTMLElement
        }
        if (!element) {
          document.body.removeChild(tempDiv)
          throw new Error('Élément de document non trouvé dans le HTML généré')
        }

        const elementId = `temp-convocation-${Date.now()}`
        element.id = elementId
        
        // Attendre que l'ID soit appliqué
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        const pdfBlob = await generatePDFBlobFromHTML(elementId)
        document.body.removeChild(tempDiv)

        // Télécharger le PDF
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `convocation_${student.last_name}_${student.first_name}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addToast({
          type: 'success',
          title: 'Convocation générée',
          description: 'La convocation a été générée et téléchargée avec succès.',
        })
        return
      }

      // Préparer les variables pour le template
      const convocationCompany = await fetchStudentCompany(student.id)
      const variables = extractDocumentVariables({
        student: {
          ...student,
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email || undefined,
          phone: student.phone || undefined,
        } as any,
        session: {
          ...sessionData,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          start_time: sessionData.start_time || undefined,
          end_time: sessionData.end_time || undefined,
          location: sessionData.location || undefined,
          formations: formation, // Important pour l'extracteur de variables
        } as any,
        organization: organization as any,
        program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
        company: convocationCompany,
        language: 'fr',
        issueDate: new Date().toISOString(),
      })

      // Utiliser l'API pour générer le PDF (même système que la page de génération)
      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template,
          variables,
          documentId: undefined,
          organizationId: organization.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
      }

      // Télécharger le PDF
      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `convocation_${student.last_name}_${student.first_name}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      addToast({
        type: 'success',
        title: 'Convocation générée',
        description: 'La convocation a été générée et téléchargée avec succès.',
      })
    } catch (error) {
      logger.error('Erreur lors de la génération de la convocation', error as Error, {
        enrollmentId: enrollment.id,
        studentId: enrollment.student_id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération de la convocation.',
      })
    }
  }

  const handleGenerateProgram = async (templateIdOrEvent?: string | any) => {
    if (!sessionData || !formation || !program || !organization) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Données manquantes pour générer le programme.',
      })
      return
    }

    try {
      // Récupérer le template depuis la base de données
      const templateService = new DocumentTemplateService(createClient())
      let template: DocumentTemplate | null = null
      
      // S'assurer que templateId est une string valide (ignorer les événements React)
      let validTemplateId: string | undefined = undefined
      if (templateIdOrEvent) {
        // Si c'est un événement React, l'ignorer
        if (typeof templateIdOrEvent === 'object' && 'target' in templateIdOrEvent) {
          // C'est un événement React, on l'ignore
          logger.debug('handleGenerateProgram - Événement React ignoré, utilisation du template par défaut')
        } else if (typeof templateIdOrEvent === 'string' && templateIdOrEvent.trim() !== '') {
          validTemplateId = templateIdOrEvent.trim()
        } else {
          logger.warn('handleGenerateProgram - templateId invalide', { templateId: templateIdOrEvent, type: typeof templateIdOrEvent })
        }
      }
      
      if (validTemplateId) {
        logger.debug('handleGenerateProgram - Utilisation du template spécifié', { templateId: validTemplateId })
        template = await templateService.getTemplateById(validTemplateId)
      } else {
        logger.debug('handleGenerateProgram - Récupération du template par défaut', { organizationId: organization.id, type: 'programme' })
        template = await templateService.getDefaultTemplate(organization.id, 'programme')
      }

      if (!template) {
        // Fallback : utiliser generateProgramHTML qui génère un template par défaut
        const html = await generateProgramHTML({
          program: { name: program.name },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
          },
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
        })

        // Créer un élément temporaire pour générer le PDF
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.style.width = '210mm'
        tempDiv.style.minHeight = '297mm'
        document.body.appendChild(tempDiv)

        // Attendre que le DOM soit mis à jour
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Chercher l'élément de document avec plusieurs méthodes
        let element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
        if (!element) {
          element = tempDiv.querySelector('#program-document') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('.document-container') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('body > div') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('div') as HTMLElement
        }
        if (!element) {
          document.body.removeChild(tempDiv)
          throw new Error('Élément de document non trouvé dans le HTML généré')
        }

        const elementId = `temp-program-${Date.now()}`
        element.id = elementId
        
        // Attendre que l'ID soit appliqué
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        const pdfBlob = await generatePDFBlobFromHTML(elementId)
        document.body.removeChild(tempDiv)

        // Télécharger le PDF
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `programme_${program.name.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addToast({
          type: 'success',
          title: 'Programme généré',
          description: 'Le programme a été généré et téléchargé avec succès.',
        })
        return
      }

      // Préparer les variables pour le template
      const variables = extractDocumentVariables({
        session: {
          ...sessionData,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        } as any,
        organization: organization as any,
        program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
        language: 'fr',
        issueDate: new Date().toISOString(),
      })

      // DEBUG: vérifier les variables extraites pour le programme
      console.warn('[PROGRAMME DEBUG] variables clés:', {
        programme_objectifs: (variables as any).programme_objectifs?.substring?.(0, 100) ?? '❌ vide',
        programme_profil_apprenants: (variables as any).programme_profil_apprenants?.substring?.(0, 100) ?? '❌ vide',
        programme_contenu: (variables as any).programme_contenu?.substring?.(0, 100) ?? '❌ vide',
        programme_prerequis: (variables as any).programme_prerequis?.substring?.(0, 100) ?? '❌ vide',
        program_id: program?.id,
      })

      // Utiliser l'API pour générer le PDF (même système que la page de génération)
      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template,
          variables,
          documentId: undefined,
          organizationId: organization.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
      }

      // Télécharger le PDF
      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `programme_${program.name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      addToast({
        type: 'success',
        title: 'Programme généré',
        description: 'Le programme a été généré et téléchargé avec succès.',
      })
    } catch (error) {
      logger.error('Erreur lors de la génération du programme', error as Error, {
        sessionId: sessionData?.id,
        programId: program?.id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération du programme.',
      })
    }
  }

  const handleGenerateTerms = async (templateIdOrEvent?: string | any) => {
    if (!organization) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Données manquantes pour générer les CGV.',
      })
      return
    }

    try {
      // Récupérer le template depuis la base de données
      const templateService = new DocumentTemplateService(createClient())
      let template: DocumentTemplate | null = null
      
      // S'assurer que templateId est une string valide (ignorer les événements React)
      let validTemplateId: string | undefined = undefined
      if (templateIdOrEvent) {
        // Si c'est un événement React, l'ignorer
        if (typeof templateIdOrEvent === 'object' && 'target' in templateIdOrEvent) {
          // C'est un événement React, on l'ignore
          logger.debug('handleGenerateTerms - Événement React ignoré, utilisation du template par défaut')
        } else if (typeof templateIdOrEvent === 'string' && templateIdOrEvent.trim() !== '') {
          validTemplateId = templateIdOrEvent.trim()
        } else {
          logger.warn('handleGenerateTerms - templateId invalide', { templateId: templateIdOrEvent, type: typeof templateIdOrEvent })
        }
      }
      
      if (validTemplateId) {
        logger.debug('handleGenerateTerms - Utilisation du template spécifié', { templateId: validTemplateId })
        template = await templateService.getTemplateById(validTemplateId)
      } else {
        logger.debug('handleGenerateTerms - Récupération du template par défaut', { organizationId: organization.id, type: 'cgv' })
        template = await templateService.getDefaultTemplate(organization.id, 'cgv')
      }

      if (!template) {
        // Fallback : utiliser generateTermsHTML qui génère un template par défaut
        const html = await generateTermsHTML({
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
        organizationId: organization.id,
      })

      // Créer un élément temporaire pour générer le PDF
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '210mm'
      tempDiv.style.minHeight = '297mm'
      document.body.appendChild(tempDiv)

      // Attendre que le DOM soit mis à jour
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Chercher l'élément de document avec plusieurs méthodes
      let element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
      if (!element) {
        element = tempDiv.querySelector('#terms-document') as HTMLElement
      }
      if (!element) {
        element = tempDiv.querySelector('.document-container') as HTMLElement
      }
      if (!element) {
        element = tempDiv.querySelector('body > div') as HTMLElement
      }
      if (!element) {
        element = tempDiv.querySelector('div') as HTMLElement
      }
      if (!element) {
        document.body.removeChild(tempDiv)
        throw new Error('Élément de document non trouvé dans le HTML généré')
      }

      const elementId = `temp-terms-${Date.now()}`
      element.id = elementId
      
      // Attendre que l'ID soit appliqué
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      const pdfBlob = await generatePDFBlobFromHTML(elementId)
      document.body.removeChild(tempDiv)

      // Télécharger le PDF
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cgv_${organization.name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      addToast({
        type: 'success',
        title: 'CGV générées',
        description: 'Les conditions générales ont été générées avec succès.',
      })
      return
      }

      // Préparer les variables pour le template
      const variables = extractDocumentVariables({
        organization: organization as any,
        language: 'fr',
        issueDate: new Date().toISOString(),
      })

      // Utiliser l'API pour générer le PDF (même système que la page de génération)
      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template,
          variables,
          documentId: undefined,
          organizationId: organization.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
      }

      // Télécharger le PDF
      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cgv_${organization.name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      addToast({
        type: 'success',
        title: 'CGV générées',
        description: 'Les conditions générales ont été générées avec succès.',
      })
    } catch (error) {
      logger.error('Erreur lors de la génération des CGV', error as Error, {
        organizationId: organization?.id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération des CGV.',
      })
    }
  }

  const handleGeneratePrivacyPolicy = async (templateIdOrEvent?: string | any) => {
    if (!organization) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Données manquantes pour générer la politique de confidentialité.',
      })
      return
    }

    try {
      // Récupérer le template depuis la base de données
      const templateService = new DocumentTemplateService(createClient())
      let template: DocumentTemplate | null = null
      
      // S'assurer que templateId est une string valide (ignorer les événements React)
      let validTemplateId: string | undefined = undefined
      if (templateIdOrEvent) {
        // Si c'est un événement React, l'ignorer
        if (typeof templateIdOrEvent === 'object' && 'target' in templateIdOrEvent) {
          // C'est un événement React, on l'ignore
          logger.debug('handleGeneratePrivacyPolicy - Événement React ignoré, utilisation du template par défaut')
        } else if (typeof templateIdOrEvent === 'string' && templateIdOrEvent.trim() !== '') {
          validTemplateId = templateIdOrEvent.trim()
        } else {
          logger.warn('handleGeneratePrivacyPolicy - templateId invalide', { templateId: templateIdOrEvent, type: typeof templateIdOrEvent })
        }
      }
      
      if (validTemplateId) {
        logger.debug('handleGeneratePrivacyPolicy - Utilisation du template spécifié', { templateId: validTemplateId })
        template = await templateService.getTemplateById(validTemplateId)
      } else {
        // Le type 'confidentialite' n'existe pas dans DocumentType, donc on utilise directement le fallback
        // Si un template par défaut est créé plus tard, on pourra l'ajouter ici
        logger.debug('handleGeneratePrivacyPolicy - Aucun template par défaut disponible, utilisation du fallback')
        template = null
      }

      if (!template) {
        // Fallback : utiliser generatePrivacyPolicyHTML qui génère un template par défaut
        const html = await generatePrivacyPolicyHTML({
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
        })

        // Créer un élément temporaire pour générer le PDF
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.style.width = '210mm'
        tempDiv.style.minHeight = '297mm'
        document.body.appendChild(tempDiv)

        // Attendre que le DOM soit mis à jour
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Chercher l'élément de document avec plusieurs méthodes
        let element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
        if (!element) {
          // Chercher par différents IDs possibles
          element = tempDiv.querySelector('#terms-document') as HTMLElement || 
                    tempDiv.querySelector('#privacy-document') as HTMLElement ||
                    tempDiv.querySelector('#attestation-document') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('.document-container') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('body > div') as HTMLElement
        }
        if (!element) {
          element = tempDiv.querySelector('div') as HTMLElement
        }
        if (!element) {
          document.body.removeChild(tempDiv)
          throw new Error('Élément de document non trouvé dans le HTML généré')
        }

        const elementId = `temp-privacy-${Date.now()}`
        element.id = elementId
        
        // Attendre que l'ID soit appliqué
        await new Promise((resolve) => setTimeout(resolve, 500))
        
        const pdfBlob = await generatePDFBlobFromHTML(elementId)
        document.body.removeChild(tempDiv)

        // Télécharger le PDF
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `politique_confidentialite_${organization.name.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addToast({
          type: 'success',
          title: 'Politique générée',
          description: 'La politique de confidentialité a été générée avec succès.',
        })
        return
      }

      // Préparer les variables pour le template
      const variables = extractDocumentVariables({
        organization: organization as any,
        language: 'fr',
        issueDate: new Date().toISOString(),
      })

      // Utiliser l'API pour générer le PDF (même système que la page de génération)
      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template,
          variables,
          documentId: undefined,
          organizationId: organization.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
      }

      // Télécharger le PDF
      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `politique_confidentialite_${organization.name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      addToast({
        type: 'success',
        title: 'Politique générée',
        description: 'La politique de confidentialité a été générée avec succès.',
      })
    } catch (error) {
      logger.error('Erreur lors de la génération de la politique de confidentialité', error as Error, {
        organizationId: organization?.id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération de la politique de confidentialité.',
      })
    }
  }

  const handleGenerateAllConventionsZip = async (enrollments: EnrollmentWithRelations[], templateId?: string) => {
    if (!sessionData || !formation || !organization) return

    setIsGeneratingZip(true)
    setZipGenerationProgress({ current: 0, total: enrollments.length + 1 })

    try {
      const pdfBlobs: Array<{ name: string; blob: Blob }> = []

      // Générer la convention générale
      const conventionHTML = await generateConventionHTML({
        session: {
          name: sessionData.name,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        },
        formation: {
          name: formation.name,
          code: formation.code || undefined,
          price: (formation as FormationWithRelations & { price?: number }).price || undefined,
          duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
        },
        program: program ? { name: program.name } : undefined,
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
        organizationId: organization.id,
        templateId,
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = conventionHTML
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const conventionElement = tempDiv.querySelector('[id$="-document"]')
      if (conventionElement) {
        conventionElement.id = `temp-convention-zip-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        const blob = await generatePDFBlobFromHTML(conventionElement.id)
        pdfBlobs.push({ name: 'convention_generale.pdf', blob })
      }

      document.body.removeChild(tempDiv)
      setZipGenerationProgress((prev) => ({ ...prev, current: prev.current + 1 }))

      // Générer les contrats pour chaque inscription
      for (const enrollment of enrollments) {
        const student = enrollment.students
        if (!student) continue

        const contractHTML = await generateContractHTML({
          student: {
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email || undefined,
            phone: student.phone || undefined,
            address: student.address || undefined,
            date_of_birth: student.date_of_birth || undefined,
          },
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
            price: (formation as FormationWithRelations & { price?: number }).price || undefined,
            duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          enrollment: {
            enrollment_date: enrollment.enrollment_date || '',
            total_amount: enrollment.total_amount || 0,
            paid_amount: enrollment.paid_amount || 0,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
          templateId,
        })

        const contractDiv = document.createElement('div')
        contractDiv.innerHTML = contractHTML
        contractDiv.style.position = 'absolute'
        contractDiv.style.left = '-9999px'
        document.body.appendChild(contractDiv)

        const contractElement = contractDiv.querySelector('[id$="-document"]')
        if (contractElement) {
          contractElement.id = `temp-contract-zip-${Date.now()}-${enrollment.id}`
          await new Promise((resolve) => setTimeout(resolve, 500))
          const blob = await generatePDFBlobFromHTML(contractElement.id)
          pdfBlobs.push({ name: `contrat_${student.last_name}_${student.first_name}.pdf`, blob })
        }

        document.body.removeChild(contractDiv)
        setZipGenerationProgress((prev) => ({ ...prev, current: prev.current + 1 }))
      }

      // Créer le ZIP
      await createZipFromPDFs(pdfBlobs, `conventions_contrats_${sessionData.name.replace(/\s+/g, '_')}.zip`)
      
      setLastZipGeneration(new Date())
      addToast({
        type: 'success',
        title: 'ZIP généré',
        description: `Le fichier ZIP contenant ${pdfBlobs.length} document(s) a été généré avec succès.`,
      })
    } catch (error) {
      logger.error('Erreur lors de la génération du ZIP', error as Error, {
        type: 'conventions',
        count: enrollments?.length || 0,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du ZIP.',
      })
    } finally {
      setIsGeneratingZip(false)
      setZipGenerationProgress({ current: 0, total: 0 })
    }
  }

  const handleGenerateAllConvocationsZip = async (enrollments: EnrollmentWithRelations[], templateId?: string) => {
    if (!sessionData || !formation || !organization) return

    setIsGeneratingZip(true)
    setZipGenerationProgress({ current: 0, total: enrollments.length })

    try {
      // Récupérer le template une seule fois pour toutes les convocations
      const templateService = new DocumentTemplateService(createClient())
      let template: DocumentTemplate | null = null
      
      const validTemplateId = typeof templateId === 'string' && templateId.trim() !== '' ? templateId : undefined
      
      if (validTemplateId) {
        template = await templateService.getTemplateById(validTemplateId)
      } else {
        template = await templateService.getDefaultTemplate(organization.id, 'convocation')
      }

      const pdfBlobs: Array<{ name: string; blob: Blob }> = []

      for (const enrollment of enrollments) {
        const student = enrollment.students
        if (!student) continue

        if (template) {
          // Utiliser l'API pour générer le PDF avec le template
          const zipStudentCompany = await fetchStudentCompany(student.id)
          const variables = extractDocumentVariables({
            student: {
              ...student,
              first_name: student.first_name,
              last_name: student.last_name,
              email: student.email || undefined,
              phone: student.phone || undefined,
            } as any,
            session: {
              ...sessionData,
              start_date: sessionData.start_date,
              end_date: sessionData.end_date,
              start_time: sessionData.start_time || undefined,
              end_time: sessionData.end_time || undefined,
              location: sessionData.location || undefined,
            } as any,
            organization: organization as any,
            program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
            company: zipStudentCompany,
            language: 'fr',
            issueDate: new Date().toISOString(),
          })

          const response = await fetch('/api/documents/generate-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              template,
              variables,
              documentId: undefined,
              organizationId: organization.id,
            }),
          })

          if (response.ok) {
            const pdfBlob = await response.blob()
            pdfBlobs.push({ name: `convocation_${student.last_name}_${student.first_name}.pdf`, blob: pdfBlob })
          } else {
            logger.warn('Erreur lors de la génération de la convocation pour un étudiant', { studentId: student.id })
          }
        } else {
          // Fallback : utiliser generateConvocationHTML
          const convocationHTML = await generateConvocationHTML({
            student: {
              first_name: student.first_name,
              last_name: student.last_name,
              email: student.email || undefined,
              phone: student.phone || undefined,
            },
            session: {
              name: sessionData.name,
              start_date: sessionData.start_date,
              end_date: sessionData.end_date,
              start_time: sessionData.start_time || undefined,
              end_time: sessionData.end_time || undefined,
              location: sessionData.location || undefined,
            },
            formation: {
              name: formation.name,
              code: formation.code || undefined,
            },
            program: program ? { name: program.name } : undefined,
            organization: {
              name: organization.name,
              address: organization.address || undefined,
              phone: organization.phone || undefined,
              email: organization.email || undefined,
              logo_url: organization.logo_url || undefined,
            },
            issueDate: new Date().toISOString(),
            language: 'fr',
            organizationId: organization.id,
          })

          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = convocationHTML
          tempDiv.style.position = 'absolute'
          tempDiv.style.left = '-9999px'
          document.body.appendChild(tempDiv)

          const element = tempDiv.querySelector('[id$="-document"]') || tempDiv.querySelector('.document-container') || tempDiv.querySelector('body > div') || tempDiv.querySelector('div')
          if (element) {
            element.id = `temp-convocation-zip-${Date.now()}-${enrollment.id}`
            await new Promise((resolve) => setTimeout(resolve, 500))
            const blob = await generatePDFBlobFromHTML(element.id)
            pdfBlobs.push({ name: `convocation_${student.last_name}_${student.first_name}.pdf`, blob })
          }

          document.body.removeChild(tempDiv)
        }

        setZipGenerationProgress((prev) => ({ ...prev, current: prev.current + 1 }))
      }

      await createZipFromPDFs(pdfBlobs, `convocations_${sessionData.name.replace(/\s+/g, '_')}.zip`)
      
      setLastZipGeneration(new Date())
      addToast({
        type: 'success',
        title: 'ZIP généré',
        description: `Le fichier ZIP contenant ${pdfBlobs.length} convocation(s) a été généré avec succès.`,
      })
    } catch (error) {
      logger.error('Erreur lors de la génération du ZIP', error as Error, {
        type: 'conventions',
        count: enrollments?.length || 0,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du ZIP.',
      })
    } finally {
      setIsGeneratingZip(false)
      setZipGenerationProgress({ current: 0, total: 0 })
    }
  }

  const handleGenerateSessionReport = async (enrollmentsArg: EnrollmentWithRelations[] = []) => {
    if (!sessionData) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Données de session manquantes pour générer le rapport.',
      })
      return
    }

    try {
      const enrol = enrollmentsArg.length > 0 ? enrollmentsArg : enrollments

      // Calculer les statistiques
      const totalEnrollments = enrol.length
      const activeEnrollments = enrol.filter((e) => e.status === 'active' || e.status === 'confirmed').length
      const completedEnrollments = enrol.filter((e) => e.status === 'completed').length
      const attendanceRate = attendanceStats && attendanceStats.total > 0
        ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
        : 0

      // Calculer la moyenne des notes
      const allGrades = grades || []
      let averageGrade: number | undefined
      let averagePercentage: number | undefined
      if (allGrades.length > 0) {
        const totalScore = allGrades.reduce((sum: number, g: any) => {
          const maxScore = Number(g.max_score) || 20
          const score = Number(g.score) || 0
          return sum + (score / maxScore) * 20
        }, 0)
        averageGrade = totalScore / allGrades.length
        averagePercentage = Math.round((averageGrade / 20) * 100)
      }

      // Calculer les finances
      const totalRevenue = enrol.reduce((sum, e) => sum + Number(e.total_amount || 0), 0)
      const paidAmount = enrol.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0)
      const remainingAmount = totalRevenue - paidAmount

      // Préparer la liste des étudiants avec leurs stats
      const students = enrol.map((enrollment) => {
        const student = enrollment.students
        if (!student) return null

        const studentGrades = allGrades.filter((g: any) => g.student_id === enrollment.student_id)
        const studentAvgGrade = studentGrades.length > 0
          ? studentGrades.reduce((sum: number, g: any) => {
              const maxScore = Number(g.max_score) || 20
              const score = Number(g.score) || 0
              return sum + (score / maxScore) * 20
            }, 0) / studentGrades.length
          : undefined

        const studentAttendance = enrollment.student_id && attendanceStats?.byStudent?.[enrollment.student_id]
          ? attendanceStats.byStudent[enrollment.student_id]
          : { present: 0, total: 0 }
        const studentAttendanceRate = studentAttendance.total > 0
          ? Math.round((studentAttendance.present / studentAttendance.total) * 100)
          : 0

        return {
          first_name: student.first_name,
          last_name: student.last_name,
          student_number: student.student_number || undefined,
          email: student.email || undefined,
          attendanceRate: studentAttendanceRate,
          averageGrade: studentAvgGrade,
          paymentStatus: enrollment.payment_status || 'pending',
          enrollmentDate: enrollment.enrollment_date || enrollment.created_at || '',
        }
      }).filter((s) => s !== null) as any[]

      const html = await generateSessionReportHTML({
        session: {
          name: sessionData.name,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          start_time: sessionData.start_time || undefined,
          end_time: sessionData.end_time || undefined,
          location: sessionData.location || undefined,
          status: sessionData.status || 'planned',
        },
        formation: {
          name: formation?.name || 'Formation',
          code: formation?.code || undefined,
          duration_hours: (formation as any)?.duration_hours || undefined,
          price: (formation as any)?.price || undefined,
        },
        program: program ? { name: program.name } : undefined,
        organization: {
          name: organization?.name || 'Organisation',
          address: organization?.address || undefined,
          phone: organization?.phone || undefined,
          email: organization?.email || undefined,
          logo_url: organization?.logo_url || undefined,
        },
        statistics: {
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          attendanceRate,
          averageGrade,
          averagePercentage,
          totalRevenue,
          paidAmount,
          remainingAmount,
        },
        students,
        issueDate: new Date().toISOString(),
        language: 'fr',
        organizationId: organization?.id ?? '',
      })

      // Créer un élément temporaire pour générer le PDF
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

      // Parser le HTML
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const bodyContent = doc.body.innerHTML
      tempDiv.innerHTML = bodyContent

      // Trouver l'élément principal du document
      const element = tempDiv.querySelector('[id$="-document"]') || tempDiv
      const elementId = `temp-session-report-${Date.now()}`
      if (element instanceof HTMLElement) {
        element.id = elementId
        if (!element.style.width) element.style.width = '794px'
        if (!element.style.minHeight) element.style.minHeight = '1123px'
        element.style.backgroundColor = '#ffffff'
      }

      // Attendre que le DOM soit mis à jour
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Générer le PDF en Blob
      const pdfBlob = await generatePDFBlobFromHTML(elementId)

      // Nettoyer
      if (tempDiv.parentNode === document.body) {
        document.body.removeChild(tempDiv)
      }

      // Télécharger le PDF
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rapport_session_${sessionData.name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      addToast({
        type: 'success',
        title: 'Rapport généré',
        description: 'Le rapport de session complet a été généré et téléchargé.',
      })
    } catch (error) {
      logger.error('Erreur lors de la génération du rapport de session', error as Error, {
        sessionId: sessionData?.id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du rapport de session.',
      })
    }
  }

  const handleGenerateCertificate = async (enrollment: EnrollmentWithRelations) => {
    addToast({
      type: 'info',
      title: 'Fonctionnalité à venir',
      description: 'La génération de certificat sera implémentée prochainement.',
    })
  }

  // ==========================================
  // FONCTIONS D'ENVOI PAR EMAIL
  // ==========================================

  /**
   * Prépare les données d'email pour une convocation (sans envoyer)
   */
  const prepareConvocationEmail = (enrollment: EnrollmentWithRelations) => {
    if (!sessionData || !formation || !organization || !enrollment) return null

    const student = enrollment.students
    if (!student || !student.email) return null

    const espaceApprenantUrl = `${APP_URLS.getBaseUrl()}/learner/access/${student.id}`

    const emailSubject = `Convocation - ${sessionData.name}`
    const emailBody = `
      <p>Bonjour ${student.first_name} ${student.last_name},</p>
      <p>Vous êtes convoqué(e) pour la session de formation suivante :</p>
      <ul>
        <li><strong>Formation :</strong> ${formation.name}</li>
        <li><strong>Session :</strong> ${sessionData.name}</li>
        <li><strong>Date de début :</strong> ${formatDate(sessionData.start_date)}</li>
        <li><strong>Date de fin :</strong> ${formatDate(sessionData.end_date)}</li>
        ${sessionData.location ? `<li><strong>Lieu :</strong> ${sessionData.location}</li>` : ''}
      </ul>
      <p>Veuillez trouver ci-joint votre convocation en PDF.</p>
      <p>Retrouvez toutes les informations de votre formation sur votre espace apprenant : <a href="${espaceApprenantUrl}">${espaceApprenantUrl}</a></p>
      <p>Cordialement,<br>${organization.name}</p>
    `

    return {
      to: student.email,
      subject: emailSubject,
      body: emailBody,
      studentName: `${student.first_name} ${student.last_name}`,
      enrollment,
    }
  }

  /**
   * Envoie une convocation par email avec contenu personnalisé
   */
  const handleSendConvocationByEmailWithCustomContent = async (
    enrollment: EnrollmentWithRelations,
    customSubject: string,
    customBody: string,
    templateId?: string
  ) => {
    if (!sessionData || !formation || !organization || !enrollment) return

    const student = enrollment.students
    if (!student) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Données étudiant manquantes.',
      })
      return
    }

    try {
      const templateService = new DocumentTemplateService(createClient())
      // Utiliser le même template que celui sélectionné pour le téléchargement
      // (une organisation a souvent plusieurs modèles de convocation — un par
      // type d'examen/formation, avec des horaires différents en dur dans le
      // contenu). Sans ce paramètre, l'email utilisait toujours le modèle
      // "par défaut" de l'organisation au lieu de celui choisi par l'utilisateur,
      // d'où un contenu (et une heure) différents de la version téléchargée.
      const template = templateId
        ? await templateService.getTemplateById(templateId)
        : await templateService.getDefaultTemplate(organization.id, 'convocation')

      let pdfBlob: Blob

      if (template) {
        // Même pipeline que le téléchargement : API generate-pdf (Puppeteer) avec le
        // jeu complet de variables (extractDocumentVariables). Sans ça, le template
        // personnalisé de l'organisation (balises ecole_*/eleve_*/convocation_*) ne
        // recevait que le petit jeu de variables codées en dur de generateConvocationHTML
        // et restait rempli de balises {xxx} non remplacées dans l'email envoyé.
        const emailConvocationCompany = await fetchStudentCompany(student.id)
        const variables = extractDocumentVariables({
          student: student as any,
          session: {
            ...sessionData,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            start_time: sessionData.start_time || undefined,
            end_time: sessionData.end_time || undefined,
            location: sessionData.location || undefined,
            formations: formation,
          } as any,
          organization: organization as any,
          program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
          company: emailConvocationCompany,
          language: 'fr',
          issueDate: new Date().toISOString(),
        })

        const response = await fetch('/api/documents/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template, variables, documentId: undefined, organizationId: organization.id }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
          throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
        }

        pdfBlob = await response.blob()
      } else {
        // Fallback : pas de template personnalisé, génération client avec le template
        // codé en dur (variables cohérentes entre elles dans ce cas)
        const html = await generateConvocationHTML({
          student: {
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email || undefined,
            phone: student.phone || undefined,
          },
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            start_time: sessionData.start_time || undefined,
            end_time: sessionData.end_time || undefined,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
        })

        // generateConvocationHTML retourne un document HTML complet — utiliser DOMParser
        // (même approche que physical-attendance-sheet-downloader)
        const tempId = `temp-convocation-email-${Date.now()}`
        const tempDiv = document.createElement('div')
        tempDiv.id = tempId
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '0'
        tempDiv.style.width = '794px'
        tempDiv.style.minHeight = '297mm'
        tempDiv.style.backgroundColor = 'white'
        const parsed = new DOMParser().parseFromString(html, 'text/html')
        tempDiv.appendChild(parsed.documentElement)
        document.body.appendChild(tempDiv)

        try {
          await new Promise((resolve) => setTimeout(resolve, 500))
          pdfBlob = await generatePDFBlobFromHTML(tempId)
        } finally {
          document.body.removeChild(tempDiv)
        }
      }

      // Convertir le texte en HTML si nécessaire (ajouter des retours à la ligne)
      const emailBodyHTML = toEmailBodyHTML(customBody)

      // Envoyer l'email avec le contenu personnalisé
      await emailService.sendDocument(
        student.email || '',
        customSubject,
        pdfBlob,
        `convocation_${student.last_name}_${student.first_name}.pdf`,
        emailBodyHTML,
        undefined,
        'convocation'
      )

      await markEnrollmentDocumentSent(enrollment.id, 'convocation_sent_at')
      queryClient.invalidateQueries({ queryKey: ['session-enrollments', sessionData.id] })

      addToast({
        type: 'success',
        title: 'Email envoyé',
        description: `La convocation a été envoyée à ${student.email || 'l\'adresse spécifiée'}.`,
      })
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la convocation par email', error as Error, {
        enrollmentId: enrollment.id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'envoi de l\'email.',
      })
    }
  }

  /**
   * Envoie une convocation par email à un étudiant
   */
  const handleSendConvocationByEmail = async (enrollment: EnrollmentWithRelations, templateId?: string) => {
    if (!sessionData || !formation || !organization || !enrollment) return

    const student = enrollment.students
    if (!student || !student.email) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'L\'étudiant n\'a pas d\'adresse email.',
      })
      return
    }

    try {
      const templateService = new DocumentTemplateService(createClient())
      // cf. handleSendConvocationByEmailWithCustomContent : utiliser le même
      // template que celui sélectionné pour le téléchargement.
      const template = templateId
        ? await templateService.getTemplateById(templateId)
        : await templateService.getDefaultTemplate(organization.id, 'convocation')

      let pdfBlob2: Blob

      if (template) {
        // Même pipeline que le téléchargement : API generate-pdf (Puppeteer) avec le
        // jeu complet de variables (extractDocumentVariables), sinon le template
        // personnalisé de l'organisation reste rempli de balises {xxx} non remplacées.
        const emailConvocationCompany = await fetchStudentCompany(student.id)
        const variables = extractDocumentVariables({
          student: student as any,
          session: {
            ...sessionData,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            start_time: sessionData.start_time || undefined,
            end_time: sessionData.end_time || undefined,
            location: sessionData.location || undefined,
            formations: formation,
          } as any,
          organization: organization as any,
          program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
          company: emailConvocationCompany,
          language: 'fr',
          issueDate: new Date().toISOString(),
        })

        const response = await fetch('/api/documents/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template, variables, documentId: undefined, organizationId: organization.id }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
          throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
        }

        pdfBlob2 = await response.blob()
      } else {
        // Fallback : pas de template personnalisé, génération client avec le template
        // codé en dur (variables cohérentes entre elles dans ce cas)
        const html = await generateConvocationHTML({
          student: {
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email || undefined,
            phone: student.phone || undefined,
          },
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            start_time: sessionData.start_time || undefined,
            end_time: sessionData.end_time || undefined,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
        })

        // generateConvocationHTML retourne un document HTML complet — utiliser DOMParser
        // (même approche que physical-attendance-sheet-downloader)
        const tempId2 = `temp-convocation-email-${Date.now()}`
        const tempDiv = document.createElement('div')
        tempDiv.id = tempId2
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '0'
        tempDiv.style.width = '794px'
        tempDiv.style.minHeight = '297mm'
        tempDiv.style.backgroundColor = 'white'
        const parsed2 = new DOMParser().parseFromString(html, 'text/html')
        tempDiv.appendChild(parsed2.documentElement)
        document.body.appendChild(tempDiv)

        try {
          await new Promise((resolve) => setTimeout(resolve, 500))
          pdfBlob2 = await generatePDFBlobFromHTML(tempId2)
        } finally {
          document.body.removeChild(tempDiv)
        }
      }

      // Créer le corps de l'email
      const espaceApprenantUrl = `${APP_URLS.getBaseUrl()}/learner/access/${student.id}`
      const emailSubject = `Convocation - ${sessionData.name}`
      const emailBody = `
        <p>Bonjour ${student.first_name} ${student.last_name},</p>
        <p>Vous êtes convoqué(e) pour la session de formation suivante :</p>
        <ul>
          <li><strong>Formation :</strong> ${formation.name}</li>
          <li><strong>Session :</strong> ${sessionData.name}</li>
          <li><strong>Date de début :</strong> ${formatDate(sessionData.start_date)}</li>
          <li><strong>Date de fin :</strong> ${formatDate(sessionData.end_date)}</li>
          ${sessionData.location ? `<li><strong>Lieu :</strong> ${sessionData.location}</li>` : ''}
        </ul>
        <p>Veuillez trouver ci-joint votre convocation en PDF.</p>
        <p>Retrouvez toutes les informations de votre formation sur votre espace apprenant : <a href="${espaceApprenantUrl}">${espaceApprenantUrl}</a></p>
        <p>Cordialement,<br>${organization.name}</p>
      `

      // Envoyer l'email
      await emailService.sendDocument(
        student.email,
        emailSubject,
        pdfBlob2,
        `convocation_${student.last_name}_${student.first_name}.pdf`,
        emailBody,
        undefined,
        'convocation'
      )

      await markEnrollmentDocumentSent(enrollment.id, 'convocation_sent_at')
      queryClient.invalidateQueries({ queryKey: ['session-enrollments', sessionData.id] })

      addToast({
        type: 'success',
        title: 'Email envoyé',
        description: `La convocation a été envoyée à ${student.email}.`,
      })
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la convocation par email', error as Error, {
        enrollmentId: enrollment.id,
        studentId: enrollment.student_id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'envoi de l\'email.',
      })
    }
  }

  /**
   * Envoie toutes les convocations par email (groupé)
   */
  const handleSendAllConvocationsByEmail = async (
    enrollments: EnrollmentWithRelations[],
    documentTemplateId?: string,
    emailTemplateId?: string,
    customSubject?: string,
    customBody?: string
  ) => {
    if (!sessionData || !formation || !organization) return

    const validEnrollments = enrollments.filter(
      (e) => e.students && e.students.email && e.status !== 'cancelled'
    )

    if (validEnrollments.length === 0) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Aucun étudiant avec une adresse email valide trouvé.',
      })
      return
    }

    setIsGeneratingZip(true)
    setZipGenerationProgress({ current: 0, total: validEnrollments.length })

    try {
      let successCount = 0
      let errorCount = 0

      for (const enrollment of validEnrollments) {
        try {
          const student = enrollment.students
          if (!student) continue

          // Si un contenu personnalisé est fourni, l'utiliser
          if (customSubject && customBody) {
            // Remplacer les variables dans le sujet et le corps
            let subject = customSubject
            let body = customBody

            // Jours restants avant le début de la session (arrondi), pour la
            // balise {days_before} héritée du modèle "Rappel de session"
            const daysBefore = sessionData.start_date
              ? Math.max(0, Math.ceil((new Date(sessionData.start_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
              : 0
            const espaceApprenantUrl = `${APP_URLS.getBaseUrl()}/learner/access/${student.id}`

            const applyTags = (text: string) => text
              .replace(/{student_first_name}/g, student.first_name || '')
              .replace(/{student_last_name}/g, student.last_name || '')
              .replace(/{student_name}/g, `${student.first_name || ''} ${student.last_name || ''}`.trim())
              .replace(/{session_name}/g, sessionData.name || '')
              .replace(/{formation_name}/g, formation.name || '')
              .replace(/{session_start_date}/g, sessionData.start_date ? formatDate(sessionData.start_date) : '')
              .replace(/{session_end_date}/g, sessionData.end_date ? formatDate(sessionData.end_date) : '')
              .replace(/{session_start_time}/g, sessionData.start_time || '')
              .replace(/{session_location}/g, sessionData.location || '')
              .replace(/{days_before}/g, String(daysBefore))
              .replace(/{espace_apprenant}/g, espaceApprenantUrl)

            subject = applyTags(subject)
            body = applyTags(body)

            await handleSendConvocationByEmailWithCustomContent(enrollment, subject, body, documentTemplateId)
          } else {
            // Utiliser le comportement par défaut
            await handleSendConvocationByEmail(enrollment, documentTemplateId)
          }
          successCount++
        } catch (error) {
          errorCount++
          logger.error('Erreur lors de l\'envoi de la convocation', error as Error, {
            enrollmentId: enrollment.id,
          })
        }
        setZipGenerationProgress((prev) => ({ ...prev, current: prev.current + 1 }))
      }

      addToast({
        type: successCount > 0 ? 'success' : 'error',
        title: 'Envoi terminé',
        description: `${successCount} email(s) envoyé(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}.`,
      })
    } catch (error) {
      logger.error('Erreur lors de l\'envoi groupé des convocations', error as Error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'envoi groupé.',
      })
    } finally {
      setIsGeneratingZip(false)
      setZipGenerationProgress({ current: 0, total: 0 })
    }
  }

  /**
   * Prépare les données d'email pour un contrat (sans envoyer)
   */
  const prepareContractEmail = (enrollment: EnrollmentWithRelations) => {
    if (!sessionData || !formation || !organization || !enrollment) return null

    const student = enrollment.students
    if (!student || !student.email) return null

    const emailSubject = `Contrat de formation - ${formation.name}`
    const emailBody = `
      <p>Bonjour ${student.first_name} ${student.last_name},</p>
      <p>Veuillez trouver ci-joint votre contrat de formation pour la session "${sessionData.name}".</p>
      <p>Cordialement,<br>${organization.name}</p>
    `

    return {
      to: student.email,
      subject: emailSubject,
      body: emailBody,
      studentName: `${student.first_name} ${student.last_name}`,
      enrollment,
    }
  }

  /**
   * Envoie un contrat par email avec contenu personnalisé.
   * Utilise la même génération PDF que le téléchargement (API Puppeteer) pour un rendu identique.
   */
  const handleSendContractByEmailWithCustomContent = async (
    enrollment: EnrollmentWithRelations,
    customSubject: string,
    customBody: string,
    templateId?: string
  ) => {
    if (!sessionData || !formation || !organization || !enrollment) return

    const student = enrollment.students
    if (!student) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Données étudiant manquantes.',
      })
      return
    }

    try {
      const templateService = new DocumentTemplateService(createClient())
      // Utiliser le même template que celui sélectionné pour le téléchargement
      // (cf. handleSendConvocationByEmailWithCustomContent pour le même correctif
      // côté convocations : sans ce paramètre, l'email ignorait le modèle choisi
      // par l'utilisateur et utilisait toujours le modèle "par défaut").
      const template = templateId
        ? await templateService.getTemplateById(templateId)
        : await templateService.getDefaultTemplate(organization.id, 'contrat')

      let pdfBlob: Blob

      if (template) {
        // Même pipeline que le téléchargement : API generate-pdf (Puppeteer) pour un PDF identique
        const emailContractCompany = await fetchStudentCompany(student.id)
        const variables = extractDocumentVariables({
          student: student as any,
          session: {
            ...sessionData,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            location: sessionData.location || undefined,
          } as any,
          organization: organization as any,
          program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
          company: emailContractCompany,
          language: 'fr',
          issueDate: new Date().toISOString(),
        })

        const response = await fetch('/api/documents/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template,
            variables,
            documentId: undefined,
            organizationId: organization.id,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
          throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
        }

        pdfBlob = await response.blob()
      } else {
        // Fallback : template par défaut (génération client html2canvas)
        const html = await generateContractHTML({
          student: {
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email || undefined,
            phone: student.phone || undefined,
            address: student.address || undefined,
            date_of_birth: student.date_of_birth || undefined,
          },
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
            price: (formation as FormationWithRelations & { price?: number }).price || undefined,
            duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          enrollment: {
            enrollment_date: enrollment.enrollment_date || '',
            total_amount: enrollment.total_amount || 0,
            paid_amount: enrollment.paid_amount || 0,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
        })

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.style.width = '210mm'
        tempDiv.style.minHeight = '297mm'
        document.body.appendChild(tempDiv)
        await new Promise((resolve) => setTimeout(resolve, 100))

        const element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
          || tempDiv.querySelector('#contract-document') as HTMLElement
          || tempDiv.querySelector('div') as HTMLElement
        if (!element) {
          document.body.removeChild(tempDiv)
          throw new Error('Élément de document non trouvé dans le HTML généré')
        }
        element.id = `temp-contract-email-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        pdfBlob = await generatePDFBlobFromHTML(element.id)
        document.body.removeChild(tempDiv)
      }

      const emailBodyHTML = toEmailBodyHTML(customBody)
      await emailService.sendDocument(
        student.email || '',
        customSubject,
        pdfBlob,
        `contrat_${student.last_name}_${student.first_name}.pdf`,
        emailBodyHTML,
        undefined,
        'contrat'
      )

      await markEnrollmentDocumentSent(enrollment.id, 'contract_sent_at')
      // Suivi commercial CRM : une convention envoyée fait progresser automatiquement
      // le statut du prospect. Ne doit jamais faire échouer l'envoi réel.
      try {
        await autoAdvanceProspectCommercialStatus(organization.id, student.id, 'convention_envoyee')
      } catch (crmError) {
        logger.error('Erreur mise à jour statut commercial CRM (convention envoyée):', crmError as Error)
      }
      queryClient.invalidateQueries({ queryKey: ['session-enrollments', sessionData.id] })

      addToast({
        type: 'success',
        title: 'Email envoyé',
        description: `Le contrat a été envoyé à ${student.email || 'l\'adresse spécifiée'}.`,
      })
    } catch (error) {
      logger.error('Erreur lors de l\'envoi du contrat par email', error as Error, {
        enrollmentId: enrollment.id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'envoi de l\'email.',
      })
    }
  }

  /**
   * Envoie tous les contrats par email (groupé)
   */
  const handleSendAllContractsByEmail = async (
    enrollments: EnrollmentWithRelations[],
    customSubject?: string,
    customBody?: string,
    templateId?: string
  ) => {
    if (!sessionData || !formation || !organization) return

    const validEnrollments = enrollments.filter(
      (e) => e.students && e.students.email && e.status !== 'cancelled'
    )

    if (validEnrollments.length === 0) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Aucun étudiant avec une adresse email valide trouvé.',
      })
      return
    }

    setIsGeneratingZip(true)
    setZipGenerationProgress({ current: 0, total: validEnrollments.length })

    try {
      let successCount = 0
      let errorCount = 0

      for (const enrollment of validEnrollments) {
        try {
          const student = enrollment.students
          if (!student) continue

          // Si un contenu personnalisé est fourni, l'utiliser
          if (customSubject && customBody) {
            // Remplacer les variables dans le sujet et le corps
            let subject = customSubject
            let body = customBody

            // Remplacer les variables
            subject = subject
              .replace(/{student_first_name}/g, student.first_name || '')
              .replace(/{student_last_name}/g, student.last_name || '')
              .replace(/{session_name}/g, sessionData.name || '')
              .replace(/{formation_name}/g, formation.name || '')
              .replace(/{session_start_date}/g, sessionData.start_date ? formatDate(sessionData.start_date) : '')
              .replace(/{session_end_date}/g, sessionData.end_date ? formatDate(sessionData.end_date) : '')
              .replace(/{session_location}/g, sessionData.location || '')

            body = body
              .replace(/{student_first_name}/g, student.first_name || '')
              .replace(/{student_last_name}/g, student.last_name || '')
              .replace(/{session_name}/g, sessionData.name || '')
              .replace(/{formation_name}/g, formation.name || '')
              .replace(/{session_start_date}/g, sessionData.start_date ? formatDate(sessionData.start_date) : '')
              .replace(/{session_end_date}/g, sessionData.end_date ? formatDate(sessionData.end_date) : '')
              .replace(/{session_location}/g, sessionData.location || '')

            await handleSendContractByEmailWithCustomContent(enrollment, subject, body, templateId)
          } else {
            // Utiliser le comportement par défaut
            await handleSendContractByEmail(enrollment, templateId)
          }
          successCount++
        } catch (error) {
          errorCount++
          logger.error('Erreur lors de l\'envoi du contrat', error as Error, {
            enrollmentId: enrollment.id,
          })
        }
        setZipGenerationProgress((prev) => ({ ...prev, current: prev.current + 1 }))
      }

      addToast({
        type: successCount > 0 ? 'success' : 'error',
        title: 'Envoi terminé',
        description: `${successCount} email(s) envoyé(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}.`,
      })
    } catch (error) {
      logger.error('Erreur lors de l\'envoi groupé des contrats', error as Error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'envoi groupé.',
      })
    } finally {
      setIsGeneratingZip(false)
      setZipGenerationProgress({ current: 0, total: 0 })
    }
  }

  /**
   * Génère un PDF (contrat ou convention) pour envoi en demande de signature.
   * Utilise le même pipeline que le téléchargement (API /api/documents/generate-pdf) avec fallback html2canvas.
   * @returns { blob, documentTitle }
   */
  const generatePdfBlobForSignatureRequest = async (params: {
    type: 'contract' | 'convention'
    enrollment?: EnrollmentWithRelations
    templateId?: string
  }): Promise<{ blob: Blob; documentTitle: string }> => {
    const { type, enrollment, templateId } = params
    if (!sessionData || !formation || !organization) {
      throw new Error('Données manquantes pour générer le document.')
    }
    if (type === 'contract' && !enrollment) {
      throw new Error('Inscription manquante pour générer le contrat.')
    }

    const templateService = new DocumentTemplateService(createClient())
    const student = type === 'contract' ? enrollment!.students : null

    if (type === 'contract' && student) {
      const template: DocumentTemplate | null = templateId
        ? await templateService.getTemplateById(templateId)
        : await templateService.getDefaultTemplate(organization.id, 'contrat')

      if (template) {
        const previewContractCompany = await fetchStudentCompany(student.id)
        const variables = extractDocumentVariables({
          student: student as any,
          session: {
            ...sessionData,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            location: sessionData.location || undefined,
          } as any,
          organization: organization as any,
          program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
          company: previewContractCompany,
          language: 'fr',
          issueDate: new Date().toISOString(),
          enrollmentAmount: enrollment!.total_amount || undefined,
        })
        const response = await fetch('/api/documents/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            template,
            variables,
            documentId: undefined,
            organizationId: organization.id,
          }),
        })
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
          throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
        }
        const blob = await response.blob()
        return {
          blob,
          documentTitle: `Contrat de formation - ${student.first_name} ${student.last_name}`,
        }
      }

      const html = await generateContractHTML({
        student: {
          first_name: student.first_name,
          last_name: student.last_name,
          email: student.email || undefined,
          phone: student.phone || undefined,
          address: student.address || undefined,
          date_of_birth: student.date_of_birth || undefined,
        },
        session: {
          name: sessionData.name,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        },
        formation: {
          name: formation.name,
          code: formation.code || undefined,
          price: (formation as FormationWithRelations & { price?: number }).price || undefined,
          duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
        },
        program: program ? { name: program.name } : undefined,
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        enrollment: {
          enrollment_date: enrollment!.enrollment_date || '',
          total_amount: enrollment!.total_amount || 0,
          paid_amount: enrollment!.paid_amount || 0,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
        organizationId: organization.id,
        templateId,
      })
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '210mm'
      tempDiv.style.minHeight = '297mm'
      document.body.appendChild(tempDiv)
      await new Promise((resolve) => setTimeout(resolve, 100))
      const element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
        || tempDiv.querySelector('#contract-document') as HTMLElement
        || tempDiv.querySelector('div') as HTMLElement
      if (!element) {
        document.body.removeChild(tempDiv)
        throw new Error('Élément de document non trouvé dans le HTML généré')
      }
      element.id = `temp-contract-sign-${Date.now()}`
      await new Promise((resolve) => setTimeout(resolve, 500))
      const blob = await generatePDFBlobFromHTML(element.id)
      document.body.removeChild(tempDiv)
      return {
        blob,
        documentTitle: `Contrat de formation - ${student.first_name} ${student.last_name}`,
      }
    }

    // convention
    const template: DocumentTemplate | null = templateId
      ? await templateService.getTemplateById(templateId)
      : await templateService.getDefaultTemplate(organization.id, 'convention')

    if (template) {
      const variables = extractDocumentVariables({
        session: {
          ...sessionData,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        } as any,
        organization: organization as any,
        program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
        language: 'fr',
        issueDate: new Date().toISOString(),
      })
      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          variables,
          documentId: undefined,
          organizationId: organization.id,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
      }
      const blob = await response.blob()
      return {
        blob,
        documentTitle: `Convention de formation - ${sessionData.name || ''}`,
      }
    }

    const html = await generateConventionHTML({
      session: {
        name: sessionData.name,
        start_date: sessionData.start_date,
        end_date: sessionData.end_date,
        location: sessionData.location || undefined,
      },
      formation: {
        name: formation.name,
        code: formation.code || undefined,
        price: (formation as FormationWithRelations & { price?: number }).price || undefined,
        duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
      },
      program: program ? { name: program.name } : undefined,
      organization: {
        name: organization.name,
        address: organization.address || undefined,
        phone: organization.phone || undefined,
        email: organization.email || undefined,
        logo_url: organization.logo_url || undefined,
      },
      issueDate: new Date().toISOString(),
      language: 'fr',
      organizationId: organization.id,
      templateId,
    })
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '-9999px'
    tempDiv.style.width = '210mm'
    tempDiv.style.minHeight = '297mm'
    document.body.appendChild(tempDiv)
    await new Promise((resolve) => setTimeout(resolve, 100))
    const element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
      || tempDiv.querySelector('#convention-document') as HTMLElement
      || tempDiv.querySelector('div') as HTMLElement
    if (!element) {
      document.body.removeChild(tempDiv)
      throw new Error('Élément de document non trouvé dans le HTML généré')
    }
    element.id = `temp-convention-sign-${Date.now()}`
    await new Promise((resolve) => setTimeout(resolve, 500))
    const blob = await generatePDFBlobFromHTML(element.id)
    document.body.removeChild(tempDiv)
    return {
      blob,
      documentTitle: `Convention de formation - ${sessionData.name || ''}`,
    }
  }

  /**
   * Envoie un contrat par email
   */
  const handleSendContractByEmail = async (enrollment: EnrollmentWithRelations, templateId?: string) => {
    if (!sessionData || !formation || !organization || !enrollment) return

    const student = enrollment.students
    if (!student || !student.email) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'L\'étudiant n\'a pas d\'adresse email.',
      })
      return
    }

    try {
      const templateService = new DocumentTemplateService(createClient())
      // cf. handleSendContractByEmailWithCustomContent : utiliser le même
      // template que celui sélectionné pour le téléchargement.
      const template = templateId
        ? await templateService.getTemplateById(templateId)
        : await templateService.getDefaultTemplate(organization.id, 'contrat')

      let pdfBlob: Blob

      if (template) {
        // Même pipeline que le téléchargement : API generate-pdf (Puppeteer) avec le
        // jeu complet de variables (extractDocumentVariables), sinon le template
        // personnalisé de l'organisation reste rempli de balises {xxx} non remplacées.
        const emailContractCompany = await fetchStudentCompany(student.id)
        const variables = extractDocumentVariables({
          student: student as any,
          session: {
            ...sessionData,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            location: sessionData.location || undefined,
          } as any,
          organization: organization as any,
          program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
          company: emailContractCompany,
          language: 'fr',
          issueDate: new Date().toISOString(),
        })

        const response = await fetch('/api/documents/generate-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ template, variables, documentId: undefined, organizationId: organization.id }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
          throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
        }

        pdfBlob = await response.blob()
      } else {
        // Fallback : pas de template personnalisé, génération client avec le template
        // codé en dur (variables cohérentes entre elles dans ce cas)
        const html = await generateContractHTML({
          student: {
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email || undefined,
            phone: student.phone || undefined,
            address: student.address || undefined,
            date_of_birth: student.date_of_birth || undefined,
          },
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
            price: (formation as FormationWithRelations & { price?: number }).price || undefined,
            duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          enrollment: {
            enrollment_date: enrollment.enrollment_date || '',
            total_amount: enrollment.total_amount || 0,
            paid_amount: enrollment.paid_amount || 0,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
        })

        // Créer un élément temporaire pour générer le PDF
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.style.width = '210mm'
        tempDiv.style.minHeight = '297mm'
        document.body.appendChild(tempDiv)

        // Attendre que le DOM soit mis à jour
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Chercher l'élément de document
        let element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
        if (!element) {
          // Essayer de chercher directement par ID
          element = tempDiv.querySelector('#contract-document') as HTMLElement
        }
        if (!element) {
          // Si toujours pas trouvé, utiliser le premier div
          element = tempDiv.querySelector('div') as HTMLElement
        }
        if (!element) {
          document.body.removeChild(tempDiv)
          throw new Error('Élément de document non trouvé dans le HTML généré')
        }

        const elementId = `temp-contract-email-${Date.now()}`
        element.id = elementId

        // Attendre que l'ID soit appliqué
        await new Promise((resolve) => setTimeout(resolve, 500))

        pdfBlob = await generatePDFBlobFromHTML(elementId)
        document.body.removeChild(tempDiv)
      }

      const emailSubject = `Contrat de formation - ${formation.name}`
      const emailBody = `
        <p>Bonjour ${student.first_name} ${student.last_name},</p>
        <p>Veuillez trouver ci-joint votre contrat de formation pour la session "${sessionData.name}".</p>
        <p>Cordialement,<br>${organization.name}</p>
      `

      await emailService.sendDocument(
        student.email,
        emailSubject,
        pdfBlob,
        `contrat_${student.last_name}_${student.first_name}.pdf`,
        emailBody,
        undefined,
        'contrat'
      )

      await markEnrollmentDocumentSent(enrollment.id, 'contract_sent_at')
      // Suivi commercial CRM : une convention envoyée fait progresser automatiquement
      // le statut du prospect. Ne doit jamais faire échouer l'envoi réel.
      try {
        await autoAdvanceProspectCommercialStatus(organization.id, student.id, 'convention_envoyee')
      } catch (crmError) {
        logger.error('Erreur mise à jour statut commercial CRM (convention envoyée):', crmError as Error)
      }
      queryClient.invalidateQueries({ queryKey: ['session-enrollments', sessionData.id] })

      addToast({
        type: 'success',
        title: 'Email envoyé',
        description: `Le contrat a été envoyé à ${student.email}.`,
      })
    } catch (error) {
      logger.error('Erreur lors de l\'envoi du contrat par email', error as Error, {
        enrollmentId: enrollment.id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'envoi de l\'email.',
      })
    }
  }

  // Convention individuelle pour un apprenant rattaché à une entreprise
  const handleGenerateConventionForEnrollment = async (enrollment: EnrollmentWithRelations, templateId?: string) => {
    if (!sessionData || !formation || !organization || !enrollment) return

    const student = enrollment.students
    if (!student) return

    try {
      const templateService = new DocumentTemplateService(createClient())
      let template: DocumentTemplate | null = null

      if (templateId) {
        template = await templateService.getTemplateById(templateId)
      } else {
        template = await templateService.getDefaultTemplate(organization.id, 'convention')
      }

      if (!template) {
        const html = await generateContractHTML({
          student: {
            first_name: student.first_name,
            last_name: student.last_name,
            email: student.email || undefined,
            phone: student.phone || undefined,
            address: student.address || undefined,
            date_of_birth: student.date_of_birth || undefined,
          },
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
            price: (formation as FormationWithRelations & { price?: number }).price || undefined,
            duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          enrollment: {
            enrollment_date: enrollment.enrollment_date || '',
            total_amount: enrollment.total_amount || 0,
            paid_amount: enrollment.paid_amount || 0,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
          templateId,
        })

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.style.width = '210mm'
        tempDiv.style.minHeight = '297mm'
        document.body.appendChild(tempDiv)
        await new Promise((resolve) => setTimeout(resolve, 100))

        let element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
        if (!element) element = tempDiv.querySelector('.document-container') as HTMLElement
        if (!element) element = tempDiv.querySelector('div') as HTMLElement
        if (!element) { document.body.removeChild(tempDiv); throw new Error('Élément de document non trouvé') }

        const elementId = `temp-convention-${Date.now()}`
        element.id = elementId
        await new Promise((resolve) => setTimeout(resolve, 500))

        const pdfBlob = await generatePDFBlobFromHTML(elementId)
        document.body.removeChild(tempDiv)

        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `convention_${student.last_name}_${student.first_name}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addToast({ type: 'success', title: 'Convention générée', description: 'La convention a été générée et téléchargée avec succès.' })
        return
      }

      const conventionStudentCompany = await fetchStudentCompany(student.id)
      const variables = extractDocumentVariables({
        student: student as any,
        session: {
          ...sessionData,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        } as any,
        organization: organization as any,
        program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
        company: conventionStudentCompany,
        language: 'fr',
        issueDate: new Date().toISOString(),
        enrollmentAmount: enrollment.total_amount || undefined,
      })

      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, variables, documentId: undefined, organizationId: organization.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
      }

      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `convention_${student.last_name}_${student.first_name}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      addToast({ type: 'success', title: 'Convention générée', description: 'La convention a été générée et téléchargée avec succès.' })
    } catch (error) {
      logger.error('Erreur lors de la génération de la convention', error as Error, {
        enrollmentId: enrollment.id,
        studentId: enrollment.student_id,
      })
      addToast({ type: 'error', title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération de la convention.' })
    }
  }

  /**
   * Génère une convention pour une entreprise inscrite à la session sans
   * liste nominative (session_entity_reservations, cf. bloc "Entreprises
   * inscrites" de config-apprenants.tsx) — pas d'étudiant, l'entreprise est
   * directement la partie prenante de la convention.
   */
  const handleGenerateConventionForEntity = async (reservation: SessionEntityReservation, templateId?: string) => {
    if (!sessionData || !formation || !organization) {
      addToast({ type: 'error', title: 'Erreur', description: 'Données manquantes pour générer la convention.' })
      return
    }

    const entityName = reservation.external_entities?.name || 'Entreprise'

    try {
      const templateService = new DocumentTemplateService(createClient())
      let template: DocumentTemplate | null = null

      if (templateId) {
        template = await templateService.getTemplateById(templateId)
      } else {
        template = await templateService.getDefaultTemplate(organization.id, 'convention')
      }

      const entityCompany = await fetchEntityCompany(reservation.entity_id)

      if (!template) {
        // Fallback : generateConventionHTML ne requiert pas de student, l'entreprise
        // est portée par les variables entreprise_* (cf variable-extractor.ts)
        const html = await generateConventionHTML({
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
            price: (formation as FormationWithRelations & { price?: number }).price || undefined,
            duration_hours: (formation as FormationWithRelations & { duration_hours?: number }).duration_hours || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
          templateId,
        })

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.style.width = '210mm'
        tempDiv.style.minHeight = '297mm'
        document.body.appendChild(tempDiv)
        await new Promise((resolve) => setTimeout(resolve, 100))

        let element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
        if (!element) element = tempDiv.querySelector('.document-container') as HTMLElement
        if (!element) element = tempDiv.querySelector('div') as HTMLElement
        if (!element) { document.body.removeChild(tempDiv); throw new Error('Élément de document non trouvé') }

        const elementId = `temp-convention-entity-${Date.now()}`
        element.id = elementId
        await new Promise((resolve) => setTimeout(resolve, 500))

        const pdfBlob = await generatePDFBlobFromHTML(elementId)
        document.body.removeChild(tempDiv)

        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `convention_${entityName.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addToast({ type: 'success', title: 'Convention générée', description: 'La convention a été générée et téléchargée avec succès.' })
        return
      }

      const variables = extractDocumentVariables({
        session: {
          ...sessionData,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          location: sessionData.location || undefined,
        } as any,
        organization: organization as any,
        program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
        company: entityCompany,
        language: 'fr',
        issueDate: new Date().toISOString(),
        effectif: reservation.expected_count || undefined,
        enrollmentAmount: reservation.total_amount || undefined,
      })

      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, variables, documentId: undefined, organizationId: organization.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
      }

      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `convention_${entityName.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      addToast({ type: 'success', title: 'Convention générée', description: 'La convention a été générée et téléchargée avec succès.' })
    } catch (error) {
      logger.error('Erreur lors de la génération de la convention entreprise', error as Error, {
        entityId: reservation.entity_id,
        sessionId: sessionData?.id,
      })
      addToast({ type: 'error', title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération de la convention.' })
    }
  }

  /**
   * Génère une convocation pour une entreprise inscrite à la session sans
   * liste nominative — adressée à l'entreprise elle-même (pas de nom
   * d'apprenant disponible, c'est tout l'intérêt de cette table).
   */
  const handleGenerateConvocationForEntity = async (reservation: SessionEntityReservation, templateId?: string) => {
    if (!sessionData || !formation || !organization) {
      addToast({ type: 'error', title: 'Erreur', description: 'Données manquantes pour générer la convocation.' })
      return
    }

    const entityName = reservation.external_entities?.name || 'Entreprise'

    try {
      const templateService = new DocumentTemplateService(createClient())
      let template: DocumentTemplate | null = null

      if (templateId) {
        template = await templateService.getTemplateById(templateId)
      } else {
        template = await templateService.getDefaultTemplate(organization.id, 'convocation')
      }

      const entityCompany = await fetchEntityCompany(reservation.entity_id)

      if (!template) {
        // Fallback : generateConvocationHTML requiert un student (nom du destinataire) ;
        // on utilise le nom de l'entreprise comme destinataire faute d'apprenant nommé.
        const html = await generateConvocationHTML({
          student: {
            first_name: entityName,
            last_name: '',
            email: entityCompany?.email || undefined,
            phone: entityCompany?.phone || undefined,
          },
          session: {
            name: sessionData.name,
            start_date: sessionData.start_date,
            end_date: sessionData.end_date,
            start_time: sessionData.start_time || undefined,
            end_time: sessionData.end_time || undefined,
            location: sessionData.location || undefined,
          },
          formation: {
            name: formation.name,
            code: formation.code || undefined,
          },
          program: program ? { name: program.name } : undefined,
          organization: {
            name: organization.name,
            address: organization.address || undefined,
            phone: organization.phone || undefined,
            email: organization.email || undefined,
            logo_url: organization.logo_url || undefined,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
          organizationId: organization.id,
        })

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = html
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        tempDiv.style.top = '-9999px'
        tempDiv.style.width = '210mm'
        tempDiv.style.minHeight = '297mm'
        document.body.appendChild(tempDiv)
        await new Promise((resolve) => setTimeout(resolve, 100))

        let element = tempDiv.querySelector('[id$="-document"]') as HTMLElement
        if (!element) element = tempDiv.querySelector('#convocation-document') as HTMLElement
        if (!element) element = tempDiv.querySelector('.document-container') as HTMLElement
        if (!element) element = tempDiv.querySelector('body > div') as HTMLElement
        if (!element) element = tempDiv.querySelector('div') as HTMLElement
        if (!element) { document.body.removeChild(tempDiv); throw new Error('Élément de document non trouvé') }

        const elementId = `temp-convocation-entity-${Date.now()}`
        element.id = elementId
        await new Promise((resolve) => setTimeout(resolve, 500))

        const pdfBlob = await generatePDFBlobFromHTML(elementId)
        document.body.removeChild(tempDiv)

        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `convocation_${entityName.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addToast({ type: 'success', title: 'Convocation générée', description: 'La convocation a été générée et téléchargée avec succès.' })
        return
      }

      const variables = extractDocumentVariables({
        session: {
          ...sessionData,
          start_date: sessionData.start_date,
          end_date: sessionData.end_date,
          start_time: sessionData.start_time || undefined,
          end_time: sessionData.end_time || undefined,
          location: sessionData.location || undefined,
          formations: formation,
        } as any,
        organization: organization as any,
        program: program ? { ...program, formations: formation ? [{ id: formation.id, name: formation.name, duration_hours: (formation as any).duration_hours }] : undefined } as any : undefined,
        company: entityCompany,
        language: 'fr',
        issueDate: new Date().toISOString(),
        effectif: reservation.expected_count || undefined,
      })

      const response = await fetch('/api/documents/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, variables, documentId: undefined, organizationId: organization.id }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.details || errorData.error || errorData.message || 'Erreur lors de la génération du PDF')
      }

      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `convocation_${entityName.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      addToast({ type: 'success', title: 'Convocation générée', description: 'La convocation a été générée et téléchargée avec succès.' })
    } catch (error) {
      logger.error('Erreur lors de la génération de la convocation entreprise', error as Error, {
        entityId: reservation.entity_id,
        sessionId: sessionData?.id,
      })
      addToast({ type: 'error', title: 'Erreur', description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la génération de la convocation.' })
    }
  }

  return {
    isGeneratingZip,
    zipGenerationProgress,
    lastZipGeneration,
    handleGenerateConvention,
    handleGenerateConventionForEnrollment,
    handleGenerateConventionForEntity,
    handleGenerateConvocationForEntity,
    handleGenerateContract,
    handleGenerateConvocation,
    handleGenerateProgram,
    handleGenerateTerms,
    handleGeneratePrivacyPolicy,
    handleGenerateAllConventionsZip,
    handleGenerateAllConvocationsZip,
    handleGenerateSessionReport,
    handleGenerateCertificate,
    handleSendConvocationByEmail,
    handleSendConvocationByEmailWithCustomContent,
    handleSendAllConvocationsByEmail,
    handleSendContractByEmail,
    handleSendContractByEmailWithCustomContent,
    handleSendAllContractsByEmail,
    prepareConvocationEmail,
    prepareContractEmail,
    generatePdfBlobForSignatureRequest,
  }
}

