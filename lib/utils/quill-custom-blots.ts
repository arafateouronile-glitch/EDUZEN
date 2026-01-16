/**
 * Custom Blots pour Quill permettant d'insérer des tableaux et cadres comme blocs éditables
 * Cette approche évite les problèmes avec le MutationObserver de Quill
 */

let Quill: any = null
let BlockEmbed: any = null

// Charger Quill dynamiquement côté client
const loadQuill = async () => {
  if (typeof window === 'undefined') return
  if (Quill && BlockEmbed) return

  try {
    const quillModule = await import('quill')
    Quill = quillModule.default
    BlockEmbed = Quill.import('blots/block/embed')
  } catch (e) {
    console.error('Error loading Quill:', e)
  }
}

// Précharger Quill
if (typeof window !== 'undefined') {
  loadQuill()
}

/**
 * Helper pour créer un node avec les attributs de base
 */
function createBaseNode(blotName: string, className: string, id: string, dataAttr: string, dataValue: any) {
  const node = document.createElement('div')
  node.setAttribute('contenteditable', 'false')
  node.setAttribute(`data-${blotName}-id`, id)
  node.className = `${className} ql-custom-element`
  node.setAttribute(`data-${blotName}-data`, JSON.stringify(dataValue))
  return node
}

/**
 * Custom Blot pour les tableaux
 */
export class TableBlot {
  static blotName = 'customTable'
  static tagName = 'div'
  static className = 'ql-custom-table'

  static create(value: any) {
    const tableData = value.data || { rows: 3, cols: 3, headers: ['Colonne 1', 'Colonne 2'], cells: [] }
    const id = value.id || `table-${Date.now()}`
    
    const node = createBaseNode('table', TableBlot.className, id, 'data', tableData)
    
    // Créer l'affichage visuel du tableau
    const table = document.createElement('table')
    table.className = 'custom-table-preview'
    table.style.cssText = 'width: 100%; border-collapse: collapse; margin: 10px 0; border: 2px solid #E5E7EB; background-color: white;'
    
    // En-têtes
    if (tableData.headers && tableData.headers.length > 0) {
      const thead = document.createElement('thead')
      const headerRow = document.createElement('tr')
      headerRow.style.cssText = 'background-color: #335ACF;'
      
      tableData.headers.forEach((header: string) => {
        const th = document.createElement('th')
        th.textContent = header
        th.style.cssText = 'padding: 10px; border: 1px solid rgba(255,255,255,0.3); color: white; font-weight: 600;'
        headerRow.appendChild(th)
      })
      
      thead.appendChild(headerRow)
      table.appendChild(thead)
    }
    
    // Corps du tableau
    const tbody = document.createElement('tbody')
    const rows = tableData.rows || 3
    const cols = tableData.cols || 3
    
    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr')
      tr.style.cssText = r % 2 === 0 ? 'background-color: white;' : 'background-color: #FAFBFC;'
      
      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td')
        const cellContent = tableData.cells?.[r]?.[c] || ''
        td.textContent = cellContent || `Ligne ${r + 1}, Col ${c + 1}`
        td.style.cssText = 'padding: 8px 10px; border: 1px solid #E5E7EB;'
        tr.appendChild(td)
      }
      
      tbody.appendChild(tr)
    }
    
    table.appendChild(tbody)
    node.appendChild(table)
    
    // Bouton d'édition
    const editButton = document.createElement('button')
    editButton.className = 'ql-edit-table-btn'
    editButton.textContent = '✏️ Éditer le tableau'
    editButton.style.cssText = 'margin-top: 8px; padding: 4px 8px; background: #335ACF; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;'
    editButton.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      node.dispatchEvent(new CustomEvent('edit-table', { 
        bubbles: true, 
        detail: { node, value } 
      }))
    }
    node.appendChild(editButton)
    
    return node
  }

  static value(node: HTMLElement) {
    const dataAttr = node.getAttribute('data-table-data')
    if (dataAttr) {
      try {
        return {
          id: node.getAttribute('data-table-id'),
          data: JSON.parse(dataAttr)
        }
      } catch (e) {
        console.error('Error parsing table data:', e)
      }
    }
    return {
      id: node.getAttribute('data-table-id'),
      data: { rows: 3, cols: 3, headers: [], cells: [] }
    }
  }

  static formats(node: HTMLElement) {
    return { table: true }
  }
}

/**
 * Custom Blot pour les cadres/borders
 */
export class FrameBlot {
  static blotName = 'customFrame'
  static tagName = 'div'
  static className = 'ql-custom-frame'

  static create(value: any) {
    const frameData = value.data || { 
      borderStyle: 'solid', 
      borderWidth: 2, 
      borderColor: '#335ACF', 
      backgroundColor: '#F9FAFB', 
      padding: 15,
      content: 'Contenu du cadre...'
    }
    const id = value.id || `frame-${Date.now()}`
    
    const node = createBaseNode('frame', FrameBlot.className, id, 'data', frameData)
    
    // Créer l'affichage visuel du cadre
    node.style.cssText = `
      border: ${frameData.borderWidth}px ${frameData.borderStyle} ${frameData.borderColor};
      background-color: ${frameData.backgroundColor};
      padding: ${frameData.padding}px;
      margin: 15px 0;
      border-radius: 6px;
      min-height: 80px;
    `
    
    const content = document.createElement('div')
    content.className = 'ql-frame-content'
    content.textContent = frameData.content
    content.style.cssText = 'min-height: 50px; color: #374151;'
    node.appendChild(content)
    
    // Bouton d'édition
    const editButton = document.createElement('button')
    editButton.className = 'ql-edit-frame-btn'
    editButton.textContent = '✏️ Éditer le cadre'
    editButton.style.cssText = 'margin-top: 8px; padding: 4px 8px; background: #335ACF; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;'
    editButton.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      node.dispatchEvent(new CustomEvent('edit-frame', { 
        bubbles: true, 
        detail: { node, value } 
      }))
    }
    node.appendChild(editButton)
    
    return node
  }

  static value(node: HTMLElement) {
    const dataAttr = node.getAttribute('data-frame-data')
    if (dataAttr) {
      try {
        return {
          id: node.getAttribute('data-frame-id'),
          data: JSON.parse(dataAttr)
        }
      } catch (e) {
        console.error('Error parsing frame data:', e)
      }
    }
    return {
      id: node.getAttribute('data-frame-id'),
      data: {}
    }
  }

  static formats(node: HTMLElement) {
    return { frame: true }
  }
}

// Variable pour vérifier si les blots sont enregistrés
let blotsRegistered = false

// Enregistrer les Custom Blots dans Quill
export async function registerCustomBlots() {
  if (typeof window === 'undefined') return // Ne pas enregistrer côté serveur
  
  if (blotsRegistered) {
    return // Déjà enregistrés
  }

  // S'assurer que Quill est chargé
  await loadQuill()
  
  if (!Quill || !BlockEmbed) {
    console.warn('Quill not loaded, custom blots will be registered when Quill is available')
    return
  }

  try {
    // Créer les classes qui étendent BlockEmbed
    class TableBlotImpl extends BlockEmbed {
      static blotName = TableBlot.blotName
      static tagName = TableBlot.tagName
      static className = TableBlot.className
      
      static create(value: any) {
        return TableBlot.create(value)
      }
      
      static value(node: HTMLElement) {
        return TableBlot.value(node)
      }
      
      static formats(node: HTMLElement) {
        return TableBlot.formats(node)
      }
    }

    class FrameBlotImpl extends BlockEmbed {
      static blotName = FrameBlot.blotName
      static tagName = FrameBlot.tagName
      static className = FrameBlot.className
      
      static create(value: any) {
        return FrameBlot.create(value)
      }
      
      static value(node: HTMLElement) {
        return FrameBlot.value(node)
      }
      
      static formats(node: HTMLElement) {
        return FrameBlot.formats(node)
      }
    }

    Quill.register(TableBlotImpl, true)
    Quill.register(FrameBlotImpl, true)
    
    // Vérifier que les blots sont bien enregistrés
    const registeredTableBlot = Quill.import(TableBlot.blotName)
    const registeredFrameBlot = Quill.import(FrameBlot.blotName)
    
    if (registeredTableBlot && registeredFrameBlot) {
      blotsRegistered = true
      console.log('Custom blots registered successfully:', {
        table: TableBlot.blotName,
        frame: FrameBlot.blotName
      })
    } else {
      console.error('Custom blots registration failed - blots not found after registration')
    }
  } catch (e) {
    console.error('Error registering custom blots:', e)
    // Ne pas marquer comme enregistré en cas d'erreur
  }
}
