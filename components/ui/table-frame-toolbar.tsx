'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, Square, Box, Columns } from 'lucide-react'
import type { RichTextEditorRef } from './rich-text-editor'
import { TablePropertiesModal } from './table-properties-modal'
import type { TableProperties } from '@/lib/utils/quill-table-helper'

interface TableFrameToolbarProps {
  editorRef: React.RefObject<RichTextEditorRef>
}

export function TableFrameToolbar({ editorRef }: TableFrameToolbarProps) {
  const [tableModalOpen, setTableModalOpen] = useState(false)
  const handleInsertTable = (rows: number, cols: number) => {
    if (editorRef.current) {
      try {
        editorRef.current.insertTable(rows, cols)
      } catch (error) {
        console.error('Error inserting table:', error)
      }
    }
  }

  const handleInsertAdminTable = (headers: string[], rows: number) => {
    if (editorRef.current) {
      try {
        editorRef.current.insertAdminTable(headers, rows)
      } catch (error) {
        console.error('Error inserting admin table:', error)
      }
    }
  }

  const handleInsertFrame = (type: 'simple' | 'colored' | 'gradient') => {
    if (!editorRef.current) return

    const options = {
      simple: {
        borderStyle: 'solid' as const,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        backgroundColor: '#F9FAFB',
        padding: 15,
      },
      colored: {
        borderStyle: 'solid' as const,
        borderWidth: 2,
        borderColor: '#335ACF',
        backgroundColor: '#EFF6FF',
        padding: 15,
      },
      gradient: {
        borderStyle: 'solid' as const,
        borderWidth: 2,
        borderColor: '#335ACF',
        backgroundColor: '#F0F9FF',
        padding: 20,
      },
    }

    try {
      editorRef.current.insertBorderedFrame(options[type])
    } catch (error) {
      console.error('Error inserting frame:', error)
    }
  }

  const handleInsertSection = (color: string) => {
    if (editorRef.current) {
      try {
        editorRef.current.insertFramedSection('Titre de la section', color)
      } catch (error) {
        console.error('Error inserting section:', error)
      }
    }
  }

  const handleInsertTableWithProperties = (properties: TableProperties) => {
    if (editorRef.current) {
      try {
        editorRef.current.insertTableWithProperties(properties)
      } catch (error) {
        console.error('Error inserting table with properties:', error)
      }
    }
  }

  return (
    <div className="flex items-center gap-2 p-2 border-b border-bg-gray-200 bg-bg-gray-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Table className="h-4 w-4" />
            Tableau
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Insérer un tableau</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setTableModalOpen(true)}>
            <Table className="h-4 w-4 mr-2" />
            Propriétés du tableau...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleInsertTable(2, 2)}>
            <Table className="h-4 w-4 mr-2" />
            2x2 (rapide)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleInsertTable(3, 3)}>
            <Table className="h-4 w-4 mr-2" />
            3x3 (rapide)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleInsertTable(4, 4)}>
            <Table className="h-4 w-4 mr-2" />
            4x4 (rapide)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleInsertTable(3, 2)}>
            <Columns className="h-4 w-4 mr-2" />
            3 lignes, 2 colonnes
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleInsertTable(5, 2)}>
            <Columns className="h-4 w-4 mr-2" />
            5 lignes, 2 colonnes
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleInsertAdminTable(['Champ', 'Valeur'], 3)}>
            <Table className="h-4 w-4 mr-2" />
            Tableau administratif (2 colonnes)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modale de propriétés du tableau */}
      <TablePropertiesModal
        open={tableModalOpen}
        onOpenChange={setTableModalOpen}
        editorRef={editorRef}
        onInsert={handleInsertTableWithProperties}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Square className="h-4 w-4" />
            Cadre
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Insérer un cadre</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleInsertFrame('simple')}>
            <Box className="h-4 w-4 mr-2" />
            Cadre simple
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleInsertFrame('colored')}>
            <Box className="h-4 w-4 mr-2" style={{ color: '#335ACF' }} />
            Cadre bleu
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleInsertFrame('gradient')}>
            <Box className="h-4 w-4 mr-2" style={{ color: '#34B9EE' }} />
            Cadre avec fond
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleInsertSection('#335ACF')}>
            <Square className="h-4 w-4 mr-2" />
            Section avec titre (bleu)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleInsertSection('#34B9EE')}>
            <Square className="h-4 w-4 mr-2" />
            Section avec titre (cyan)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleInsertSection('#10B981')}>
            <Square className="h-4 w-4 mr-2" />
            Section avec titre (vert)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

