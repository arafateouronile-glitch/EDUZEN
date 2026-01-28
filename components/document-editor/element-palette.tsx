'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GlassCard } from '@/components/ui/glass-card'
import { 
  Image, 
  FileSignature, 
  QrCode,
  Upload,
  X,
  Link as LinkIcon,
  FileText,
  CheckCircle,
  ScanLine,
  FileEdit,
  BarChart3,
  Library
} from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { logger, sanitizeError } from '@/lib/utils/logger'

type ElementType = 'image' | 'signature' | 'qrcode' | 'barcode' | 'link' | 'divider' | 'chart' | 'map' | 'attachment' | 'form'

interface ElementPaletteProps {
  onInsert: (elementHTML: string) => void
  onClose: () => void
  onChartEditorOpen?: () => void
  onSignatureFieldOpen?: () => void
  onMapEmbedOpen?: () => void
  onAttachmentEmbedOpen?: () => void
  onFormFieldOpen?: () => void
  onMediaLibraryOpen?: () => void
}

export function ElementPalette({ onInsert, onClose, onChartEditorOpen, onSignatureFieldOpen, onMapEmbedOpen, onAttachmentEmbedOpen, onFormFieldOpen, onMediaLibraryOpen }: ElementPaletteProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [elementType, setElementType] = useState<ElementType>('image')
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [imageWidth, setImageWidth] = useState(200)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [qrCodeData, setQrCodeData] = useState('')
  const [qrCodeSize, setQrCodeSize] = useState(200)
  const [barcodeData, setBarcodeData] = useState('')
  const [barcodeType, setBarcodeType] = useState<'CODE128' | 'CODE39' | 'EAN13' | 'UPC'>('CODE128')
  const [barcodeWidth, setBarcodeWidth] = useState(200)
  const [barcodeHeight, setBarcodeHeight] = useState(50)

  const generateElementHTML = () => {
    switch (elementType) {
      case 'image':
        if (!imageUrl) return ''
        return `<p style="text-align: center; margin: 16px 0;">
          <img 
            src="${imageUrl}" 
            alt="${imageAlt || 'Image'}" 
            style="max-width: ${imageWidth}px; height: auto; border-radius: 8px; display: block; margin: 0 auto;"
          />
        </p>`
      
      case 'signature':
        if (onSignatureFieldOpen) {
          onSignatureFieldOpen()
          return ''
        }
        return `<p style="margin: 32px 0; text-align: center;">
          <span style="display: block; border-top: 2px solid #000; width: 200px; margin: 0 auto 8px;"></span>
          <span style="font-size: 14px; color: #666;">Signature</span>
        </p>`
      
      case 'qrcode':
        if (!qrCodeData) return ''
        // Utiliser un service de QR code en ligne avec support des variables
        // Les variables seront remplacées lors de la génération du document
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrCodeSize}x${qrCodeSize}&data=${encodeURIComponent(qrCodeData)}`
        return `<p style="text-align: center; margin: 16px 0;">
          <img 
            src="${qrCodeUrl}" 
            alt="QR Code" 
            class="qr-code-dynamic"
            data-qr-data="${qrCodeData}"
            style="max-width: ${qrCodeSize}px; height: auto; display: block; margin: 0 auto;"
          />
        </p>
        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 8px;">
          ${qrCodeData}
        </p>`
      
      case 'barcode':
        if (!barcodeData) return ''
        // Utiliser un service de code-barres en ligne avec support des variables
        // Les variables seront remplacées lors de la génération du document
        const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeData)}&code=${barcodeType}&dpi=96&dataseparator=`
        return `<p style="text-align: center; margin: 16px 0;">
          <img 
            src="${barcodeUrl}" 
            alt="Code-barres ${barcodeType}" 
            class="barcode-dynamic"
            data-barcode-data="${barcodeData}"
            data-barcode-type="${barcodeType}"
            style="max-width: ${barcodeWidth}px; height: ${barcodeHeight}px; display: block; margin: 0 auto;"
          />
        </p>
        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 8px;">
          ${barcodeData}
        </p>`
      
      case 'link':
        if (!linkUrl) return ''
        return `<p style="margin: 16px 0;">
          <a href="${linkUrl}" style="color: #335ACF; text-decoration: underline;">
            ${linkText || linkUrl}
          </a>
        </p>`
      
      case 'divider':
        return `<hr style="border-top: 2px solid #e5e7eb; margin: 24px 0; border-bottom: none; border-left: none; border-right: none;" />`
      
      case 'chart':
        // Pour les graphiques, on ouvre l'éditeur de graphiques
        if (onChartEditorOpen) {
          onChartEditorOpen()
          return ''
        }
        return ''
      
      case 'form':
        // Pour les champs de formulaire, on ouvre l'éditeur de champs
        if (onFormFieldOpen) {
          onFormFieldOpen()
          return ''
        }
        return ''
      
      default:
        return ''
    }
  }

  const handleInsert = () => {
    const html = generateElementHTML()
    logger.debug('Element HTML généré', { html, type: elementType })
    if (html && html.trim()) {
      try {
        onInsert(html)
        // Attendre un peu avant de fermer pour s'assurer que l'insertion est terminée
        setTimeout(() => {
          onClose()
        }, 100)
      } catch (error) {
        logger.error('Erreur lors de l\'insertion de l\'élément:', error)
        alert('Erreur lors de l\'insertion de l\'élément. Veuillez réessayer.')
      }
    } else {
      logger.error('Aucun HTML généré pour l\'élément', elementType)
      alert('Impossible de générer l\'élément. Veuillez remplir tous les champs requis.')
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImageUrl(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const elementIcons = {
    image: Image,
    signature: FileSignature,
    qrcode: QrCode,
    barcode: ScanLine,
    link: LinkIcon,
    divider: FileText,
    chart: BarChart3,
    form: FileEdit,
  }

  return (
    <GlassCard variant="premium" className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5 text-brand-blue" />
          Palette d'éléments
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Element Type Selection */}
        <div>
          <Label className="mb-3 block">Type d'élément</Label>
          <div className="grid grid-cols-6 gap-2">
            {(['image', 'signature', 'qrcode', 'barcode', 'link', 'divider', 'form'] as const).map((type) => {
              const Icon = elementIcons[type as keyof typeof elementIcons]
              return (
                <motion.button
                  key={type}
                  onClick={() => setElementType(type)}
                  className={cn(
                    'p-3 border-2 rounded-lg transition-all flex flex-col items-center gap-2',
                    elementType === type
                      ? 'border-brand-blue bg-brand-blue-ghost'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs capitalize">{type}</span>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Element Configuration */}
        <div className="space-y-4">
          {elementType === 'image' && (
            <>
              <div>
                <Label>URL de l'image ou upload</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    {onMediaLibraryOpen && (
                      <Button 
                        variant="outline" 
                        type="button"
                        onClick={onMediaLibraryOpen}
                      >
                        <Library className="h-4 w-4 mr-2" />
                        Bibliothèque
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="imageAlt">Texte alternatif</Label>
                  <Input
                    id="imageAlt"
                    type="text"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    className="mt-1"
                    placeholder="Description de l'image"
                  />
                </div>
                <div>
                  <Label htmlFor="imageWidth">Largeur (px)</Label>
                  <Input
                    id="imageWidth"
                    type="number"
                    min="50"
                    max="800"
                    value={imageWidth}
                    onChange={(e) => setImageWidth(parseInt(e.target.value) || 200)}
                    className="mt-1"
                  />
                </div>
              </div>
              {imageUrl && (
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <img
                    src={imageUrl}
                    alt={imageAlt || 'Preview'}
                    style={{ maxWidth: `${imageWidth}px`, height: 'auto' }}
                    className="mx-auto rounded"
                  />
                </div>
              )}
            </>
          )}

          {elementType === 'qrcode' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="qrCodeData">Données du QR Code (variables supportées: {'{variable_name}'})</Label>
                <Input
                  id="qrCodeData"
                  type="text"
                  value={qrCodeData}
                  onChange={(e) => setQrCodeData(e.target.value)}
                  className="mt-1"
                  placeholder="Texte, URL ou variable (ex: {eleve_numero})"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Vous pouvez utiliser des variables comme {'{eleve_numero}'}, {'{numero_document}'}, etc.
                </p>
              </div>
              <div>
                <Label htmlFor="qrCodeSize">Taille (px)</Label>
                <Input
                  id="qrCodeSize"
                  type="number"
                  min="100"
                  max="500"
                  value={qrCodeSize}
                  onChange={(e) => setQrCodeSize(parseInt(e.target.value) || 200)}
                  className="mt-1"
                />
              </div>
              {qrCodeData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=${Math.min(qrCodeSize, 300)}x${Math.min(qrCodeSize, 300)}&data=${encodeURIComponent(qrCodeData)}`}
                    alt="QR Code Preview"
                    className="mx-auto"
                  />
                  <p className="text-sm text-gray-600 mt-2 break-all">{qrCodeData}</p>
                </div>
              )}
            </div>
          )}

          {elementType === 'barcode' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="barcodeData">Données du code-barres (variables supportées: {'{variable_name}'})</Label>
                <Input
                  id="barcodeData"
                  type="text"
                  value={barcodeData}
                  onChange={(e) => setBarcodeData(e.target.value)}
                  className="mt-1"
                  placeholder="Numéro ou variable (ex: {eleve_numero})"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Vous pouvez utiliser des variables comme {'{eleve_numero}'}, {'{numero_document}'}, etc.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="barcodeType">Type de code-barres</Label>
                  <select
                    id="barcodeType"
                    value={barcodeType}
                    onChange={(e) => setBarcodeType(e.target.value as typeof barcodeType)}
                    className="mt-1 w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="CODE128">CODE128</option>
                    <option value="CODE39">CODE39</option>
                    <option value="EAN13">EAN13</option>
                    <option value="UPC">UPC</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="barcodeWidth">Largeur (px)</Label>
                  <Input
                    id="barcodeWidth"
                    type="number"
                    min="100"
                    max="600"
                    value={barcodeWidth}
                    onChange={(e) => setBarcodeWidth(parseInt(e.target.value) || 200)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="barcodeHeight">Hauteur (px)</Label>
                <Input
                  id="barcodeHeight"
                  type="number"
                  min="30"
                  max="200"
                  value={barcodeHeight}
                  onChange={(e) => setBarcodeHeight(parseInt(e.target.value) || 50)}
                  className="mt-1"
                />
              </div>
              {barcodeData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                  <img
                    src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(barcodeData)}&code=${barcodeType}&dpi=96&dataseparator=`}
                    alt={`Barcode ${barcodeType} Preview`}
                    className="mx-auto"
                    style={{ maxWidth: `${Math.min(barcodeWidth, 400)}px`, height: `${barcodeHeight}px` }}
                  />
                  <p className="text-sm text-gray-600 mt-2 break-all">{barcodeData}</p>
                </div>
              )}
            </div>
          )}

          {elementType === 'link' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="linkUrl">URL</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="mt-1"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="linkText">Texte du lien</Label>
                <Input
                  id="linkText"
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="mt-1"
                  placeholder="Texte à afficher"
                />
              </div>
            </div>
          )}

          {(elementType === 'signature' || elementType === 'divider') && (
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
              <div dangerouslySetInnerHTML={{ __html: generateElementHTML() }} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleInsert}
            disabled={
              (elementType === 'image' && !imageUrl) || 
              (elementType === 'qrcode' && !qrCodeData) || 
              (elementType === 'barcode' && !barcodeData) ||
              (elementType === 'link' && !linkUrl)
            }
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Insérer l'élément
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}
