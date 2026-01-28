/**
 * API Route pour exécuter les générations programmées
 * Cette route peut être appelée par un cron job (Supabase Edge Function, Vercel Cron, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'
import { ScheduledGenerationService } from '@/lib/services/scheduled-generation.service'
import { generatePDF } from '@/lib/utils/document-generation/pdf-generator'
import { generateDOCX } from '@/lib/utils/document-generation/docx-generator'
import { generateHTML } from '@/lib/utils/document-generation/html-generator'
import { mapDataToVariables } from '@/lib/utils/document-generation/variable-mapper'
import { EmailService } from '@/lib/services/email.service'
import type { DocumentTemplate } from '@/lib/types/document-templates'
import { logger, sanitizeError } from '@/lib/utils/logger'

// POST /api/documents/scheduled/execute - Exécute les générations programmées
export async function POST(request: NextRequest) {
  try {
    // Vérifier la clé secrète pour sécuriser l'endpoint
    const authHeader = request.headers.get('authorization')
    const secretKey = process.env.SCHEDULED_GENERATION_SECRET_KEY
    
    if (secretKey && authHeader !== `Bearer ${secretKey}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    )

    // Récupérer les générations à exécuter
    const scheduledGenerationService = new ScheduledGenerationService(supabase)
    const dueGenerations = await scheduledGenerationService.getDueGenerations()
    
    const results = []

    for (const generation of dueGenerations) {
      try {
        // Récupérer le template
        const { data: template, error: templateError } = await supabase
          .from('document_templates')
          .select('*')
          .eq('id', generation.template_id)
          .single()

        if (templateError || !template) {
          throw new Error(`Template non trouvé: ${templateError?.message}`)
        }

        // Récupérer les étudiants selon les filtres
        const filterConfig = generation.filter_config as { studentIds?: string[] } | null
        let studentIds: string[] = []

        if (filterConfig?.studentIds && Array.isArray(filterConfig.studentIds)) {
          studentIds = filterConfig.studentIds
        } else {
          // Récupérer tous les étudiants actifs de l'organisation
          const { data: students } = await supabase
            .from('students')
            .select('id')
            .eq('organization_id', generation.organization_id)
            .eq('status', 'active')

          studentIds = students?.map(s => s.id) || []
        }

        // Générer les documents pour chaque étudiant
        for (const studentId of studentIds) {
          try {
            // Récupérer les données de l'étudiant
            const { data: student } = await supabase
              .from('students')
              .select('*, sessions(*, formations(*, programs(*)))')
              .eq('id', studentId)
              .single()

            if (!student) continue

            // Mapper les données en variables
            const variables = mapDataToVariables(
              template.type as 'invoice' | 'quote' | 'certificate' | 'contract' | 'report' | 'other',
              {
                student: student as Record<string, unknown>,
                session: student.sessions as Record<string, unknown> | Record<string, unknown>[] | null,
              }
            )

            // Générer le document
            let fileBlob: Blob
            let fileName: string

            if (generation.format === 'PDF') {
              const result = await generatePDF(template as unknown as DocumentTemplate, variables)
              fileBlob = result.blob
              fileName = `${generation.name}_${student.student_number || studentId}.pdf`
            } else if (generation.format === 'DOCX') {
              const result = await generateDOCX(template as unknown as DocumentTemplate, variables)
              fileBlob = result.blob
              fileName = `${generation.name}_${student.student_number || studentId}.docx`
            } else {
              const result = await generateHTML(template as unknown as DocumentTemplate, variables)
              fileBlob = new Blob([result.html], { type: 'text/html' })
              fileName = `${generation.name}_${student.student_number || studentId}.html`
            }

            // Enregistrer le document généré
            const arrayBuffer = await fileBlob.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            const fileUrl = `data:application/${generation.format.toLowerCase()};base64,${base64}`

            await (supabase as any)
              .from('generated_documents')
              .insert({
                organization_id: generation.organization_id,
                template_id: template.id,
                type: template.type,
                file_name: fileName,
                file_url: fileUrl,
                format: generation.format,
                related_entity_type: 'student',
                related_entity_id: studentId,
                metadata: variables as any,
              })

            // Envoyer par email si demandé
            if (generation.send_email && generation.email_recipients && generation.email_recipients.length > 0) {
              const recipientEmails = generation.email_recipients
              
              // Si l'email de l'étudiant est dans la liste, l'utiliser
              const studentEmail = student.email
              const emailsToSend = studentEmail && recipientEmails.includes(studentEmail)
                ? [studentEmail]
                : recipientEmails

              const emailService = new EmailService()
              for (const email of emailsToSend) {
                await emailService.sendEmail({
                  to: email,
                  subject: `${generation.name} - ${student.first_name} ${student.last_name}`,
                  html: `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <style>
                          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                          .header { background: #335ACF; color: white; padding: 20px; text-align: center; }
                          .content { padding: 20px; background: #f9fafb; }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <div class="header">
                            <h1>${generation.name}</h1>
                          </div>
                          <div class="content">
                            <p>Bonjour,</p>
                            <p>Veuillez trouver ci-joint le document <strong>${generation.name}</strong> pour ${student.first_name} ${student.last_name}.</p>
                            <p>Ce document a été généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}.</p>
                            <p>Cordialement,<br>Eduzen</p>
                          </div>
                        </div>
                      </body>
                    </html>
                  `,
                  attachments: [{
                    filename: fileName,
                    content: arrayBuffer,
                    contentType: generation.format === 'PDF' 
                      ? 'application/pdf' 
                      : generation.format === 'DOCX'
                      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                      : 'text/html',
                  }],
                })
              }
            }
          } catch (studentError) {
            logger.error(`Erreur lors de la génération pour l'étudiant ${studentId}:`, studentError)
            // Continuer avec les autres étudiants
          }
        }

        // Enregistrer le succès
        // NOTE: Fonctionnalité prévue - Implémenter recordExecution pour logger les exécutions
        // Créer une table document_execution_logs pour tracer les exécutions de documents planifiés
        // await scheduledGenerationService.recordExecution(generation.id, true)
        results.push({ generationId: generation.id, success: true })

      } catch (error) {
        logger.error(`Erreur lors de l'exécution de la génération ${generation.id}:`, error)
        // NOTE: Fonctionnalité prévue - Implémenter recordExecution pour logger les exécutions
        // Créer une table document_execution_logs pour tracer les exécutions de documents planifiés
        // await scheduledGenerationService.recordExecution(
        //   generation.id,
        //   false,
        //   error instanceof Error ? error.message : 'Erreur inconnue'
        // )
        results.push({ 
          generationId: generation.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Erreur inconnue' 
        })
      }
    }

    return NextResponse.json({
      executed: results.length,
      results,
    })
  } catch (error) {
    logger.error('Erreur lors de l\'exécution des générations programmées:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

