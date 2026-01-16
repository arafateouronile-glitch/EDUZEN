'use client'

import { useQuery } from '@tanstack/react-query'
import { signatureService } from '@/lib/services/signature.service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { PenTool, CheckCircle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SignaturesHistoryProps {
  documentId?: string
  userId?: string
  organizationId?: string
  title?: string
  description?: string
  className?: string
  showDocumentLink?: boolean
}

export function SignaturesHistory({
  documentId,
  userId,
  organizationId,
  title = 'Historique des signatures',
  description,
  className,
  showDocumentLink = false,
}: SignaturesHistoryProps) {
  // Récupérer les signatures par document ou par utilisateur
  const { data: signatures, isLoading } = useQuery({
    queryKey: documentId
      ? ['document-signatures', documentId]
      : ['user-signatures', userId, organizationId],
    queryFn: () =>
      documentId
        ? signatureService.getSignaturesByDocument(documentId)
        : userId && organizationId
        ? signatureService.getSignaturesByUser(userId, organizationId)
        : Promise.resolve([]),
    enabled: !!(documentId || (userId && organizationId)),
  })

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    )
  }

  if (!signatures || signatures.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <PenTool className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">Aucune signature enregistrée</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardDescription className="pt-2">
          {signatures.length} signature(s) enregistrée(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {signatures.map((signature) => (
            <div
              key={signature.id}
              className={cn(
                'flex items-start gap-4 p-4 border rounded-lg transition-colors',
                signature.status === 'revoked'
                  ? 'bg-red-50 border-red-200'
                  : signature.is_valid
                  ? 'bg-green-50/50 border-green-200 hover:bg-green-50'
                  : 'hover:bg-muted/50'
              )}
            >
              <div className="flex-shrink-0 w-24 h-16 border rounded bg-white p-1.5 flex items-center justify-center">
                <img
                  src={signature.signature_data}
                  alt={`Signature de ${signature.signer_name}`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">
                        {signature.signer_name || signature.signer?.full_name || 'Signataire inconnu'}
                      </p>
                      {signature.status === 'signed' && signature.is_valid && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {signature.status === 'revoked' && (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      {signature.status === 'pending' && (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {signature.signer_role || signature.signer?.role || 'Rôle non spécifié'}
                    </p>
                    {signature.signer_email && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {signature.signer_email}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Signé le {formatDate(signature.signed_at)}</span>
                      {signature.signature_type && (
                        <span className="capitalize">
                          {signature.signature_type === 'handwritten'
                            ? 'Manuscrite'
                            : signature.signature_type === 'typed'
                            ? 'Tapée'
                            : 'Image'}
                        </span>
                      )}
                    </div>
                    {signature.comment && (
                      <p className="text-sm text-muted-foreground mt-2 italic border-l-2 border-muted pl-2">
                        "{signature.comment}"
                      </p>
                    )}
                    {signature.status === 'revoked' && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-800">
                        Signature révoquée
                      </div>
                    )}
                  </div>
                  {!signature.is_valid && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded font-medium whitespace-nowrap">
                      Invalide
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
