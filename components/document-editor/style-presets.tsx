'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Type, 
  X, 
  CheckCircle,
  Save,
  Trash2,
  Plus,
  Palette
} from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

export interface StylePreset {
  id: string
  name: string
  styles: {
    fontSize?: string
    fontWeight?: string
    fontStyle?: string
    color?: string
    backgroundColor?: string
    textAlign?: 'left' | 'center' | 'right' | 'justify'
    lineHeight?: string
    letterSpacing?: string
    marginTop?: string
    marginBottom?: string
    padding?: string
    border?: string
    borderRadius?: string
  }
}

const DEFAULT_PRESETS: StylePreset[] = [
  {
    id: 'heading-1',
    name: 'Titre Principal',
    styles: {
      fontSize: '24pt',
      fontWeight: 'bold',
      color: '#000000',
      marginTop: '20pt',
      marginBottom: '12pt',
      lineHeight: '1.3',
    },
  },
  {
    id: 'heading-2',
    name: 'Sous-titre',
    styles: {
      fontSize: '18pt',
      fontWeight: '600',
      color: '#335ACF',
      marginTop: '16pt',
      marginBottom: '10pt',
      lineHeight: '1.4',
    },
  },
  {
    id: 'heading-3',
    name: 'Titre Section',
    styles: {
      fontSize: '14pt',
      fontWeight: '600',
      color: '#1E3578',
      marginTop: '14pt',
      marginBottom: '8pt',
      lineHeight: '1.4',
    },
  },
  {
    id: 'body-text',
    name: 'Texte Normal',
    styles: {
      fontSize: '12pt',
      fontWeight: 'normal',
      color: '#000000',
      lineHeight: '1.6',
      marginBottom: '12pt',
    },
  },
  {
    id: 'highlight',
    name: 'Texte Mis en Évidence',
    styles: {
      fontSize: '12pt',
      fontWeight: 'bold',
      color: '#335ACF',
      backgroundColor: '#E8EEF9',
      padding: '4pt 8pt',
      borderRadius: '4pt',
    },
  },
  {
    id: 'quote',
    name: 'Citation',
    styles: {
      fontSize: '12pt',
      fontStyle: 'italic',
      color: '#4D4D4D',
      borderLeft: '4px solid #335ACF',
      paddingLeft: '16pt',
      marginTop: '18pt',
      marginBottom: '18pt',
      backgroundColor: '#F9FAFB',
      padding: '12pt 18pt',
    },
  },
  {
    id: 'note',
    name: 'Note',
    styles: {
      fontSize: '11pt',
      color: '#666666',
      fontStyle: 'italic',
      backgroundColor: '#F3F4F6',
      padding: '8pt 12pt',
      borderRadius: '4pt',
      borderLeft: '3px solid #9CA3AF',
    },
  },
]

interface StylePresetsProps {
  onApply: (styles: StylePreset['styles']) => void
  onClose: () => void
}

export function StylePresets({ onApply, onClose }: StylePresetsProps) {
  const [presets, setPresets] = useState<StylePreset[]>(() => {
    // Charger les presets depuis localStorage
    const saved = localStorage.getItem('document-style-presets')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return DEFAULT_PRESETS
      }
    }
    return DEFAULT_PRESETS
  })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetStyles, setNewPresetStyles] = useState<StylePreset['styles']>({})

  const savePresets = (newPresets: StylePreset[]) => {
    setPresets(newPresets)
    localStorage.setItem('document-style-presets', JSON.stringify(newPresets))
  }

  const handleCreatePreset = () => {
    if (!newPresetName.trim()) return
    
    const newPreset: StylePreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName,
      styles: newPresetStyles,
    }
    
    savePresets([...presets, newPreset])
    setNewPresetName('')
    setNewPresetStyles({})
    setShowCreateForm(false)
  }

  const handleDeletePreset = (id: string) => {
    if (id.startsWith('heading-') || id === 'body-text' || id === 'highlight' || id === 'quote' || id === 'note') {
      // Ne pas supprimer les presets par défaut
      return
    }
    savePresets(presets.filter(p => p.id !== id))
  }

  const generateStyleString = (styles: StylePreset['styles']): string => {
    return Object.entries(styles)
      .map(([key, value]) => {
        // Convertir camelCase en kebab-case
        const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase()
        return `${cssKey}: ${value}`
      })
      .join('; ')
  }

  const handleApply = (preset: StylePreset) => {
    // Générer le HTML avec les styles
    const styleString = generateStyleString(preset.styles)
    const html = `<p style="${styleString}">Texte avec style "${preset.name}"</p>`
    
    // Appliquer les styles via callback (l'éditeur appliquera les styles au texte sélectionné)
    onApply(preset.styles)
    onClose()
  }

  return (
    <GlassCard variant="premium" className="p-6 max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-brand-blue" />
          <h2 className="text-xl font-semibold">Styles prédéfinis</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Liste des presets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {presets.map((preset) => {
            const isDefault = preset.id.startsWith('heading-') || 
                            preset.id === 'body-text' || 
                            preset.id === 'highlight' || 
                            preset.id === 'quote' || 
                            preset.id === 'note'
            
            return (
              <motion.div
                key={preset.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <GlassCard variant="subtle" className="p-4 cursor-pointer h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Type className="h-4 w-4 text-brand-blue" />
                        <h3 className="font-semibold text-sm">{preset.name}</h3>
                      </div>
                      <div 
                        className="text-xs p-2 rounded border"
                        style={preset.styles as React.CSSProperties}
                      >
                        Aperçu du style
                      </div>
                      <div className="mt-2 text-xs text-text-tertiary">
                        {Object.keys(preset.styles).length} propriété(s)
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApply(preset)}
                        className="w-full"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Appliquer
                      </Button>
                      {!isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeletePreset(preset.id)}
                          className="w-full text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>

        {/* Formulaire de création */}
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3"
          >
            <Label className="font-semibold">Créer un nouveau style</Label>
            <Input
              placeholder="Nom du style"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Taille de police</Label>
                <Input
                  type="text"
                  placeholder="12pt"
                  value={newPresetStyles.fontSize || ''}
                  onChange={(e) => setNewPresetStyles({ ...newPresetStyles, fontSize: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Couleur</Label>
                <Input
                  type="color"
                  value={newPresetStyles.color || '#000000'}
                  onChange={(e) => setNewPresetStyles({ ...newPresetStyles, color: e.target.value })}
                  className="h-8"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreatePreset} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Créer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewPresetName('')
                  setNewPresetStyles({})
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
            </div>
          </motion.div>
        )}

        {/* Bouton pour créer un nouveau preset */}
        {!showCreateForm && (
          <Button
            variant="outline"
            onClick={() => setShowCreateForm(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer un nouveau style
          </Button>
        )}
      </div>
    </GlassCard>
  )
}

