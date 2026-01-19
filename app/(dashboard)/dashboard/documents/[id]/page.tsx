'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { documentService } from '@/lib/services/document.service'
import { signatureService } from '@/lib/services/signature.service.client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Download, PenTool, Eye, Mail, Send, FileText } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { SendSignatureRequestDialog } from '@/components/signatures'
import { useState } from 'react'

export default function DocumentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { addToast } = useToast()
  const documentId = params.id as string

  // Récupérer le document
  const { data: document, isLoading: documentLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentService.getById(documentId),
    enabled: !!documentId,
  })

  // Récupérer les signatures
  const { data: signatures, isLoading: signaturesLoading } = useQuery({
    queryKey: ['document-signatures', documentId],
    queryFn: () => signatureService.getSignaturesByDocument(documentId),
    enabled: !!documentId,
  })

  if (documentLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Document introuvable</p>
            <Link href="/dashboard/documents">
              <Button variant="outline">Retour aux documents</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Note: getSignaturesByDocument retourne déjà uniquement les signatures avec status === 'signed'
  const hasUserSigned = signatures?.some((sig) => sig.signer?.id === user?.id)

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/dashboard/documents">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux documents
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{document.title || 'Document sans titre'}</h1>
            <p className="text-muted-foreground">
              Type : {document.type || 'Non spécifié'} • Créé le {document.created_at ? formatDate(document.created_at) : 'Date inconnue'}
            </p>
          </div>
          <div className="flex gap-2">
            {document.file_url && (
              <>
                <SendSignatureRequestDialog
                  documentId={documentId}
                  documentTitle={document.title || 'Document'}
                  onSuccess={() => {
                    addToast({
                      type: 'success',
                      title: 'Demande de signature envoyée',
                      description: 'Les destinataires ont reçu un email avec le lien de signature.',
                    })
                  }}
                  trigger={
                    <Button variant="outline">
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer pour signature
                    </Button>
                  }
                />
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                >
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </a>
                <Link href={`/dashboard/documents/${documentId}/sign`}>
                  <Button variant={hasUserSigned ? 'outline' : 'default'}>
                    <PenTool className="h-4 w-4 mr-2" />
                    {hasUserSigned ? 'Re-signer' : 'Signer'}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale - Document et signatures */}
        <div className="lg:col-span-2 space-y-6">
          {/* Aperçu du document */}
          {document.file_url && (
            <Card>
              <CardHeader>
                <CardTitle>Aperçu du document</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={document.file_url}
                    className="w-full h-[600px]"
                    title="Aperçu du document"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signatures */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Signatures</CardTitle>
                  <CardDescription>
                    {signaturesLoading
                      ? 'Chargement...'
                      : signatures && signatures.length > 0
                      ? `${signatures.length} signature(s) enregistrée(s)`
                      : 'Aucune signature'}
                  </CardDescription>
                </div>
                {!hasUserSigned && (
                  <Link href={`/dashboard/documents/${documentId}/sign`}>
                    <Button size="sm">
                      <PenTool className="h-4 w-4 mr-2" />
                      Ajouter une signature
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {signaturesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Chargement des signatures...</div>
              ) : signatures && signatures.length > 0 ? (
                <div className="space-y-4">
                  {signatures.map((signature) => (
                    <div
                      key={signature.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-32 h-20 border rounded bg-white p-2 flex items-center justify-center">
                        <img
                          src={signature.signature_data}
                          alt={`Signature de ${signature.signer_name}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-lg">
                              {signature.signer_name || signature.signer?.full_name || 'Signataire inconnu'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {signature.signer_role || signature.signer?.role || 'Rôle non spécifié'}
                            </p>
                            {signature.signer_email && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {signature.signer_email}
                              </p>
                            )}
                            {signature.signed_at && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Signé le {formatDate(signature.signed_at)}
                              </p>
                            )}
                            {signature.comment && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
                                "{signature.comment}"
                              </p>
                            )}
                          </div>
                          {signature.signer_id === user?.id && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded font-medium whitespace-nowrap">
                              Votre signature
                            </span>
                          )}
                        </div>
                        {signature.status === 'revoked' && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            Signature révoquée
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <PenTool className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune signature enregistrée pour ce document
                  </p>
                  <Link href={`/dashboard/documents/${documentId}/sign`}>
                    <Button>
                      <PenTool className="h-4 w-4 mr-2" />
                      Ajouter la première signature
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale - Informations */}
        <div className="space-y-6">
          {/* Informations du document */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Type</p>
                <p className="font-medium">{document.type || 'Non spécifié'}</p>
              </div>
              {document.created_at && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date de création</p>
                  <p className="font-medium">{formatDate(document.created_at)}</p>
                </div>
              )}
              {document.students && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Étudiant</p>
                  <p className="font-medium">
                    {(document.students as any).first_name} {(document.students as any).last_name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistiques des signatures */}
          {signatures && signatures.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total de signatures</span>
                  <span className="font-semibold">{signatures.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Signatures valides</span>
                  <span className="font-semibold text-green-600">
                    {signatures.filter((s) => s.is_valid && s.status === 'signed').length}
                  </span>
                </div>
                {hasUserSigned && (
                  <div className="pt-2 mt-2 border-t">
                    <span className="text-sm text-blue-600 font-medium">✓ Vous avez signé ce document</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog d'envoi de signature */}
      {user?.organization_id && (
        <SendSignatureRequestDialog
          documentId={documentId}
          documentTitle={document?.title || 'Document'}
          onSuccess={() => {
            addToast({
              type: 'success',
              title: 'Demande de signature envoyée',
              description: 'Les destinataires ont reçu un email avec le lien de signature.',
            })
          }}
          trigger={
            <Button variant="outline" size="sm">
              <Send className="h-4 w-4 mr-2" />
              Demander une signature
            </Button>
          }
        />
      )}
    </div>
  )
}
