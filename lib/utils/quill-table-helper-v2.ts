/**
 * Nouvelle version des helpers pour insérer des tableaux et cadres
 * Utilise les Custom Blots au lieu de l'insertion HTML directe
 * 
 * @deprecated Ce fichier est obsolète car react-quill a été supprimé. 
 * Le projet utilise maintenant Tiptap pour l'édition de documents.
 * Ce fichier est conservé pour référence mais ne devrait plus être utilisé.
 */

import { registerCustomBlots, TableBlot, FrameBlot } from './quill-custom-blots'

// Fonction pour s'assurer que les blots sont enregistrés avant utilisation
async function ensureBlotsRegistered() {
  if (typeof window === 'undefined') {
    throw new Error('Cannot register blots on server side')
  }
  
  try {
    await registerCustomBlots()
    
    // Vérifier que Quill est chargé et que les blots sont disponibles
    // @ts-expect-error - quill n'est plus installé, ce fichier est obsolète
    const quillModule = await import('quill')
    const Quill = quillModule.default
    
    // Vérifier que les blots sont bien enregistrés
    try {
      const tableBlot = Quill.import('customTable')
      const frameBlot = Quill.import('customFrame')
      
      if (!tableBlot || !frameBlot) {
        throw new Error('Custom blots not found after registration')
      }
    } catch (importError) {
      console.error('Custom blots not available:', importError)
      throw new Error('Custom blots are not registered. Please wait and try again.')
    }
  } catch (e) {
    console.error('Error ensuring blots are registered:', e)
    throw e
  }
}

export interface TableProperties {
  rows: number
  cols: number
  width?: number
  height?: number
  headers: 'none' | 'first-row' | 'first-col' | 'both'
  cellSpacing: number
  borderSize: number
  cellPadding: number
  alignment: 'left' | 'center' | 'right'
  title?: string
  summary?: string
}

/**
 * Insère un tableau en utilisant le Custom Blot (méthode durable)
 */
export async function insertTableWithProperties(quill: any, properties: TableProperties) {
  if (!quill) return

  // S'assurer que les blots sont enregistrés avant utilisation
  await ensureBlotsRegistered()

  const range = quill.getSelection(true)
  const insertIndex = range?.index ?? quill.getLength() - 1

  // Préparer les données du tableau
  const headers: string[] = []
  const cols = properties.cols
  
  if (properties.headers === 'first-row' || properties.headers === 'both') {
    for (let c = 0; c < cols; c++) {
      headers.push(properties.title ? `Colonne ${c + 1}` : `Colonne ${c + 1}`)
    }
  }

  const tableData = {
    rows: properties.rows,
    cols: cols,
    headers: headers,
    cells: [] as string[][]
  }

  // Initialiser les cellules vides
  for (let r = 0; r < properties.rows; r++) {
    tableData.cells[r] = []
    for (let c = 0; c < cols; c++) {
      tableData.cells[r][c] = ''
    }
  }

  // Insérer le bloc tableau en utilisant le Custom Blot
  try {
    quill.insertEmbed(insertIndex, TableBlot.blotName, {
      id: `table-${Date.now()}`,
      data: tableData
    }, 'user')
    
    // Positionner le curseur après le tableau
    setTimeout(() => {
      try {
        const length = quill.getLength()
        const newIndex = Math.min(insertIndex + 2, length - 1)
        quill.setSelection(newIndex, 0, 'user')
      } catch (e) {
        console.warn('Error setting selection after table insertion:', e)
      }
    }, 100)
  } catch (error) {
    console.error('Error inserting table with Custom Blot:', error)
    throw error
  }
}

/**
 * Insère un tableau simple
 */
export async function insertTable(quill: any, rows: number = 3, cols: number = 3) {
  if (!quill) return

  await insertTableWithProperties(quill, {
    rows,
    cols,
    headers: 'first-row',
    cellSpacing: 0,
    borderSize: 2,
    cellPadding: 10,
    alignment: 'left'
  })
}

/**
 * Insère un cadre/border en utilisant le Custom Blot
 */
export async function insertBorderedFrame(
  quill: any,
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double' = 'solid',
  borderWidth: number = 2,
  borderColor: string = '#335ACF',
  backgroundColor: string = '#F9FAFB',
  padding: number = 15
) {
  if (!quill) return

  // S'assurer que les blots sont enregistrés avant utilisation
  await ensureBlotsRegistered()

  const range = quill.getSelection(true)
  const insertIndex = range?.index ?? quill.getLength() - 1

  const frameData = {
    borderStyle,
    borderWidth,
    borderColor,
    backgroundColor,
    padding,
    content: 'Contenu du cadre...'
  }

  try {
    quill.insertEmbed(insertIndex, FrameBlot.blotName, {
      id: `frame-${Date.now()}`,
      data: frameData
    }, 'user')
    
    setTimeout(() => {
      try {
        const length = quill.getLength()
        const newIndex = Math.min(insertIndex + 2, length - 1)
        quill.setSelection(newIndex, 0, 'user')
      } catch (e) {
        console.warn('Error setting selection after frame insertion:', e)
      }
    }, 100)
  } catch (error) {
    console.error('Error inserting frame with Custom Blot:', error)
    throw error
  }
}

/**
 * Insère un cadre avec titre
 */
export async function insertFramedSection(
  quill: any,
  title: string = 'Titre de la section',
  borderColor: string = '#335ACF'
) {
  if (!quill) return

  // S'assurer que les blots sont enregistrés avant utilisation
  await ensureBlotsRegistered()

  const range = quill.getSelection(true)
  const insertIndex = range?.index ?? quill.getLength() - 1

  const frameData = {
    borderStyle: 'solid' as const,
    borderWidth: 2,
    borderColor,
    backgroundColor: '#F9FAFB',
    padding: 15,
    content: `${title}\n\nContenu de la section...`,
    title
  }

  try {
    quill.insertEmbed(insertIndex, FrameBlot.blotName, {
      id: `frame-section-${Date.now()}`,
      data: frameData
    }, 'user')
    
    setTimeout(() => {
      try {
        const length = quill.getLength()
        const newIndex = Math.min(insertIndex + 2, length - 1)
        quill.setSelection(newIndex, 0, 'user')
      } catch (e) {
        console.warn('Error setting selection after framed section insertion:', e)
      }
    }, 100)
  } catch (error) {
    console.error('Error inserting framed section with Custom Blot:', error)
    throw error
  }
}

/**
 * Insère un tableau administratif préformaté
 */
export async function insertAdminTable(quill: any, headers: string[] = ['Champ', 'Valeur'], rows: number = 3) {
  if (!quill) return

  await insertTableWithProperties(quill, {
    rows,
    cols: headers.length,
    headers: 'first-row',
    cellSpacing: 0,
    borderSize: 2,
    cellPadding: 12,
    alignment: 'left'
  })
}

