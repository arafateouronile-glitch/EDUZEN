'use client'

/**
 * Composant ImageResizer - Redimensionneur d'images
 * 
 * NOTE: Composant non implémenté - Fonctionnalité prévue pour une future version
 * Ce composant permettra de redimensionner et configurer les images dans les documents.
 */

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
  onUpdate?: (config: ImageConfig & { 
    align?: string
    width?: number
    height?: number
    widthUnit?: '%' | 'px' | 'auto'
    heightUnit?: '%' | 'px' | 'auto'
    borderRadius?: number
    opacity?: number
    rotation?: number
  }) => void
  onInsert?: (html: string) => void
  onClose?: () => void
}

export function ImageResizer(props?: ImageResizerProps) {
  return null
}
