'use client'

import type { DocumentTemplate } from '@/lib/types/document-templates'
import { WysiwygFooterEditor } from './wysiwyg-footer-editor'

interface FooterEditorProps {
  template: DocumentTemplate
  onTemplateChange: (updates: Partial<DocumentTemplate>) => void
  onEditorRefReady?: (ref: { insertVariable: (variable: string) => void }) => void
  isActive?: boolean
}

export function FooterEditor({ template, onTemplateChange, onEditorRefReady, isActive }: FooterEditorProps) {
  return (
    <WysiwygFooterEditor
      template={template}
      onTemplateChange={onTemplateChange}
      onEditorRefReady={onEditorRefReady}
      isActive={isActive}
    />
  )
}

