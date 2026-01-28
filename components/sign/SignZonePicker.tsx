'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import {
  Upload,
  Loader2,
  Trash2,
  Plus,
  FileWarning,
  ChevronLeft,
  ChevronRight,
  Layers,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { SignZone } from '@/lib/types/sign-zones'
// react-rnd styles are included in the component

const PDF_WORKER = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
const SCALE = 1.5
const DEFAULT_ZONE_W = 0.15
const DEFAULT_ZONE_H = 0.05

export interface SignZonePickerProps {
  /** PDF en tant que File ou URL (object URL). Si non fourni, upload interne. */
  file?: File | string | null
  /** Zones existantes (ex. chargées depuis un template) */
  zones?: SignZone[]
  /** Callback quand les zones changent */
  onChange?: (zones: SignZone[]) => void
  /** Callback quand un PDF est choisi (mode uncontrolled) */
  onFileSelect?: (file: File) => void
  /** Id de la zone « Signature Stagiaire » pour libellé par défaut */
  defaultZoneId?: string
  className?: string
}

function generateZoneId(): string {
  return `zone_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function SignZonePicker({
  file: fileProp,
  zones: controlledZones,
  onChange,
  onFileSelect,
  defaultZoneId = 'sig_stagiaire',
  className,
}: SignZonePickerProps) {
  const [internalFile, setInternalFile] = useState<File | null>(null)
  const file = fileProp ?? internalFile

  const [zones, setZones] = useState<SignZone[]>(controlledZones ?? [])
  const [pdfDoc, setPdfDoc] = useState<{
    numPages: number
    pageWidths: number[]
    pageHeights: number[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [addMode, setAddMode] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const canvasRefs = useRef<Record<number, HTMLCanvasElement>>({})
  const containerRefs = useRef<Record<number, HTMLDivElement>>({})
  const pdfLibRef = useRef<typeof import('pdfjs-dist') | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const emit = useCallback(
    (next: SignZone[]) => {
      setZones(next)
      onChange?.(next)
    },
    [onChange]
  )

  useEffect(() => {
    if (controlledZones && controlledZones.length >= 0) {
      setZones(controlledZones)
    }
  }, [controlledZones])

  useEffect(() => {
    if (!file) {
      setPdfDoc(null)
      setError(null)
      return
    }

    let cancelled = false
    let objectUrl: string | null = null

    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER
        pdfLibRef.current = pdfjs

        const src = typeof file === 'string' ? file : URL.createObjectURL(file)
        if (typeof file === 'object') objectUrl = src

        const doc = await pdfjs.getDocument(src).promise
        if (cancelled) return

        const numPages = doc.numPages
        const pageWidths: number[] = []
        const pageHeights: number[] = []

        for (let i = 1; i <= numPages; i++) {
          const page = await doc.getPage(i)
          const vp = page.getViewport({ scale: SCALE })
          pageWidths.push(vp.width)
          pageHeights.push(vp.height)
        }

        if (cancelled) return
        setPdfDoc({ numPages, pageWidths, pageHeights })
        setCurrentPage(1)
        setZones((z) => z.filter((zone) => zone.page <= numPages))
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur chargement PDF')
      } finally {
        if (!cancelled) setLoading(false)
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }
    }

    run()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [file])

  useEffect(() => {
    if (!pdfDoc || !pdfLibRef.current || !file) return
    const pdfjs = pdfLibRef.current
    const src = typeof file === 'string' ? file : URL.createObjectURL(file as File)
    let objectUrl: string | null = typeof file === 'object' ? src : null

    const render = async () => {
      try {
        const doc = await pdfjs.getDocument(src).promise
        const canvas = canvasRefs.current[currentPage]
        if (!canvas) return
        const page = await doc.getPage(currentPage)
        const vp = page.getViewport({ scale: SCALE })
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        canvas.width = vp.width
        canvas.height = vp.height
        await page.render({ canvasContext: ctx, viewport: vp }).promise
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }
    }
    render()
  }, [pdfDoc, file, currentPage])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (!f) return
      if (!fileProp) setInternalFile(f)
      onFileSelect?.(f)
      e.target.value = ''
    },
    [fileProp, onFileSelect]
  )

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
      if (!addMode || !pdfDoc) return
      if ((e.target as HTMLElement).closest('[data-rnd]')) return
      const pageNum = pageIndex + 1
      const el = e.currentTarget
      const rect = el.getBoundingClientRect()
      const pw = pdfDoc.pageWidths[pageIndex] ?? rect.width
      const ph = pdfDoc.pageHeights[pageIndex] ?? rect.height
      const scaleX = pw / rect.width
      const scaleY = ph / rect.height
      const cx = (e.clientX - rect.left) * scaleX
      const cy = (e.clientY - rect.top) * scaleY
      const x = Math.max(0, Math.min(1 - DEFAULT_ZONE_W, cx / pw - DEFAULT_ZONE_W / 2))
      const y = Math.max(0, Math.min(1 - DEFAULT_ZONE_H, cy / ph - DEFAULT_ZONE_H / 2))

      const id = zones.some((z) => z.id === defaultZoneId) ? generateZoneId() : defaultZoneId
      const label =
        id === defaultZoneId
          ? 'Signature Stagiaire'
          : zones.some((z) => z.id === defaultZoneId)
            ? 'Signature OF'
            : 'Nouvelle zone'
      const zone: SignZone = {
        id,
        page: pageNum,
        x,
        y,
        w: DEFAULT_ZONE_W,
        h: DEFAULT_ZONE_H,
        label,
      }
      emit(zones.some((z) => z.id === id) ? zones.map((z) => (z.id === id ? zone : z)) : [...zones, zone])
      setAddMode(false)
      setSelectedId(id)
    },
    [addMode, pdfDoc, zones, defaultZoneId, emit]
  )

  const removeZone = useCallback(
    (id: string) => {
      const next = zones.filter((z) => z.id !== id)
      emit(next)
      if (selectedId === id) setSelectedId(null)
    },
    [zones, selectedId, emit]
  )

  const updateZone = useCallback(
    (id: string, patch: Partial<SignZone>) => {
      emit(zones.map((z) => (z.id === id ? { ...z, ...patch } : z)))
    },
    [zones, emit]
  )

  const onDragStop = useCallback(
    (id: string, pageNum: number, _e: unknown, d: { x: number; y: number }) => {
      const idx = pageNum - 1
      const pw = pdfDoc?.pageWidths[idx] ?? 1
      const ph = pdfDoc?.pageHeights[idx] ?? 1
      const zone = zones.find((z) => z.id === id)
      if (!zone) return
      const x = Math.max(0, Math.min(1 - zone.w, d.x / pw))
      const y = Math.max(0, Math.min(1 - zone.h, d.y / ph))
      updateZone(id, { x, y })
    },
    [pdfDoc, zones, updateZone]
  )

  const onResizeStop = useCallback(
    (id: string, pageNum: number, _e: unknown, _d: unknown, ref: HTMLElement) => {
      const idx = pageNum - 1
      const pw = pdfDoc?.pageWidths[idx] ?? 1
      const ph = pdfDoc?.pageHeights[idx] ?? 1
      const zone = zones.find((z) => z.id === id)
      if (!zone) return
      const container = containerRefs.current[pageNum]
      if (!container) return
      const scaleW = pw / container.offsetWidth
      const scaleH = ph / container.offsetHeight
      const r = ref.getBoundingClientRect()
      const w = Math.max(0.05, Math.min(1 - zone.x, (r.width * scaleW) / pw))
      const h = Math.max(0.02, Math.min(1 - zone.y, (r.height * scaleH) / ph))
      updateZone(id, { w, h })
    },
    [pdfDoc, zones, updateZone]
  )

  const copyJson = useCallback(() => {
    const out = zones.map((z) => ({ id: z.id, page: z.page, x: z.x, y: z.y, w: z.w, h: z.h, label: z.label }))
    navigator.clipboard.writeText(JSON.stringify(out, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [zones])

  const selectedZone = zones.find((z) => z.id === selectedId)
  const pageZones = zones.filter((z) => z.page === currentPage)
  const showUpload = !fileProp

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-center gap-3">
        {showUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choisir un PDF
            </Button>
          </>
        )}
        {pdfDoc && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddMode(!addMode)}
              className={cn(
                'border-white/20 bg-white/5 text-white hover:bg-white/10',
                addMode && 'ring-2 ring-[#34B9EE]'
              )}
            >
              <Plus className="h-4 w-4 mr-2" />
              {addMode ? 'Cliquez sur la page pour placer' : 'Ajouter une zone'}
            </Button>
            <div className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2 py-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[7rem] text-center text-sm text-white/80">
                Page {currentPage} / {pdfDoc.numPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white/80"
                onClick={() => setCurrentPage((p) => Math.min(pdfDoc.numPages, p + 1))}
                disabled={currentPage >= pdfDoc.numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B9EE]" />
          <span className="text-sm text-white/70">Chargement du PDF…</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <FileWarning className="h-5 w-5 shrink-0 text-amber-400" />
          <span className="text-sm text-amber-200">{error}</span>
        </div>
      )}

      {!file && !loading && showUpload && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/20 bg-white/5 py-16 transition-colors hover:border-[#34B9EE]/50 hover:bg-white/10"
        >
          <Upload className="h-12 w-12 text-white/40" />
          <p className="text-sm text-white/70">Glissez un PDF ici ou cliquez pour parcourir</p>
        </div>
      )}

      {pdfDoc && file && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          <div className="overflow-auto rounded-xl border border-white/20 bg-[#0f2847]/90">
            <div
              ref={(r) => {
                if (r) containerRefs.current[currentPage] = r
              }}
              className="relative inline-block"
              style={{
                width: pdfDoc.pageWidths[currentPage - 1],
                height: pdfDoc.pageHeights[currentPage - 1],
              }}
            >
              <canvas
                ref={(r) => {
                  if (r) canvasRefs.current[currentPage] = r
                }}
                className="block"
                width={pdfDoc.pageWidths[currentPage - 1]}
                height={pdfDoc.pageHeights[currentPage - 1]}
                style={{
                  width: pdfDoc.pageWidths[currentPage - 1],
                  height: pdfDoc.pageHeights[currentPage - 1],
                }}
              />
              <div
                role="presentation"
                className={cn(
                  'absolute inset-0',
                  addMode && 'cursor-crosshair'
                )}
                style={{ width: pdfDoc.pageWidths[currentPage - 1], height: pdfDoc.pageHeights[currentPage - 1] }}
                onClick={(e) => handlePageClick(e, currentPage - 1)}
              />
              {pageZones.map((zone) => {
                const pw = pdfDoc.pageWidths[currentPage - 1] ?? 1
                const ph = pdfDoc.pageHeights[currentPage - 1] ?? 1
                return (
                  <Rnd
                    key={zone.id}
                    data-rnd
                    position={{ x: zone.x * pw, y: zone.y * ph }}
                    size={{ width: zone.w * pw, height: zone.h * ph }}
                    bounds="parent"
                    onDragStop={(e, d) => onDragStop(zone.id, zone.page, e, d)}
                    onResizeStop={(e, d, ref) => onResizeStop(zone.id, zone.page, e, d, ref)}
                    onMouseDown={() => setSelectedId(zone.id)}
                    enableResizing={selectedId === zone.id}
                    className={cn(
                      'border-2 border-[#34B9EE] bg-[#34B9EE]/20 flex items-center justify-center cursor-move rounded z-10',
                      selectedId === zone.id && 'ring-2 ring-white'
                    )}
                  >
                    <span className="truncate px-1 text-xs font-medium text-white">
                      {zone.label ?? zone.id}
                    </span>
                  </Rnd>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-white/20 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium text-white/90">
                <Layers className="h-4 w-4" />
                Zones ({zones.length})
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white"
                onClick={copyJson}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1">{copied ? 'Copié' : 'Copier JSON'}</span>
              </Button>
            </div>
            <ul className="space-y-2 overflow-auto">
              {zones.map((z) => (
                <li
                  key={z.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                    selectedId === z.id
                      ? 'border-[#34B9EE] bg-[#34B9EE]/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  )}
                >
                  <button
                    type="button"
                    className="flex-1 text-left text-white/90"
                    onClick={() => {
                      setSelectedId(z.id)
                      setCurrentPage(z.page)
                    }}
                  >
                    <span className="font-medium">{z.label ?? z.id}</span>
                    <span className="ml-2 text-white/50">p.{z.page}</span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                    onClick={() => removeZone(z.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
            {selectedZone && (
              <div className="mt-2 space-y-2 border-t border-white/10 pt-3">
                <Label className="text-xs text-white/60">Label</Label>
                <Input
                  value={selectedZone.label ?? ''}
                  onChange={(e) => updateZone(selectedZone.id, { label: e.target.value })}
                  placeholder="ex. Signature Stagiaire"
                  className="border-white/20 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>
            )}
            <pre className="mt-auto max-h-40 overflow-auto rounded bg-[#0f2847] p-2 text-xs text-white/70">
              {JSON.stringify(
                zones.map((z) => ({ id: z.id, page: z.page, x: z.x, y: z.y, w: z.w, h: z.h, label: z.label })),
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
