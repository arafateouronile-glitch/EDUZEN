/**
 * Types pour les propriétés de tableaux dans l'éditeur de texte riche
 * 
 * Ce fichier remplace les types précédemment définis dans quill-table-helper.ts
 * pour éviter la dépendance aux fichiers quill-* deprecated.
 */

export interface TableProperties {
  rows: number
  cols: number
  width?: number // Pourcentage 0-100
  height?: number // Pixels
  headers: 'none' | 'first-row' | 'first-col' | 'both'
  cellSpacing: number
  borderSize: number
  cellPadding: number
  alignment: 'left' | 'center' | 'right' | 'undefined'
  title?: string
  summary?: string
}
