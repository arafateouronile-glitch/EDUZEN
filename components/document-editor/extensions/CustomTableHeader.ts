import { TableHeader } from '@tiptap/extension-table-header'

export interface CustomTableHeaderOptions {
  HTMLAttributes: Record<string, unknown>
}

export const CustomTableHeader = TableHeader.extend<CustomTableHeaderOptions>({
  addAttributes() {
    return {
      ...this.parent?.(),
      // Couleur de fond
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || element.getAttribute('data-bg-color') || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) return {}
          return {
            'data-bg-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          }
        },
      },
      // Bordure haut
      borderTop: {
        default: null,
        parseHTML: (element) => element.style.borderTop || element.getAttribute('data-border-top') || null,
        renderHTML: (attributes) => {
          if (!attributes.borderTop) return {}
          return { 'data-border-top': attributes.borderTop, style: `border-top: ${attributes.borderTop}` }
        },
      },
      // Bordure bas
      borderBottom: {
        default: null,
        parseHTML: (element) => element.style.borderBottom || element.getAttribute('data-border-bottom') || null,
        renderHTML: (attributes) => {
          if (!attributes.borderBottom) return {}
          return { 'data-border-bottom': attributes.borderBottom, style: `border-bottom: ${attributes.borderBottom}` }
        },
      },
      // Bordure gauche
      borderLeft: {
        default: null,
        parseHTML: (element) => element.style.borderLeft || element.getAttribute('data-border-left') || null,
        renderHTML: (attributes) => {
          if (!attributes.borderLeft) return {}
          return { 'data-border-left': attributes.borderLeft, style: `border-left: ${attributes.borderLeft}` }
        },
      },
      // Bordure droite
      borderRight: {
        default: null,
        parseHTML: (element) => element.style.borderRight || element.getAttribute('data-border-right') || null,
        renderHTML: (attributes) => {
          if (!attributes.borderRight) return {}
          return { 'data-border-right': attributes.borderRight, style: `border-right: ${attributes.borderRight}` }
        },
      },
      // Alignement vertical
      verticalAlign: {
        default: 'middle',
        parseHTML: (element) => element.style.verticalAlign || 'middle',
        renderHTML: (attributes) => {
          if (!attributes.verticalAlign || attributes.verticalAlign === 'middle') return {}
          return { style: `vertical-align: ${attributes.verticalAlign}` }
        },
      },
      // Padding
      padding: {
        default: null,
        parseHTML: (element) => element.style.padding || element.getAttribute('data-padding') || null,
        renderHTML: (attributes) => {
          if (!attributes.padding) return {}
          return { 'data-padding': attributes.padding, style: `padding: ${attributes.padding}` }
        },
      },
      // Hauteur minimale de ligne
      minHeight: {
        default: null,
        parseHTML: (element) => element.style.minHeight || null,
        renderHTML: (attributes) => {
          if (!attributes.minHeight) return {}
          return { style: `min-height: ${attributes.minHeight}` }
        },
      },
    }
  },
})
