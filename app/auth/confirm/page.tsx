'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { KeyRound, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type { EmailOtpType } from '@supabase/supabase-js'

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') || '/dashboard'

  const handleConfirm = async () => {
    if (!tokenHash || !type) {
      setError('Lien invalide.')
      return
    }
    setVerifying(true)
    setError(null)

    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })

    if (verifyError) {
      setVerifying(false)
      setError('Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.')
      return
    }

    router.push(next)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 text-center">
          <div className="mx-auto w-14 h-14 bg-brand-blue/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-7 h-7 text-brand-blue" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Continuer vers EduZen</h1>
          <p className="text-gray-600 mb-6">
            Cliquez ci-dessous pour confirmer ce lien et accéder à votre espace.
          </p>

          {!tokenHash || !type ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Ce lien est invalide.</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <Button onClick={handleConfirm} isLoading={verifying} className="w-full">
              Confirmer
            </Button>
          )}

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
              Retour à la connexion
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
