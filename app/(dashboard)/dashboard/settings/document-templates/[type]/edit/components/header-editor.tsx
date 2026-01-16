'use client'

import type { DocumentTemplate } from '@/lib/types/document-templates'
import { WysiwygHeaderEditor } from './wysiwyg-header-editor'

interface HeaderEditorProps {
  template: DocumentTemplate
  onTemplateChange: (updates: Partial<DocumentTemplate>) => void
  onEditorRefReady?: (ref: { insertVariable: (variable: string) => void }) => void
  isActive?: boolean
}

export function HeaderEditor({ template, onTemplateChange, onEditorRefReady, isActive }: HeaderEditorProps) {
  return (
    <WysiwygHeaderEditor
      template={template}
      onTemplateChange={onTemplateChange}
      onEditorRefReady={onEditorRefReady}
      isActive={isActive}
    />
  )
}

