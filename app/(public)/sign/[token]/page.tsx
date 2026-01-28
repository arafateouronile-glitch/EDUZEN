'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { SignPortalLayout, SignPortalCard } from '@/components/sign/SignPortalLayout'
import { SignatureStepWithCheckbox } from '@/components/sign/SignatureStepWithCheckbox'
import {
  Loader2,
  FileText,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
} from 'lucide-react'
import { SignDocumentPdfViewer } from '@/components/sign/SignDocumentPdfViewer'
import { cn } from '@/lib/utils'

type SignType = 'signature' | 'attendance' | 'process'
type SignData = {
  type: SignType
  data: Record<string, unknown> & {
    status?: string
    document?: Record<string, unknown>
    process?: {
      title?: string
      document?: Record<string, unknown>
      [key: string]: unknown
    }
    [key: string]: unknown
  }
}

export default function SignPage() {
  const params = useParams()
  const token = (params?.token as string) ?? ''
  const [sign, setSign] = useState<SignData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [location, setLocation] = useState<{
    lat: number
    lng: number
    accuracy?: number
  } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token?.trim()) {
      setError('Lien invalide')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/sign/public/${token}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? 'Erreur lors du chargement')
        if (res.status === 404 || res.status === 410) {
          setSign(json?.type && json?.data ? { type: json.type, data: json.data } : null)
        }
        setLoading(false)
        return
      }
      setSign({ type: json.type, data: json.data })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const session = sign?.type === 'attendance'
      ? (sign.data?.attendance_session as Record<string, unknown> | null)
      : null
    if (session?.require_geolocation && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setLocation({
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy,
          })
          setLocationError(null)
        },
        () => setLocationError('Géolocalisation refusée ou indisponible.')
      )
    }
  }, [sign])

  const handleValidate = useCallback(
    async (signatureData: string) => {
      if (!token?.trim()) return
      try {
        setSubmitting(true)
        setError(null)
        const body: Record<string, unknown> = {
          token,
          signatureData,
          attestation: true,
        }
        if (location) {
          body.geolocation = {
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy,
          }
        }
        const res = await fetch('/api/sign/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(json?.error ?? 'Erreur lors de l\'enregistrement')
          return
        }
        setSuccess(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur inconnue')
      } finally {
        setSubmitting(false)
      }
    },
    [token, location]
  )

  if (loading) {
    return (
      <SignPortalLayout>
        <SignPortalCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-[#34B9EE] mb-4" />
            <p className="text-white/80">Chargement…</p>
          </div>
        </SignPortalCard>
      </SignPortalLayout>
    )
  }

  if (error && !success) {
    const processOrSig = sign?.data?.process ?? sign?.data
    const st = processOrSig?.status ?? sign?.data?.status
    const showForm = sign && (st === 'pending' || st === 'partially_signed' || st === undefined)
    if (!showForm) {
      return (
        <SignPortalLayout>
          <SignPortalCard>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-red-500/20 p-3">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <h1 className="text-xl font-semibold text-white">Erreur</h1>
              <p className="text-white/70">{error}</p>
            </div>
          </SignPortalCard>
        </SignPortalLayout>
      )
    }
  }

  if (success) {
    const isAttendance = sign?.type === 'attendance'
    const isProcess = sign?.type === 'process'
    return (
      <SignPortalLayout>
        <AnimatePresence mode="wait">
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
            className="w-full max-w-md"
          >
            <SignPortalCard>
              <div className="flex flex-col items-center text-center space-y-5 py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className="rounded-full bg-[#34B9EE]/20 p-4"
                >
                  <CheckCircle className="h-12 w-12 text-[#34B9EE]" />
                </motion.div>
                <h1 className="text-xl font-semibold text-white">
                  Merci,{' '}
                  {isAttendance
                    ? 'votre présence est enregistrée'
                    : isProcess
                      ? 'votre signature a été enregistrée. Le prochain signataire recevra le lien par email.'
                      : 'votre signature a été enregistrée.'}
                </h1>
                <p className="text-white/70 text-sm">
                  Vous pouvez fermer cette page.
                </p>
              </div>
            </SignPortalCard>
          </motion.div>
        </AnimatePresence>
      </SignPortalLayout>
    )
  }

  const isAttendance = sign?.type === 'attendance'
  const isProcess = sign?.type === 'process'
  const session = isAttendance
    ? (sign?.data?.attendance_session as Record<string, unknown> | null)
    : null
  const sessionStartTime = session?.start_time as string | null | undefined
  const sessionEndTime = session?.end_time as string | null | undefined
  const sessionLocationName = session?.location_name as string | null | undefined
  const requireGeo = !!session?.require_geolocation
  const hasGeo = !requireGeo || !!location

  const doc = !isAttendance
    ? ((sign?.data?.document ?? sign?.data?.process?.document) as Record<string, unknown> | null)
    : null
  const requester = !isAttendance && !isProcess
    ? (sign?.data?.requester as Record<string, unknown> | null)
    : null
  const signatory = isProcess ? (sign?.data?.signatory as Record<string, unknown> | null) : null

  const title = isAttendance
    ? (session?.title as string) ?? 'Session'
    : (doc?.title as string) ?? (sign?.data?.process?.title as string) ?? 'Document'
  const subtitle = isAttendance
    ? 'Validez votre présence à la session suivante'
    : isProcess
      ? 'Signature en cascade : vous signez ce document à votre tour.'
      : 'Vous êtes invité(e) à signer le document suivant'
  const name = isAttendance
    ? (sign?.data?.student_name as string) ?? 'Apprenant'
    : isProcess
      ? (signatory?.name as string) ?? 'Signataire'
      : (sign?.data?.recipient_name as string) ?? 'Vous'

  const formattedDate: string | null = session?.date
    ? new Date(session.date as string).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const isDocument = !isAttendance && (!!doc?.file_url || isProcess)

  return (
    <SignPortalLayout>
      <motion.div
        className={cn('w-full', isDocument ? 'max-w-3xl' : 'max-w-lg')}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SignPortalCard>
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-white mb-1">
                {isAttendance
                  ? 'Émargement électronique'
                  : isProcess
                    ? 'Signature en cascade'
                    : 'Signature de document'}
              </h1>
              <p className="text-white/70 text-sm">{subtitle}</p>
            </div>

            <div className="space-y-3 rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-[#34B9EE] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">Destinataire</p>
                  <p className="text-white font-medium">{name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-[#34B9EE] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider">
                    {isAttendance ? 'Session' : 'Document'}
                  </p>
                  <p className="text-white font-medium">{title}</p>
                </div>
              </div>
              {formattedDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-[#34B9EE] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider">Date</p>
                    <p className="text-white font-medium">{formattedDate}</p>
                    {sessionStartTime && (
                      <p className="text-white/70 text-sm flex items-center gap-1 mt-0.5">
                        <Clock className="h-4 w-4" />
                        <span>{String(sessionStartTime)}</span>
                        {sessionEndTime && <span> – {String(sessionEndTime)}</span>}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {sessionLocationName && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[#34B9EE] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider">Lieu</p>
                    <p className="text-white font-medium">{String(sessionLocationName)}</p>
                  </div>
                </div>
              )}
              {!isAttendance && requester && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-[#34B9EE] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider">Demandé par</p>
                    <p className="text-white font-medium">
                      {(requester.full_name as string) ?? 'Un utilisateur'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {requireGeo && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                {location ? (
                  <p className="text-sm text-[#34B9EE] flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Position enregistrée
                  </p>
                ) : locationError ? (
                  <p className="text-sm text-amber-300">{locationError}</p>
                ) : (
                  <p className="text-sm text-white/60">Vérification de la position…</p>
                )}
              </div>
            )}

            {isDocument && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-white/90">Document à signer</p>
                <SignDocumentPdfViewer
                  token={token}
                  pdfUrlEndpoint={isProcess ? 'process-pdf-url' : 'document-pdf-url'}
                  className="w-full"
                />
              </div>
            )}

            <SignatureStepWithCheckbox
              onValidate={handleValidate}
              disabled={false}
              isLoading={submitting}
              isAttendance={isAttendance}
              isDocument={isDocument}
              requireGeolocation={requireGeo}
              hasGeolocation={hasGeo}
            />

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}
          </div>
        </SignPortalCard>
      </motion.div>
    </SignPortalLayout>
  )
}
