'use client'

import { useEffect, useState, useRef } from 'react'
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
 * Récupère l’URL proxy puis le PDF en blob pour un affichage fiable (évite CORS / URL relative).
 */
export function SignDocumentPdfViewer({
  token,
  pdfUrlEndpoint = 'document-pdf-url',
  className,
  onLoad,
}: SignDocumentPdfViewerProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!token?.trim()) {
      setError('Token manquant')
      setLoading(false)
      return
    }

    let cancelled = false

    fetch(`/api/sign/${pdfUrlEndpoint}?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then(async (data) => {
        if (cancelled) return
        if (!data?.url) {
          setError(data?.error ?? 'Impossible de charger le document')
          return
        }
        const pdfUrl =
          typeof data.url === 'string' && data.url.startsWith('http')
            ? data.url
            : `${typeof window !== 'undefined' ? window.location.origin : ''}${String(data.url).startsWith('/') ? '' : '/'}${data.url}`
        const res = await fetch(pdfUrl)
        if (cancelled) return
        if (!res.ok) {
          setError(res.status === 404 ? 'Document non disponible' : 'Erreur lors du chargement du PDF')
          return
        }
        const blob = await res.blob()
        if (cancelled) return
        if (blob.type !== 'application/pdf' && !blob.type.includes('pdf')) {
          setError('Réponse invalide (pas un PDF)')
          return
        }
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const blobUrl = URL.createObjectURL(blob)
        blobUrlRef.current = blobUrl
        setPdfBlobUrl(blobUrl)
        setError(null)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur réseau')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [token, pdfUrlEndpoint])

  useEffect(() => {
    if (pdfBlobUrl && onLoad) onLoad()
  }, [pdfBlobUrl, onLoad])

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

  if (error || !pdfBlobUrl) {
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
        'sign-pdf-viewer rounded-xl overflow-hidden border border-white/20 bg-white/5',
        'min-h-[320px] [&_.rpv-core__viewer]:!bg-white/5 [&_.rpv-core__inner-pages]:!bg-white',
        // Réduire le flou : canvas en taille réelle + rendu net (évite l’upscale flou du navigateur)
        '[&_.rpv-core__canvas-layer_canvas]:!max-w-none [&_.rpv-core__canvas-layer_canvas]:!h-auto',
        className
      )}
    >
      <style
        dangerouslySetInnerHTML={{
          __html:
            '.sign-pdf-viewer .rpv-core__canvas-layer canvas { image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; }',
        }}
      />
      <Worker workerUrl={PDF_VIEWER_WORKER}>
        <div className="w-full min-w-0 h-[min(85vh,720px)] overflow-auto bg-white/10" style={{ minHeight: 560 }}>
          <Viewer
            fileUrl={pdfBlobUrl}
            defaultScale={0.75}
            onDocumentLoad={() => onLoad?.()}
          />
        </div>
      </Worker>
    </div>
  )
}
