'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SyncCalendarModalProps {
  open: boolean
  onClose: () => void
}

export function SyncCalendarModal({ open, onClose }: SyncCalendarModalProps) {
  const [feedUrl, setFeedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || feedUrl) return
    setLoading(true)
    fetch('/api/calendar/token')
      .then((r) => r.json())
      .then((d) => {
        if (d.feedUrl) setFeedUrl(d.feedUrl)
        else setError(d.error ?? 'Erreur')
      })
      .catch(() => setError('Impossible de générer le lien'))
      .finally(() => setLoading(false))
  }, [open, feedUrl])

  const copy = async () => {
    if (!feedUrl) return
    await navigator.clipboard.writeText(feedUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const webcalUrl = feedUrl?.replace(/^https?:\/\//, 'webcal://')

  const googleUrl = feedUrl
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl ?? feedUrl)}`
    : null

  const outlookUrl = feedUrl
    ? `https://outlook.live.com/calendar/addcalendar?url=${encodeURIComponent(feedUrl)}`
    : null

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Synchroniser le calendrier</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Abonnez-vous pour voir les sessions dans votre agenda
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="h-6 w-6 text-brand-blue animate-spin" />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 text-center py-4">{error}</p>
          )}

          {feedUrl && (
            <>
              {/* Boutons d'abonnement */}
              <div className="space-y-3">
                <a
                  href={googleUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all',
                    'border-blue-100 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 text-blue-700 font-medium'
                  )}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" fill="currentColor">
                    <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064 5.96 5.96 0 0 1 4.123 1.632l2.904-2.904A10.003 10.003 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
                  </svg>
                  Ajouter à Google Calendar
                  <ExternalLink className="h-4 w-4 ml-auto opacity-60" />
                </a>

                <a
                  href={outlookUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all',
                    'border-sky-100 bg-sky-50 hover:border-sky-300 hover:bg-sky-100 text-sky-700 font-medium'
                  )}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" fill="currentColor">
                    <path d="M7.462 0L0 2.125v19.749l7.462 2.126V0zM8.538 2.125v19.749L24 24V0L8.538 2.125z" />
                  </svg>
                  Ajouter à Outlook
                  <ExternalLink className="h-4 w-4 ml-auto opacity-60" />
                </a>

                <a
                  href={webcalUrl ?? '#'}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 rounded-xl border-2 transition-all',
                    'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 text-gray-700 font-medium'
                  )}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" fill="currentColor">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Apple Calendar / Autre
                  <ExternalLink className="h-4 w-4 ml-auto opacity-60" />
                </a>
              </div>

              {/* Lien à copier */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Ou copiez le lien d'abonnement
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={feedUrl}
                    className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-600 truncate focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copy}
                    className="flex-shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Ce lien est personnel et sécurisé — ne le partagez pas.
                Le calendrier se met à jour automatiquement.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
