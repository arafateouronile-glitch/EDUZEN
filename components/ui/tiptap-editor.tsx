'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Extension } from '@tiptap/core'
import Underline from '@tiptap/extension-underline'
import TiptapImage from '@tiptap/extension-image'
import { useImperativeHandle, forwardRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { VariableExtension } from '@/components/document-editor/extensions/VariableExtension'
import { ConditionalBlockExtension } from '@/components/document-editor/extensions/ConditionalBlockExtension'
import { Button } from './button'
import { Select } from './select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Link,
  Image,
  Table as TableIcon,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Sparkles,
  Square,
  Image as ImageIcon,
  Zap,
  Droplet,
} from 'lucide-react'

export interface TiptapEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
  height?: number
  fontFamily?: string
  onFontFamilyChange?: (fontFamily: string) => void
  onTableEditorOpen?: () => void
  onShapeEditorOpen?: () => void
  onElementPaletteOpen?: () => void
  onQuickTemplatesOpen?: () => void
  onStylePaletteOpen?: () => void
  onWatermarkEditorOpen?: () => void
  onSignatureFieldOpen?: () => void
  onMapEmbedOpen?: () => void
  onAttachmentEmbedOpen?: () => void
}

export interface TiptapEditorRef {
  insertVariable: (variable: string) => void
  insertVariableNode: (id: string, label: string, value: string) => void
  insertConditionalBlock: (type?: 'if' | 'elseif' | 'else') => void
  insertTable: (rows?: number, cols?: number) => void
  insertBorderedFrame: (options?: {
    borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double'
    borderWidth?: number
    borderColor?: string
    backgroundColor?: string
    padding?: number
  }) => void
  insertFramedSection: (title?: string, borderColor?: string) => void
  insertAdminTable: (headers?: string[], rows?: number) => void
  insertHTML: (html: string) => void
  getEditor: () => any
}

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  function TiptapEditor(
    {
      value,
      onChange,
      placeholder = 'Saisissez votre texte...',
      className,
      readOnly = false,
      height = 500,
      fontFamily: externalFontFamily,
      onFontFamilyChange,
      onTableEditorOpen,
      onShapeEditorOpen,
      onElementPaletteOpen,
      onQuickTemplatesOpen,
      onStylePaletteOpen,
      onWatermarkEditorOpen,
      onSignatureFieldOpen,
      onMapEmbedOpen,
      onAttachmentEmbedOpen,
    },
    ref
  ) {
    const [isMounted, setIsMounted] = useState(false)
    const [fontFamily, setFontFamily] = useState(externalFontFamily || 'Inter')
    const [fontSize, setFontSize] = useState<string>('12')

    useEffect(() => {
      setIsMounted(true)
    }, [])

    // Extension FontFamily pour appliquer la police au texte sélectionné
    const FontFamily = Extension.create({
      name: 'fontFamily',

      addOptions() {
        return {
          types: ['textStyle'],
        }
      },

      addGlobalAttributes() {
        return [
          {
            types: this.options.types,
            attributes: {
              fontFamily: {
                default: null,
                parseHTML: element => element.style.fontFamily?.replace(/['"]+/g, ''),
                renderHTML: attributes => {
                  if (!attributes.fontFamily) {
                    return {}
                  }
                  return {
                    style: `font-family: ${attributes.fontFamily}`,
                  }
                },
              },
            },
          },
        ]
      },

      addCommands() {
        return {
          setFontFamily: (fontFamily: string) => ({ chain }) => {
            return chain()
              .setMark('textStyle', { fontFamily })
              .run()
          },
          unsetFontFamily: () => ({ chain }) => {
            return chain()
              .setMark('textStyle', { fontFamily: null })
              .removeEmptyTextStyle()
              .run()
          },
        }
      },
    })

    // Extension FontSize personnalisée pour appliquer la taille de police au texte sélectionné
    const FontSizeExtension = Extension.create({
      name: 'fontSize',

      addOptions() {
        return {
          types: ['textStyle'],
        }
      },

      addGlobalAttributes() {
        return [
          {
            types: this.options.types,
            attributes: {
              fontSize: {
                default: null,
                parseHTML: element => element.style.fontSize?.replace(/px|pt|em|rem/g, ''),
                renderHTML: attributes => {
                  if (!attributes.fontSize) {
                    return {}
                  }
                  return {
                    style: `font-size: ${attributes.fontSize}pt`,
                  }
                },
              },
            },
          },
        ]
      },

      addCommands() {
        return {
          setFontSize: (fontSize: string) => ({ chain }) => {
            return chain()
              .setMark('textStyle', { fontSize })
              .run()
          },
          unsetFontSize: () => ({ chain }) => {
            return chain()
              .setMark('textStyle', { fontSize: null })
              .removeEmptyTextStyle()
              .run()
          },
        }
      },
    })

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3, 4, 5, 6],
          },
          // Désactiver underline de StarterKit car on utilise l'extension séparée
          underline: false,
        }),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        TextStyle,
        FontFamily,
        FontSizeExtension,
        Color,
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: 'tiptap-table',
            style: 'width: 100%; border-collapse: collapse; margin: 15px 0; border: 2px solid #335ACF; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(51, 90, 207, 0.1);',
          },
        }),
        TableRow,
        TableHeader,
        TableCell,
        TiptapImage.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              'data-logo-var': {
                default: null,
                parseHTML: element => {
                  const logoVar = element.getAttribute('data-logo-var')
                  // Si l'image a data-logo-var, forcer l'utilisation du placeholder SVG
                  if (logoVar) {
                    return {
                      'data-logo-var': logoVar,
                      // Forcer le src à utiliser le placeholder SVG
                      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='55'%3E%3Crect width='140' height='55' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='Arial' font-size='10' fill='%23999'%3ELogo%3C/text%3E%3C/svg%3E",
                    }
                  }
                  return null
                },
                renderHTML: attributes => {
                  if (!attributes['data-logo-var']) {
                    return {}
                  }
                  return {
                    'data-logo-var': attributes['data-logo-var'],
                    // Toujours utiliser le placeholder SVG pour les images avec data-logo-var
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='55'%3E%3Crect width='140' height='55' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='Arial' font-size='10' fill='%23999'%3ELogo%3C/text%3E%3C/svg%3E",
                  }
                },
              },
            }
          },
          parseHTML() {
            return [
              {
                tag: 'img[data-logo-var]',
                getAttrs: (node) => {
                  if (typeof node === 'string') return false
                  const element = node as HTMLElement
                  const logoVar = element.getAttribute('data-logo-var')
                  if (logoVar) {
                    // Forcer l'utilisation du placeholder SVG
                    return {
                      'data-logo-var': logoVar,
                      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='55'%3E%3Crect width='140' height='55' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='Arial' font-size='10' fill='%23999'%3ELogo%3C/text%3E%3C/svg%3E",
                    }
                  }
                  return false
                },
              },
              {
                tag: 'img',
              },
            ]
          },
        }).configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: {
            class: 'tiptap-image',
          },
        }),
        // Extensions personnalisées pour les variables et blocs conditionnels
        VariableExtension,
        ConditionalBlockExtension,
      ],
      content: value,
      editable: !readOnly,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML())
      },
      editorProps: {
        attributes: {
          class: 'document-editor focus:outline-none',
          style: `min-height: ${height}px;`,
          'data-placeholder': placeholder,
        },
        // Permettre tous les attributs HTML
        parseOptions: {
          preserveWhitespace: 'full',
        },
        // Gestionnaire de drag & drop pour les variables
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false

          // Récupérer les données de la variable depuis le dataTransfer
          const variableId = event.dataTransfer?.getData('application/x-variable-id')
          const variableLabel = event.dataTransfer?.getData('application/x-variable-label')
          const variableValue = event.dataTransfer?.getData('application/x-variable-value')

          // Si c'est une variable, l'insérer comme Node
          if (variableId && variableLabel && variableValue) {
            event.preventDefault()

            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            })

            if (coordinates) {
              const { schema } = view.state
              // Essayer de créer un node Variable
              if (schema.nodes.variable) {
                const variableNode = schema.nodes.variable.create({
                  id: variableId,
                  label: variableLabel,
                  value: variableValue,
                })
                const transaction = view.state.tr.insert(coordinates.pos, variableNode)
                view.dispatch(transaction)
              } else {
                // Fallback: insérer comme texte
                const { tr } = view.state
                tr.insertText(variableValue, coordinates.pos)
                view.dispatch(tr)
              }
              return true
            }
          }
          return false
        },
        handleDOMEvents: {
          dragover: (_view, event) => {
            const hasVariable = event.dataTransfer?.types.includes('application/x-variable-id')
            if (hasVariable) {
              event.preventDefault()
              event.dataTransfer!.dropEffect = 'copy'
              return true
            }
            return false
          },
          dragenter: (_view, event) => {
            const hasVariable = event.dataTransfer?.types.includes('application/x-variable-id')
            if (hasVariable) {
              event.preventDefault()
              return true
            }
            return false
          },
        },
      },
    })

    // Synchroniser la valeur externe avec l'éditeur
    useEffect(() => {
      if (editor && value !== editor.getHTML()) {
        // Utiliser une micro-tâche pour éviter flushSync pendant le rendu
        Promise.resolve().then(() => {
          editor.commands.setContent(value, false)
        })
      }
    }, [value, editor])

    // Synchroniser la police externe avec l'état interne
    useEffect(() => {
      if (externalFontFamily && externalFontFamily !== fontFamily) {
        setFontFamily(externalFontFamily)
      }
    }, [externalFontFamily])

    // Mettre à jour la police affichée selon la sélection
    useEffect(() => {
      if (!editor) return

      const updateFontFamily = () => {
        const { from, to } = editor.state.selection
        if (from === to) {
          // Pas de sélection, utiliser la police par défaut
          setFontFamily(externalFontFamily || 'Inter')
          return
        }

        // Récupérer la police du texte sélectionné
        const marks = editor.state.storedMarks || editor.state.selection.$from.marks()
        const fontFamilyMark = marks.find(mark => mark.type.name === 'textStyle' && mark.attrs.fontFamily)
        
        if (fontFamilyMark) {
          setFontFamily(fontFamilyMark.attrs.fontFamily)
        } else {
          setFontFamily(externalFontFamily || 'Inter')
        }
      }

      editor.on('selectionUpdate', updateFontFamily)
      editor.on('transaction', updateFontFamily)

      return () => {
        editor.off('selectionUpdate', updateFontFamily)
        editor.off('transaction', updateFontFamily)
      }
    }, [editor, externalFontFamily])

    // Exposer les méthodes via ref
    useImperativeHandle(ref, () => ({
      getEditor: () => editor,
      // Insérer une variable avec le format {variable}
      insertVariable: (variable: string) => {
        if (editor) {
          // Utiliser le Node Variable de TipTap si disponible
          const cleanVariable = variable.replace(/[{}]/g, '')
          try {
            editor.chain().focus().insertVariable({
              id: cleanVariable,
              label: cleanVariable,
              value: `{${cleanVariable}}`,
            }).run()
          } catch {
            // Fallback: insérer comme HTML stylé
            editor.chain().focus().insertContent(
              `<span data-type="variable" data-id="${cleanVariable}" data-label="${cleanVariable}" data-value="{${cleanVariable}}" style="background-color: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 4px; border: 1px solid #93C5FD; font-size: 0.875em; font-weight: 500;">{${cleanVariable}}</span>`
            ).run()
          }
        }
      },
      // Insérer une variable avec les 3 attributs (id, label, value)
      insertVariableNode: (id: string, label: string, value: string) => {
        if (editor) {
          try {
            editor.chain().focus().insertVariable({ id, label, value }).run()
          } catch {
            // Fallback
            editor.chain().focus().insertContent(
              `<span data-type="variable" data-id="${id}" data-label="${label}" data-value="${value}" style="background-color: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 4px; border: 1px solid #93C5FD; font-size: 0.875em; font-weight: 500;">${label}</span>`
            ).run()
          }
        }
      },
      // Insérer un bloc conditionnel
      insertConditionalBlock: (type: 'if' | 'elseif' | 'else' = 'if') => {
        if (editor) {
          try {
            editor.chain().focus().insertConditionalBlock({ type }).run()
          } catch {
            // Fallback: insérer comme HTML
            const colors = {
              if: { border: '#14B8A6', bg: '#F0FDFA', label: 'SI' },
              elseif: { border: '#F59E0B', bg: '#FFFBEB', label: 'SINON SI' },
              else: { border: '#3B82F6', bg: '#EFF6FF', label: 'SINON' },
            }
            const c = colors[type]
            editor.chain().focus().insertContent(
              `<div style="border: 2px solid ${c.border}; background-color: ${c.bg}; padding: 16px; margin: 16px 0; border-radius: 8px;">
                <div style="font-size: 12px; font-weight: 600; color: ${c.border}; margin-bottom: 8px;">${c.label} : Condition...</div>
                <p>Contenu conditionnel...</p>
              </div>`
            ).run()
          }
        }
      },
      // Insérer du HTML brut
      insertHTML: (html: string) => {
        if (editor) {
          editor.chain().focus().insertContent(html).run()
        }
      },
      insertTable: (rows: number = 3, cols: number = 3) => {
        if (editor) {
          editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
        }
      },
      insertBorderedFrame: (options?: {
        borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double'
        borderWidth?: number
        borderColor?: string
        backgroundColor?: string
        padding?: number
      }) => {
        if (editor) {
          const borderStyle = options?.borderStyle || 'solid'
          const borderWidth = options?.borderWidth || 2
          const borderColor = options?.borderColor || '#335ACF'
          const backgroundColor = options?.backgroundColor || '#F9FAFB'
          const padding = options?.padding || 15

          const frameHTML = `<div style="border: ${borderWidth}px ${borderStyle} ${borderColor}; background-color: ${backgroundColor}; padding: ${padding}px; margin: 15px 0; border-radius: 6px; min-height: 80px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  <p style="margin: 0; color: #4B5563; font-size: 14px; line-height: 1.6;">Contenu du cadre...</p>
</div>`
          editor.chain().focus().insertContent(frameHTML).run()
        }
      },
      insertFramedSection: (title: string = 'Titre de la section', borderColor: string = '#335ACF') => {
        if (editor) {
          editor.chain().focus().insertContent(
            `<div style="border: 2px solid ${borderColor}; background-color: #F9FAFB; margin: 15px 0; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  <div style="background: linear-gradient(135deg, ${borderColor} 0%, ${borderColor}dd 100%); padding: 12px 15px; border-bottom: 2px solid ${borderColor};">
    <h3 style="margin: 0; color: white; font-size: 14px; font-weight: 600;">${title}</h3>
  </div>
  <div style="padding: 15px; min-height: 50px;">
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">Contenu de la section...</p>
  </div>
</div>`
          ).run()
        }
      },
      insertAdminTable: (headers: string[] = ['Champ', 'Valeur'], rows: number = 3) => {
        if (editor) {
          // Tiptap n'a pas de méthode directe pour insérer un tableau préformaté
          // On utilise insertContent avec HTML
          let tableHTML = '<table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 2px solid #335ACF; box-shadow: 0 2px 8px rgba(0,0,0,0.08); background-color: white;"><thead><tr style="background: linear-gradient(135deg, #335ACF 0%, #1E40AF 100%);">'
          headers.forEach((header) => {
            tableHTML += `<th style="padding: 12px 15px; border: 1px solid rgba(255,255,255,0.3); text-align: left; font-weight: 600; color: white;">${header}</th>`
          })
          tableHTML += '</tr></thead><tbody>'
          for (let r = 0; r < rows; r++) {
            const bgColor = r % 2 === 0 ? '#FAFBFC' : '#FFFFFF'
            tableHTML += `<tr style="background-color: ${bgColor};">`
            headers.forEach((_, c) => {
              const content = c === 0 ? `Ligne ${r + 1}` : `Valeur ${r + 1}-${c + 1}`
              tableHTML += `<td style="padding: 10px 15px; border: 1px solid #E5E7EB; font-size: 13px; color: #374151;">${content}</td>`
            })
            tableHTML += '</tr>'
          }
          tableHTML += '</tbody></table>'
          editor.chain().focus().insertContent(tableHTML).run()
        }
      },
      insertHTML: (html: string) => {
        if (editor) {
          try {
            console.log('Tiptap insertHTML appelé avec:', html)
            
            // Nettoyer le HTML et s'assurer qu'il est valide
            const cleanHTML = html.trim()
            if (!cleanHTML) {
              console.warn('HTML vide, insertion annulée')
              return
            }
            
            // Vérifier si c'est une image (pour utiliser la commande spécifique de Tiptap)
            const imgMatch = cleanHTML.match(/<img[^>]+src="([^"]+)"[^>]*>/i)
            if (imgMatch && imgMatch[1]) {
              const imgSrc = imgMatch[1]
              const imgAlt = cleanHTML.match(/alt="([^"]*)"/i)?.[1] || 'Image'
              const widthMatch = cleanHTML.match(/width="(\d+)"/i)
              const heightMatch = cleanHTML.match(/height="(\d+)"/i)
              
              console.log('Détection d\'une image, utilisation de la commande setImage:', { imgSrc, imgAlt, width: widthMatch?.[1], height: heightMatch?.[1] })
              
              // Utiliser la commande setImage de Tiptap pour une meilleure compatibilité
              editor.chain().focus().setImage({
                src: imgSrc,
                alt: imgAlt,
                width: widthMatch ? parseInt(widthMatch[1]) : undefined,
                height: heightMatch ? parseInt(heightMatch[1]) : undefined,
              }).run()
              
              console.log('✅ Image insérée via setImage')
              return
            }
            
            // Vérifier si c'est un horizontal rule (hr)
            const hrMatch = cleanHTML.match(/<hr[^>]*>/i)
            if (hrMatch) {
              console.log('Détection d\'un horizontal rule')
              
              // Extraire les styles du hr
              const styleMatch = cleanHTML.match(/style="([^"]*)"/i)
              const hrStyles = styleMatch ? styleMatch[1] : ''
              
              // Pour les hr avec styles, utiliser directement insertContent pour préserver les styles
              // StarterKit peut normaliser les hr et supprimer les styles
              if (hrStyles) {
                console.log('HR avec styles détecté, utilisation de insertContent pour préserver les styles')
                // Insérer directement le HTML complet avec les styles
                const result = editor.chain().focus().insertContent(cleanHTML).run()
                console.log('Résultat insertContent pour HR:', result)
                
                // Vérifier que l'insertion a réussi
                setTimeout(() => {
                  const currentHTML = editor.getHTML()
                  const hasHR = currentHTML.includes('<hr') || currentHTML.toLowerCase().includes('horizontalrule')
                  if (hasHR) {
                    console.log('✅ Horizontal rule stylisé confirmé dans l\'éditeur')
                  } else {
                    console.warn('⚠️ Horizontal rule non détecté après insertion, utilisation de la méthode alternative')
                    // Fallback : utiliser la méthode alternative
                    const currentContent = editor.getHTML()
                    const parser = new DOMParser()
                    const doc = parser.parseFromString(`<div>${currentContent}</div>`, 'text/html')
                    const container = doc.querySelector('div')
                    if (container) {
                      container.insertAdjacentHTML('beforeend', cleanHTML)
                      editor.commands.setContent(container.innerHTML)
                      console.log('✅ Horizontal rule inséré via méthode alternative')
                    }
                  }
                }, 100)
                return
              } else {
                // Pour les hr sans styles, utiliser setHorizontalRule
                try {
                  if (editor.can().setHorizontalRule()) {
                    editor.chain().focus().setHorizontalRule().run()
                    console.log('✅ Horizontal rule inséré via setHorizontalRule')
                    return
                  }
                } catch (hrError) {
                  console.warn('setHorizontalRule non disponible, utilisation de insertContent:', hrError)
                }
              }
            }
            
            // Tiptap peut avoir des problèmes avec certains HTML
            // On utilise une approche plus robuste en créant un élément temporaire
            const tempDiv = document.createElement('div')
            tempDiv.innerHTML = cleanHTML
            
            // Tiptap peut avoir des problèmes avec les styles inline sur les paragraphes
            // Utiliser une approche qui force l'insertion
            try {
              // Méthode 1 : Essayer insertContent directement
              console.log('Tentative d\'insertion directe du HTML')
              const result = editor.chain().focus().insertContent(cleanHTML).run()
              console.log('Résultat insertContent:', result)
              
              // Vérifier après un court délai si l'insertion a réussi
              setTimeout(() => {
                const currentHTML = editor.getHTML()
                console.log('HTML actuel après insertion (premiers 300 caractères):', currentHTML.substring(0, 300))
                
                // Vérifier si le contenu a été inséré (chercher des indices plus larges)
                const htmlCheck = cleanHTML.toLowerCase().replace(/\s+/g, ' ')
                const currentCheck = currentHTML.toLowerCase().replace(/\s+/g, ' ')
                
                // Vérifier plusieurs indices pour confirmer l'insertion
                const hasDataImage = currentCheck.includes('data:image')
                const hasImgTag = currentCheck.includes('<img') || currentCheck.includes('img src')
                const hasSvg = currentCheck.includes('svg') || currentCheck.includes('base64')
                const hasHR = currentCheck.includes('<hr') || currentCheck.includes('horizontalrule')
                const hasInserted = hasDataImage || hasImgTag || hasSvg || hasHR || currentCheck.includes(htmlCheck.substring(0, 30))
                
                console.log('Vérification insertion - HTML cherché:', htmlCheck.substring(0, 50))
                console.log('Vérification insertion - data:image:', hasDataImage, 'img tag:', hasImgTag, 'svg:', hasSvg, 'hr:', hasHR)
                console.log('Vérification insertion - Trouvé:', hasInserted)
                console.log('HTML complet actuel:', currentHTML)
                
                if (!hasInserted) {
                  console.warn('Le HTML n\'a pas été inséré correctement, utilisation d\'une méthode alternative')
                  
                  // Méthode alternative : Insérer via manipulation directe du contenu
                  try {
                    const currentContent = editor.getHTML()
                    const parser = new DOMParser()
                    const doc = parser.parseFromString(`<div>${currentContent}</div>`, 'text/html')
                    const container = doc.querySelector('div')
                    
                    if (container) {
                      // Créer un élément avec le nouveau HTML
                      const newElement = document.createElement('div')
                      newElement.innerHTML = cleanHTML
                      
                      // Insérer à la fin
                      if (newElement.firstElementChild) {
                        container.appendChild(newElement.firstElementChild)
                      } else {
                        container.insertAdjacentHTML('beforeend', cleanHTML)
                      }
                      
                      // Mettre à jour l'éditeur avec le nouveau contenu
                      const newHTML = container.innerHTML
                      editor.commands.setContent(newHTML)
                      console.log('✅ HTML inséré via méthode alternative')
                    }
                  } catch (altError) {
                    console.error('Erreur lors de la méthode alternative:', altError)
                  }
                } else {
                  console.log('✅ HTML inséré avec succès via insertContent')
                }
              }, 150)
            } catch (insertError) {
              console.error('Erreur lors de l\'insertion:', insertError)
              // Fallback final
              try {
                const currentHTML = editor.getHTML()
                editor.commands.setContent(currentHTML + cleanHTML)
              } catch (finalError) {
                console.error('Erreur lors du fallback final:', finalError)
              }
            }
          } catch (error) {
            console.error('Erreur lors de l\'insertion HTML:', error, html)
            // Fallback : utiliser une approche alternative
            try {
              // Essayer d'insérer directement le HTML
              editor.chain().focus().insertContent(html).run()
            } catch (directError) {
              console.error('Erreur lors de l\'insertion directe:', directError)
              // Dernier recours : ajouter à la fin du contenu
              try {
                const currentHTML = editor.getHTML()
                const newHTML = currentHTML + html
                editor.commands.setContent(newHTML)
              } catch (finalError) {
                console.error('Erreur lors du fallback final:', finalError)
              }
            }
          }
        } else {
          console.error('Editor non disponible pour insertHTML')
        }
      },
    }), [editor])

    if (!isMounted || !editor) {
      return <div className={cn('h-[400px] border rounded-lg bg-gray-50 animate-pulse', className)} />
    }

    return (
      <TooltipProvider delayDuration={300}>
        <div className={cn('tiptap-editor border rounded-lg overflow-hidden bg-white', className)}>
          {/* Toolbar */}
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gradient-to-r from-gray-50 to-white">
            {/* Sélecteur de police */}
            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              <div className="flex items-center gap-1">
                <Type className="h-4 w-4 text-gray-500" />
                <select
                  value={fontFamily}
                  onChange={(e) => {
                    const newFont = e.target.value
                    setFontFamily(newFont)
                    // Appliquer la police au texte sélectionné
                    if (editor) {
                      if (editor.state.selection.empty) {
                        // Si aucune sélection, appliquer au prochain texte saisi
                        editor.chain().focus().setFontFamily(newFont).run()
                      } else {
                        // Appliquer au texte sélectionné
                        editor.chain().focus().setFontFamily(newFont).run()
                      }
                    }
                    // Appeler le callback de manière asynchrone pour éviter les warnings React
                    if (onFontFamilyChange) {
                      setTimeout(() => onFontFamilyChange(newFont), 0)
                    }
                  }}
                  className="h-8 px-2 text-xs border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[120px]"
                  title="Choisir la police (applique au texte sélectionné)"
                >
                  <option value="Inter">Inter</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                </select>
              </div>
            </div>

            {/* Sélecteur de taille de police */}
            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Taille</span>
                <select
                  value={fontSize}
                  onChange={(e) => {
                    const newSize = e.target.value
                    setFontSize(newSize)
                    // Appliquer la taille au texte sélectionné
                    if (editor) {
                      if (editor.state.selection.empty) {
                        // Si aucune sélection, appliquer au prochain texte saisi
                        editor.chain().focus().setFontSize(newSize).run()
                      } else {
                        // Appliquer au texte sélectionné
                        editor.chain().focus().setFontSize(newSize).run()
                      }
                    }
                  }}
                  className="h-8 px-2 text-xs border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[70px]"
                  title="Choisir la taille de police (applique au texte sélectionné)"
                >
                  <option value="8">8pt</option>
                  <option value="9">9pt</option>
                  <option value="10">10pt</option>
                  <option value="11">11pt</option>
                  <option value="12">12pt</option>
                  <option value="14">14pt</option>
                  <option value="16">16pt</option>
                  <option value="18">18pt</option>
                  <option value="20">20pt</option>
                  <option value="24">24pt</option>
                  <option value="28">28pt</option>
                  <option value="32">32pt</option>
                  <option value="36">36pt</option>
                  <option value="48">48pt</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="h-8 w-8 p-0"
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Annuler</p>
                  <p className="text-xs text-gray-400">Ctrl+Z</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="h-8 w-8 p-0"
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refaire</p>
                  <p className="text-xs text-gray-400">Ctrl+Shift+Z</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive('heading', { level: 1 }) && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <Heading1 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Titre 1</p>
                  <p className="text-xs text-gray-400">Ctrl+Alt+1</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive('heading', { level: 2 }) && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <Heading2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Titre 2</p>
                  <p className="text-xs text-gray-400">Ctrl+Alt+2</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive('heading', { level: 3 }) && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <Heading3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Titre 3</p>
                  <p className="text-xs text-gray-400">Ctrl+Alt+3</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive('bold') && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gras</p>
                  <p className="text-xs text-gray-400">Ctrl+B</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive('italic') && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Italique</p>
                  <p className="text-xs text-gray-400">Ctrl+I</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive('underline') && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <UnderlineIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Souligné</p>
                  <p className="text-xs text-gray-400">Ctrl+U</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive('strike') && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <Strikethrough className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Barré</p>
                  <p className="text-xs text-gray-400">Ctrl+Shift+X</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive('bulletList') && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Liste à puces</p>
                  <p className="text-xs text-gray-400">Ctrl+Shift+8</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive('orderedList') && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Liste numérotée</p>
                  <p className="text-xs text-gray-400">Ctrl+Shift+7</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive({ textAlign: 'left' }) && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Aligner à gauche</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive({ textAlign: 'center' }) && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Centrer</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={cn('h-8 w-8 p-0 transition-all', editor.isActive({ textAlign: 'right' }) && 'bg-brand-blue-ghost text-brand-blue shadow-sm')}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Aligner à droite</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Boutons Éditeur Premium */}
            {(onQuickTemplatesOpen || onTableEditorOpen || onShapeEditorOpen || onElementPaletteOpen) && (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 px-2 border-r pr-2 mr-2">
                  <Sparkles className="h-4 w-4 text-brand-blue" />
                  <span className="text-xs font-medium text-gray-600 hidden sm:inline">Premium</span>
                </div>
                {onQuickTemplatesOpen && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onQuickTemplatesOpen}
                        className="h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost"
                      >
                        <Zap className="h-4 w-4" />
                        <span className="text-xs hidden sm:inline">Templates</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Templates rapides</p>
                      <p className="text-xs text-gray-400">Insérer des structures prédéfinies</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {onTableEditorOpen && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onTableEditorOpen}
                        className="h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost"
                      >
                        <TableIcon className="h-4 w-4" />
                        <span className="text-xs hidden sm:inline">Tableau</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Éditeur de tableau premium</p>
                      <p className="text-xs text-gray-400">Créer et personnaliser des tableaux</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {onShapeEditorOpen && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onShapeEditorOpen}
                        className="h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost"
                      >
                        <Square className="h-4 w-4" />
                        <span className="text-xs hidden sm:inline">Forme</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Éditeur de formes</p>
                      <p className="text-xs text-gray-400">Insérer des formes géométriques</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {onElementPaletteOpen && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onElementPaletteOpen}
                        className="h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost"
                      >
                        <ImageIcon className="h-4 w-4" />
                        <span className="text-xs hidden sm:inline">Élément</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Palette d'éléments</p>
                      <p className="text-xs text-gray-400">Images, QR codes, codes-barres, etc.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {onStylePaletteOpen && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onStylePaletteOpen}
                        className="h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost"
                      >
                        <Type className="h-4 w-4" />
                        <span className="text-xs hidden sm:inline">Styles</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Styles prédéfinis</p>
                      <p className="text-xs text-gray-400">Appliquer des styles de paragraphe</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {onWatermarkEditorOpen && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onWatermarkEditorOpen}
                        className="h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost"
                      >
                        <Droplet className="h-4 w-4" />
                        <span className="text-xs hidden sm:inline">Filigrane</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Filigrane</p>
                      <p className="text-xs text-gray-400">Ajouter un filigrane au document</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        )}

        {/* Editor Content */}
        <EditorContent 
          editor={editor} 
          className="prose-editor"
        />

        {/* Styles globaux pour l'éditeur */}
        <style jsx global>{`
          .tiptap-editor .ProseMirror {
            outline: none;
            min-height: ${height}px;
          }

          .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #9ca3af;
            height: 0;
            pointer-events: none;
          }

          .tiptap-editor .ProseMirror:focus {
            outline: none;
          }

          /* Styles pour les tables dans l'éditeur */
          .tiptap-editor .ProseMirror table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
            margin: 18pt 0;
            overflow: hidden;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .tiptap-editor .ProseMirror table td,
          .tiptap-editor .ProseMirror table th {
            min-width: 1em;
            border: 1px solid #E5E7EB;
            padding: 10pt 12pt;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
          }

          .tiptap-editor .ProseMirror table th {
            font-weight: 600;
            text-align: left;
            background-color: #335ACF;
            color: white;
          }

          .tiptap-editor .ProseMirror table td {
            background-color: white;
            color: #374151;
          }

          .tiptap-editor .ProseMirror table tr:nth-child(even) td {
            background-color: #f9fafb;
          }

          .tiptap-editor .ProseMirror table .selectedCell:after {
            z-index: 2;
            position: absolute;
            content: '';
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            background: rgba(200, 200, 255, 0.4);
            pointer-events: none;
          }

          .tiptap-editor .ProseMirror table .column-resize-handle {
            position: absolute;
            right: -2px;
            top: 0;
            bottom: -2px;
            width: 4px;
            background-color: #335ACF;
            pointer-events: none;
          }

          .tiptap-editor .ProseMirror div[style*="border"] {
            margin: 18pt 0;
            display: block;
          }

          .tiptap-editor .ProseMirror span[style*="background-color: #E0F2FE"] {
            display: inline-block;
          }
        `}</style>
        </div>
      </TooltipProvider>
    )
  }
)

TiptapEditor.displayName = 'TiptapEditor'


