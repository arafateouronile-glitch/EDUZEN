'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, FileWarning } from 'lucide-react'
import { cn } from '@/lib/utils'
import '@react-pdf-viewer/core/lib/styles/index.css'

const PDF_VIEWER_WORKER = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`

const Viewer = dynamic(
  () => import('@react-pdf-viewer/core').then((mod) => mod.Viewer),
  { ssr: false }
)

const Worker = dynamic(
  () => import('@react-pdf-viewer/core').then((mod) => mod.Worker),
  { ssr: false }
)

export interface SignDocumentPdfViewerProps {
  token: string
  /** 'document-pdf-url' (signature classique) ou 'process-pdf-url' (cascade) */
  pdfUrlEndpoint?: 'document-pdf-url' | 'process-pdf-url'
  className?: string
  onLoad?: (numPages?: number) => void
}

/**
 * PDF Viewer intégré pour le portail de signature.
 * Charge le PDF via URL signée (document-pdf-url ou process-pdf-url).
 * Obligation légale : lecture du document avant signature.
 */
export function SignDocumentPdfViewer({
  token,
  pdfUrlEndpoint = 'document-pdf-url',
  className,
  onLoad,
}: SignDocumentPdfViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token?.trim()) {
      setError('Token manquant')
      setLoading(false)
      return
    }

    let cancelled = false

    fetch(`/api/sign/${pdfUrlEndpoint}?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data?.url) {
          setSignedUrl(data.url)
          setError(null)
        } else {
          setError(data?.error ?? 'Impossible de charger le document')
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur réseau')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, pdfUrlEndpoint])

  useEffect(() => {
    if (signedUrl && onLoad) onLoad()
  }, [signedUrl, onLoad])

  if (loading) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl bg-white/5 border border-white/10 min-h-[320px]',
          className
        )}
      >
        <Loader2 className="h-10 w-10 animate-spin text-[#34B9EE] mb-3" />
        <p className="text-sm text-white/70">Chargement du document…</p>
      </div>
    )
  }

  if (error || !signedUrl) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl bg-white/5 border border-white/10 min-h-[320px] p-6',
          className
        )}
      >
        <FileWarning className="h-10 w-10 text-amber-400 mb-3" />
        <p className="text-sm text-white/80 text-center">
          {error ?? 'Document non disponible'}
        </p>
        <p className="text-xs text-white/50 mt-2 text-center">
          Vous pouvez demander une copie par email avant de signer.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border border-white/20 bg-white/5',
        'min-h-[320px] [&_.rpv-core__viewer]:!bg-white/5',
        className
      )}
    >
      <Worker workerUrl={PDF_VIEWER_WORKER}>
        <div className="h-[min(70vh,520px)] overflow-auto">
          <Viewer fileUrl={signedUrl} onDocumentLoad={() => onLoad?.()} />
        </div>
      </Worker>
    </div>
  )
}
