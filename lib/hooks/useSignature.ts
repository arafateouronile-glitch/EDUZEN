/**
 * Hook React pour faciliter l'utilisation de la signature électronique
 */

'use client'

import { useState, useCallback } from 'react'
import { signatureService } from '@/lib/services/signature.service'
import { generatePDFWithSignatures, uploadSignedPDF } from '@/lib/utils/document-generation/pdf-with-signatures'
import { logger } from '@/lib/utils/logger'

export interface UseSignatureOptions {
  documentId: string
  organizationId: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export interface SignatureData {
  signatureData: string
  signerName: string
  signerEmail: string
  signerRole?: string
  comment?: string
}

/**
 * Hook personnalisé pour gérer les signatures électroniques
 */
export function useSignature(options: UseSignatureOptions) {
  const { documentId, organizationId, onSuccess, onError } = options

  const [loading, setLoading] = useState(false)
  const [signatures, setSignatures] = useState<any[]>([])
  const [hasSignatures, setHasSignatures] = useState(false)

  /**
   * Charger les signatures existantes
   */
  const loadSignatures = useCallback(async () => {
    try {
      setLoading(true)
      const sigs = await signatureService.getSignaturesByDocument(documentId)
      setSignatures(sigs)
      setHasSignatures(sigs.length > 0)
      return sigs
    } catch (error) {
      logger.error('Erreur lors du chargement des signatures', error instanceof Error ? error : new Error(String(error)), {
        documentId,
      })
      if (onError) onError(error as Error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [documentId, onError])

  /**
   * Créer une nouvelle signature
   */
  const createSignature = useCallback(async (data: SignatureData, currentUserId: string) => {
    try {
      setLoading(true)

      const signature = await signatureService.createSignature({
        documentId,
        organizationId,
        signerId: currentUserId,
        signatureData: data.signatureData,
        signatureType: 'handwritten',
        signerName: data.signerName,
        signerEmail: data.signerEmail,
        signerRole: data.signerRole,
        comment: data.comment,
      })

      // Recharger les signatures
      await loadSignatures()

      if (onSuccess) onSuccess()

      return signature
    } catch (error) {
      logger.error('Erreur lors de la création de la signature', error instanceof Error ? error : new Error(String(error)), {
        documentId,
      })
      if (onError) onError(error as Error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [documentId, organizationId, loadSignatures, onSuccess, onError])

  /**
   * Générer un PDF avec signatures
   */
  const generatePDF = useCallback(async (
    htmlContent: string,
    variables: Record<string, any>,
    filename: string = 'document.pdf'
  ) => {
    try {
      setLoading(true)

      const result = await generatePDFWithSignatures(htmlContent, {
        documentId,
        variables,
        filename,
        includeMetadata: true,
      })

      return result
    } catch (error) {
      logger.error('Erreur lors de la génération du PDF', error instanceof Error ? error : new Error(String(error)), {
        documentId,
      })
      if (onError) onError(error as Error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [documentId, onError])

  /**
   * Générer et uploader un PDF avec signatures
   */
  const generateAndUploadPDF = useCallback(async (
    htmlContent: string,
    variables: Record<string, any>,
    filename: string = 'document.pdf'
  ) => {
    try {
      setLoading(true)

      // Générer le PDF
      const result = await generatePDFWithSignatures(htmlContent, {
        documentId,
        variables,
        filename,
        includeMetadata: true,
      })

      // Upload vers Supabase
      const url = await uploadSignedPDF(result.blob, documentId, organizationId)

      if (onSuccess) onSuccess()

      return { ...result, uploadUrl: url }
    } catch (error) {
      logger.error('Erreur lors de la génération et upload du PDF', error instanceof Error ? error : new Error(String(error)), {
        documentId,
      })
      if (onError) onError(error as Error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [documentId, organizationId, onSuccess, onError])

  /**
   * Révoquer une signature
   */
  const revokeSignature = useCallback(async (signatureId: string, reason?: string) => {
    try {
      setLoading(true)

      await signatureService.revokeSignature(signatureId, reason)

      // Recharger les signatures
      await loadSignatures()

      if (onSuccess) onSuccess()
    } catch (error) {
      logger.error('Erreur lors de la révocation de la signature', error instanceof Error ? error : new Error(String(error)), {
        signatureId,
      })
      if (onError) onError(error as Error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [loadSignatures, onSuccess, onError])

  /**
   * Vérifier si l'utilisateur actuel a déjà signé
   */
  const hasUserSigned = useCallback((userEmail: string): boolean => {
    return signatures.some(sig =>
      sig.signer_email === userEmail && sig.status === 'signed'
    )
  }, [signatures])

  /**
   * Vérifier si toutes les signatures sont complètes
   */
  const isFullySigned = useCallback((): boolean => {
    if (signatures.length === 0) return false
    return signatures.every(sig => sig.status === 'signed')
  }, [signatures])

  /**
   * Obtenir le statut de complétion
   */
  const getCompletionStatus = useCallback(() => {
    const total = signatures.length
    const signed = signatures.filter(sig => sig.status === 'signed').length
    const pending = signatures.filter(sig => sig.status === 'pending').length

    return {
      total,
      signed,
      pending,
      percentage: total > 0 ? Math.round((signed / total) * 100) : 0,
      isComplete: total > 0 && signed === total,
    }
  }, [signatures])

  return {
    // État
    loading,
    signatures,
    hasSignatures,

    // Actions
    loadSignatures,
    createSignature,
    generatePDF,
    generateAndUploadPDF,
    revokeSignature,

    // Utilitaires
    hasUserSigned,
    isFullySigned,
    getCompletionStatus,
  }
}

/**
 * Hook simplifié pour signature rapide (sans chargement)
 */
export function useQuickSignature() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sign = useCallback(async (params: {
    documentId: string
    organizationId: string
    signerId: string
    signatureData: string
    signerName: string
    signerEmail: string
    signerRole?: string
  }) => {
    try {
      setLoading(true)
      setError(null)

      const signature = await signatureService.createSignature({
        ...params,
        signatureType: 'handwritten',
      })

      return signature
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return { sign, loading, error }
}
