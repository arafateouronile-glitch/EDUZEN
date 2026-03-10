'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import { VariableExtension } from './extensions/VariableExtension'
import { ConditionalBlockExtension } from './extensions/ConditionalBlockExtension'
import './editor-styles.css'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Undo,
  Redo,
  Variable,
  GitBranch,
  Table as TableIcon,
  Image as ImageIcon,
  Save,
  Printer,
  RowsIcon,
  Columns,
  Trash2,
  Plus,
  Minus,
  Merge,
  Split,
  FileJson,
  FileCode,
  Download,
  Eye,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logger, sanitizeError } from '@/lib/utils/logger'

// Types pour les variables
interface VariableItem {
  id: string
  label: string
  value: string
}

interface VariableCategory {
  id: string
  name: string
  icon?: string
  variables: VariableItem[]
}

// Données simulées des variables
const variableCategories: VariableCategory[] = [
  {
    id: 'organisme',
    name: 'Organisme',
    icon: '🏢',
    variables: [
      { id: 'org_nom', label: 'Nom de l\'organisme', value: '{ecole_nom}' },
      { id: 'org_adresse', label: 'Adresse', value: '{ecole_adresse}' },
      { id: 'org_email', label: 'Email', value: '{ecole_email}' },
      { id: 'org_telephone', label: 'Téléphone', value: '{ecole_telephone}' },
      { id: 'org_siret', label: 'SIRET', value: '{ecole_siret}' },
      { id: 'org_logo', label: 'Logo', value: '{ecole_logo}' },
    ],
  },
  {
    id: 'client',
    name: 'Client / Élève',
    icon: '👤',
    variables: [
      { id: 'client_nom', label: 'Nom', value: '{eleve_nom}' },
      { id: 'client_prenom', label: 'Prénom', value: '{eleve_prenom}' },
      { id: 'client_email', label: 'Email', value: '{eleve_email}' },
      { id: 'client_adresse', label: 'Adresse', value: '{eleve_adresse}' },
      { id: 'client_telephone', label: 'Téléphone', value: '{eleve_telephone}' },
    ],
  },
  {
    id: 'formation',
    name: 'Formation',
    icon: '📚',
    variables: [
      { id: 'formation_nom', label: 'Nom de la formation', value: '{formation_nom}' },
      { id: 'formation_duree', label: 'Durée', value: '{formation_duree}' },
      { id: 'formation_prix', label: 'Prix', value: '{formation_prix}' },
      { id: 'formation_dates', label: 'Dates', value: '{formation_dates}' },
      { id: 'formation_lieu', label: 'Lieu', value: '{session_lieu}' },
    ],
  },
  {
    id: 'document',
    name: 'Document',
    icon: '📄',
    variables: [
      { id: 'doc_date', label: 'Date du jour', value: '{date_jour}' },
      { id: 'doc_numero', label: 'Numéro de document', value: '{numero_document}' },
      { id: 'doc_annee', label: 'Année scolaire', value: '{annee_scolaire}' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance',
    icon: '💰',
    variables: [
      { id: 'montant_ht', label: 'Montant HT', value: '{montant_ht}' },
      { id: 'montant_ttc', label: 'Montant TTC', value: '{montant_ttc}' },
      { id: 'tva', label: 'TVA', value: '{tva}' },
      { id: 'mode_paiement', label: 'Mode de paiement', value: '{mode_paiement}' },
    ],
  },
]

// Composant Bouton de Toolbar
interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title?: string
  className?: string
  focusMode?: boolean
}

function ToolbarButton({ onClick, isActive, disabled, children, title, className, focusMode }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center justify-center h-7 w-7 rounded transition-colors duration-100 flex-shrink-0',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        focusMode
          ? cn(
              'text-gray-400 hover:bg-gray-700 hover:text-gray-200',
              isActive && 'bg-blue-900/50 text-blue-300'
            )
          : cn(
              'text-[#444746] hover:bg-[#f1f3f4]',
              isActive && 'bg-[#e8f0fe] text-[#1a73e8]'
            ),
        className
      )}
    >
      {children}
    </button>
  )
}

// Composant Séparateur de Toolbar
function ToolbarDivider({ focusMode }: { focusMode?: boolean }) {
  return <div className={cn("w-px h-5 mx-1 flex-shrink-0", focusMode ? "bg-gray-700" : "bg-[#dadce0]")} />
}

// Composant Badge Variable (Chip) - Draggable
interface VariableBadgeProps {
  variable: VariableItem
}

function VariableBadge({ variable }: VariableBadgeProps) {
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('application/x-variable-id', variable.id)
    e.dataTransfer.setData('application/x-variable-label', variable.label)
    e.dataTransfer.setData('application/x-variable-value', variable.value)
    e.dataTransfer.setData('text/plain', variable.value)
    e.dataTransfer.effectAllowed = 'copy'
    
    const dragImage = document.createElement('div')
    dragImage.className = 'fixed -left-[9999px] px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium border border-blue-300'
    dragImage.textContent = variable.label
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2)
    
    setTimeout(() => {
      document.body.removeChild(dragImage)
    }, 0)
  }, [variable])

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
        'bg-purple-100 text-purple-700 border border-purple-200',
        'cursor-grab active:cursor-grabbing',
        'hover:bg-purple-200 hover:border-purple-300 hover:shadow-sm',
        'transition-all duration-150',
        'select-none'
      )}
    >
      <Variable className="w-3 h-3 opacity-70" />
      <span>{variable.label}</span>
    </div>
  )
}

// Composant Menu contextuel pour les tableaux
interface TableMenuProps {
  editor: ReturnType<typeof useEditor>
  focusMode?: boolean
}

function TableContextMenu({ editor, focusMode }: TableMenuProps) {
  if (!editor || !editor.isActive('table')) {
    return null
  }

  const btnClass = focusMode
    ? "p-1.5 rounded hover:bg-gray-700 text-gray-400"
    : "p-1.5 rounded hover:bg-gray-200 text-gray-600"

  const dividerClass = focusMode ? "bg-gray-700" : "bg-gray-300"

  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-md border",
      focusMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
    )}>
      <span className={cn("text-xs mr-2", focusMode ? "text-gray-400" : "text-gray-500")}>Tableau :</span>

      {/* Ajouter ligne */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Ajouter une ligne après"
        className={btnClass}
      >
        <Plus className="w-3.5 h-3.5" />
        <RowsIcon className="w-3.5 h-3.5" />
      </button>

      {/* Supprimer ligne */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Supprimer la ligne"
        className={btnClass}
      >
        <Minus className="w-3.5 h-3.5" />
        <RowsIcon className="w-3.5 h-3.5" />
      </button>

      <div className={cn("w-px h-4 mx-1", dividerClass)} />

      {/* Ajouter colonne */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Ajouter une colonne après"
        className={btnClass}
      >
        <Plus className="w-3.5 h-3.5" />
        <Columns className="w-3.5 h-3.5" />
      </button>

      {/* Supprimer colonne */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Supprimer la colonne"
        className={btnClass}
      >
        <Minus className="w-3.5 h-3.5" />
        <Columns className="w-3.5 h-3.5" />
      </button>

      <div className={cn("w-px h-4 mx-1", dividerClass)} />

      {/* Fusionner cellules */}
      <button
        type="button"
        onClick={() => editor.chain().focus().mergeCells().run()}
        disabled={!editor.can().mergeCells()}
        title="Fusionner les cellules"
        className={cn(btnClass, "disabled:opacity-50")}
      >
        <Merge className="w-3.5 h-3.5" />
      </button>

      {/* Diviser cellule */}
      <button
        type="button"
        onClick={() => editor.chain().focus().splitCell().run()}
        disabled={!editor.can().splitCell()}
        title="Diviser la cellule"
        className={cn(btnClass, "disabled:opacity-50")}
      >
        <Split className="w-3.5 h-3.5" />
      </button>

      <div className={cn("w-px h-4 mx-1", dividerClass)} />

      {/* Supprimer tableau */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Supprimer le tableau"
        className={cn(
          "p-1.5 rounded",
          focusMode ? "hover:bg-red-900/30 text-red-400" : "hover:bg-red-100 text-red-600"
        )}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// Composant Principal
export default function DocumentEditor() {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)

  // Raccourci clavier pour le Focus Mode (Escape pour quitter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFocusMode) {
        setIsFocusMode(false)
        setIsSidebarVisible(true)
      }
      // F11 pour toggle focus mode
      if (e.key === 'F11') {
        e.preventDefault()
        toggleFocusMode()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- toggleFocusMode stable, only react to isFocusMode
  }, [isFocusMode])

  // Toggle Focus Mode
  const toggleFocusMode = useCallback(() => {
    setIsFocusMode(prev => {
      const newValue = !prev
      if (newValue) {
        setIsSidebarVisible(false)
      } else {
        setIsSidebarVisible(true)
      }
      return newValue
    })
  }, [])

  // Initialisation de l'éditeur TipTap
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      // Extensions Table
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      // Extension Image
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      // Extensions personnalisées
      VariableExtension,
      ConditionalBlockExtension,
    ],
    content: `
      <h1>Titre du document</h1>
      <p>Commencez à rédiger votre document ici...</p>
      <p>Glissez-déposez des variables depuis la barre latérale droite pour les insérer dans votre texte.</p>
      <p></p>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-lg xl:prose-xl max-w-none focus:outline-none min-h-[600px]',
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false

        const variableId = event.dataTransfer?.getData('application/x-variable-id')
        const variableLabel = event.dataTransfer?.getData('application/x-variable-label')
        const variableValue = event.dataTransfer?.getData('application/x-variable-value')

        if (!variableId || !variableLabel || !variableValue) {
          return false
        }

        event.preventDefault()

        const coordinates = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })

        if (!coordinates) return false

        const { schema } = view.state
        const variableNode = schema.nodes.variable.create({
          id: variableId,
          label: variableLabel,
          value: variableValue,
        })

        const transaction = view.state.tr.insert(coordinates.pos, variableNode)
        view.dispatch(transaction)

        return true
      },
      handleDOMEvents: {
        dragover: (view, event) => {
          const hasVariable = event.dataTransfer?.types.includes('application/x-variable-id')
          if (hasVariable) {
            event.preventDefault()
            event.dataTransfer!.dropEffect = 'copy'
            return true
          }
          return false
        },
        dragenter: (view, event) => {
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

  // Fonction pour insérer une variable via clic
  const handleVariableClick = useCallback((variable: VariableItem) => {
    if (!editor) return
    editor.chain().focus().insertVariable({
      id: variable.id,
      label: variable.label,
      value: variable.value,
    }).run()
  }, [editor])

  // Fonction pour insérer un tableau
  const handleInsertTable = useCallback(() => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  // Fonction pour insérer une image
  const handleInsertImage = useCallback(() => {
    if (!editor) return
    
    const url = window.prompt('URL de l\'image :')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  // Fonction de sauvegarde
  const handleSave = useCallback(async () => {
    if (!editor) return

    setIsSaving(true)

    try {
      // Récupérer le contenu en JSON (pour réédition)
      const jsonContent = editor.getJSON()
      
      // Récupérer le contenu en HTML (pour génération PDF)
      const htmlContent = editor.getHTML()

      // Pour le moment, afficher dans la console
      logger.debug('=== SAUVEGARDE DU DOCUMENT ===')
      logger.debug('📋 Contenu JSON (pour réédition)', { jsonContentLength: JSON.stringify(jsonContent).length })
      logger.debug('📄 Contenu HTML (pour PDF)', { htmlContentLength: htmlContent?.length || 0 })
      logger.debug('===============================')

      // NOTE: Fonctionnalité prévue - Envoyer au backend
      // Utiliser DocumentTemplateService.save() une fois l'implémentation complète
      // await documentService.saveTemplate({
      //   json: jsonContent,
      //   html: htmlContent,
      // })

      setLastSaved(new Date())
      
      // Notification de succès (simulée)
      alert('Document sauvegardé ! (voir console pour les données)')
    } catch (error) {
      logger.error('Erreur de sauvegarde:', error)
      alert('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }, [editor])

  // Fonction pour imprimer / Aperçu PDF
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // Fonction pour exporter en JSON
  const handleExportJSON = useCallback(() => {
    if (!editor) return
    
    const jsonContent = editor.getJSON()
    const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = 'document-template.json'
    a.click()
    
    URL.revokeObjectURL(url)
  }, [editor])

  // Fonction pour exporter en HTML
  const handleExportHTML = useCallback(() => {
    if (!editor) return
    
    const htmlContent = editor.getHTML()
    const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 210mm; margin: 0 auto; padding: 20mm; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    td, th { border: 1px solid #d1d5db; padding: 8px 12px; }
    th { background-color: #f3f4f6; font-weight: 600; }
    img { max-width: 100%; height: auto; }
    h1 { font-size: 1.875rem; font-weight: 700; }
    h2 { font-size: 1.5rem; font-weight: 600; }
    span[data-type="variable"] {
      background-color: #dbeafe;
      color: #1e40af;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.875em;
    }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`
    
    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = 'document.html'
    a.click()
    
    URL.revokeObjectURL(url)
  }, [editor])

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-pulse text-gray-500">Chargement de l'éditeur...</div>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex h-screen transition-all duration-300",
      isFocusMode ? "fixed inset-0 z-50 bg-gray-900" : "bg-[#f0f0f0]"
    )}>
      {/* Zone principale - Éditeur Full-Width */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header avec titre et actions */}
        <div className={cn(
          "document-editor-header px-4 py-2.5 flex items-center justify-between no-print transition-all duration-300 border-b",
          isFocusMode ? "bg-gray-900 border-gray-800" : "bg-white border-[#e0e0e0]"
        )}>
          {/* Titre — style Google Docs */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex flex-col min-w-0">
              <h1 className={cn(
                "text-base font-medium truncate transition-colors leading-tight",
                isFocusMode ? "text-white" : "text-[#202124]"
              )}>
                Éditeur de document
              </h1>
              <div className={cn(
                "text-[11px] transition-colors leading-tight",
                isFocusMode ? "text-gray-500" : "text-[#5f6368]"
              )}>
                {lastSaved
                  ? `Sauvegardé à ${lastSaved.toLocaleTimeString()}`
                  : isFocusMode
                  ? 'Mode Focus — Esc pour quitter'
                  : 'Non sauvegardé'
                }
              </div>
            </div>
          </div>

          <div className="document-editor-actions flex items-center gap-1">
            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJSON}
              title="Exporter en JSON"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors",
                isFocusMode ? "text-gray-400 hover:bg-gray-800" : "text-[#5f6368] hover:bg-[#f1f3f4]"
              )}
            >
              <FileJson className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">JSON</span>
            </button>

            {/* Export HTML */}
            <button
              type="button"
              onClick={handleExportHTML}
              title="Exporter en HTML"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors",
                isFocusMode ? "text-gray-400 hover:bg-gray-800" : "text-[#5f6368] hover:bg-[#f1f3f4]"
              )}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">HTML</span>
            </button>

            {/* Aperçu / Imprimer */}
            <button
              type="button"
              onClick={handlePrint}
              title="Aperçu PDF / Imprimer"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded transition-colors",
                isFocusMode ? "text-gray-400 hover:bg-gray-800" : "text-[#5f6368] hover:bg-[#f1f3f4]"
              )}
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aperçu</span>
            </button>

            {/* Séparateur */}
            <div className={cn(
              "w-px h-5 mx-1",
              isFocusMode ? "bg-gray-700" : "bg-[#dadce0]"
            )} />

            {/* Toggle Sidebar */}
            {!isFocusMode && (
              <button
                type="button"
                onClick={() => setIsSidebarVisible(prev => !prev)}
                title={isSidebarVisible ? "Masquer la sidebar" : "Afficher la sidebar"}
                className="flex items-center justify-center h-7 w-7 text-[#5f6368] hover:bg-[#f1f3f4] rounded transition-colors"
              >
                {isSidebarVisible ? (
                  <PanelRightClose className="w-4 h-4" />
                ) : (
                  <PanelRightOpen className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Focus Mode */}
            <button
              type="button"
              onClick={toggleFocusMode}
              title={isFocusMode ? "Quitter le mode Focus (Esc)" : "Mode Focus (F11)"}
              className={cn(
                "flex items-center justify-center h-7 w-7 rounded transition-colors",
                isFocusMode
                  ? "text-blue-400 hover:bg-gray-800 bg-gray-800/50"
                  : "text-[#5f6368] hover:bg-[#f1f3f4]"
              )}
            >
              {isFocusMode ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Bouton Enregistrer — style Google Docs */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#1a73e8] text-white rounded hover:bg-[#1557b0] transition-colors disabled:opacity-50 ml-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>
        </div>

        {/* Barre d'outils sticky — style Google Docs */}
        <div className={cn(
          "document-editor-toolbar sticky top-0 z-10 border-b no-print transition-all duration-300",
          isFocusMode ? "bg-gray-900 border-gray-800" : "bg-[#f8f9fa] border-[#e0e0e0]"
        )}>
          <div className="flex items-center gap-0.5 px-2 py-1 overflow-x-auto flex-nowrap min-h-[40px]">
            {/* Historique */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Annuler (Ctrl+Z)"
              focusMode={isFocusMode}
            >
              <Undo className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Rétablir (Ctrl+Y)"
              focusMode={isFocusMode}
            >
              <Redo className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider focusMode={isFocusMode} />

            {/* Formatage texte */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Gras (Ctrl+B)"
              focusMode={isFocusMode}
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italique (Ctrl+I)"
              focusMode={isFocusMode}
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Souligné (Ctrl+U)"
              focusMode={isFocusMode}
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider focusMode={isFocusMode} />

            {/* Titres */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Titre 1"
              focusMode={isFocusMode}
            >
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Titre 2"
              focusMode={isFocusMode}
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider focusMode={isFocusMode} />

            {/* Alignement */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              title="Aligner à gauche"
              focusMode={isFocusMode}
            >
              <AlignLeft className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              title="Centrer"
              focusMode={isFocusMode}
            >
              <AlignCenter className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              title="Aligner à droite"
              focusMode={isFocusMode}
            >
              <AlignRight className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider focusMode={isFocusMode} />

            {/* Listes */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Liste à puces"
              focusMode={isFocusMode}
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Liste numérotée"
              focusMode={isFocusMode}
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider focusMode={isFocusMode} />

            {/* Tableau */}
            <ToolbarButton
              onClick={handleInsertTable}
              isActive={editor.isActive('table')}
              title="Insérer un tableau 3x3"
              focusMode={isFocusMode}
            >
              <TableIcon className="w-4 h-4" />
            </ToolbarButton>

            {/* Image */}
            <ToolbarButton
              onClick={handleInsertImage}
              title="Insérer une image"
              focusMode={isFocusMode}
            >
              <ImageIcon className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider focusMode={isFocusMode} />

            {/* Blocs conditionnels */}
            <div className="relative group">
              <ToolbarButton
                onClick={() => editor.chain().focus().insertConditionalBlock({ type: 'if' }).run()}
                isActive={editor.isActive('conditionalBlock')}
                title="Insérer un bloc conditionnel (Ctrl+Shift+C)"
                focusMode={isFocusMode}
              >
                <GitBranch className="w-4 h-4" />
              </ToolbarButton>
              
              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-20">
                <div className={cn(
                  "rounded-lg shadow-lg border py-1 min-w-[180px]",
                  isFocusMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                )}>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().insertConditionalBlock({ type: 'if' }).run()}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                      isFocusMode ? "text-gray-300 hover:bg-teal-900/30" : "text-gray-700 hover:bg-teal-50"
                    )}
                  >
                    <div className="w-3 h-3 rounded-sm bg-teal-400" />
                    <span>Bloc SI</span>
                    <span className={cn("ml-auto text-xs", isFocusMode ? "text-gray-500" : "text-gray-400")}>Ctrl+Shift+C</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().insertConditionalBlock({ type: 'elseif' }).run()}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                      isFocusMode ? "text-gray-300 hover:bg-amber-900/30" : "text-gray-700 hover:bg-amber-50"
                    )}
                  >
                    <div className="w-3 h-3 rounded-sm bg-amber-400" />
                    <span>Bloc SINON SI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().insertConditionalBlock({ type: 'else' }).run()}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                      isFocusMode ? "text-gray-300 hover:bg-blue-900/30" : "text-gray-700 hover:bg-blue-50"
                    )}
                  >
                    <div className="w-3 h-3 rounded-sm bg-blue-400" />
                    <span>Bloc SINON</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Menu contextuel pour les tableaux */}
          {editor.isActive('table') && (
            <div className={cn(
              "px-4 py-2 border-t",
              isFocusMode ? "border-gray-800" : "border-gray-100"
            )}>
              <TableContextMenu editor={editor} focusMode={isFocusMode} />
            </div>
          )}
        </div>

        {/* Zone de contenu scrollable - Full-Bleed Workspace */}
        <div
          className={cn(
            "flex-1 overflow-y-auto overflow-x-auto transition-colors duration-300",
            isFocusMode ? "bg-gray-900" : "bg-[#f0f0f0]"
          )}
          onDragOver={(e) => e.preventDefault()}
        >
          {/* Workspace Full-Bleed - Prend TOUT l'espace disponible */}
          <div className="w-full h-full p-4">
            {/* Page du document - Feuille blanche fluide */}
            <div
              className={cn(
                "document-editor-page bg-white w-full h-full transition-all duration-300",
                isFocusMode
                  ? "shadow-2xl shadow-black/40"
                  : ""
              )}
              style={{
                boxShadow: isFocusMode
                  ? '0 0 0 1px rgba(255,255,255,0.08), 0 25px 50px -12px rgba(0,0,0,0.5)'
                  : '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
              }}
            >
              {/* Zone d'édition */}
              <div className="w-full h-full p-8 lg:p-12">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Variables (masquée en Focus Mode ou via toggle) */}
      <div
        className={cn(
          "document-editor-sidebar bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-lg no-print transition-all duration-300",
          isSidebarVisible && !isFocusMode ? "w-[300px]" : "w-0 border-l-0"
        )}
      >
        {/* Contenu de la sidebar avec overflow hidden pour l'animation */}
        <div className={cn(
          "flex flex-col h-full transition-opacity duration-200",
          isSidebarVisible && !isFocusMode ? "opacity-100" : "opacity-0"
        )}>
          {/* Header de la sidebar */}
          <div className="px-3 py-3 border-b border-[#e0e0e0] bg-[#f8f9fa] shrink-0">
            <h2 className="text-sm font-medium text-[#202124] flex items-center gap-2">
              <Variable className="w-4 h-4 text-[#1a73e8]" />
              Variables
            </h2>
            <p className="text-xs text-[#5f6368] mt-0.5">
              Glissez ou cliquez pour insérer
            </p>
          </div>

          {/* Liste des catégories et variables */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {variableCategories.map((category) => (
              <div key={category.id} className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <span>{category.icon}</span>
                  {category.name}
                </h3>

                <div className="flex flex-wrap gap-2">
                  {category.variables.map((variable) => (
                    <div
                      key={variable.id}
                      onClick={() => handleVariableClick(variable)}
                      className="cursor-pointer"
                    >
                      <VariableBadge variable={variable} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer de la sidebar */}
          <div className="px-3 py-2.5 border-t border-[#e0e0e0] bg-[#f8f9fa] shrink-0">
            <p className="text-[11px] text-[#5f6368]">
              Les variables seront remplacées par leurs valeurs lors de la génération du document.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
