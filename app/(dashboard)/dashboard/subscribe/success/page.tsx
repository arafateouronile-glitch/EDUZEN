'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { CheckCircle2, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { useToast } from '@/components/ui/toast'
import { logger } from '@/lib/utils/logger'

export default function SubscribeSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = createClient()
  const { addToast } = useToast()
  const [isVerifying, setIsVerifying] = useState(true)
  const sessionId = searchParams.get('session_id')

  // Vérifier le statut de la subscription
  const { data: subscription } = useQuery({
    queryKey: ['subscription', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, plans(*)')
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (error) {
        logger.error('Erreur récupération subscription', error)
        return null
      }
      
      return data
    },
    enabled: !!user?.organization_id && !isVerifying,
    refetchInterval: 2000, // Vérifier toutes les 2 secondes
  })

  useEffect(() => {
    if (sessionId) {
      // Attendre quelques secondes pour que Stripe webhook mette à jour la subscription
      const timer = setTimeout(() => {
        setIsVerifying(false)
      }, 3000)
      
      return () => clearTimeout(timer)
    } else {
      setIsVerifying(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (!isVerifying && subscription && subscription.status === 'active') {
      addToast({
        type: 'success',
        title: 'Abonnement activé !',
        description: 'Votre abonnement est maintenant actif',
      })
    }
  }, [subscription, isVerifying, addToast])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <GlassCard variant="premium" className="p-12 text-center">
          {isVerifying ? (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-brand-blue mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Vérification de votre paiement...
              </h1>
              <p className="text-gray-600">
                Nous vérifions votre abonnement. Cela ne prendra que quelques instants.
              </p>
            </>
          ) : subscription && subscription.status === 'active' ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="mb-6"
              >
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50"></div>
                  <div className="relative p-4 bg-green-100 rounded-full">
                    <CheckCircle2 className="h-16 w-16 text-green-600" />
                  </div>
                </div>
              </motion.div>
              
              <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent mb-4">
                Abonnement confirmé !
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                Votre abonnement <strong>{(subscription.plans as any)?.name}</strong> est maintenant actif.
              </p>
              
              <Button
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-brand text-white shadow-lg hover:shadow-xl"
              >
                Accéder au tableau de bord
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-16 w-16 text-brand-blue mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Paiement en cours de traitement
              </h1>
              <p className="text-gray-600 mb-8">
                Votre paiement a été reçu. Votre abonnement sera activé sous peu.
              </p>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
              >
                Retour au tableau de bord
              </Button>
            </>
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}
