'use client'

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import { cn } from '@/lib/utils'

export interface TinyMCEEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
  height?: number
}

export interface TinyMCEEditorRef {
  insertVariable: (variable: string) => void
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
  getEditor: () => any
}

export const TinyMCEEditor = forwardRef<TinyMCEEditorRef, TinyMCEEditorProps>(
  function TinyMCEEditor(
    {
      value,
      onChange,
      placeholder = 'Saisissez votre texte...',
      className,
      readOnly = false,
      height = 500,
    },
    ref
  ) {
    const editorRef = useRef<any>(null)

    // Exposer les méthodes via ref
    useImperativeHandle(ref, () => ({
      getEditor: () => editorRef.current,
      insertVariable: (variable: string) => {
        if (editorRef.current) {
          editorRef.current.insertContent(`<span class="variable-tag" style="background-color: #E0F2FE; color: #0369A1; font-family: 'Courier New', monospace; font-weight: 500; padding: 2px 6px; border-radius: 4px; border: 1px solid #BAE6FD; display: inline-block;">{${variable}}</span>`)
        }
      },
      insertTable: (rows: number = 3, cols: number = 3) => {
        if (editorRef.current) {
          editorRef.current.execCommand('mceInsertTable', false, {
            rows,
            cols,
            border: '2px solid #335ACF',
            cellpadding: '10px',
            cellspacing: '0',
            style: 'width: 100%; border-collapse: collapse; margin: 15px 0;',
          })
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
          const borderStyle = options?.borderStyle || 'solid'
          const borderWidth = options?.borderWidth || 2
          const borderColor = options?.borderColor || '#335ACF'
          const backgroundColor = options?.backgroundColor || '#F9FAFB'
          const padding = options?.padding || 15

          const frameHTML = `<div style="border: ${borderWidth}px ${borderStyle} ${borderColor}; background-color: ${backgroundColor}; padding: ${padding}px; margin: 15px 0; border-radius: 6px; min-height: 80px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  <p style="margin: 0; color: #4B5563; font-size: 14px; line-height: 1.6;">Contenu du cadre...</p>
</div>`
          editorRef.current.insertContent(frameHTML)
        }
      },
      insertFramedSection: (title: string = 'Titre de la section', borderColor: string = '#335ACF') => {
        if (editorRef.current) {
          const frameHTML = `<div style="border: 2px solid ${borderColor}; background-color: #F9FAFB; margin: 15px 0; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  <div style="background: linear-gradient(135deg, ${borderColor} 0%, ${borderColor}dd 100%); padding: 12px 15px; border-bottom: 2px solid ${borderColor};">
    <h3 style="margin: 0; color: white; font-size: 14px; font-weight: 600;">${title}</h3>
  </div>
  <div style="padding: 15px; min-height: 50px;">
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">Contenu de la section...</p>
  </div>
</div>`
          editorRef.current.insertContent(frameHTML)
        }
      },
      insertAdminTable: (headers: string[] = ['Champ', 'Valeur'], rows: number = 3) => {
        if (editorRef.current) {
          let tableHTML = '<table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 2px solid #335ACF; box-shadow: 0 2px 8px rgba(0,0,0,0.08); background-color: white;">'
          tableHTML += '<thead><tr style="background: linear-gradient(135deg, #335ACF 0%, #1E40AF 100%);">'
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
          editorRef.current.insertContent(tableHTML)
        }
      },
    }), [])

    return (
      <div className={cn('tinymce-editor', className)}>
        <Editor
          onInit={(evt, editor) => {
            editorRef.current = editor
          }}
          value={value}
          onEditorChange={(content) => {
            onChange(content)
          }}
          init={{
            height,
            menubar: true,
            plugins: [
              'advlist',
              'autolink',
              'lists',
              'link',
              'image',
              'charmap',
              'preview',
              'anchor',
              'searchreplace',
              'visualblocks',
              'code',
              'fullscreen',
              'insertdatetime',
              'media',
              'table',
              'code',
              'help',
              'wordcount',
              'template',
              'paste',
              'codesample',
            ],
            toolbar:
              'undo redo | blocks | ' +
              'bold italic forecolor | alignleft aligncenter ' +
              'alignright alignjustify | bullist numlist outdent indent | ' +
              'removeformat | help | table | image | link | code | fullscreen',
            content_style: `
              body {
                font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: #374151;
              }
              .variable-tag {
                background-color: #E0F2FE !important;
                color: #0369A1 !important;
                font-family: 'Courier New', monospace !important;
                font-weight: 500 !important;
                padding: 2px 6px !important;
                border-radius: 4px !important;
                border: 1px solid #BAE6FD !important;
                display: inline-block !important;
              }
              table {
                border-collapse: collapse !important;
                width: 100% !important;
                margin: 15px 0 !important;
              }
              table td, table th {
                border: 1px solid #E5E7EB !important;
                padding: 10px 12px !important;
              }
              table th {
                background-color: #F3F4F6 !important;
                font-weight: 600 !important;
              }
            `,
            placeholder,
            readonly: readOnly,
            branding: false,
            promotion: false,
            resize: true,
            table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
            table_appearance_options: false,
            table_grid: true,
            table_resize_bars: true,
            table_default_attributes: {
              border: '1',
            },
            table_default_styles: {
              'border-collapse': 'collapse',
              width: '100%',
              margin: '15px 0',
            },
            table_class_list: [
              { title: 'Aucune', value: '' },
              { title: 'Tableau simple', value: 'simple-table' },
              { title: 'Tableau avec bordures', value: 'bordered-table' },
              { title: 'Tableau alterné', value: 'striped-table' },
            ],
            paste_as_text: false,
            paste_auto_cleanup_on_paste: true,
            paste_remove_styles: false,
            paste_remove_styles_if_webkit: false,
            paste_strip_class_attributes: 'none',
            invalid_elements: '',
            extended_valid_elements: 'span[class|style|contenteditable],div[class|style|contenteditable],table[class|style|border|cellpadding|cellspacing],td[class|style],th[class|style],tr[class|style]',
            setup: (editor) => {
              // Ajouter un bouton personnalisé pour les variables
              editor.ui.registry.addMenuButton('variables', {
                text: 'Variables',
                fetch: (callback) => {
                  const items = [
                    {
                      type: 'menuitem',
                      text: 'Établissement > Nom',
                      onAction: () => {
                        editor.insertContent(`<span class="variable-tag">{ecole_nom}</span>`)
                      },
                    },
                    {
                      type: 'menuitem',
                      text: 'Élève > Nom',
                      onAction: () => {
                        editor.insertContent(`<span class="variable-tag">{eleve_nom}</span>`)
                      },
                    },
                    {
                      type: 'menuitem',
                      text: 'Élève > Prénom',
                      onAction: () => {
                        editor.insertContent(`<span class="variable-tag">{eleve_prenom}</span>`)
                      },
                    },
                    {
                      type: 'menuitem',
                      text: 'Date actuelle',
                      onAction: () => {
                        editor.insertContent(`<span class="variable-tag">{date_jour}</span>`)
                      },
                    },
                  ]
                  callback(items)
                },
              })

              // Ajouter un bouton personnalisé pour les tableaux avancés
              editor.ui.registry.addMenuButton('advanced-table', {
                text: 'Tableau avancé',
                fetch: (callback) => {
                  const items = [
                    {
                      type: 'menuitem',
                      text: 'Tableau 2x2',
                      onAction: () => {
                        editor.execCommand('mceInsertTable', false, { rows: 2, cols: 2 })
                      },
                    },
                    {
                      type: 'menuitem',
                      text: 'Tableau 3x3',
                      onAction: () => {
                        editor.execCommand('mceInsertTable', false, { rows: 3, cols: 3 })
                      },
                    },
                    {
                      type: 'menuitem',
                      text: 'Tableau 4x4',
                      onAction: () => {
                        editor.execCommand('mceInsertTable', false, { rows: 4, cols: 4 })
                      },
                    },
                  ]
                  callback(items)
                },
              })

              // Ajouter un bouton personnalisé pour les cadres
              editor.ui.registry.addMenuButton('frames', {
                text: 'Cadres',
                fetch: (callback) => {
                  const items = [
                    {
                      type: 'menuitem',
                      text: 'Cadre simple',
                      onAction: () => {
                        editor.insertContent(
                          `<div style="border: 2px solid #335ACF; background-color: #F9FAFB; padding: 15px; margin: 15px 0; border-radius: 6px; min-height: 80px;">
  <p style="margin: 0;">Contenu du cadre...</p>
</div>`
                        )
                      },
                    },
                    {
                      type: 'menuitem',
                      text: 'Section avec titre',
                      onAction: () => {
                        editor.insertContent(
                          `<div style="border: 2px solid #335ACF; background-color: #F9FAFB; margin: 15px 0; border-radius: 6px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #335ACF 0%, #335ACFdd 100%); padding: 12px 15px; border-bottom: 2px solid #335ACF;">
    <h3 style="margin: 0; color: white; font-size: 14px; font-weight: 600;">Titre de la section</h3>
  </div>
  <div style="padding: 15px; min-height: 50px;">
    <p style="margin: 0;">Contenu de la section...</p>
  </div>
</div>`
                        )
                      },
                    },
                  ]
                  callback(items)
                },
              })
            },
          }}
        />
        <style jsx global>{`
          .tinymce-editor .tox-tinymce {
            border-radius: 8px !important;
            border: 1px solid #e5e7eb !important;
          }
          .tinymce-editor .tox-toolbar {
            border-top-left-radius: 8px !important;
            border-top-right-radius: 8px !important;
          }
          .tinymce-editor .tox-edit-area {
            border-bottom-left-radius: 8px !important;
            border-bottom-right-radius: 8px !important;
          }
        `}</style>
      </div>
    )
  }
)

TinyMCEEditor.displayName = 'TinyMCEEditor'























