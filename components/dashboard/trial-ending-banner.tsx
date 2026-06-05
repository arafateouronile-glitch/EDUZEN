'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { X } from 'lucide-react'

const DISMISS_KEY = 'trial_banner_dismissed_date'

function getDismissedToday(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(DISMISS_KEY) === new Date().toDateString()
  } catch {
    return false
  }
}

export function TrialEndingBanner() {
  const { user } = useAuth()
  const supabase = createClient()
  const [dismissed, setDismissed] = useState(getDismissedToday)

  const { data: sub } = useQuery({
    queryKey: ['trial-banner', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null
      const { data } = await supabase
        .from('organization_subscriptions')
        .select('status, trial_ends_at')
        .eq('organization_id', user.organization_id)
        .in('status', ['trialing', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!user?.organization_id,
  })

  if (dismissed || user?.role === 'teacher') return null
  if (!sub?.trial_ends_at) return null

  const trialEnd = new Date(sub.trial_ends_at)
  const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  // Afficher seulement si ≤ 3 jours restants et encore en essai
  if (daysLeft > 3 || daysLeft <= 0) return null

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, new Date().toDateString()) } catch {}
  }

  const label = daysLeft === 1 ? 'demain' : `dans ${daysLeft} jours`

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 mb-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
      <span className="flex-1">
        Votre essai gratuit se termine <strong>{label}</strong>.{' '}
        <Link
          href="/dashboard/subscribe"
          className="underline underline-offset-2 hover:text-amber-700 font-medium transition-colors"
        >
          Choisir une formule
        </Link>
        {' '}pour continuer sans interruption.
      </span>
      <button
        onClick={dismiss}
        className="shrink-0 text-amber-500 hover:text-amber-700 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
