import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import VariableNodeView from './VariableNodeView'

// Déclaration des commandes pour TypeScript
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    variable: {
      /**
       * Insère une variable dans l'éditeur
       */
      insertVariable: (attributes: { id: string; label: string; value: string }) => ReturnType
    }
  }
}

export interface VariableOptions {
  HTMLAttributes: Record<string, any>
}

/**
 * Extension TipTap pour les variables de documents
 * Rend un Node non-éditable avec un style de badge
 */
export const VariableExtension = Node.create<VariableOptions>({
  name: 'variable',

  // Groupe inline pour être inséré dans le texte
  group: 'inline',

  // Comportement inline (pas de bloc)
  inline: true,

  // Atomique = non-éditable, traité comme une seule unité
  atom: true,

  // Pas de contenu à l'intérieur
  content: '',

  // Attributs de la variable
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => ({
          'data-id': attributes.id,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => ({
          'data-label': attributes.label,
        }),
      },
      value: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-value'),
        renderHTML: (attributes) => ({
          'data-value': attributes.value,
        }),
      },
    }
  },

  // Configuration par défaut
  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  // Comment parser depuis HTML
  parseHTML() {
    return [
      {
        tag: 'span[data-type="variable"]',
      },
    ]
  },

  // Comment rendre en HTML
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': 'variable' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      HTMLAttributes['data-label'] || HTMLAttributes['data-value'] || '',
    ]
  },

  // Utiliser un NodeView React pour le rendu
  addNodeView() {
    return ReactNodeViewRenderer(VariableNodeView)
  },

  // Commandes pour insérer une variable
  addCommands() {
    return {
      insertVariable:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          })
        },
    }
  },

  // Raccourcis clavier (optionnel)
  addKeyboardShortcuts() {
    return {
      // Supprimer la variable avec Backspace
      Backspace: () => {
        const { selection } = this.editor.state
        const node = this.editor.state.doc.nodeAt(selection.from - 1)
        if (node?.type.name === 'variable') {
          return this.editor.commands.deleteRange({
            from: selection.from - 1,
            to: selection.from,
          })
        }
        return false
      },
    }
  },
})

export default VariableExtension



