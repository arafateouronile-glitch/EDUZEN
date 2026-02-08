import { TableCell } from '@tiptap/extension-table-cell'

export interface CustomTableCellOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customTableCell: {
      /**
       * Set cell background color
       */
      setCellBackground: (color: string | null) => ReturnType
      /**
       * Set all cell borders
       */
      setCellBorders: (options: {
        color?: string
        width?: string
        style?: string
      }) => ReturnType
      /**
       * Set specific cell border
       */
      setCellBorder: (
        side: 'top' | 'bottom' | 'left' | 'right',
        options: { color?: string; width?: string; style?: string } | null
      ) => ReturnType
      /**
       * Set outer borders only
       */
      setCellOuterBorders: (options: {
        color?: string
        width?: string
        style?: string
      }) => ReturnType
      /**
       * Remove all cell borders
       */
      removeCellBorders: () => ReturnType
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
        parseHTML: (element) => {
          return element.style.backgroundColor || element.getAttribute('data-bg-color') || null
        },
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {}
          }
          return {
            'data-bg-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          }
        },
      },
      // Bordure haut
      borderTop: {
        default: null,
        parseHTML: (element) => {
          return element.style.borderTop || element.getAttribute('data-border-top') || null
        },
        renderHTML: (attributes) => {
          if (!attributes.borderTop) {
            return {}
          }
          return {
            'data-border-top': attributes.borderTop,
            style: `border-top: ${attributes.borderTop}`,
          }
        },
      },
      // Bordure bas
      borderBottom: {
        default: null,
        parseHTML: (element) => {
          return element.style.borderBottom || element.getAttribute('data-border-bottom') || null
        },
        renderHTML: (attributes) => {
          if (!attributes.borderBottom) {
            return {}
          }
          return {
            'data-border-bottom': attributes.borderBottom,
            style: `border-bottom: ${attributes.borderBottom}`,
          }
        },
      },
      // Bordure gauche
      borderLeft: {
        default: null,
        parseHTML: (element) => {
          return element.style.borderLeft || element.getAttribute('data-border-left') || null
        },
        renderHTML: (attributes) => {
          if (!attributes.borderLeft) {
            return {}
          }
          return {
            'data-border-left': attributes.borderLeft,
            style: `border-left: ${attributes.borderLeft}`,
          }
        },
      },
      // Bordure droite
      borderRight: {
        default: null,
        parseHTML: (element) => {
          return element.style.borderRight || element.getAttribute('data-border-right') || null
        },
        renderHTML: (attributes) => {
          if (!attributes.borderRight) {
            return {}
          }
          return {
            'data-border-right': attributes.borderRight,
            style: `border-right: ${attributes.borderRight}`,
          }
        },
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setCellBackground:
        (color: string | null) =>
        ({ commands }) => {
          return commands.updateAttributes('tableCell', { backgroundColor: color })
        },
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
          if (options === null) {
            const attrName = `border${side.charAt(0).toUpperCase() + side.slice(1)}`
            return commands.updateAttributes('tableCell', { [attrName]: null })
          }
          const border = `${options.width || '1px'} ${options.style || 'solid'} ${options.color || '#000000'}`
          const attrName = `border${side.charAt(0).toUpperCase() + side.slice(1)}`
          return commands.updateAttributes('tableCell', { [attrName]: border })
        },
      setCellOuterBorders:
        (options: { color?: string; width?: string; style?: string }) =>
        ({ commands }) => {
          const border = `${options.width || '1px'} ${options.style || 'solid'} ${options.color || '#000000'}`
          // Pour les bordures extérieures, on applique à toutes les cellules
          // mais seules les cellules sur les bords auront des bordures visibles
          return commands.updateAttributes('tableCell', {
            borderTop: border,
            borderBottom: border,
            borderLeft: border,
            borderRight: border,
          })
        },
      removeCellBorders:
        () =>
        ({ commands }) => {
          return commands.updateAttributes('tableCell', {
            borderTop: 'none',
            borderBottom: 'none',
            borderLeft: 'none',
            borderRight: 'none',
          })
        },
    }
  },
})
