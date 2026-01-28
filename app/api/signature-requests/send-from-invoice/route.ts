import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SignatureRequestService } from '@/lib/services/signature-request.service'
import { DocumentService } from '@/lib/services/document.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * POST /api/signature-requests/send-from-invoice
 * Génère un PDF depuis une facture/devis, crée un document et envoie une demande de signature
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer l'organization_id de l'utilisateur
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier les permissions
    if (!['admin', 'secretary', 'teacher'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      pdfBase64, // PDF en base64 généré côté client
      documentTitle,
      type, // 'invoice' | 'quote'
      invoiceId,
      sessionId,
      recipientEmail,
      recipientName,
      recipientId,
      subject,
      message,
      expiresAt,
    } = body

    if (!pdfBase64 || !documentTitle || !type || !invoiceId || !sessionId || !recipientEmail || !recipientName) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      )
    }

    // Convertir le base64 en Buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64')

    // Uploader le PDF vers Supabase Storage
    const documentService = new DocumentService(supabase)
    const timestamp = Date.now()
    const fileName = `${documentTitle.replace(/\s+/g, '_')}.pdf`
    const filePath = `signatures/${userData.organization_id}/${timestamp}_${fileName}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
      })

    if (uploadError) {
      logger.error('Erreur upload:', uploadError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'upload du document' },
        { status: 500 }
      )
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    // Récupérer les informations de la facture/devis pour obtenir le student_id
    const { data: invoice } = await supabase
      .from('invoices')
      .select('student_id')
      .eq('id', invoiceId)
      .single()

    // Créer le document dans la base de données
    const document = await documentService.create({
      title: documentTitle,
      type: type === 'quote' ? 'quote' : 'invoice',
      file_url: urlData.publicUrl,
      organization_id: userData.organization_id,
      student_id: invoice?.student_id || null,
      metadata: {
        session_id: sessionId,
        invoice_id: invoiceId,
        generated_at: new Date().toISOString(),
      },
    })

    // Créer la demande de signature
    const signatureRequestService = new SignatureRequestService(supabase)
    const signatureRequest = await signatureRequestService.createSignatureRequest({
      documentId: document.id,
      organizationId: userData.organization_id,
      recipientEmail,
      recipientName,
      recipientType: 'student',
      recipientId: recipientId || invoice?.student_id,
      subject: subject || `Demande de signature : ${documentTitle}`,
      message: message || null,
      expiresAt: expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })

    return NextResponse.json({
      signatureRequest,
      document,
    }, { status: 201 })
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de la demande de signature:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
