'use client'

import { useEffect } from 'react'

interface CalendlyInlineProps {
  url: string
  height?: number
}

export function CalendlyInline({ url, height = 660 }: CalendlyInlineProps) {
  useEffect(() => {
    if (document.querySelector('script[src*="assets.calendly.com"]')) return
    const script = document.createElement('script')
    script.src = 'https://assets.calendly.com/assets/external/widget.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  return (
    <div
      className="calendly-inline-widget"
      data-url={url}
      data-resize="true"
      style={{ minWidth: '320px', height: `${height}px` }}
    />
  )
}
