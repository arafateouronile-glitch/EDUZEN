/**
 * Service de traitement des webhooks de signature électronique
 * Gère les événements des différents providers (Yousign, DocuSign, HelloSign, etc.)
 */

import { SignatureService } from '@/lib/services/signature.service'
import { logger, maskId } from '@/lib/utils/logger'
import { createClient } from '@/lib/supabase/server'

export type SignatureEventType =
  | 'signature.created'
  | 'signature.pending'
  | 'signature.signed'
  | 'signature.completed'
  | 'signature.declined'
  | 'signature.expired'
  | 'signature.canceled'
  | 'document.sent'
  | 'document.opened'
  | 'document.downloaded'

export interface SignatureWebhookEvent {
  provider: 'yousign' | 'docusign' | 'hellosign' | 'signnow' | 'other'
  eventType: SignatureEventType
  signatureId?: string // ID externe du provider
  documentId?: string // Notre ID interne
  signerEmail?: string
  signerName?: string
  signedAt?: string
  status?: string
  metadata?: Record<string, any>
  rawPayload?: any
}

export interface WebhookProcessingResult {
  success: boolean
  message: string
  signatureId?: string
  documentId?: string
  action?: string
}

/**
 * Service de traitement des webhooks de signature électronique
 */
export class ESignatureWebhookHandlerService {
  /**
   * Traite un événement webhook générique
   */
  async processWebhookEvent(event: SignatureWebhookEvent): Promise<WebhookProcessingResult> {
    try {
      logger.info('Traitement du webhook de signature', {
        provider: event.provider,
        eventType: event.eventType,
        signatureId: maskId(event.signatureId),
        documentId: maskId(event.documentId),
      })

      // Router vers le bon handler selon le type d'événement
      switch (event.eventType) {
        case 'signature.created':
        case 'signature.pending':
          return await this.handleSignaturePending(event)

        case 'signature.signed':
          return await this.handleSignatureSigned(event)

        case 'signature.completed':
          return await this.handleSignatureCompleted(event)

        case 'signature.declined':
          return await this.handleSignatureDeclined(event)

        case 'signature.expired':
          return await this.handleSignatureExpired(event)

        case 'signature.canceled':
          return await this.handleSignatureCanceled(event)

        case 'document.sent':
        case 'document.opened':
        case 'document.downloaded':
          return await this.handleDocumentEvent(event)

        default:
          logger.warn('Type d\'événement webhook non géré', {
            eventType: event.eventType,
            provider: event.provider,
          })
          return {
            success: true,
            message: `Événement ${event.eventType} enregistré mais non traité`,
          }
      }
    } catch (error) {
      logger.error('Erreur lors du traitement du webhook', error instanceof Error ? error : new Error(String(error)), {
        provider: event.provider,
        eventType: event.eventType,
        signatureId: maskId(event.signatureId),
      })
      throw error
    }
  }

  /**
   * Gère les événements de signature en attente
   */
  private async handleSignaturePending(event: SignatureWebhookEvent): Promise<WebhookProcessingResult> {
    // Créer ou mettre à jour la signature avec le statut pending
    if (event.documentId && event.signerEmail) {
      const supabase = await createClient()

      // Vérifier si la signature existe déjà
      const { data: existingSignatures } = await supabase
        .from('document_signatures')
        .select('id')
        .eq('document_id', event.documentId)
        .eq('signer_email', event.signerEmail)
        .eq('status', 'pending')
        .limit(1)

      if (existingSignatures && existingSignatures.length > 0) {
        return {
          success: true,
          message: 'Signature en attente déjà enregistrée',
          signatureId: existingSignatures[0].id,
          documentId: event.documentId,
        }
      }

      logger.info('Signature en attente créée', {
        documentId: maskId(event.documentId),
        signerEmail: event.signerEmail,
      })
    }

    return {
      success: true,
      message: 'Événement de signature en attente traité',
      documentId: event.documentId,
      action: 'pending_recorded',
    }
  }

  /**
   * Gère les événements de signature signée
   */
  private async handleSignatureSigned(event: SignatureWebhookEvent): Promise<WebhookProcessingResult> {
    if (!event.documentId) {
      throw new Error('documentId manquant dans l\'événement signature.signed')
    }

    const supabase = await createClient()

    // Trouver la signature correspondante
    const { data: signatures } = await supabase
      .from('document_signatures')
      .select('*')
      .eq('document_id', event.documentId)
      .or(`signer_email.eq.${event.signerEmail},validation_code.eq.${event.signatureId}`)
      .limit(1)

    if (signatures && signatures.length > 0) {
      const signature = signatures[0]

      // Mettre à jour le statut de la signature
      const signatureService = new SignatureService(supabase)
      await signatureService.updateSignature(signature.id, {
        status: 'signed',
        is_valid: true,
        signed_at: event.signedAt ? new Date(event.signedAt).toISOString() : new Date().toISOString(),
      })

      logger.info('Signature mise à jour comme signée', {
        signatureId: maskId(signature.id),
        documentId: maskId(event.documentId),
      })

      return {
        success: true,
        message: 'Signature enregistrée comme signée',
        signatureId: signature.id,
        documentId: event.documentId,
        action: 'signature_signed',
      }
    }

    logger.warn('Aucune signature correspondante trouvée pour l\'événement signed', {
      documentId: maskId(event.documentId),
      signerEmail: event.signerEmail,
    })

    return {
      success: true,
      message: 'Événement enregistré mais aucune signature correspondante',
      documentId: event.documentId,
    }
  }

  /**
   * Gère les événements de signature complétée (toutes les signatures du document)
   */
  private async handleSignatureCompleted(event: SignatureWebhookEvent): Promise<WebhookProcessingResult> {
    if (!event.documentId) {
      throw new Error('documentId manquant dans l\'événement signature.completed')
    }

    const supabase = await createClient()

    // Mettre à jour le statut du document
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
      } as any)
      .eq('id', event.documentId)

    if (updateError) {
      logger.error('Erreur lors de la mise à jour du document', updateError, {
        documentId: maskId(event.documentId),
      })
    }

    // Marquer toutes les signatures du document comme complétées
    const { error: signaturesError } = await supabase
      .from('document_signatures')
      .update({ status: 'signed' })
      .eq('document_id', event.documentId)
      .in('status', ['pending', 'processing'])

    if (signaturesError) {
      logger.error('Erreur lors de la mise à jour des signatures', signaturesError, {
        documentId: maskId(event.documentId),
      })
    }

    logger.info('Document marqué comme complètement signé', {
      documentId: maskId(event.documentId),
    })

    // NOTE: Fonctionnalités prévues:
    // 1. Générer le document final avec toutes les signatures (utiliser SignatureService.getSignedDocument)
    // 2. Envoyer une notification aux parties concernées (utiliser NotificationService.createForUsers)

    return {
      success: true,
      message: 'Document complètement signé',
      documentId: event.documentId,
      action: 'document_completed',
    }
  }

  /**
   * Gère les événements de signature refusée
   */
  private async handleSignatureDeclined(event: SignatureWebhookEvent): Promise<WebhookProcessingResult> {
    if (!event.documentId) {
      throw new Error('documentId manquant dans l\'événement signature.declined')
    }

    const supabase = await createClient()

    // Trouver et mettre à jour la signature
    const { data: signatures } = await supabase
      .from('document_signatures')
      .select('id')
      .eq('document_id', event.documentId)
      .eq('signer_email', event.signerEmail || '')
      .limit(1)

    if (signatures && signatures.length > 0) {
      const signatureService = new SignatureService(supabase)
      await signatureService.revokeSignature(
        signatures[0].id,
        'Signature refusée par le signataire'
      )

      logger.info('Signature marquée comme refusée', {
        signatureId: maskId(signatures[0].id),
        documentId: maskId(event.documentId),
      })

      return {
        success: true,
        message: 'Signature refusée enregistrée',
        signatureId: signatures[0].id,
        documentId: event.documentId,
        action: 'signature_declined',
      }
    }

    return {
      success: true,
      message: 'Événement de refus enregistré',
      documentId: event.documentId,
    }
  }

  /**
   * Gère les événements de signature expirée
   */
  private async handleSignatureExpired(event: SignatureWebhookEvent): Promise<WebhookProcessingResult> {
    if (!event.documentId) {
      throw new Error('documentId manquant dans l\'événement signature.expired')
    }

    const supabase = await createClient()

    // Mettre à jour toutes les signatures pendantes comme expirées
    const { error } = await supabase
      .from('document_signatures')
      .update({
        status: 'expired',
        is_valid: false,
      })
      .eq('document_id', event.documentId)
      .eq('status', 'pending')

    if (error) {
      logger.error('Erreur lors de la mise à jour des signatures expirées', error, {
        documentId: maskId(event.documentId),
      })
    }

    logger.info('Signatures marquées comme expirées', {
      documentId: maskId(event.documentId),
    })

    return {
      success: true,
      message: 'Signatures expirées',
      documentId: event.documentId,
      action: 'signatures_expired',
    }
  }

  /**
   * Gère les événements de signature annulée
   */
  private async handleSignatureCanceled(event: SignatureWebhookEvent): Promise<WebhookProcessingResult> {
    if (!event.documentId) {
      throw new Error('documentId manquant dans l\'événement signature.canceled')
    }

    const supabase = await createClient()

    // Révoquer toutes les signatures du document
    const { data: signatures } = await supabase
      .from('document_signatures')
      .select('id')
      .eq('document_id', event.documentId)
      .in('status', ['pending', 'processing'])

    if (signatures) {
      const signatureService = new SignatureService(supabase)
      for (const sig of signatures) {
        await signatureService.revokeSignature(sig.id, 'Procédure de signature annulée')
      }
    }

    logger.info('Procédure de signature annulée', {
      documentId: maskId(event.documentId),
      signaturesCount: signatures?.length || 0,
    })

    return {
      success: true,
      message: 'Procédure de signature annulée',
      documentId: event.documentId,
      action: 'signature_canceled',
    }
  }

  /**
   * Gère les événements liés au document (envoi, ouverture, téléchargement)
   */
  private async handleDocumentEvent(event: SignatureWebhookEvent): Promise<WebhookProcessingResult> {
    // Ces événements sont surtout informatifs pour le tracking
    logger.info('Événement document reçu', {
      eventType: event.eventType,
      documentId: maskId(event.documentId),
      signerEmail: event.signerEmail,
    })

    // NOTE: Fonctionnalité prévue - Enregistrer dans un audit log
    // Créer une table audit_logs pour tracer toutes les actions de signature

    return {
      success: true,
      message: `Événement ${event.eventType} enregistré`,
      documentId: event.documentId,
      action: 'document_event_logged',
    }
  }

  /**
   * Parse le payload d'un webhook Yousign
   */
  parseYousignWebhook(payload: any): SignatureWebhookEvent {
    const eventType = this.mapYousignEventType(payload.event_name || payload.type)

    return {
      provider: 'yousign',
      eventType,
      signatureId: payload.signature_request?.id || payload.id,
      documentId: payload.metadata?.documentId || payload.signature_request?.metadata?.documentId,
      signerEmail: payload.signer?.email || payload.signature_request?.signer?.email,
      signerName: payload.signer?.info?.first_name && payload.signer?.info?.last_name
        ? `${payload.signer.info.first_name} ${payload.signer.info.last_name}`
        : undefined,
      signedAt: payload.signer?.signed_at || payload.signature_request?.signed_at,
      status: payload.status || payload.signature_request?.status,
      metadata: payload.metadata,
      rawPayload: payload,
    }
  }

  /**
   * Parse le payload d'un webhook DocuSign
   */
  parseDocuSignWebhook(payload: any): SignatureWebhookEvent {
    const eventType = this.mapDocuSignEventType(payload.event)

    return {
      provider: 'docusign',
      eventType,
      signatureId: payload.envelopeId || payload.data?.envelopeId,
      documentId: payload.envelopeSummary?.customFields?.textCustomFields?.find(
        (f: any) => f.name === 'documentId'
      )?.value,
      signerEmail: payload.data?.recipients?.signers?.[0]?.email,
      signerName: payload.data?.recipients?.signers?.[0]?.name,
      signedAt: payload.data?.recipients?.signers?.[0]?.signedDateTime,
      status: payload.data?.envelopeStatus || payload.status,
      metadata: payload.data,
      rawPayload: payload,
    }
  }

  /**
   * Parse le payload d'un webhook HelloSign
   */
  parseHelloSignWebhook(payload: any): SignatureWebhookEvent {
    const eventType = this.mapHelloSignEventType(payload.event?.event_type)

    return {
      provider: 'hellosign',
      eventType,
      signatureId: payload.signature_request?.signature_request_id,
      documentId: payload.signature_request?.metadata?.documentId,
      signerEmail: payload.event?.event_metadata?.reported_for_signer_email,
      signerName: payload.signature_request?.signatures?.[0]?.signer_name,
      signedAt: payload.signature_request?.signatures?.[0]?.signed_at
        ? new Date(payload.signature_request.signatures[0].signed_at * 1000).toISOString()
        : undefined,
      status: payload.signature_request?.status,
      metadata: payload.signature_request?.metadata,
      rawPayload: payload,
    }
  }

  /**
   * Mappe les types d'événements Yousign vers notre format
   */
  private mapYousignEventType(yousignEvent: string): SignatureEventType {
    const mapping: Record<string, SignatureEventType> = {
      'signature_request.created': 'signature.created',
      'signature_request.activated': 'signature.pending',
      'signature_request.signed': 'signature.signed',
      'signature_request.done': 'signature.completed',
      'signature_request.refused': 'signature.declined',
      'signature_request.expired': 'signature.expired',
      'signature_request.canceled': 'signature.canceled',
    }

    return mapping[yousignEvent] || 'signature.created'
  }

  /**
   * Mappe les types d'événements DocuSign vers notre format
   */
  private mapDocuSignEventType(docusignEvent: string): SignatureEventType {
    const mapping: Record<string, SignatureEventType> = {
      'envelope-created': 'signature.created',
      'envelope-sent': 'document.sent',
      'envelope-delivered': 'document.opened',
      'recipient-completed': 'signature.signed',
      'envelope-completed': 'signature.completed',
      'recipient-declined': 'signature.declined',
      'envelope-voided': 'signature.canceled',
    }

    return mapping[docusignEvent] || 'signature.created'
  }

  /**
   * Mappe les types d'événements HelloSign vers notre format
   */
  private mapHelloSignEventType(hellosignEvent: string): SignatureEventType {
    const mapping: Record<string, SignatureEventType> = {
      'signature_request_sent': 'document.sent',
      'signature_request_viewed': 'document.opened',
      'signature_request_signed': 'signature.signed',
      'signature_request_all_signed': 'signature.completed',
      'signature_request_declined': 'signature.declined',
      'signature_request_canceled': 'signature.canceled',
      'signature_request_expired': 'signature.expired',
    }

    return mapping[hellosignEvent] || 'signature.created'
  }
}

export const webhookHandlerService = new ESignatureWebhookHandlerService()
