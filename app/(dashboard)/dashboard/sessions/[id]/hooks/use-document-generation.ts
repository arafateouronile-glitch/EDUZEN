'use client'

import { useState } from 'react'
import { generatePDFFromHTML, createZipFromPDFs, generatePDFBlobFromHTML } from '@/lib/utils/pdf-generator'
import {
  generateConventionHTML,
  generateContractHTML,
  generateConvocationHTML,
  generateProgramHTML,
  generateTermsHTML,
  generatePrivacyPolicyHTML,
} from '@/lib/utils/document-templates'
import { useToast } from '@/components/ui/toast'
import { logger } from '@/lib/utils/logger'
import { emailService } from '@/lib/services/email.service'
import { formatDate } from '@/lib/utils'
import type { 
  SessionWithRelations, 
  EnrollmentWithRelations,
  FormationWithRelations
} from '@/lib/types/query-types'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Program = TableRow<'programs'>
type Organization = TableRow<'organizations'>

interface DocumentGenerationProps {
  sessionData: SessionWithRelations | undefined
  formation: FormationWithRelations | null | undefined
  program: Program | null | undefined
  organization: Organization | undefined
}

export function useDocumentGeneration({
  sessionData,
  formation,
  program,
  organization,
}: DocumentGenerationProps) {
  const { addToast } = useToast()
  const [isGeneratingZip, setIsGeneratingZip] = useState(false)
  const [zipGenerationProgress, setZipGenerationProgress] = useState({ current: 0, total: 0 })
  const [lastZipGeneration, setLastZipGeneration] = useState<Date | null>(null)

  const handleGenerateConvention = async () => {
    if (!sessionData || !formation || !organization) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Données manquantes pour générer la convention.',
      })
      return
    }

    try {
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
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-convention-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, `convention_${sessionData.name.replace(/\s+/g, '_')}.pdf`)
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'Convention générée',
        description: 'La convention a été générée et téléchargée avec succès.',
      })
    } catch (error) {
      logger.error('Erreur lors de la génération de la convention', error as Error, {
        enrollmentId: enrollment.id,
        studentId: enrollment.student_id,
      })
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération de la convention.',
      })
    }
  }

  const handleGenerateContract = async (enrollment: EnrollmentWithRelations) => {
    if (!sessionData || !formation || !organization || !enrollment) return

    const student = enrollment.students
    if (!student) return

    try {
      const html = generateContractHTML({
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
          enrollment_date: enrollment.enrollment_date,
          total_amount: enrollment.total_amount || 0,
          paid_amount: enrollment.paid_amount || 0,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-contract-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, `contrat_${student.last_name}_${student.first_name}.pdf`)
      }

      document.body.removeChild(tempDiv)
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
        description: 'Une erreur est survenue lors de la génération du contrat.',
      })
    }
  }

  const handleGenerateConvocation = async (enrollment: EnrollmentWithRelations) => {
    if (!sessionData || !formation || !organization || !enrollment) return

    const student = enrollment.students
    if (!student) return

    try {
      const html = generateConvocationHTML({
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
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-convocation-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, `convocation_${student.last_name}_${student.first_name}.pdf`)
      }

      document.body.removeChild(tempDiv)
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
        description: 'Une erreur est survenue lors de la génération de la convocation.',
      })
    }
  }

  const handleGenerateProgram = async () => {
    if (!sessionData || !formation || !program || !organization) return

    try {
      const html = generateProgramHTML({
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
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-program-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, `programme_${program.name.replace(/\s+/g, '_')}.pdf`)
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'Programme généré',
        description: 'Le programme a été généré et téléchargé avec succès.',
      })
    } catch (error) {
      logger.error('Erreur lors de la génération du programme', error as Error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération du programme.',
      })
    }
  }

  const handleGenerateTerms = async () => {
    if (!organization) return

    try {
      const html = generateTermsHTML({
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-terms-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, `cgv_${organization.name.replace(/\s+/g, '_')}.pdf`)
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'CGV générée',
        description: 'Les conditions générales de vente ont été générées avec succès.',
      })
    } catch (error) {
      logger.error('Erreur lors de la génération des CGV', error as Error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération des CGV.',
      })
    }
  }

  const handleGeneratePrivacyPolicy = async () => {
    if (!organization) return

    try {
      const html = generatePrivacyPolicyHTML({
        organization: {
          name: organization.name,
          address: organization.address || undefined,
          phone: organization.phone || undefined,
          email: organization.email || undefined,
          logo_url: organization.logo_url || undefined,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (element) {
        element.id = `temp-privacy-${Date.now()}`
        await new Promise((resolve) => setTimeout(resolve, 500))
        await generatePDFFromHTML(element.id, `politique_confidentialite_${organization.name.replace(/\s+/g, '_')}.pdf`)
      }

      document.body.removeChild(tempDiv)
      addToast({
        type: 'success',
        title: 'Politique générée',
        description: 'La politique de confidentialité a été générée avec succès.',
      })
    } catch (error) {
      logger.error('Erreur lors de la génération de la politique de confidentialité', error as Error)
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la génération de la politique de confidentialité.',
      })
    }
  }

  const handleGenerateAllConventionsZip = async (enrollments: EnrollmentWithRelations[]) => {
    if (!sessionData || !formation || !organization) return

    setIsGeneratingZip(true)
    setZipGenerationProgress({ current: 0, total: enrollments.length + 1 })

    try {
      const pdfBlobs: Array<{ name: string; blob: Blob }> = []

      // Générer la convention générale
      const conventionHTML = generateConventionHTML({
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

        const contractHTML = generateContractHTML({
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
            enrollment_date: enrollment.enrollment_date,
            total_amount: enrollment.total_amount || 0,
            paid_amount: enrollment.paid_amount || 0,
          },
          issueDate: new Date().toISOString(),
          language: 'fr',
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

  const handleGenerateAllConvocationsZip = async (enrollments: EnrollmentWithRelations[]) => {
    if (!sessionData || !formation || !organization) return

    setIsGeneratingZip(true)
    setZipGenerationProgress({ current: 0, total: enrollments.length })

    try {
      const pdfBlobs: Array<{ name: string; blob: Blob }> = []

      for (const enrollment of enrollments) {
        const student = enrollment.students
        if (!student) continue

        const convocationHTML = generateConvocationHTML({
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
        })

        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = convocationHTML
        tempDiv.style.position = 'absolute'
        tempDiv.style.left = '-9999px'
        document.body.appendChild(tempDiv)

        const element = tempDiv.querySelector('[id$="-document"]')
        if (element) {
          element.id = `temp-convocation-zip-${Date.now()}-${enrollment.id}`
          await new Promise((resolve) => setTimeout(resolve, 500))
          const blob = await generatePDFBlobFromHTML(element.id)
          pdfBlobs.push({ name: `convocation_${student.last_name}_${student.first_name}.pdf`, blob })
        }

        document.body.removeChild(tempDiv)
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

  // Placeholder functions pour les fonctionnalités à venir
  const handleGenerateSessionReport = async () => {
    addToast({
      type: 'info',
      title: 'Fonctionnalité à venir',
      description: 'La génération du rapport de session sera implémentée prochainement.',
    })
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
    customBody: string
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
      // Générer le HTML de la convocation
      const html = generateConvocationHTML({
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
      })

      // Créer un élément temporaire pour générer le PDF
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (!element) {
        document.body.removeChild(tempDiv)
        throw new Error('Élément de document non trouvé')
      }

      element.id = `temp-convocation-email-${Date.now()}`
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Générer le PDF en Blob
      const pdfBlob = await generatePDFBlobFromHTML(element.id)
      document.body.removeChild(tempDiv)

      // Convertir le texte en HTML si nécessaire (ajouter des retours à la ligne)
      const emailBodyHTML = customBody.replace(/\n/g, '<br>')

      // Envoyer l'email avec le contenu personnalisé
      await emailService.sendDocument(
        student.email || '',
        customSubject,
        pdfBlob,
        `convocation_${student.last_name}_${student.first_name}.pdf`,
        emailBodyHTML
      )

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
        description: 'Une erreur est survenue lors de l\'envoi de l\'email.',
      })
    }
  }

  /**
   * Envoie une convocation par email à un étudiant
   */
  const handleSendConvocationByEmail = async (enrollment: EnrollmentWithRelations) => {
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
      // Générer le HTML de la convocation
      const html = generateConvocationHTML({
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
      })

      // Créer un élément temporaire pour générer le PDF
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (!element) {
        document.body.removeChild(tempDiv)
        throw new Error('Élément de document non trouvé')
      }

      element.id = `temp-convocation-email-${Date.now()}`
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Générer le PDF en Blob
      const pdfBlob = await generatePDFBlobFromHTML(element.id)
      document.body.removeChild(tempDiv)

      // Créer le corps de l'email
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
        <p>Cordialement,<br>${organization.name}</p>
      `

      // Envoyer l'email
      await emailService.sendDocument(
        student.email,
        emailSubject,
        pdfBlob,
        `convocation_${student.last_name}_${student.first_name}.pdf`,
        emailBody
      )

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
        description: 'Une erreur est survenue lors de l\'envoi de l\'email.',
      })
    }
  }

  /**
   * Envoie toutes les convocations par email (groupé)
   */
  const handleSendAllConvocationsByEmail = async (enrollments: EnrollmentWithRelations[]) => {
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
          await handleSendConvocationByEmail(enrollment)
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
   * Envoie un contrat par email avec contenu personnalisé
   */
  const handleSendContractByEmailWithCustomContent = async (
    enrollment: EnrollmentWithRelations,
    customSubject: string,
    customBody: string
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
      const html = generateContractHTML({
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
          enrollment_date: enrollment.enrollment_date,
          total_amount: enrollment.total_amount || 0,
          paid_amount: enrollment.paid_amount || 0,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (!element) {
        document.body.removeChild(tempDiv)
        throw new Error('Élément de document non trouvé')
      }

      element.id = `temp-contract-email-${Date.now()}`
      await new Promise((resolve) => setTimeout(resolve, 500))

      const pdfBlob = await generatePDFBlobFromHTML(element.id)
      document.body.removeChild(tempDiv)

      // Convertir le texte en HTML si nécessaire
      const emailBodyHTML = customBody.replace(/\n/g, '<br>')

      await emailService.sendDocument(
        student.email || '',
        customSubject,
        pdfBlob,
        `contrat_${student.last_name}_${student.first_name}.pdf`,
        emailBodyHTML
      )

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
   * Envoie un contrat par email
   */
  const handleSendContractByEmail = async (enrollment: EnrollmentWithRelations) => {
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
      const html = generateContractHTML({
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
          enrollment_date: enrollment.enrollment_date,
          total_amount: enrollment.total_amount || 0,
          paid_amount: enrollment.paid_amount || 0,
        },
        issueDate: new Date().toISOString(),
        language: 'fr',
      })

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = html
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      document.body.appendChild(tempDiv)

      const element = tempDiv.querySelector('[id$="-document"]')
      if (!element) {
        document.body.removeChild(tempDiv)
        throw new Error('Élément de document non trouvé')
      }

      element.id = `temp-contract-email-${Date.now()}`
      await new Promise((resolve) => setTimeout(resolve, 500))

      const pdfBlob = await generatePDFBlobFromHTML(element.id)
      document.body.removeChild(tempDiv)

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
        emailBody
      )

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

  return {
    isGeneratingZip,
    zipGenerationProgress,
    lastZipGeneration,
    handleGenerateConvention,
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
    prepareConvocationEmail,
    prepareContractEmail,
  }
}

