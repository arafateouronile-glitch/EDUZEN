import { TableCell } from '@tiptap/extension-table-cell'

export interface CustomTableCellOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customTableCell: {
      /** Set cell background color */
      setCellBackground: (color: string | null) => ReturnType
      /** Set all cell borders */
      setCellBorders: (options: { color?: string; width?: string; style?: string }) => ReturnType
      /** Set specific cell border */
      setCellBorder: (
        side: 'top' | 'bottom' | 'left' | 'right',
        options: { color?: string; width?: string; style?: string } | null
      ) => ReturnType
      /** Set outer borders only */
      setCellOuterBorders: (options: { color?: string; width?: string; style?: string }) => ReturnType
      /** Remove all cell borders */
      removeCellBorders: () => ReturnType
      /** Set cell vertical alignment */
      setCellVerticalAlign: (align: 'top' | 'middle' | 'bottom') => ReturnType
      /** Set cell padding */
      setCellPadding: (padding: string) => ReturnType
    }
  }
}

export const CustomTableCell = TableCell.extend<CustomTableCellOptions>({
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
        default: 'top',
        parseHTML: (element) => element.style.verticalAlign || 'top',
        renderHTML: (attributes) => {
          if (!attributes.verticalAlign || attributes.verticalAlign === 'top') return {}
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

  addCommands() {
    return {
      ...this.parent?.(),
      setCellBackground:
        (color: string | null) =>
        ({ commands }) =>
          commands.updateAttributes('tableCell', { backgroundColor: color }),

      setCellBorders:
        (options: { color?: string; width?: string; style?: string }) =>
        ({ commands }) => {
          const border = `${options.width || '1px'} ${options.style || 'solid'} ${options.color || '#000000'}`
          return commands.updateAttributes('tableCell', {
            borderTop: border,
            borderBottom: border,
            borderLeft: border,
            borderRight: border,
          })
        },

      setCellBorder:
        (side: 'top' | 'bottom' | 'left' | 'right', options: { color?: string; width?: string; style?: string } | null) =>
        ({ commands }) => {
          const attrName = `border${side.charAt(0).toUpperCase() + side.slice(1)}`
          if (options === null) return commands.updateAttributes('tableCell', { [attrName]: null })
          const border = `${options.width || '1px'} ${options.style || 'solid'} ${options.color || '#000000'}`
          return commands.updateAttributes('tableCell', { [attrName]: border })
        },

      setCellOuterBorders:
        (options: { color?: string; width?: string; style?: string }) =>
        ({ commands }) => {
          const border = `${options.width || '1px'} ${options.style || 'solid'} ${options.color || '#000000'}`
          return commands.updateAttributes('tableCell', {
            borderTop: border,
            borderBottom: border,
            borderLeft: border,
            borderRight: border,
          })
        },

      removeCellBorders:
        () =>
        ({ commands }) =>
          commands.updateAttributes('tableCell', {
            borderTop: 'none',
            borderBottom: 'none',
            borderLeft: 'none',
            borderRight: 'none',
          }),

      setCellVerticalAlign:
        (align: 'top' | 'middle' | 'bottom') =>
        ({ commands }) =>
          commands.updateAttributes('tableCell', { verticalAlign: align }),

      setCellPadding:
        (padding: string) =>
        ({ commands }) =>
          commands.updateAttributes('tableCell', { padding }),
    }
  },
})
