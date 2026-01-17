'use client'

// TODO: Implémenter ImageResizer

export interface ImageConfig {
  width?: number
  height?: number
  aspectRatio?: 'original' | 'square' | '16:9' | '4:3' | '3:2'
  quality?: number
  format?: 'original' | 'jpeg' | 'png' | 'webp'
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside'
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

interface ImageResizerProps {
  imageUrl?: string
  config?: ImageConfig
  onUpdate?: (config: ImageConfig & { align?: string; width?: number; height?: number }) => void
  onInsert?: (html: string) => void
  onClose?: () => void
}

export function ImageResizer(props?: ImageResizerProps) {
  return null
}
