'use client'

import React, { useCallback, useState } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

function ToolbarButton({ onClick, isActive, disabled, children, title, className }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded-md transition-colors',
        'hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed',
        isActive && 'bg-purple-100 text-purple-700',
        className
      )}
    >
      {children}
    </button>
  )
}

// Composant Séparateur de Toolbar
function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-300 mx-1" />
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
}

function TableContextMenu({ editor }: TableMenuProps) {
  if (!editor || !editor.isActive('table')) {
    return null
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-md border border-gray-200">
      <span className="text-xs text-gray-500 mr-2">Tableau :</span>
      
      {/* Ajouter ligne */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="Ajouter une ligne après"
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
      >
        <Plus className="w-3.5 h-3.5" />
        <RowsIcon className="w-3.5 h-3.5" />
      </button>
      
      {/* Supprimer ligne */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="Supprimer la ligne"
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
      >
        <Minus className="w-3.5 h-3.5" />
        <RowsIcon className="w-3.5 h-3.5" />
      </button>
      
      <div className="w-px h-4 bg-gray-300 mx-1" />
      
      {/* Ajouter colonne */}
      <button
        type="button"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="Ajouter une colonne après"
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
      >
        <Plus className="w-3.5 h-3.5" />
        <Columns className="w-3.5 h-3.5" />
      </button>
      
      {/* Supprimer colonne */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="Supprimer la colonne"
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
      >
        <Minus className="w-3.5 h-3.5" />
        <Columns className="w-3.5 h-3.5" />
      </button>
      
      <div className="w-px h-4 bg-gray-300 mx-1" />
      
      {/* Fusionner cellules */}
      <button
        type="button"
        onClick={() => editor.chain().focus().mergeCells().run()}
        disabled={!editor.can().mergeCells()}
        title="Fusionner les cellules"
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-50"
      >
        <Merge className="w-3.5 h-3.5" />
      </button>
      
      {/* Diviser cellule */}
      <button
        type="button"
        onClick={() => editor.chain().focus().splitCell().run()}
        disabled={!editor.can().splitCell()}
        title="Diviser la cellule"
        className="p-1.5 rounded hover:bg-gray-200 text-gray-600 disabled:opacity-50"
      >
        <Split className="w-3.5 h-3.5" />
      </button>
      
      <div className="w-px h-4 bg-gray-300 mx-1" />
      
      {/* Supprimer tableau */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Supprimer le tableau"
        className="p-1.5 rounded hover:bg-red-100 text-red-600"
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
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[250mm] p-0',
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
      console.log('=== SAUVEGARDE DU DOCUMENT ===')
      console.log('📋 Contenu JSON (pour réédition) :', jsonContent)
      console.log('📄 Contenu HTML (pour PDF) :', htmlContent)
      console.log('===============================')

      // TODO: Envoyer au backend
      // await documentService.saveTemplate({
      //   json: jsonContent,
      //   html: htmlContent,
      // })

      setLastSaved(new Date())
      
      // Notification de succès (simulée)
      alert('Document sauvegardé ! (voir console pour les données)')
    } catch (error) {
      console.error('Erreur de sauvegarde:', error)
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
    <div className="flex h-screen bg-gray-100">
      {/* Zone principale - Éditeur */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header avec titre et actions */}
        <div className="document-editor-header bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between no-print">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Éditeur de document</h1>
            {lastSaved && (
              <p className="text-xs text-gray-500">
                Dernière sauvegarde : {lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          <div className="document-editor-actions flex items-center gap-2">
            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJSON}
              title="Exporter en JSON"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <FileJson className="w-4 h-4" />
              <span className="hidden sm:inline">JSON</span>
            </button>
            
            {/* Export HTML */}
            <button
              type="button"
              onClick={handleExportHTML}
              title="Exporter en HTML"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <FileCode className="w-4 h-4" />
              <span className="hidden sm:inline">HTML</span>
            </button>
            
            {/* Aperçu / Imprimer */}
            <button
              type="button"
              onClick={handlePrint}
              title="Aperçu PDF / Imprimer"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Aperçu</span>
            </button>
            
            {/* Bouton Enregistrer */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer le Modèle'}</span>
            </button>
          </div>
        </div>

        {/* Barre d'outils sticky */}
        <div className="document-editor-toolbar sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm no-print">
          <div className="flex items-center gap-1 px-4 py-2 flex-wrap">
            {/* Historique */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Annuler (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Rétablir (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Formatage texte */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Gras (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italique (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Souligné (Ctrl+U)"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Titres */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Titre 1"
            >
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Titre 2"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Alignement */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              title="Aligner à gauche"
            >
              <AlignLeft className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              title="Centrer"
            >
              <AlignCenter className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              title="Aligner à droite"
            >
              <AlignRight className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Listes */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Liste à puces"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Liste numérotée"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Tableau */}
            <ToolbarButton
              onClick={handleInsertTable}
              isActive={editor.isActive('table')}
              title="Insérer un tableau 3x3"
            >
              <TableIcon className="w-4 h-4" />
            </ToolbarButton>

            {/* Image */}
            <ToolbarButton
              onClick={handleInsertImage}
              title="Insérer une image"
            >
              <ImageIcon className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Blocs conditionnels */}
            <div className="relative group">
              <ToolbarButton
                onClick={() => editor.chain().focus().insertConditionalBlock({ type: 'if' }).run()}
                isActive={editor.isActive('conditionalBlock')}
                title="Insérer un bloc conditionnel (Ctrl+Shift+C)"
              >
                <GitBranch className="w-4 h-4" />
              </ToolbarButton>
              
              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-20">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]">
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().insertConditionalBlock({ type: 'if' }).run()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-teal-50 text-gray-700"
                  >
                    <div className="w-3 h-3 rounded-sm bg-teal-400" />
                    <span>Bloc SI</span>
                    <span className="ml-auto text-xs text-gray-400">Ctrl+Shift+C</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().insertConditionalBlock({ type: 'elseif' }).run()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-amber-50 text-gray-700"
                  >
                    <div className="w-3 h-3 rounded-sm bg-amber-400" />
                    <span>Bloc SINON SI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.chain().focus().insertConditionalBlock({ type: 'else' }).run()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-blue-50 text-gray-700"
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
            <div className="px-4 py-2 border-t border-gray-100">
              <TableContextMenu editor={editor} />
            </div>
          )}
        </div>

        {/* Zone de contenu scrollable */}
        <div 
          className="flex-1 overflow-y-auto p-8"
          onDragOver={(e) => e.preventDefault()}
        >
          {/* Simulation de page A4 */}
          <div
            className="document-editor-page mx-auto bg-white shadow-lg rounded-sm"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '20mm',
            }}
          >
            <EditorContent editor={editor} />
          </div>
          
          <div className="h-16" />
        </div>
      </div>

      {/* Sidebar - Variables */}
      <div className="document-editor-sidebar w-[300px] bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-lg no-print">
        {/* Header de la sidebar */}
        <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Variable className="w-5 h-5 text-purple-600" />
            Variables
          </h2>
          <p className="text-sm text-gray-500 mt-1">
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
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-start gap-2 text-xs text-gray-500">
            <span className="text-lg">💡</span>
            <div>
              <p className="font-medium text-gray-600">Astuce</p>
              <p>Les variables seront remplacées par leurs valeurs lors de la génération du document.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
