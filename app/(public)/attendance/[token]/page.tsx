'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { SignaturePad } from '@/components/signatures'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Calendar, MapPin, User, CheckCircle, XCircle, Clock } from 'lucide-react'

interface AttendanceRequest {
  id: string
  student_name: string
  student_email: string
  status: 'pending' | 'signed' | 'expired' | 'declined'
  attendance_session: {
    id: string
    title: string
    date: string
    start_time: string | null
    end_time: string | null
    require_signature: boolean
    require_geolocation: boolean
    allowed_radius_meters: number | null
    latitude: number | null
    longitude: number | null
    location_name: string | null
    status: string
    closes_at: string | null
  } | null
}

export default function AttendancePage() {
  const params = useParams()
  const token = params?.token as string

  const [request, setRequest] = useState<AttendanceRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [location, setLocation] = useState<{
    latitude: number
    longitude: number
    accuracy?: number
  } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  useEffect(() => {
    loadAttendanceRequest()
  }, [token])

  useEffect(() => {
    if (request?.attendance_session?.require_geolocation) {
      requestGeolocation()
    }
  }, [request])

  const loadAttendanceRequest = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/electronic-attendance/public/${token}`)

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

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas supportée par votre navigateur')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setLocationError(null)
      },
      (error) => {
        setLocationError('Impossible d\'obtenir votre position. Veuillez autoriser la géolocalisation.')
      }
    )
  }

  const handleSign = async (signatureData: string) => {
    try {
      setSigning(true)
      setError(null)

      // Vérifier la géolocalisation si requise
      if (request?.attendance_session?.require_geolocation && !location) {
        throw new Error('La géolocalisation est requise pour émarger')
      }

      const response = await fetch('/api/electronic-attendance/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          signatureData,
          location,
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
              <CardTitle>Émargement enregistré</CardTitle>
            </div>
            <CardDescription>
              Votre présence a été enregistrée avec succès. Vous pouvez maintenant fermer cette page.
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
              <CardTitle>Émargement non disponible</CardTitle>
            </div>
            <CardDescription>
              {request.status === 'signed' && 'Vous avez déjà émargé pour cette session.'}
              {request.status === 'expired' && 'Cette session d\'émargement a expiré.'}
              {request.status === 'declined' && 'Vous avez refusé cet émargement.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const session = request.attendance_session
  const formattedDate = session ? new Date(session.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) : ''

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Émargement électronique</CardTitle>
            <CardDescription>
              Validez votre présence à la session suivante
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Informations de la session */}
            <div className="grid gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Apprenant</p>
                  <p className="font-medium">{request.student_name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Session</p>
                  <p className="font-medium">{session?.title}</p>
                  <p className="text-sm text-gray-600">{formattedDate}</p>
                  {session?.start_time && (
                    <p className="text-sm text-gray-600">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {session.start_time}
                      {session.end_time && ` - ${session.end_time}`}
                    </p>
                  )}
                </div>
              </div>

              {session?.location_name && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Lieu</p>
                    <p className="font-medium">{session.location_name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Géolocalisation */}
            {session?.require_geolocation && (
              <Alert variant={location ? 'default' : locationError ? 'destructive' : 'default'}>
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  {location ? (
                    <span className="text-green-600">
                      ✓ Position GPS vérifiée
                    </span>
                  ) : locationError ? (
                    <div>
                      <p className="font-medium">Géolocalisation requise</p>
                      <p className="text-sm mt-1">{locationError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={requestGeolocation}
                        className="mt-2"
                      >
                        Réessayer
                      </Button>
                    </div>
                  ) : (
                    <span>Vérification de votre position GPS...</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Zone de signature */}
            <div>
              <h3 className="font-medium mb-4">Votre signature</h3>
              <SignaturePad
                width={700}
                height={200}
                onSave={handleSign}
                title="Signez ci-dessous pour confirmer votre présence"
                description="Dessinez votre signature dans la zone ci-dessous"
                disabled={signing || (session?.require_geolocation === true && !location)}
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
                En émargent électroniquement, vous certifiez votre présence à cette session de formation.
                Votre signature est enregistrée de manière sécurisée et conforme aux normes en vigueur.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
