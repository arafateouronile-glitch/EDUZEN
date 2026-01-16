'use client'

import React, { useRef, useEffect, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RotateCcw, Download, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SignatureCanvasProps {
  width?: number
  height?: number
  backgroundColor?: string
  penColor?: string
  onSave?: (signatureData: string) => void
  onClear?: () => void
  defaultValue?: string // Signature par défaut (base64)
  className?: string
  disabled?: boolean
  showControls?: boolean
  title?: string
  description?: string
}

export function SignaturePad({
  width = 600,
  height = 200,
  backgroundColor = '#ffffff',
  penColor = '#000000',
  onSave,
  onClear,
  defaultValue,
  className,
  disabled = false,
  showControls = true,
  title,
  description,
}: SignatureCanvasProps) {
  const signatureRef = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)
  const [signatureData, setSignatureData] = useState<string | null>(defaultValue || null)

  // Charger la signature par défaut si fournie
  useEffect(() => {
    if (defaultValue && signatureRef.current && isEmpty) {
      const img = new Image()
      img.src = defaultValue
      img.onload = () => {
        const ctx = signatureRef.current?.getCanvas()?.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          setIsEmpty(false)
          setSignatureData(defaultValue)
        }
      }
    }
  }, [defaultValue, isEmpty])

  const handleClear = () => {
    signatureRef.current?.clear()
    setIsEmpty(true)
    setSignatureData(null)
    onClear?.()
  }

  const handleSave = () => {
    if (signatureRef.current && !isEmpty) {
      const data = signatureRef.current.toDataURL('image/png')
      setSignatureData(data)
      onSave?.(data)
    }
  }

  const handleEnd = () => {
    if (signatureRef.current) {
      const isEmpty = signatureRef.current.isEmpty()
      setIsEmpty(isEmpty)
      if (!isEmpty) {
        const data = signatureRef.current.toDataURL('image/png')
        setSignatureData(data)
        onSave?.(data)
      }
    }
  }

  const handleDownload = () => {
    if (signatureData) {
      const link = document.createElement('a')
      link.download = `signature-${Date.now()}.png`
      link.href = signatureData
      link.click()
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const data = event.target?.result as string
        if (data && signatureRef.current) {
          const img = new Image()
          img.src = data
          img.onload = () => {
            const canvas = signatureRef.current?.getCanvas()
            const ctx = canvas?.getContext('2d')
            if (ctx && canvas) {
              ctx.clearRect(0, 0, canvas.width, canvas.height)
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              setIsEmpty(false)
              setSignatureData(data)
              onSave?.(data)
            }
          }
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Card className={cn('w-full', className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <div className="relative border-2 border-dashed rounded-lg overflow-hidden bg-white">
          <SignatureCanvas
            ref={signatureRef}
            canvasProps={{
              width,
              height,
              className: 'w-full h-full cursor-crosshair',
              style: {
                backgroundColor,
                width: '100%',
                height: `${height}px`,
              },
            }}
            backgroundColor={backgroundColor}
            penColor={penColor}
            onEnd={handleEnd}
            disabled={disabled}
          />
          {isEmpty && !signatureData && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-muted-foreground">Signez dans la zone ci-dessus</p>
            </div>
          )}
        </div>

        {showControls && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={disabled || (isEmpty && !signatureData)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Effacer
            </Button>

            {signatureData && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={disabled}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>

                <label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={disabled}
                  >
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Importer
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={disabled}
                  />
                </label>
              </>
            )}

            {!isEmpty && !signatureData && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={disabled}
              >
                Enregistrer la signature
              </Button>
            )}
          </div>
        )}

        {signatureData && (
          <div className="text-xs text-muted-foreground">
            Signature enregistrée le {new Date().toLocaleString('fr-FR')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
