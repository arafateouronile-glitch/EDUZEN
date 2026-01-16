'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { SignaturePad } from '@/components/signatures'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, FileText, Calendar, User, CheckCircle, XCircle } from 'lucide-react'

interface SignatureRequest {
  id: string
  document: {
    id: string
    title: string | null
    file_url: string | null
    type: string | null
  } | null
  requester: {
    full_name: string | null
    email: string | null
  } | null
  recipient_name: string
  recipient_email: string
  subject: string
  message: string | null
  status: 'pending' | 'signed' | 'expired' | 'declined' | 'cancelled'
  expires_at: string | null
  created_at: string
}

export default function SignaturePage() {
  const params = useParams()
  const router = useRouter()
  const token = params?.token as string

  const [request, setRequest] = useState<SignatureRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadSignatureRequest()
  }, [token])

  const loadSignatureRequest = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/signature-requests/public/${token}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors du chargement')
      }

      const data = await response.json()
      setRequest(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async (signatureData: string) => {
    try {
      setSigning(true)
      setError(null)

      const response = await fetch('/api/signature-requests/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          signatureData,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la signature')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error && !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <XCircle className="h-6 w-6" />
              <CardTitle>Erreur</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle className="h-6 w-6" />
              <CardTitle>Signature enregistrée</CardTitle>
            </div>
            <CardDescription>
              Votre signature a été enregistrée avec succès. Vous pouvez maintenant fermer cette page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.close()}
              className="w-full"
            >
              Fermer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!request) {
    return null
  }

  // Vérifier si la demande est encore valide
  if (request.status !== 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <XCircle className="h-6 w-6" />
              <CardTitle>Demande non disponible</CardTitle>
            </div>
            <CardDescription>
              {request.status === 'signed' && 'Ce document a déjà été signé.'}
              {request.status === 'expired' && 'Cette demande de signature a expiré.'}
              {request.status === 'cancelled' && 'Cette demande de signature a été annulée.'}
              {request.status === 'declined' && 'Cette demande de signature a été refusée.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const expirationDate = request.expires_at
    ? new Date(request.expires_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Signature de document</CardTitle>
            <CardDescription>
              Vous êtes invité(e) à signer le document suivant
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Informations du document */}
            <div className="grid gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Document</p>
                  <p className="font-medium">{request.document?.title || 'Document'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Demandé par</p>
                  <p className="font-medium">
                    {request.requester?.full_name || 'Un utilisateur'}
                  </p>
                  {request.requester?.email && (
                    <p className="text-sm text-gray-500">{request.requester.email}</p>
                  )}
                </div>
              </div>

              {expirationDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date d'expiration</p>
                    <p className="font-medium">{expirationDate}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Message personnalisé */}
            {request.message && (
              <Alert>
                <AlertDescription>
                  <strong>Message :</strong> {request.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Visualisation du document */}
            {request.document?.file_url && (
              <div>
                <h3 className="font-medium mb-2">Aperçu du document</h3>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    src={request.document.file_url}
                    className="w-full h-96"
                    title="Aperçu du document"
                  />
                </div>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(request.document?.file_url || '', '_blank')}
                  >
                    Ouvrir le document dans un nouvel onglet
                  </Button>
                </div>
              </div>
            )}

            {/* Zone de signature */}
            <div>
              <h3 className="font-medium mb-4">Votre signature</h3>
              <SignaturePad
                width={700}
                height={200}
                onSave={handleSign}
                title="Signez ci-dessous"
                description="Dessinez votre signature dans la zone ci-dessous"
                disabled={signing}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Informations légales */}
            <div className="text-sm text-gray-500 border-t pt-4">
              <p>
                En signant ce document, vous acceptez que votre signature électronique soit
                juridiquement équivalente à une signature manuscrite conformément aux normes
                eIDAS.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
