'use client'

import { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react'
import * as React from 'react'

// Composant wrapper pour ReactQuill qui charge uniquement côté client
// et gère correctement les refs
let ReactQuillComponent: any = null
let Quill: any = null
let BlotRegistered = false

export interface ReactQuillClientRef {
  getEditor: () => any
  insertVariable: (variable: string) => void
}

export const ReactQuillClient = forwardRef<ReactQuillClientRef, any>((props, ref) => {
  const [isMounted, setIsMounted] = useState(false)
  const quillInstanceRef = useRef<any>(null)

  useEffect(() => {
    // Charger ReactQuill uniquement côté client
    const loadModules = async () => {
      try {
        const reactQuillModule = await import('react-quill')
        ReactQuillComponent = reactQuillModule.default
        
        // Essayer de charger Quill et enregistrer les modules
        try {
          const quillModule = await import('quill')
          Quill = quillModule.default
          
          // Note: better-table est optionnel, on utilise des tableaux HTML natifs à la place
          
          // Note: Les Custom Blots ne sont plus utilisés car ils causent des problèmes d'enregistrement
          // On utilise maintenant l'insertion HTML directe via quill-table-helper.ts
        } catch (quillError) {
          // Quill n'est pas nécessaire pour ReactQuill, on continue
          console.warn('Could not load Quill directly (optional):', quillError)
        }
        
        setIsMounted(true)
      } catch (error) {
        console.error('Error loading ReactQuill:', error)
      }
    }
    
    loadModules()
  }, [])

  // Exposer les méthodes via ref
  useImperativeHandle(ref, () => ({
    getEditor: () => {
      if (!quillInstanceRef.current) return null
      return quillInstanceRef.current.getEditor 
        ? quillInstanceRef.current.getEditor() 
        : quillInstanceRef.current
    },
    insertTable: (rows: number = 3, cols: number = 3) => {
      const editor = quillInstanceRef.current?.getEditor?.() || quillInstanceRef.current
      if (editor) {
        try {
          const { insertTable } = require('@/lib/utils/quill-table-helper')
          insertTable(editor, rows, cols)
        } catch (error) {
          console.error('Error inserting table:', error)
        }
      }
    },
    insertBorderedFrame: (options?: { borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double', borderWidth?: number, borderColor?: string, backgroundColor?: string, padding?: number }) => {
      const editor = quillInstanceRef.current?.getEditor?.() || quillInstanceRef.current
      if (editor) {
        try {
          const { insertBorderedFrame } = require('@/lib/utils/quill-table-helper')
          insertBorderedFrame(editor, options?.borderStyle, options?.borderWidth, options?.borderColor, options?.backgroundColor, options?.padding)
        } catch (error) {
          console.error('Error inserting frame:', error)
        }
      }
    },
    insertFramedSection: (title: string = 'Titre de la section', borderColor: string = '#335ACF') => {
      const editor = quillInstanceRef.current?.getEditor?.() || quillInstanceRef.current
      if (editor) {
        try {
          const { insertFramedSection } = require('@/lib/utils/quill-table-helper')
          insertFramedSection(editor, title, borderColor)
        } catch (error) {
          console.error('Error inserting framed section:', error)
        }
      }
    },
    insertAdminTable: (headers: string[] = ['Champ', 'Valeur'], rows: number = 3) => {
      const editor = quillInstanceRef.current?.getEditor?.() || quillInstanceRef.current
      if (editor) {
        try {
          const { insertAdminTable } = require('@/lib/utils/quill-table-helper')
          insertAdminTable(editor, headers, rows)
        } catch (error) {
          console.error('Error inserting admin table:', error)
        }
      }
    },
    insertTableWithProperties: (properties: any) => {
      const editor = quillInstanceRef.current?.getEditor?.() || quillInstanceRef.current
      if (editor) {
        try {
          const { insertTableWithProperties } = require('@/lib/utils/quill-table-helper')
          insertTableWithProperties(editor, properties)
        } catch (error) {
          console.error('Error inserting table with properties:', error)
        }
      }
    },
    insertVariable: (variable: string) => {
      if (!quillInstanceRef.current) return
      
      try {
        const quill = quillInstanceRef.current.getEditor 
          ? quillInstanceRef.current.getEditor() 
          : null
        if (!quill || !quill.getSelection) return
        
        const range = quill.getSelection(true)
        const variableText = `{${variable}}`
        
        if (range && typeof range.index === 'number' && Number.isInteger(range.index)) {
          // Insérer la variable comme texte formaté avec style inline
          const insertIndex = Math.max(0, range.index)
          quill.insertText(insertIndex, variableText, 'user')
          // Appliquer un format pour que la variable soit visible
          quill.formatText(insertIndex, variableText.length, {
            'background-color': '#E0F2FE',
            'color': '#0369A1',
            'font-family': 'Courier New, monospace',
            'font-weight': '500',
            'padding': '2px 6px',
            'border-radius': '4px',
            'border': '1px solid #BAE6FD'
          }, 'user')
          // Ne pas appeler setSelection après insertText - Quill gère automatiquement la position
          // Appeler setSelection peut causer l'erreur "substring is not a function"
        } else {
          const length = quill.getLength()
          if (typeof length === 'number' && Number.isInteger(length)) {
            const insertIndex = Math.max(0, length - 1)
            quill.insertText(insertIndex, variableText, 'user')
            quill.formatText(insertIndex, variableText.length, {
              'background-color': '#E0F2FE',
              'color': '#0369A1',
              'font-family': 'Courier New, monospace',
              'font-weight': '500'
            }, 'user')
            // Ne pas appeler setSelection après insertText - Quill gère automatiquement la position
          }
        }
      } catch (error) {
        console.error('Error inserting variable:', error)
        // Fallback : insertion simple du texte
        try {
          const quill = quillInstanceRef.current.getEditor 
            ? quillInstanceRef.current.getEditor() 
            : null
          if (quill && quill.getSelection) {
            const range = quill.getSelection(true)
            if (range) {
              quill.insertText(range.index, `{${variable}}`, 'user')
            }
          }
        } catch (e) {
          console.error('Fallback insertion also failed:', e)
        }
      }
    },
  }), [])

  // Gérer le changement de valeur - garder les balises {variable} telles quelles
  const handleChange = (content: string, delta: any, source: string, editor: any) => {
    if (!props.onChange) return
    
    try {
      // Si l'éditeur Quill existe, utiliser son HTML directement pour préserver les tableaux/cadres
      if (editor && editor.root && typeof editor.root.innerHTML === 'string') {
        // Utiliser requestAnimationFrame pour s'assurer que le DOM est à jour
        requestAnimationFrame(() => {
          try {
            const html = editor.root.innerHTML
            if (html) {
              props.onChange(html)
              return
            }
          } catch (e) {
            console.warn('Error getting HTML from editor:', e)
          }
        })
      }
      
      // ReactQuill passe content comme HTML string dans le premier argument
      // Si content est une string, l'utiliser directement
      if (typeof content === 'string') {
        props.onChange(content)
        return
      }
      
      // Sinon, essayer d'extraire le HTML depuis l'éditeur
      if (editor && typeof editor.getHTML === 'function') {
        const html = editor.getHTML()
        props.onChange(html || '')
        return
      }
      
      // Fallback final
      props.onChange('')
    } catch (error) {
      // En cas d'erreur, utiliser une chaîne vide
      console.warn('Error in handleChange:', error)
      try {
        props.onChange(content || '')
      } catch (e) {
        props.onChange('')
      }
    }
  }

  if (!isMounted || !ReactQuillComponent) {
    return <div className="h-[300px] border rounded-lg bg-gray-50 animate-pulse" />
  }

  return (
    <ReactQuillComponent
      {...props}
      value={props.value}
      onChange={handleChange}
      ref={(instance: any) => {
        quillInstanceRef.current = instance
      }}
    />
  )
})

ReactQuillClient.displayName = 'ReactQuillClient'

