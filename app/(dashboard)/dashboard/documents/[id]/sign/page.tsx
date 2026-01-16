'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { documentService } from '@/lib/services/document.service'
import { signatureService } from '@/lib/services/signature.service'
import { SignaturePad } from '@/components/signatures'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { ArrowLeft, Save, X } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default function SignDocumentPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const documentId = params.id as string

  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  // Récupérer le document
  const { data: document, isLoading: documentLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentService.getById(documentId),
    enabled: !!documentId,
  })

  // Récupérer les signatures existantes
  const { data: existingSignatures } = useQuery({
    queryKey: ['document-signatures', documentId],
    queryFn: () => signatureService.getSignaturesByDocument(documentId),
    enabled: !!documentId,
  })

  // Mutation pour créer la signature
  const createSignatureMutation = useMutation({
    mutationFn: async () => {
      if (!signatureData || !user?.organization_id || !user?.id) {
        throw new Error('Signature requise')
      }

      return signatureService.createSignature({
        documentId,
        organizationId: user.organization_id,
        signerId: user.id,
        signatureData,
        signerName: user.full_name || user.email || 'Utilisateur',
        signerEmail: user.email || null,
        signerRole: user.role || null,
        comment: comment || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-signatures', documentId] })
      queryClient.invalidateQueries({ queryKey: ['document', documentId] })
      addToast({
        title: 'Signature enregistrée',
        description: 'Votre signature a été enregistrée avec succès.',
        type: 'success',
      })
      router.push(`/dashboard/documents/${documentId}`)
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de l\'enregistrement de la signature.',
      })
    },
  })

  if (documentLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center py-12">Chargement...</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Document introuvable</p>
            <Link href="/dashboard/documents">
              <Button variant="outline" className="mt-4">
                Retour aux documents
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Vérifier si l'utilisateur a déjà signé
  const userHasSigned = existingSignatures?.some(
    (sig) => sig.signer_id === user?.id && sig.status === 'signed'
  )

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/dashboard/documents/${documentId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au document
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Signer le document</h1>
        <p className="text-muted-foreground">
          {document.title || 'Document sans titre'}
        </p>
      </div>

      {/* Informations du document */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informations du document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <Label className="text-sm text-muted-foreground">Type</Label>
            <p className="font-medium">{document.type || 'Non spécifié'}</p>
          </div>
          {document.created_at && (
            <div>
              <Label className="text-sm text-muted-foreground">Date de création</Label>
              <p className="font-medium">{formatDate(document.created_at)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signatures existantes */}
      {existingSignatures && existingSignatures.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Signatures existantes</CardTitle>
            <CardDescription>
              {existingSignatures.length} signature(s) déjà enregistrée(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {existingSignatures.map((signature) => (
                <div
                  key={signature.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-16 border rounded bg-white p-2">
                      <img
                        src={signature.signature_data}
                        alt="Signature"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <p className="font-medium">
                        {signature.signer_name || signature.signer?.full_name || 'Signataire'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {signature.signer_role || signature.signer?.role || 'Rôle non spécifié'}
                      </p>
                      {signature.signed_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatDate(signature.signed_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  {signature.signer_id === user?.id && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Votre signature
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {userHasSigned ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">
              Vous avez déjà signé ce document.
            </p>
            <Link href={`/dashboard/documents/${documentId}`}>
              <Button variant="outline">Retour au document</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Zone de signature */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Votre signature</CardTitle>
              <CardDescription>
                Signez dans la zone ci-dessous. Vous pouvez également importer une image de signature.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignaturePad
                onSave={(data) => setSignatureData(data)}
                onClear={() => setSignatureData(null)}
                width={600}
                height={200}
              />
            </CardContent>
          </Card>

          {/* Commentaire optionnel */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Commentaire (optionnel)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ajouter un commentaire à votre signature..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Link href={`/dashboard/documents/${documentId}`}>
              <Button variant="outline">
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </Link>
            <Button
              onClick={() => createSignatureMutation.mutate()}
              disabled={!signatureData || createSignatureMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createSignatureMutation.isPending ? 'Enregistrement...' : 'Enregistrer la signature'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
