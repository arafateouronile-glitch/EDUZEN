'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader2, RefreshCw, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScormPackageInfo {
  id: string
  title: string | null
  scorm_version: string
  entry_point: string
  file_count: number
}

interface ScormUploaderProps {
  lessonId: string
  organizationId: string
  existingPackage?: ScormPackageInfo | null
  onSuccess?: (pkg: ScormPackageInfo) => void
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

export function ScormUploader({
  lessonId,
  organizationId,
  existingPackage,
  onSuccess,
}: ScormUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>(existingPackage ? 'done' : 'idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [packageInfo, setPackageInfo] = useState<ScormPackageInfo | null>(
    existingPackage ?? null
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      setError('Le fichier doit être un archive .zip')
      return
    }

    const MAX_SIZE = 500 * 1024 * 1024 // 500 MB
    if (file.size > MAX_SIZE) {
      setError('Le fichier est trop volumineux (max 500 Mo)')
      return
    }

    setStatus('uploading')
    setProgress(0)
    setError(null)

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // 1. Upload du .zip directement vers Supabase Storage (évite la limite Vercel)
      const zipPath = `tmp/${organizationId}/${lessonId}/${Date.now()}.zip`

      const { error: uploadError } = await supabase.storage
        .from('scorm-packages')
        .upload(zipPath, file, { upsert: true, cacheControl: '60' })

      if (uploadError) {
        throw new Error(`Erreur upload : ${uploadError.message}`)
      }

      setProgress(50)
      setStatus('processing')

      // 2. Extraction et traitement côté serveur
      const res = await fetch('/api/elearning/scorm/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zip_path: zipPath,
          lesson_id: lessonId,
          organization_id: organizationId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors du traitement du package')
      }

      setProgress(100)
      setStatus('done')
      setPackageInfo(data.package)
      onSuccess?.(data.package)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    }
  }, [lessonId, organizationId, onSuccess])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragRef.current = false
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!dragRef.current) {
      dragRef.current = true
      setIsDragOver(true)
    }
  }

  const handleDragLeave = () => {
    dragRef.current = false
    setIsDragOver(false)
  }

  const reset = () => {
    setStatus('idle')
    setProgress(0)
    setError(null)
    setPackageInfo(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (status === 'done' && packageInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-4 bg-green-50 rounded-full">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Package SCORM importé</h3>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-left w-full max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {packageInfo.title || 'Package sans titre'}
              </span>
            </div>
            <div className="space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Version</span>
                <span className="font-mono font-medium">SCORM {packageInfo.scorm_version}</span>
              </div>
              <div className="flex justify-between">
                <span>Point d&apos;entrée</span>
                <span className="font-mono truncate max-w-[150px]">{packageInfo.entry_point}</span>
              </div>
              {packageInfo.file_count > 0 && (
                <div className="flex justify-between">
                  <span>Fichiers</span>
                  <span className="font-medium">{packageInfo.file_count}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Réimporter un autre package
        </button>
      </div>
    )
  }

  if (status === 'uploading' || status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <Loader2 className="h-10 w-10 text-brand-blue animate-spin" />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {status === 'uploading' ? 'Envoi du fichier...' : 'Extraction du package SCORM...'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {status === 'processing' ? 'Cela peut prendre quelques secondes selon la taille' : ''}
          </p>
        </div>
        <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-brand-blue h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'w-full max-w-md border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors',
          isDragOver
            ? 'border-brand-blue bg-brand-blue/5'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100',
        )}
      >
        <div className="p-4 bg-white rounded-full shadow-sm">
          <Upload className="h-8 w-8 text-gray-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">
            Déposer un package SCORM ici
          </p>
          <p className="text-xs text-gray-400 mt-1">
            ou cliquer pour sélectionner un fichier .zip
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Compatible SCORM 1.2 et SCORM 2004 — jusqu&apos;à 500 Mo
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 max-w-md w-full">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
