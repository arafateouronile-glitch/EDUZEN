'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Printer, X } from 'lucide-react'

interface QRCodeModalProps {
  open: boolean
  onClose: () => void
  url: string
  title: string
  organizationName?: string
}

export function QRCodeModal({ open, onClose, url, title, organizationName }: QRCodeModalProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !url) return
    QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: '#15263f', light: '#ffffff' } })
      .then(setDisplayUrl)
    QRCode.toDataURL(url, { width: 600, margin: 2, color: { dark: '#15263f', light: '#ffffff' } })
      .then(setDownloadUrl)
  }, [open, url])

  const handleDownload = () => {
    if (!downloadUrl) return
    const link = document.createElement('a')
    const safeName = title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_')
    link.download = `QR_Emargement_${safeName}.png`
    link.href = downloadUrl
    link.click()
  }

  const handlePrint = () => {
    if (!downloadUrl) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title>
      <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}
      h1{font-size:20px;color:#15263f;margin-bottom:8px;text-align:center;}p{font-size:13px;color:#555;margin:4px 0;text-align:center;}img{margin:20px 0;}</style>
      </head><body><h1>${title}</h1>${organizationName ? `<p>${organizationName}</p>` : ''}
      <img src="${downloadUrl}" width="300" height="300" alt="QR Code" />
      <p style="font-size:11px;word-break:break-all;max-width:300px;">${url}</p></body></html>`)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold leading-tight">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {displayUrl
            ? <img src={displayUrl} alt="QR Code" width={300} height={300} className="rounded-lg border border-gray-200" />
            : <div className="w-[300px] h-[300px] rounded-lg border border-gray-200 bg-gray-50 animate-pulse" />
          }
          <p className="text-xs text-muted-foreground text-center break-all max-w-[280px]">{url}</p>
        </div>

        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!downloadUrl}>
            <Download className="h-4 w-4 mr-1.5" />
            Télécharger
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!downloadUrl}>
            <Printer className="h-4 w-4 mr-1.5" />
            Imprimer
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4 mr-1.5" />
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
