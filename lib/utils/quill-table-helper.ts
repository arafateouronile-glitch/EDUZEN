/**
 * Helpers pour insérer des tableaux et des cadres dans Quill
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

/**
 * Désactive temporairement le MutationObserver de Quill pour éviter les erreurs de synchronisation
 */
function disableQuillObserver(quill: any): (() => void) | null {
  try {
    // Tenter d'accéder au MutationObserver de Quill
    const observer = (quill as any).observer
    if (observer) {
      // Désactiver le MutationObserver principal
      if (observer.mutations && observer.mutations.disconnect) {
        observer.mutations.disconnect()
      }
      
      // Désactiver également le scroll observer si présent
      if (observer.scroll && observer.scroll.mutations && observer.scroll.mutations.disconnect) {
        observer.scroll.mutations.disconnect()
      }
      
      // Marquer l'observer comme désactivé temporairement
      const wasDisabled = observer._disabled
      observer._disabled = true
      
      return () => {
        // Réactiver le MutationObserver après un court délai
        setTimeout(() => {
          try {
            if (observer && quill.root) {
              // Réactiver le MutationObserver principal
              if (observer.mutations && !observer.mutations.connected) {
                observer.mutations.observe(quill.root, {
                  childList: true,
                  subtree: true,
                  characterData: true,
                })
              }
              
              // Réactiver le scroll observer si présent
              if (observer.scroll && observer.scroll.mutations && !observer.scroll.mutations.connected) {
                observer.scroll.mutations.observe(quill.root, {
                  childList: true,
                  subtree: true,
                })
              }
              
              // Restaurer l'état précédent
              observer._disabled = wasDisabled
            }
          } catch (e) {
            console.warn('Error reconnecting Quill MutationObserver:', e)
            try {
              // Fallback : réinitialiser l'observer
              if (observer) {
                observer._disabled = false
              }
            } catch (e2) {
              console.warn('Error resetting observer state:', e2)
            }
          }
        }, 150)
      }
    }
  } catch (e) {
    // Si on ne peut pas désactiver l'observer, continuer quand même
    console.warn('Could not disable Quill MutationObserver:', e)
  }
  return null
}

/**
 * Insère un tableau personnalisé avec propriétés avancées (affichage visuel et esthétique garanti)
 */
export function insertTableWithProperties(quill: any, properties: TableProperties) {
  if (!quill || !quill.getSelection) return

  const range = quill.getSelection(true)
  if (!range) {
    // Si pas de sélection, essayer de se positionner à la fin
    // Mais éviter setSelection si possible pour éviter les erreurs
    try {
      const length = quill.getLength()
      if (typeof length === 'number' && Number.isInteger(length) && length > 0) {
        const safeIndex = Math.max(0, length - 1)
        // Utiliser updateContents pour positionner le curseur sans setSelection
        // Cela évite les problèmes avec substring
      }
    } catch (err) {
      console.warn('Could not get Quill length:', err)
    }
  }

  const {
    rows,
    cols,
    width = 100,
    height,
    headers,
    cellSpacing,
    borderSize,
    cellPadding,
    alignment,
    title,
    summary,
  } = properties

  // Construire le style du tableau
  const tableWidth = width ? `${width}%` : '100%'
  const tableHeight = height ? `${height}px` : 'auto'
  const tableAlignment = alignment === 'undefined' ? 'left' : alignment
  const alignmentStyle = 
    tableAlignment === 'center' ? 'margin: 15px auto;' :
    tableAlignment === 'right' ? 'margin: 15px 0 15px auto;' :
    'margin: 15px 0;'

  // Préparer le titre séparément (sera ajouté avant le tableau)
  let titleHTML = ''
  if (title) {
    const titleAlign = tableAlignment === 'center' ? 'center' : tableAlignment === 'right' ? 'right' : 'left'
    titleHTML = `<div style="margin: 15px 0 8px 0; font-weight: 600; color: #111827; font-size: 14px; text-align: ${titleAlign};">${title}</div>`
  }

  // Construire l'attribut summary pour accessibilité
  const summaryAttr = summary ? ` summary="${summary}"` : ''
  
  // Ajouter contenteditable="false" pour que Quill ne convertisse pas le tableau en texte
  let tableHTML = `<table${summaryAttr} contenteditable="false" style="width: ${tableWidth}; height: ${tableHeight}; border-collapse: separate; border-spacing: ${cellSpacing}px; ${alignmentStyle} border: ${borderSize}px solid #335ACF; background-color: white; display: table; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 6px; overflow: hidden;">`

  // En-têtes : première ligne
  if (headers === 'first-row' || headers === 'both') {
    tableHTML += '<thead>'
    tableHTML += '<tr style="background: linear-gradient(135deg, #335ACF 0%, #1E40AF 100%); display: table-row;">'
    
    for (let c = 0; c < cols; c++) {
      const headerText = c === 0 && headers === 'both' ? 'En-tête' : `Colonne ${c + 1}`
      tableHTML += `<th style="padding: ${cellPadding}px; border: 1px solid rgba(255,255,255,0.3); text-align: left; font-weight: 600; color: white; display: table-cell; vertical-align: middle; font-size: 13px;">${headerText}</th>`
    }
    
    tableHTML += '</tr>'
    tableHTML += '</thead>'
  }

  // Corps du tableau
  tableHTML += '<tbody>'
  
  const dataRows = headers === 'first-row' || headers === 'both' ? rows - 1 : rows
  
  for (let r = 0; r < dataRows; r++) {
    const bgColor = r % 2 === 0 ? '#FFFFFF' : '#FAFBFC'
    tableHTML += `<tr style="display: table-row; background-color: ${bgColor}; transition: background-color 0.2s;">`
    
    for (let c = 0; c < cols; c++) {
      // Première colonne en en-tête si headers === 'first-col' ou 'both'
      const isHeaderCell = (headers === 'first-col' || headers === 'both') && c === 0
      const cellTag = isHeaderCell ? 'th' : 'td'
      const cellStyle = isHeaderCell 
        ? `padding: ${cellPadding}px; border: 1px solid #E5E7EB; text-align: left; font-weight: 600; color: #111827; background-color: #F3F4F6; display: table-cell; vertical-align: middle; font-size: 13px;`
        : `padding: ${cellPadding}px; border: 1px solid #E5E7EB; display: table-cell; vertical-align: top; color: #374151; font-size: 13px;`
      
      const cellContent = isHeaderCell 
        ? `Ligne ${r + 1}`
        : `Cellule ${r + 1}-${c + 1}`
      
      tableHTML += `<${cellTag} style="${cellStyle}">${cellContent}</${cellTag}>`
    }
    tableHTML += '</tr>'
  }
  
  tableHTML += '</tbody>'
  tableHTML += '</table>'

  // Encapsuler dans un div pour garantir l'affichage (avec titre si présent)
  const wrapperHTML = `${titleHTML}<div style="margin: ${title ? '0' : '15px'} 0; width: 100%;">${tableHTML}</div><p><br></p>`

  // Insertion directe dans le DOM de Quill (car clipboard.convert ne supporte pas les tableaux)
  try {
    const editorElement = quill.root
    if (!editorElement) return

    // Désactiver temporairement le MutationObserver de Quill pour éviter l'erreur "emit"
    const reenableObserver = disableQuillObserver(quill)

    const currentRange = quill.getSelection(true)
    
    // Obtenir la position d'insertion
    let insertNode: Node | null = null
    
    if (currentRange && typeof currentRange.index === 'number') {
      try {
        const lineResult = quill.getLine(currentRange.index)
        const line = Array.isArray(lineResult) ? lineResult[0] : lineResult
        
        if (line && line.domNode) {
          insertNode = line.domNode
        }
      } catch (e) {
        // Si getLine échoue, insérer à la fin
        console.warn('Could not get line for insertion, inserting at end')
      }
    }
    
    // Utiliser insertAdjacentHTML pour préserver le HTML brut
    if (insertNode && insertNode.parentNode) {
      // Insérer après le noeud de ligne actuel
      // Créer un conteneur pour le HTML
      const container = document.createElement('div')
      container.innerHTML = wrapperHTML
      const nodes = Array.from(container.childNodes)
      
      // Insérer tous les nœuds de manière atomique pour éviter que Quill ne détecte les changements progressifs
      const fragment = document.createDocumentFragment()
      nodes.forEach((node) => {
        fragment.appendChild(node.cloneNode(true))
      })
      
      if (insertNode!.nextSibling) {
        insertNode!.parentNode!.insertBefore(fragment, insertNode!.nextSibling)
      } else {
        insertNode!.parentNode!.appendChild(fragment)
      }
    } else {
      // Insérer à la fin de l'éditeur avec appendChild
      // Utiliser un DocumentFragment pour une insertion atomique
      const container = document.createElement('div')
      container.innerHTML = wrapperHTML
      const fragment = document.createDocumentFragment()
      
      Array.from(container.childNodes).forEach((node) => {
        fragment.appendChild(node.cloneNode(true))
      })
      
      editorElement.appendChild(fragment)
    }
    
    // Réactiver le MutationObserver si on l'a désactivé
    if (reenableObserver) {
      reenableObserver()
    }
    
    // Utiliser requestAnimationFrame pour différer la notification de React
    requestAnimationFrame(() => {
      try {
        // Déclencher uniquement un événement input pour notifier React
        // NE PAS déclencher text-change car cela peut déclencher quill.update() qui cause l'erreur "emit"
        const inputEvent = new Event('input', { bubbles: true, cancelable: true })
        editorElement.dispatchEvent(inputEvent)
      } catch (e) {
        console.warn('Error dispatching input event:', e)
      }
    })
    
    return // Succès, pas besoin de fallback
  } catch (error) {
    // Fallback : Insertion directe via DOM
    try {
      const editorElement = quill.root
      if (!editorElement) return

      const selection = quill.getSelection(true)
      const insertIndex = selection?.index ?? editorElement.innerHTML.length

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = wrapperHTML
      const wrapperElement = tempDiv.firstElementChild as HTMLElement

      if (wrapperElement) {
        try {
          const lineResult = quill.getLine(insertIndex)
          const line = Array.isArray(lineResult) ? lineResult[0] : lineResult
          
          if (line && line.domNode) {
            const parent = line.domNode.parentNode
            if (parent) {
              parent.insertBefore(wrapperElement, line.domNode.nextSibling)
              
              // Utiliser requestAnimationFrame pour différer la notification
              // NE PAS déclencher text-change car cela peut déclencher quill.update()
              requestAnimationFrame(() => {
                try {
                  if (editorElement) {
                    const inputEvent = new Event('input', { bubbles: true, cancelable: true })
                    editorElement.dispatchEvent(inputEvent)
                  }
                } catch (e) {
                  console.warn('Error dispatching input event:', e)
                }
              })
              
              // Ne pas appeler setSelection après manipulation DOM
              // Cela cause l'erreur "substring is not a function"
              // Laisser Quill gérer naturellement la position du curseur
            }
          } else {
            editorElement.appendChild(wrapperElement)
            
            // Ne PAS appeler quill.update() - cela peut convertir le HTML en texte
            const inputEvent = new Event('input', { bubbles: true, cancelable: true })
            editorElement.dispatchEvent(inputEvent)
            
            const textChangeEvent = new Event('text-change', { bubbles: true, cancelable: true })
            editorElement.dispatchEvent(textChangeEvent)
            
            // Ne pas appeler setSelection après manipulation DOM
            // Cela cause l'erreur "substring is not a function"
          }
        } catch (lineError) {
          editorElement.appendChild(wrapperElement)
          
          // Utiliser requestAnimationFrame pour différer la notification
          requestAnimationFrame(() => {
            try {
              const inputEvent = new Event('input', { bubbles: true, cancelable: true })
              editorElement.dispatchEvent(inputEvent)
            } catch (e) {
              console.warn('Error dispatching input event:', e)
            }
          })
        }
      }
    } catch (domError) {
      // Dernier fallback
      try {
        const editorElement = quill.root
        if (editorElement) {
          editorElement.innerHTML = editorElement.innerHTML + wrapperHTML
          
          // Utiliser requestAnimationFrame pour différer la notification
          requestAnimationFrame(() => {
            try {
              const inputEvent = new Event('input', { bubbles: true, cancelable: true })
              editorElement.dispatchEvent(inputEvent)
            } catch (e) {
              console.warn('Error dispatching input event:', e)
            }
          })
          
          // Ne pas appeler setSelection après manipulation DOM
          // Cela cause l'erreur "substring is not a function"
        }
      } catch (finalError) {
        console.error('All table insertion methods failed:', finalError)
      }
    }
  }
}

/**
 * Insère un tableau dans un éditeur Quill (affichage visuel garanti)
 */
export function insertTable(quill: any, rows: number = 3, cols: number = 3) {
  if (!quill || !quill.getSelection) return

  const range = quill.getSelection(true)
  if (!range) {
    // Si pas de sélection, insérer à la fin
    // Ne pas appeler setSelection si pas de sélection - insérer quand même
  }

  // Créer le HTML du tableau avec styles inline pour garantie visuelle
  // Ajouter contenteditable="false" pour que Quill ne convertisse pas le tableau en texte
  let tableHTML = '<table contenteditable="false" style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 2px solid #E5E7EB; background-color: white; display: table;">'
  tableHTML += '<thead>'
  tableHTML += '<tr style="background-color: #F3F4F6; display: table-row;">'
  
  for (let c = 0; c < cols; c++) {
    tableHTML += `<th style="padding: 12px; border: 1px solid #D1D5DB; text-align: left; font-weight: 600; color: #111827; display: table-cell; vertical-align: middle;">Colonne ${c + 1}</th>`
  }
  
  tableHTML += '</tr>'
  tableHTML += '</thead>'
  tableHTML += '<tbody>'
  
  for (let r = 0; r < rows - 1; r++) {
    tableHTML += `<tr style="display: table-row; ${r % 2 === 0 ? 'background-color: #FAFBFC;' : 'background-color: white;'}">`
    for (let c = 0; c < cols; c++) {
      tableHTML += `<td style="padding: 10px 12px; border: 1px solid #E5E7EB; display: table-cell; vertical-align: top; color: #374151;">Cellule ${r + 1}-${c + 1}</td>`
    }
    tableHTML += '</tr>'
  }
  
  tableHTML += '</tbody>'
  tableHTML += '</table>'

  // Insertion directe dans le DOM de Quill (car clipboard.convert ne supporte pas les tableaux)
  try {
    const editorElement = quill.root
    if (!editorElement) return

    // Obtenir la position d'insertion
    let insertNode: Node | null = null
    
    if (range && typeof range.index === 'number') {
      try {
        const lineResult = quill.getLine(range.index)
        const line = Array.isArray(lineResult) ? lineResult[0] : lineResult
        
        if (line && line.domNode) {
          insertNode = line.domNode
        }
      } catch (e) {
        console.warn('Could not get line for insertion, inserting at end')
      }
    }
    
    // Insérer le HTML directement avec insertAdjacentHTML pour éviter les problèmes de synchronisation Quill
    const htmlToInsert = tableHTML + '<p><br></p>'
    
    if (insertNode && insertNode.parentNode) {
      // Créer un conteneur temporaire pour le HTML
      const container = document.createElement('div')
      container.innerHTML = htmlToInsert
      
      // Utiliser un marqueur pour insérer après le nœud actuel
      const parentElement = insertNode.parentElement
      if (parentElement) {
        const marker = document.createComment('insertion-marker')
        parentElement.insertBefore(marker, insertNode.nextSibling)
        
        // Utiliser un DocumentFragment pour une insertion atomique
        const fragment = document.createDocumentFragment()
        container.childNodes.forEach((node) => {
          fragment.appendChild(node.cloneNode(true))
        })
        parentElement.insertBefore(fragment, marker)
        
        parentElement.removeChild(marker)
      }
    } else {
      // Insérer à la fin de l'éditeur
      const container = document.createElement('div')
      container.innerHTML = htmlToInsert
      // Utiliser un DocumentFragment pour une insertion atomique
      const fragment = document.createDocumentFragment()
      container.childNodes.forEach((node) => {
        fragment.appendChild(node.cloneNode(true))
      })
      editorElement.appendChild(fragment)
    }
    
    // Utiliser requestAnimationFrame pour différer la notification de Quill
    // Cela évite que Quill essaie de synchroniser pendant que le DOM est en train de changer
    requestAnimationFrame(() => {
      try {
        // Déclencher un événement input pour notifier React sans déclencher la synchronisation Quill
        const inputEvent = new Event('input', { bubbles: true, cancelable: true })
        editorElement.dispatchEvent(inputEvent)
      } catch (e) {
        console.warn('Error dispatching input event:', e)
      }
    })
    
    return // Succès, pas besoin de fallback
  } catch (error) {
    // Méthode 2 : Insertion directe via le DOM de Quill
    try {
      const editorElement = quill.root
      if (!editorElement) return

      const selection = quill.getSelection(true)
      const insertIndex = selection?.index ?? editorElement.innerHTML.length

      // Créer un élément temporaire pour parser le HTML
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = tableHTML
      const tableElement = tempDiv.firstElementChild as HTMLTableElement

      if (tableElement) {
        // Obtenir la position d'insertion dans le DOM
        try {
          const lineResult = quill.getLine(insertIndex)
          const line = Array.isArray(lineResult) ? lineResult[0] : lineResult
          
          if (line && line.domNode) {
            // Insérer après la ligne actuelle
            const parent = line.domNode.parentNode
            if (parent) {
              parent.insertBefore(tableElement, line.domNode.nextSibling)
              
              // Ajouter un paragraphe vide après le tableau pour la navigation
              const p = document.createElement('p')
              p.innerHTML = '<br>'
              parent.insertBefore(p, tableElement.nextSibling)
              
              // Ne PAS appeler quill.update() - cela peut convertir le HTML en texte
              // Déclencher directement des événements pour notifier React et Quill
              const editorElement = quill.root
              if (editorElement) {
                const inputEvent = new Event('input', { bubbles: true, cancelable: true })
                editorElement.dispatchEvent(inputEvent)
                
                const textChangeEvent = new Event('text-change', { bubbles: true, cancelable: true })
                editorElement.dispatchEvent(textChangeEvent)
              }
              
              // Positionner le curseur après le tableau
              // Ne pas appeler setSelection après manipulation DOM
              // Cela cause l'erreur "substring is not a function"
              // Laisser Quill gérer naturellement la position du curseur
            }
          } else {
            // Fallback : insérer directement dans le root
            const editorElement = quill.root
            if (editorElement) {
              editorElement.appendChild(tableElement)
              const p = document.createElement('p')
              p.innerHTML = '<br>'
              editorElement.appendChild(p)
              
              // Ne PAS appeler quill.update() - cela peut convertir le HTML en texte
              const inputEvent = new Event('input', { bubbles: true, cancelable: true })
              editorElement.dispatchEvent(inputEvent)
              
              const textChangeEvent = new Event('text-change', { bubbles: true, cancelable: true })
              editorElement.dispatchEvent(textChangeEvent)
            }
          }
        } catch (lineError) {
          // Si getLine échoue, insérer directement dans le root
          const editorElement = quill.root
          if (editorElement) {
            editorElement.appendChild(tableElement)
            const p = document.createElement('p')
            p.innerHTML = '<br>'
            editorElement.appendChild(p)
            // Désactiver temporairement le MutationObserver avant l'insertion
            const reenableObserver = disableQuillObserver(quill)
            
            // Ne PAS appeler quill.update() - cela peut convertir le HTML en texte
            // Réactiver le MutationObserver si on l'a désactivé
            if (reenableObserver) {
              reenableObserver()
            }
            
            // Utiliser requestAnimationFrame pour différer la notification
            requestAnimationFrame(() => {
              try {
                const inputEvent = new Event('input', { bubbles: true, cancelable: true })
                editorElement.dispatchEvent(inputEvent)
              } catch (e) {
                console.warn('Error dispatching input event:', e)
              }
            })
          }
        }
      }
    } catch (domError) {
      console.error('Error inserting table via DOM:', domError)
      // Méthode 3 : Fallback simple avec innerHTML
      try {
        const editorElement = quill.root
        if (editorElement) {
          const currentHTML = editorElement.innerHTML
          editorElement.innerHTML = currentHTML + tableHTML + '<p><br></p>'
          
          // Utiliser requestAnimationFrame pour différer la notification
          requestAnimationFrame(() => {
            try {
              const inputEvent = new Event('input', { bubbles: true, cancelable: true })
              editorElement.dispatchEvent(inputEvent)
            } catch (e) {
              console.warn('Error dispatching input event:', e)
            }
          })
        }
      } catch (finalError) {
        console.error('All table insertion methods failed:', finalError)
      }
    }
  }
}

/**
 * Insère un cadre/border autour du contenu sélectionné ou un cadre vide (affichage visuel garanti)
 */
export function insertBorderedFrame(quill: any, borderStyle: 'solid' | 'dashed' | 'dotted' | 'double' = 'solid', borderWidth: number = 2, borderColor: string = '#335ACF', backgroundColor: string = '#F9FAFB', padding: number = 15) {
  if (!quill || !quill.getSelection) return

  const range = quill.getSelection(true)
  
  // Créer un cadre vide avec le style spécifié (styles inline pour garantie visuelle)
  // Ajouter contenteditable="false" sur le conteneur mais permettre l'édition du contenu interne
  const emptyFrame = `<div contenteditable="false" style="border: ${borderWidth}px ${borderStyle} ${borderColor}; background-color: ${backgroundColor}; padding: ${padding}px; margin: 15px 0; border-radius: 6px; min-height: 80px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: block; width: 100%; box-sizing: border-box;">
  <div contenteditable="true" style="min-height: 50px; outline: none; word-wrap: break-word; white-space: pre-wrap;">
    <p style="margin: 0 0 10px 0; color: #4B5563; font-size: 14px; line-height: 1.6;">Contenu du cadre...</p>
  </div>
</div>`
  
  // Méthode 1 : Utiliser clipboard.convert
  try {
    // clipboard.convert accepte directement une string HTML, pas un objet
    const delta = quill.clipboard.convert(emptyFrame)
    const insertIndex = range?.index ?? quill.getLength() - 1
    
    const Delta = quill.constructor?.import?.('delta')?.default || 
                  (typeof window !== 'undefined' && (window as any).Quill?.import?.('delta'))?.default
    
    if (Delta) {
      const newDelta = new Delta().retain(insertIndex).concat(delta)
      quill.updateContents(newDelta, 'user')
    } else {
      quill.updateContents(delta, 'user')
    }
    
    try {
      const length = quill.getLength()
      if (typeof length === 'number' && Number.isInteger(length) && length > 0) {
        const newIndex = Math.min(insertIndex + 5, Math.max(0, length - 1))
        if (Number.isInteger(newIndex) && newIndex >= 0) {
          quill.setSelection(newIndex, 0, 'user')
        }
      }
    } catch (err) {
      console.warn('Error setting selection after frame insertion:', err)
    }
  } catch (error) {
    // Fallback : Insertion directe via DOM (méthode simplifiée)
    try {
      const editorElement = quill.root
      if (!editorElement) return

      // Désactiver temporairement le MutationObserver de Quill pour éviter l'erreur "emit"
      const reenableObserver = disableQuillObserver(quill)

      // Insérer directement à la fin
      const container = document.createElement('div')
      container.innerHTML = emptyFrame + '<p><br></p>'
      const nodes = Array.from(container.childNodes)
      
      nodes.forEach((node) => {
        editorElement.appendChild(node.cloneNode(true))
      })
      
      // Réactiver le MutationObserver si on l'a désactivé
      if (reenableObserver) {
        reenableObserver()
      }
      
      // Utiliser requestAnimationFrame pour différer la notification
      requestAnimationFrame(() => {
        try {
          const inputEvent = new Event('input', { bubbles: true, cancelable: true })
          editorElement.dispatchEvent(inputEvent)
        } catch (e) {
          console.warn('Error dispatching input event:', e)
        }
      })
    } catch (finalError) {
      console.error('All frame insertion methods failed:', finalError)
    }
  }
}

/**
 * Insère un cadre avec titre (affichage visuel garanti)
 */
export function insertFramedSection(quill: any, title: string = 'Titre de la section', borderColor: string = '#335ACF') {
  if (!quill || !quill.getSelection) return

  const range = quill.getSelection(true)
  // Ajouter contenteditable="false" sur le conteneur mais permettre l'édition du contenu
  const frameHTML = `<div contenteditable="false" style="border: 2px solid ${borderColor}; background-color: #F9FAFB; margin: 15px 0; border-radius: 6px; overflow: hidden; display: block; width: 100%; box-sizing: border-box; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  <div contenteditable="false" style="background: linear-gradient(135deg, ${borderColor} 0%, ${borderColor}dd 100%); padding: 12px 15px; border-bottom: 2px solid ${borderColor}; display: block;">
    <h3 style="margin: 0; color: white; font-size: 14px; font-weight: 600; display: block;">${title}</h3>
  </div>
  <div contenteditable="true" style="padding: 15px; display: block; min-height: 50px;">
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5; display: block;">Contenu de la section...</p>
  </div>
</div>`

  // Insertion directe dans le DOM de Quill
  try {
    const editorElement = quill.root
    if (!editorElement) return

    // Désactiver temporairement le MutationObserver de Quill pour éviter l'erreur "emit"
    const reenableObserver = disableQuillObserver(quill)

    // Obtenir la position d'insertion
    let insertNode: Node | null = null
    
    if (range && typeof range.index === 'number') {
      try {
        const lineResult = quill.getLine(range.index)
        const line = Array.isArray(lineResult) ? lineResult[0] : lineResult
        
        if (line && line.domNode) {
          insertNode = line.domNode
        }
      } catch (e) {
        console.warn('Could not get line for insertion, inserting at end')
      }
    }
    
    // Créer un conteneur temporaire pour le HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = frameHTML + '<p><br></p>'
    const frameElement = tempDiv.firstElementChild as HTMLElement
    
    if (frameElement) {
      // Créer un fragment pour une insertion atomique
      const fragment = document.createDocumentFragment()
      fragment.appendChild(frameElement.cloneNode(true))
      
      if (insertNode && insertNode.parentNode) {
        // Insérer après le noeud de ligne actuel
        insertNode.parentNode.insertBefore(fragment, insertNode.nextSibling)
      } else {
        // Insérer à la fin de l'éditeur
        editorElement.appendChild(fragment)
      }
      
      // Réactiver le MutationObserver si on l'a désactivé
      if (reenableObserver) {
        reenableObserver()
      }
      
      // Utiliser requestAnimationFrame pour différer la notification
      requestAnimationFrame(() => {
        try {
          // Déclencher un événement input pour que React détecte le changement
          const inputEvent = new Event('input', { bubbles: true, cancelable: true })
          editorElement.dispatchEvent(inputEvent)
        } catch (e) {
          console.warn('Error dispatching input event:', e)
        }
      })
    }
    
    return // Succès, pas besoin de fallback
  } catch (error) {
    // Fallback : Insertion directe via DOM
    try {
      const editorElement = quill.root
      if (!editorElement) return

      const selection = quill.getSelection(true)
      const insertIndex = selection?.index ?? editorElement.innerHTML.length

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = frameHTML
      const frameElement = tempDiv.firstElementChild as HTMLElement

      if (frameElement) {
        try {
          const lineResult = quill.getLine(insertIndex)
          const line = Array.isArray(lineResult) ? lineResult[0] : lineResult
          
          if (line && line.domNode) {
            const parent = line.domNode.parentNode
            if (parent) {
              parent.insertBefore(frameElement, line.domNode.nextSibling)
              
              const p = document.createElement('p')
              p.innerHTML = '<br>'
              parent.insertBefore(p, frameElement.nextSibling)
              
              // Désactiver temporairement le MutationObserver avant l'insertion
              const reenableObserver = disableQuillObserver(quill)
              
              // Ne PAS appeler quill.update() - cela peut convertir le HTML en texte
              const editorElement = quill.root
              if (editorElement) {
                // Réactiver le MutationObserver si on l'a désactivé
                if (reenableObserver) {
                  reenableObserver()
                }
                
                // Utiliser requestAnimationFrame pour différer la notification
                requestAnimationFrame(() => {
                  try {
                    const inputEvent = new Event('input', { bubbles: true, cancelable: true })
                    editorElement.dispatchEvent(inputEvent)
                  } catch (e) {
                    console.warn('Error dispatching input event:', e)
                  }
                })
              }
              
              // Ne pas appeler setSelection après manipulation DOM
              // Cela cause l'erreur "substring is not a function"
              // Laisser Quill gérer naturellement la position du curseur
            }
          } else {
            const editorElement = quill.root
            if (editorElement) {
              editorElement.appendChild(frameElement)
              const p = document.createElement('p')
              p.innerHTML = '<br>'
              editorElement.appendChild(p)
              quill.update('user')
              // Ne pas appeler setSelection après manipulation DOM
              // Cela cause l'erreur "substring is not a function"
              // Laisser Quill gérer naturellement la position du curseur
            }
          }
        } catch (lineError) {
          const editorElement = quill.root
          if (editorElement) {
            editorElement.appendChild(frameElement)
            const p = document.createElement('p')
            p.innerHTML = '<br>'
            editorElement.appendChild(p)
            // Désactiver temporairement le MutationObserver avant l'insertion
            const reenableObserver = disableQuillObserver(quill)
            
            // Ne PAS appeler quill.update() - cela peut convertir le HTML en texte
            // Réactiver le MutationObserver si on l'a désactivé
            if (reenableObserver) {
              reenableObserver()
            }
            
            // Utiliser requestAnimationFrame pour différer la notification
            requestAnimationFrame(() => {
              try {
                const inputEvent = new Event('input', { bubbles: true, cancelable: true })
                editorElement.dispatchEvent(inputEvent)
              } catch (e) {
                console.warn('Error dispatching input event:', e)
              }
            })
          }
        }
      }
    } catch (domError) {
      // Dernier fallback
      try {
        const editorElement = quill.root
        if (editorElement) {
          // Désactiver temporairement le MutationObserver avant l'insertion
          const reenableObserver = disableQuillObserver(quill)
          
          editorElement.innerHTML = editorElement.innerHTML + frameHTML + '<p><br></p>'
          
          // Réactiver le MutationObserver si on l'a désactivé
          if (reenableObserver) {
            reenableObserver()
          }
          
          // Utiliser requestAnimationFrame pour différer la notification
          requestAnimationFrame(() => {
            try {
              const inputEvent = new Event('input', { bubbles: true, cancelable: true })
              editorElement.dispatchEvent(inputEvent)
            } catch (e) {
              console.warn('Error dispatching input event:', e)
            }
          })
        }
      } catch (finalError) {
        console.error('All framed section insertion methods failed:', finalError)
      }
    }
  }
}

/**
 * Insère un tableau préformaté pour documents administratifs (affichage visuel garanti)
 */
export function insertAdminTable(quill: any, headers: string[] = ['Champ', 'Valeur'], rows: number = 3) {
  if (!quill || !quill.getSelection) return

  const range = quill.getSelection(true)
  
  // Ajouter contenteditable="false" pour que Quill ne convertisse pas le tableau en texte
  let tableHTML = '<table contenteditable="false" style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 2px solid #E5E7EB; box-shadow: 0 2px 8px rgba(0,0,0,0.08); background-color: white; display: table;">'
  tableHTML += '<thead>'
  tableHTML += '<tr style="background: linear-gradient(135deg, #335ACF 0%, #1E40AF 100%); display: table-row;">'
  
  headers.forEach((header) => {
    tableHTML += `<th style="padding: 12px 15px; border: 1px solid rgba(255,255,255,0.3); text-align: left; font-weight: 600; color: white; display: table-cell; vertical-align: middle;">${header}</th>`
  })
  
  tableHTML += '</tr>'
  tableHTML += '</thead>'
  tableHTML += '<tbody>'
  
  for (let r = 0; r < rows; r++) {
    const bgColor = r % 2 === 0 ? '#FAFBFC' : '#FFFFFF'
    tableHTML += `<tr style="background-color: ${bgColor}; display: table-row;">`
    headers.forEach((_, c) => {
      const content = c === 0 ? `Ligne ${r + 1}` : `Valeur ${r + 1}-${c + 1}`
      tableHTML += `<td style="padding: 10px 15px; border: 1px solid #E5E7EB; font-size: 13px; color: #374151; display: table-cell; vertical-align: top;">${content}</td>`
    })
    tableHTML += '</tr>'
  }
  
  tableHTML += '</tbody>'
  tableHTML += '</table>'

  // Insertion directe dans le DOM de Quill (car clipboard.convert ne supporte pas les tableaux)
  try {
    const editorElement = quill.root
    if (!editorElement) return

    // Désactiver temporairement le MutationObserver de Quill pour éviter l'erreur "emit"
    const reenableObserver = disableQuillObserver(quill)

    // Obtenir la position d'insertion
    let insertNode: Node | null = null
    
    if (range && typeof range.index === 'number') {
      try {
        const lineResult = quill.getLine(range.index)
        const line = Array.isArray(lineResult) ? lineResult[0] : lineResult
        
        if (line && line.domNode) {
          insertNode = line.domNode
        }
      } catch (e) {
        console.warn('Could not get line for insertion, inserting at end')
      }
    }
    
    // Insérer le HTML directement avec insertAdjacentHTML pour éviter les problèmes de synchronisation Quill
    const htmlToInsert = tableHTML + '<p><br></p>'
    
    if (insertNode && insertNode.parentNode) {
      // Créer un conteneur temporaire pour le HTML
      const container = document.createElement('div')
      container.innerHTML = htmlToInsert
      
      // Utiliser un marqueur pour insérer après le nœud actuel
      const parentElement = insertNode.parentElement
      if (parentElement) {
        const marker = document.createComment('insertion-marker')
        parentElement.insertBefore(marker, insertNode.nextSibling)
        
        // Utiliser un DocumentFragment pour une insertion atomique
        const fragment = document.createDocumentFragment()
        container.childNodes.forEach((node) => {
          fragment.appendChild(node.cloneNode(true))
        })
        parentElement.insertBefore(fragment, marker)
        
        parentElement.removeChild(marker)
      }
    } else {
      // Insérer à la fin de l'éditeur
      const container = document.createElement('div')
      container.innerHTML = htmlToInsert
      const nodes = Array.from(container.childNodes)
      
      nodes.forEach((node) => {
        editorElement.appendChild(node.cloneNode(true))
      })
    }
    
    // Réactiver le MutationObserver si on l'a désactivé
    if (reenableObserver) {
      reenableObserver()
    }
    
    // Utiliser requestAnimationFrame pour différer la notification de Quill
    // Cela évite que Quill essaie de synchroniser pendant que le DOM est en train de changer
    requestAnimationFrame(() => {
      try {
        // Déclencher un événement input pour notifier React sans déclencher la synchronisation Quill
        const inputEvent = new Event('input', { bubbles: true, cancelable: true })
        editorElement.dispatchEvent(inputEvent)
      } catch (e) {
        console.warn('Error dispatching input event:', e)
      }
    })
    
    return // Succès, pas besoin de fallback
  } catch (error) {
    // Fallback : Insertion directe via DOM
    try {
      const editorElement = quill.root
      if (!editorElement) return

      const selection = quill.getSelection(true)
      const insertIndex = selection?.index ?? editorElement.innerHTML.length

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = tableHTML
      const tableElement = tempDiv.firstElementChild as HTMLTableElement

      if (tableElement) {
        try {
          const lineResult = quill.getLine(insertIndex)
          const line = Array.isArray(lineResult) ? lineResult[0] : lineResult
          
          if (line && line.domNode) {
            const parent = line.domNode.parentNode
            if (parent) {
              parent.insertBefore(tableElement, line.domNode.nextSibling)
              
              const p = document.createElement('p')
              p.innerHTML = '<br>'
              parent.insertBefore(p, tableElement.nextSibling)
              
              // Désactiver temporairement le MutationObserver avant l'insertion
              const reenableObserver = disableQuillObserver(quill)
              
              // Ne PAS appeler quill.update() - cela peut convertir le HTML en texte
              const editorElement = quill.root
              if (editorElement) {
                // Réactiver le MutationObserver si on l'a désactivé
                if (reenableObserver) {
                  reenableObserver()
                }
                
                // Utiliser requestAnimationFrame pour différer la notification
                requestAnimationFrame(() => {
                  try {
                    const inputEvent = new Event('input', { bubbles: true, cancelable: true })
                    editorElement.dispatchEvent(inputEvent)
                  } catch (e) {
                    console.warn('Error dispatching input event:', e)
                  }
                })
              }
              
              // Ne pas appeler setSelection après manipulation DOM
              // Cela cause l'erreur "substring is not a function"
              // Laisser Quill gérer naturellement la position du curseur
            }
          } else {
            const editorElement = quill.root
            if (editorElement) {
              editorElement.appendChild(tableElement)
              const p = document.createElement('p')
              p.innerHTML = '<br>'
              editorElement.appendChild(p)
              
              // Ne PAS appeler quill.update() - cela peut convertir le HTML en texte
              const inputEvent = new Event('input', { bubbles: true, cancelable: true })
              editorElement.dispatchEvent(inputEvent)
              
              const textChangeEvent = new Event('text-change', { bubbles: true, cancelable: true })
              editorElement.dispatchEvent(textChangeEvent)
            }
          }
        } catch (lineError) {
          const editorElement = quill.root
          if (editorElement) {
            editorElement.appendChild(tableElement)
            const p = document.createElement('p')
            p.innerHTML = '<br>'
            editorElement.appendChild(p)
            // Désactiver temporairement le MutationObserver avant l'insertion
            const reenableObserver = disableQuillObserver(quill)
            
            // Ne PAS appeler quill.update() - cela peut convertir le HTML en texte
            // Réactiver le MutationObserver si on l'a désactivé
            if (reenableObserver) {
              reenableObserver()
            }
            
            // Utiliser requestAnimationFrame pour différer la notification
            requestAnimationFrame(() => {
              try {
                const inputEvent = new Event('input', { bubbles: true, cancelable: true })
                editorElement.dispatchEvent(inputEvent)
              } catch (e) {
                console.warn('Error dispatching input event:', e)
              }
            })
          }
        }
      }
    } catch (domError) {
      // Dernier fallback
      try {
        const editorElement = quill.root
        if (editorElement) {
          // Désactiver temporairement le MutationObserver avant l'insertion
          const reenableObserver = disableQuillObserver(quill)
          
          editorElement.innerHTML = editorElement.innerHTML + tableHTML + '<p><br></p>'
          
          // Réactiver le MutationObserver si on l'a désactivé
          if (reenableObserver) {
            reenableObserver()
          }
          
          // Utiliser requestAnimationFrame pour différer la notification
          requestAnimationFrame(() => {
            try {
              const inputEvent = new Event('input', { bubbles: true, cancelable: true })
              editorElement.dispatchEvent(inputEvent)
            } catch (e) {
              console.warn('Error dispatching input event:', e)
            }
          })
        }
      } catch (finalError) {
        console.error('All admin table insertion methods failed:', finalError)
      }
    }
  }
}

