'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { HeaderLayout, FooterLayout } from '@/lib/types/document-templates'
import { FileText, Layout, Palette, Image as ImageIcon, Minus } from 'lucide-react'

interface LayoutSelectorProps {
  type: 'header' | 'footer'
  value: HeaderLayout | FooterLayout | 'custom'
  onChange: (layout: HeaderLayout | FooterLayout) => void
}

const headerLayouts: Array<{
  id: HeaderLayout
  name: string
  description: string
  preview: string
}> = [
  {
    id: 'logo_left_info_right',
    name: 'Logo Gauche / Infos Droite',
    description: 'Logo à gauche, informations de contact à droite',
    preview: 'Logo | Nom École\n       | Contact',
  },
  {
    id: 'logo_centered',
    name: 'Logo Centré',
    description: 'Logo et nom centrés verticalement',
    preview: '       Logo\n   Nom École',
  },
  {
    id: 'banner_gradient',
    name: 'Bannière Gradient',
    description: 'Header avec fond dégradé et logo',
    preview: 'Logo | Nom École\n     | Contact (fond bleu)',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Header simple et épuré',
    preview: 'Logo | Nom École',
  },
  {
    id: 'professional',
    name: 'Professionnel',
    description: 'Header avec bordure et slogan',
    preview: 'Logo | Nom École\n     | Slogan (avec bordure)',
  },
]

const footerLayouts: Array<{
  id: FooterLayout
  name: string
  description: string
  preview: string
}> = [
  {
    id: 'simple',
    name: 'Simple',
    description: 'Pagination centrée avec nom de l\'école',
    preview: 'Nom École | Page X / Y',
  },
  {
    id: 'complete',
    name: 'Complet',
    description: 'Contact, pagination et site web',
    preview: 'Contact | Page X / Y | Site Web\nDate génération',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Uniquement la pagination',
    preview: 'Page X / Y',
  },
  {
    id: 'professional',
    name: 'Professionnel',
    description: 'Avec bordure et mentions légales',
    preview: 'Confidentiel | Page X / Y | Contact\n       Mentions légales',
  },
  {
    id: 'modern',
    name: 'Moderne',
    description: 'QR Code, contact et pagination',
    preview: '[QR] | Contact | Page X / Y | Site Web',
  },
]

export function LayoutSelector({ type, value, onChange }: LayoutSelectorProps) {
  const layouts = type === 'header' ? headerLayouts : footerLayouts

  return (
    <div className="grid grid-cols-2 gap-3">
      {layouts.map((layout) => {
        const isSelected = value === layout.id
        return (
          <Card
            key={layout.id}
            className={cn(
              'cursor-pointer transition-all hover:border-brand-blue hover:shadow-md',
              isSelected && 'border-brand-blue border-2 shadow-md'
            )}
            onClick={() => onChange(layout.id)}
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-primary">{layout.name}</h4>
                  {isSelected && (
                    <div className="h-2 w-2 rounded-full bg-brand-blue" />
                  )}
                </div>
                <p className="text-xs text-text-tertiary">{layout.description}</p>
                <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 whitespace-pre-line border border-gray-200">
                  {layout.preview}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
      
      {/* Option Custom */}
      <Card
        className={cn(
          'cursor-pointer transition-all hover:border-brand-blue hover:shadow-md',
          value === 'custom' && 'border-brand-blue border-2 shadow-md'
        )}
        onClick={() => onChange('custom' as any)}
      >
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text-primary">Personnalisé</h4>
              {value === 'custom' && (
                <div className="h-2 w-2 rounded-full bg-brand-blue" />
              )}
            </div>
            <p className="text-xs text-text-tertiary">Créez votre propre layout</p>
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono text-gray-400 whitespace-pre-line border border-gray-200 flex items-center justify-center h-12">
              <Palette className="h-4 w-4 opacity-50" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
