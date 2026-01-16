/**
 * Blot personnalisé pour les variables dans Quill
 * Les variables sont formatées comme des badges non modifiables
 */

// Cette fonction doit être appelée après l'import de Quill
export function registerVariableBlot(Quill: any) {
  const Block = Quill.import('blots/block')
  const Inline = Quill.import('blots/inline')
  const Embed = Quill.import('blots/embed')

  // Créer un Blot personnalisé pour les variables
  class VariableBlot extends Embed {
    static blotName = 'variable'
    static tagName = 'span'
    static className = 'ql-variable'

    static create(value: string) {
      const node = super.create()
      node.setAttribute('data-variable', value)
      node.setAttribute('contenteditable', 'false')
      node.classList.add('ql-variable')
      node.textContent = `{${value}}`
      node.style.cssText = `
        display: inline-block;
        padding: 2px 8px;
        margin: 0 2px;
        background-color: #E0F2FE;
        color: #0369A1;
        border: 1px solid #BAE6FD;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        font-weight: 500;
        cursor: default;
        user-select: none;
      `
      return node
    }

    static value(node: HTMLElement) {
      return node.getAttribute('data-variable') || ''
    }

    // Empêcher la modification du contenu
    static formats() {
      return true
    }

    // Empêcher la suppression
    length() {
      return 1
    }

    // Empêcher la division
    split() {
      return this
    }

    // Empêcher la fusion
    deleteAt() {
      // Ne rien faire - empêche la suppression
      return
    }

    // Empêcher l'insertion
    insertAt() {
      // Ne rien faire - empêche l'insertion
      return
    }

    // Empêcher la modification
    optimize() {
      // Ne rien faire
      return
    }
  }

  // Enregistrer le Blot
  Quill.register(VariableBlot, true)

  return VariableBlot
}

/**
 * Insère une variable dans un éditeur Quill
 */
export function insertVariable(quill: any, variable: string) {
  const range = quill.getSelection(true)
  if (range) {
    quill.insertEmbed(range.index, 'variable', variable, 'user')
    quill.setSelection(range.index + 1)
  } else {
    const length = quill.getLength()
    quill.insertEmbed(length - 1, 'variable', variable, 'user')
    quill.setSelection(length)
  }
}

/**
 * Convertit les balises {variable} en Blots Variable dans le HTML
 */
export function convertVariablesToBlots(html: string): string {
  // Remplacer les balises {variable} par des spans avec la classe ql-variable
  return html.replace(
    /\{([^}]+)\}/g,
    '<span class="ql-variable" data-variable="$1" contenteditable="false" style="display: inline-block; padding: 2px 8px; margin: 0 2px; background-color: #E0F2FE; color: #0369A1; border: 1px solid #BAE6FD; border-radius: 4px; font-family: \'Courier New\', monospace; font-size: 13px; font-weight: 500; cursor: default; user-select: none;">{$1}</span>'
  )
}

/**
 * Convertit les Blots Variable en balises {variable} dans le HTML
 */
export function convertBlotsToVariables(html: string): string {
  // Remplacer les spans ql-variable par des balises {variable}
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const variables = doc.querySelectorAll('.ql-variable[data-variable]')
  
  variables.forEach((variable) => {
    const varName = variable.getAttribute('data-variable') || ''
    const textNode = doc.createTextNode(`{${varName}}`)
    variable.parentNode?.replaceChild(textNode, variable)
  })

  return doc.body.innerHTML
}























