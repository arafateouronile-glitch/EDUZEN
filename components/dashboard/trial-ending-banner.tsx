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

function getStyle(daysLeft: number): {
  wrapper: string
  text: string
  link: string
  close: string
} {
  if (daysLeft <= 3) {
    return {
      wrapper: 'border-amber-200 bg-amber-50 text-amber-900',
      text: 'text-amber-900',
      link: 'underline underline-offset-2 hover:text-amber-700 font-medium transition-colors',
      close: 'text-amber-500 hover:text-amber-700',
    }
  }
  if (daysLeft <= 7) {
    return {
      wrapper: 'border-blue-200 bg-blue-50 text-blue-900',
      text: 'text-blue-900',
      link: 'underline underline-offset-2 hover:text-blue-700 font-medium transition-colors',
      close: 'text-blue-400 hover:text-blue-600',
    }
  }
  // > 7 jours : sobre, neutre
  return {
    wrapper: 'border-gray-200 bg-gray-50 text-gray-600',
    text: 'text-gray-600',
    link: 'underline underline-offset-2 hover:text-gray-800 font-medium transition-colors',
    close: 'text-gray-400 hover:text-gray-600',
  }
}

function getLabel(daysLeft: number): string {
  if (daysLeft === 1) return 'demain'
  if (daysLeft <= 3) return `dans ${daysLeft} jours`
  if (daysLeft <= 7) return `dans ${daysLeft} jours`
  return `${daysLeft} jours restants`
}

function getMessage(daysLeft: number, label: string): JSX.Element {
  if (daysLeft <= 3) {
    return (
      <>
        Votre essai gratuit se termine <strong>{label}</strong>.{' '}
        <Link href="/dashboard/subscribe" className="underline underline-offset-2 hover:text-amber-700 font-medium transition-colors">
          Choisir une formule
        </Link>
        {' '}pour continuer sans interruption.
      </>
    )
  }
  if (daysLeft <= 7) {
    return (
      <>
        Essai gratuit · <strong>{label}</strong> avant la fin.{' '}
        <Link href="/dashboard/subscribe" className="underline underline-offset-2 hover:text-blue-700 font-medium transition-colors">
          Voir les formules
        </Link>
      </>
    )
  }
  return (
    <>
      Essai gratuit · <strong>{label}</strong>.{' '}
      <Link href="/dashboard/subscribe" className="underline underline-offset-2 hover:text-gray-800 font-medium transition-colors">
        Voir les formules
      </Link>
    </>
  )
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
        .from('subscriptions')
        .select('status, trial_end_at')
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
  if (!sub?.trial_end_at) return null

  const trialEnd = new Date(sub.trial_end_at)
  const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) return null

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, new Date().toDateString()) } catch {}
  }

  const style = getStyle(daysLeft)
  const label = getLabel(daysLeft)

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 mb-4 rounded-lg border text-sm ${style.wrapper}`}>
      <span className="flex-1">
        {getMessage(daysLeft, label)}
      </span>
      <button
        onClick={dismiss}
        className={`shrink-0 transition-colors ${style.close}`}
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
