import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { generatePDF } from '@/lib/utils/document-generation/pdf-generator'
import { generateDOCX } from '@/lib/utils/document-generation/docx-generator'
// import { generateODT } from '@/lib/utils/document-generation/odt-generator' // TODO: Implémenter generateODT
import { generateHTML } from '@/lib/utils/document-generation/html-generator'
import { emailService } from '@/lib/services/email.service'
import { templateAnalyticsService } from '@/lib/services/template-analytics.service'
import type { GenerateDocumentInput, DocumentTemplate } from '@/lib/types/document-templates'
import { Database } from '@/types/database.types'
import { withRateLimit, mutationRateLimiter } from '@/app/api/_middleware/rate-limit'
import type { CookieOptions } from '@supabase/ssr'

// POST /api/documents/generate - Génère un document à partir d'un template
export async function POST(request: NextRequest) {
  return withRateLimit(request, mutationRateLimiter, async (req) => {
  try {
    // Convertir Request en NextRequest pour accéder aux cookies
    const nextReq = req as unknown as NextRequest
    // Créer un client Supabase pour les API routes en utilisant les cookies de la requête
    // Utiliser la même approche que le middleware pour la compatibilité
    const supabase = createSupabaseServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return nextReq.cookies.get(name)?.value
          },
          set(_name: string, _value: string, _options?: CookieOptions) {
            // Dans les API routes, on ne peut pas modifier les cookies de la réponse
            // Le middleware gère déjà la mise à jour des cookies
          },
          remove(_name: string, _options?: CookieOptions) {
            // Dans les API routes, on ne peut pas modifier les cookies de la réponse
          },
        },
      }
    )

    // Debug: vérifier les cookies reçus
    const cookies = nextReq.cookies.getAll()
    console.log('Cookies reçus dans l\'API:', cookies.map(c => c.name))
    console.log('Cookies Supabase présents:', cookies.some(c => c.name.includes('supabase') || c.name.includes('sb-')))

    // Essayer d'abord getSession() qui est plus permissif
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    let user
    if (session && session.user) {
      user = session.user
    } else {
      // Si getSession() échoue, essayer getUser()
      const {
        data: { user: userFromGetUser },
      error: authError,
    } = await supabase.auth.getUser()

      if (authError || !userFromGetUser) {
        console.error('Erreur d\'authentification:', authError)
        console.error('Utilisateur:', userFromGetUser)
        console.error('Cookies disponibles:', nextReq.cookies.getAll().map(c => `${c.name}=${c.value.substring(0, 20)}...`))
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }

      user = userFromGetUser
    }

    if (!user) {
      console.error('Aucun utilisateur trouvé')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'organisation de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    const body: GenerateDocumentInput = await req.json()

    // Récupérer le template directement avec le client serveur
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', body.template_id)
      .single()

    if (templateError || !template) {
      console.error('Erreur lors de la récupération du template:', templateError)
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    if (template.organization_id !== userData.organization_id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // Vérifier que le template a du contenu
    const templateContent = template.content as { html?: string; elements?: unknown[] } | null
    const templateHeader = template.header as { content?: string } | null
    const templateFooter = template.footer as { content?: string } | null
    
    const hasContent = 
      templateContent?.html || 
      (templateContent?.elements && templateContent.elements.length > 0) ||
      templateHeader?.content ||
      templateFooter?.content

    if (!hasContent) {
      return NextResponse.json(
        { error: 'Le template ne contient pas de contenu. Veuillez éditer le template avant de générer un document.' },
        { status: 400 }
      )
    }

    // Générer le document selon le format
    let fileBlob: Blob
    let pageCount: number
    let fileName: string
    let documentId: string | undefined
    const generationStartTime = Date.now()

    try {
      if (body.format === 'PDF') {
        console.log('Début de la génération PDF...')
        console.log('Template content type:', typeof template.content)
        console.log('Template header type:', typeof template.header)
        console.log('Template footer type:', typeof template.footer)
        console.log('Variables reçues:', Object.keys(body.variables || {}).length, 'variables')
        
        try {
          const result = await generatePDF(template as unknown as DocumentTemplate, body.variables, documentId, userData.organization_id)
          fileBlob = result.blob
          pageCount = result.pageCount
          fileName = `${template.type}_${Date.now()}.pdf`
          console.log('PDF généré avec succès, taille:', fileBlob.size, 'bytes')
        } catch (pdfError) {
          console.error('Erreur spécifique lors de la génération PDF:', pdfError)
          const pdfErrorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError)
          const pdfErrorStack = pdfError instanceof Error ? pdfError.stack : undefined
          console.error('Stack trace PDF:', pdfErrorStack)
          
          // Si c'est une erreur Puppeteer, retourner une erreur plus claire
          if (pdfErrorMessage.includes('Puppeteer') || pdfErrorMessage.includes('Chromium') || pdfErrorMessage.includes('browser')) {
            throw new Error(
              `Impossible de générer le PDF: Puppeteer nécessite Chromium pour fonctionner. ` +
              `Dans un environnement de développement, vous pouvez utiliser le format HTML pour l'aperçu. ` +
              `Erreur: ${pdfErrorMessage}`
            )
          }
          
          // Sinon, propager l'erreur originale
          throw pdfError
        }
      } else if (body.format === 'DOCX') {
        console.log('Début de la génération DOCX...')
        const result = await generateDOCX(template as unknown as DocumentTemplate, body.variables, documentId, userData.organization_id)
        fileBlob = result.blob
        pageCount = result.pageCount
        fileName = `${template.type}_${Date.now()}.docx`
        console.log('DOCX généré avec succès')
      } else if (body.format === 'ODT') {
        // TODO: Implémenter generateODT dans lib/utils/document-generation/odt-generator.ts
        return NextResponse.json(
          { error: 'Le format ODT n\'est pas encore implémenté. Utilisez PDF, DOCX ou HTML.' },
          { status: 501 }
        )
      } else if (body.format === 'HTML') {
        console.log('Début de la génération HTML...')
        // Pour HTML, on génère d'abord sans documentId (les signatures seront des placeholders)
        // Si un documentId est fourni, on peut l'utiliser pour récupérer les signatures réelles
        const result = await generateHTML(
          template as unknown as DocumentTemplate,
          body.variables,
          undefined, // documentId sera disponible après la création du document
          userData.organization_id
        )
        // Convertir HTML en Blob
        fileBlob = new Blob([result.html], { type: 'text/html;charset=utf-8' })
        pageCount = result.pageCount
        fileName = `${template.type}_${Date.now()}.html`
        console.log('HTML généré avec succès')
      } else {
        throw new Error(`Format non supporté: ${body.format}`)
      }
    } catch (genError) {
      console.error('Erreur lors de la génération du document:', genError)
      const genErrorMessage = genError instanceof Error 
        ? genError.message 
        : 'Erreur lors de la génération du document'
      const genErrorStack = genError instanceof Error ? genError.stack : undefined
      console.error('Stack trace complète:', genErrorStack)
      console.error('Type d\'erreur:', genError?.constructor?.name)
      console.error('Erreur complète:', JSON.stringify(genError, Object.getOwnPropertyNames(genError)))
      
      // Vérifier si c'est une erreur Puppeteer
      if (genErrorMessage.includes('Puppeteer') || genErrorMessage.includes('Chromium')) {
        throw new Error(`Puppeteer n'a pas pu être lancé. Puppeteer nécessite Chromium pour fonctionner. Veuillez installer Chromium ou utiliser un environnement qui le supporte. Erreur: ${genErrorMessage}`)
      }
      
      throw new Error(`Génération ${body.format} échouée: ${genErrorMessage}`)
    }

    // TODO: Upload vers cloud storage (Supabase Storage, S3, etc.)
    // Pour l'instant, on retourne le blob en base64
    const arrayBuffer = await fileBlob.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const fileUrl = `data:application/${body.format.toLowerCase()};base64,${base64}`

    // Récupérer l'organisation pour l'email (avant la création du document)
    const { data: organization } = await supabase
      .from('organizations')
      .select('name, email')
      .eq('id', userData.organization_id)
      .single()

    // Créer l'enregistrement du document généré directement avec le client serveur
    const { data: generatedDocument, error: docError } = await supabase
      .from('generated_documents')
      .insert({
        organization_id: userData.organization_id,
        template_id: template.id,
        type: template.type,
        file_name: fileName,
        file_url: fileUrl,
        format: body.format,
        page_count: pageCount,
        related_entity_type: body.related_entity_type,
        related_entity_id: body.related_entity_id,
        metadata: body.variables,
        generated_by: user.id,
      })
      .select()
      .single()

    // Mettre à jour documentId pour les futures références
    if (generatedDocument) {
      documentId = generatedDocument.id
    }

    if (docError) {
      console.error('Erreur lors de la création de l\'enregistrement:', docError)
      // On continue quand même car le document est généré
    }

    // Logger l'événement de génération pour les analytics
    try {
      const generationTime = Date.now() - generationStartTime
      const variablesCount = Object.keys(body.variables || {}).length
      
      await templateAnalyticsService.logEvent(
        template.id,
        userData.organization_id,
        user.id,
        'generate',
        {
          format: body.format,
          variablesCount,
          generationTimeMs: generationTime,
          fileSizeBytes: fileBlob.size,
          metadata: {
            pageCount,
            related_entity_type: body.related_entity_type,
            related_entity_id: body.related_entity_id,
          },
        }
      )
    } catch (analyticsError) {
      // Ne pas faire échouer la génération si l'analytics échoue
      console.warn('Erreur lors du logging analytics:', analyticsError)
    }

    // Envoyer par email si demandé
    let emailResult = null
    if (body.options?.sendEmail && body.options?.emailTo) {
      try {
        // Récupérer les informations de l'entité liée pour personnaliser l'email
        let recipientName = ''
        let documentTitle = template.name || `Document ${template.type}`

        if (body.related_entity_type === 'student' && body.related_entity_id) {
          const { data: student } = await supabase
            .from('students')
            .select('first_name, last_name, email')
            .eq('id', body.related_entity_id)
            .single()

          if (student) {
            recipientName = `${student.first_name} ${student.last_name}`
            // Si l'email de l'étudiant n'est pas fourni, utiliser celui de l'étudiant
            if (!body.options.emailTo && student.email) {
              body.options.emailTo = student.email
            }
          }
        }

        // Préparer la pièce jointe
        const attachment = {
          filename: fileName,
          content: Buffer.from(await fileBlob.arrayBuffer()),
          contentType: body.format === 'PDF' 
            ? 'application/pdf' 
            : body.format === 'DOCX'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : body.format === 'ODT'
            ? 'application/vnd.oasis.opendocument.text'
            : 'text/html',
        }

        // Envoyer l'email
        emailResult = await emailService.send({
          to: body.options.emailTo,
          subject: `${documentTitle} - ${organization?.name || 'Eduzen'}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #335ACF; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; }
                  .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
                  .button { background: #335ACF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>${documentTitle}</h1>
                  </div>
                  <div class="content">
                    ${recipientName ? `<p>Bonjour ${recipientName},</p>` : '<p>Bonjour,</p>'}
                    <p>Veuillez trouver ci-joint votre document <strong>${documentTitle}</strong>.</p>
                    <p>Ce document a été généré le ${new Date().toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}.</p>
                    ${organization?.name ? `<p>Cordialement,<br><strong>${organization.name}</strong></p>` : '<p>Cordialement,<br>L\'équipe Eduzen</p>'}
                  </div>
                  <div class="footer">
                    <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
                    ${organization?.email ? `<p>Pour toute question, contactez-nous à ${organization.email}</p>` : ''}
                  </div>
                </div>
              </body>
            </html>
          `,
          text: `
Bonjour${recipientName ? ` ${recipientName}` : ''},

Veuillez trouver ci-joint votre document ${documentTitle}.

Ce document a été généré le ${new Date().toLocaleDateString('fr-FR')}.

${organization?.name ? `Cordialement,\n${organization.name}` : 'Cordialement,\nL\'équipe Eduzen'}
          `.trim(),
          attachments: [attachment],
        })

        console.log('Email envoyé avec succès:', emailResult)
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email:', emailError)
        // On continue même si l'email échoue
        emailResult = {
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Erreur inconnue',
        }
      }
    }

    return NextResponse.json({
      document: generatedDocument,
      downloadUrl: fileUrl,
      fileName,
      emailSent: emailResult?.success || false,
      emailError: emailResult?.error,
    })
  } catch (error) {
    console.error('Erreur lors de la génération du document:', error)
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : 'Erreur serveur inconnue'
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error('Stack trace:', errorStack)
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    )
  }
  })
}

