'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import { TiptapEditor, type TiptapEditorRef, type TiptapEditorProps } from './tiptap-editor'

export interface RichTextEditorRef {
  insertVariable: (variable: string) => void
  insertVariableNode: (id: string, label: string, value: string) => void
  insertConditionalBlock: (type?: 'if' | 'elseif' | 'else') => void
  getEditor: () => any
  insertTable: (rows?: number, cols?: number) => void
  insertTableWithProperties: (properties: any) => void
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
}

export interface RichTextEditorProps extends Omit<TiptapEditorProps, 'onChange'> {
  onChange?: (value: string) => void
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  function RichTextEditor({ onChange, ...props }, ref) {
    const editorRef = useRef<TiptapEditorRef>(null)

    useImperativeHandle(ref, () => ({
      insertVariable: (variable: string) => {
        if (editorRef.current) {
          editorRef.current.insertVariable(variable)
        }
      },
      insertVariableNode: (id: string, label: string, value: string) => {
        if (editorRef.current) {
          editorRef.current.insertVariableNode(id, label, value)
        }
      },
      insertConditionalBlock: (type: 'if' | 'elseif' | 'else' = 'if') => {
        if (editorRef.current) {
          editorRef.current.insertConditionalBlock(type)
        }
      },
      getEditor: () => {
        return editorRef.current?.getEditor()
      },
      insertTable: (rows: number = 3, cols: number = 3) => {
        if (editorRef.current) {
          editorRef.current.insertTable(rows, cols)
        }
      },
      insertTableWithProperties: (properties: any) => {
        // Pas d'implémentation spécifique pour l'instant
        if (editorRef.current) {
          editorRef.current.insertTable(properties.rows || 3, properties.cols || 3)
        }
      },
      insertBorderedFrame: (options?: {
        borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double'
        borderWidth?: number
        borderColor?: string
        backgroundColor?: string
        padding?: number
      }) => {
        if (editorRef.current) {
          editorRef.current.insertBorderedFrame(options)
        }
      },
      insertFramedSection: (title?: string, borderColor?: string) => {
        if (editorRef.current) {
          editorRef.current.insertFramedSection(title, borderColor)
        }
      },
      insertAdminTable: (headers?: string[], rows?: number) => {
        if (editorRef.current) {
          editorRef.current.insertAdminTable(headers, rows)
        }
      },
      insertHTML: (html: string) => {
        if (editorRef.current) {
          editorRef.current.insertHTML(html)
        }
      },
    }), [])

    return (
      <TiptapEditor
        ref={editorRef}
        {...props}
        onChange={onChange || (() => {})}
      />
    )
  }
)

RichTextEditor.displayName = 'RichTextEditor'


