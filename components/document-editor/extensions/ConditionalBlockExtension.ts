import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ConditionalBlockNodeView from './ConditionalBlockNodeView'

// Déclaration des commandes pour TypeScript
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    conditionalBlock: {
      /**
       * Insère un bloc conditionnel dans l'éditeur
       */
      insertConditionalBlock: (attributes?: { condition?: string; type?: 'if' | 'else' | 'elseif' }) => ReturnType
      /**
       * Met à jour la condition d'un bloc
       */
      updateConditionalBlockCondition: (condition: string) => ReturnType
    }
  }
}

export interface ConditionalBlockOptions {
  HTMLAttributes: Record<string, any>
}

/**
 * Extension TipTap pour les blocs conditionnels
 * Permet de créer des sections de contenu qui seront affichées conditionnellement
 */
export const ConditionalBlockExtension = Node.create<ConditionalBlockOptions>({
  name: 'conditionalBlock',

  // Groupe block pour être un conteneur
  group: 'block',

  // Contenu : peut contenir des blocs (paragraphes, titres, etc.)
  content: 'block+',

  // Définit que c'est un conteneur
  defining: true,

  // Attributs du bloc conditionnel
  addAttributes() {
    return {
      condition: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-condition') || '',
        renderHTML: (attributes) => ({
          'data-condition': attributes.condition,
        }),
      },
      type: {
        default: 'if',
        parseHTML: (element) => element.getAttribute('data-type') || 'if',
        renderHTML: (attributes) => ({
          'data-type': attributes.type,
        }),
      },
      variableId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-variable-id'),
        renderHTML: (attributes) => {
          if (!attributes.variableId) return {}
          return { 'data-variable-id': attributes.variableId }
        },
      },
      operator: {
        default: 'exists',
        parseHTML: (element) => element.getAttribute('data-operator') || 'exists',
        renderHTML: (attributes) => ({
          'data-operator': attributes.operator,
        }),
      },
      compareValue: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-compare-value') || '',
        renderHTML: (attributes) => ({
          'data-compare-value': attributes.compareValue,
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
        tag: 'div[data-type="conditional-block"]',
      },
    ]
  },

  // Comment rendre en HTML
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { 'data-type': 'conditional-block' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      0, // 0 signifie que le contenu sera inséré ici
    ]
  },

  // Utiliser un NodeView React pour le rendu
  addNodeView() {
    return ReactNodeViewRenderer(ConditionalBlockNodeView)
  },

  // Commandes pour manipuler les blocs conditionnels
  addCommands() {
    return {
      insertConditionalBlock:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              condition: attributes.condition || '',
              type: attributes.type || 'if',
            },
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Contenu conditionnel...',
                  },
                ],
              },
            ],
          })
        },
      updateConditionalBlockCondition:
        (condition) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { condition })
        },
    }
  },

  // Raccourcis clavier
  addKeyboardShortcuts() {
    return {
      // Ctrl+Shift+C pour insérer un bloc conditionnel
      'Mod-Shift-c': () => this.editor.commands.insertConditionalBlock(),
    }
  },
})

export default ConditionalBlockExtension



