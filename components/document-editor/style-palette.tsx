'use client'

// TODO: Implémenter StylePalette

interface StylePaletteProps {
  onApplyStyle?: (style: {
    fontSize?: string
    fontWeight?: string
    fontStyle?: string
    color?: string
    backgroundColor?: string
    textAlign?: string
    lineHeight?: string
    marginTop?: string
    marginBottom?: string
    padding?: string
    borderLeft?: string
    borderColor?: string
  }) => void
  onClose?: () => void
}

export function StylePalette(props?: StylePaletteProps) {
  return null
}
