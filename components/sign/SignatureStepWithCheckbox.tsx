'use client'

import { useRef, useState, useCallback } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { motion } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRAND } from './SignPortalLayout'

const attestationAttendance =
  "Je certifie sur l'honneur être présent et accepter les conditions de cette signature / émargement."

const attestationDocument =
  "J'ai lu et j'accepte l'ensemble des pages du document. Je certifie sur l'honneur la véracité de ma signature."

export interface SignatureStepWithCheckboxProps {
  onValidate: (signatureData: string) => void
  disabled?: boolean
  isLoading?: boolean
  isAttendance?: boolean
  isDocument?: boolean
  requireGeolocation?: boolean
  hasGeolocation?: boolean
  className?: string
}

export function SignatureStepWithCheckbox({
  onValidate,
  disabled = false,
  isLoading = false,
  isAttendance = false,
  isDocument = false,
  requireGeolocation = false,
  hasGeolocation = true,
  className,
}: SignatureStepWithCheckboxProps) {
  const attestationText = isDocument ? attestationDocument : attestationAttendance
  const sigRef = useRef<SignatureCanvas>(null)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [attestation, setAttestation] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)

  const clear = useCallback(() => {
    sigRef.current?.clear()
    setHasDrawn(false)
    setSignatureData(null)
  }, [])

  const onEnd = useCallback(() => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setHasDrawn(true)
      const data = sigRef.current.toDataURL('image/png') || ''
      setSignatureData(data)
    }
  }, [])

  const submit = useCallback(() => {
    if (!signatureData || !attestation) return
    if (requireGeolocation && !hasGeolocation) return
    onValidate(signatureData)
  }, [signatureData, attestation, requireGeolocation, hasGeolocation, onValidate])

  const canSubmit =
    hasDrawn &&
    !!signatureData &&
    attestation &&
    (!requireGeolocation || hasGeolocation) &&
    !disabled &&
    !isLoading

  return (
    <motion.div
      className={cn('space-y-6', className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="space-y-2">
        <Label className="text-sm font-medium text-white/90">
          Votre signature
        </Label>
        <div
          className={cn(
            'relative rounded-xl overflow-hidden border-2 border-dashed',
            'bg-white/5 border-white/20'
          )}
        >
          <SignatureCanvas
            ref={sigRef}
            canvasProps={{
              width: 560,
              height: 180,
              className: 'w-full h-full min-h-[180px] cursor-crosshair touch-none',
              style: {
                width: '100%',
                height: 180,
                backgroundColor: 'rgba(255,255,255,0.03)',
              },
            }}
            backgroundColor="rgba(255,255,255,0.03)"
            penColor={BRAND.deepBlue}
            onEnd={onEnd}
          />
          {!hasDrawn && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none text-white/40 text-sm"
              aria-hidden
            >
              Signez dans la zone ci‑dessus
            </div>
          )}
        </div>
        {hasDrawn && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clear}
            disabled={disabled}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Effacer
          </Button>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4">
        <Checkbox
          id="attestation"
          checked={attestation}
          onCheckedChange={(v) => setAttestation(!!v)}
          disabled={disabled}
          className="border-white/30 mt-0.5 [&:checked]:bg-[#34B9EE] [&:checked]:border-[#34B9EE]"
        />
        <Label
          htmlFor="attestation"
          className="text-sm text-white/90 leading-relaxed cursor-pointer"
        >
          {attestationText}
        </Label>
      </div>

      {requireGeolocation && !hasGeolocation && (
        <p className="text-sm text-amber-300">
          La géolocalisation est requise pour valider votre présence.
        </p>
      )}

      <Button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className={cn(
          'w-full font-semibold rounded-xl transition-all',
          'bg-[#34B9EE] hover:bg-[#2aa8dd] text-[#0f2847]',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-[#0f2847]/30 border-t-[#0f2847] rounded-full animate-spin" />
            Enregistrement…
          </span>
        ) : (
          'Valider'
        )}
      </Button>
    </motion.div>
  )
}
