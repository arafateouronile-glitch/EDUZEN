import { Extension } from '@tiptap/core'

export interface ParagraphStyleOptions {
  types: string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphStyle: {
      /**
       * Set spacing before paragraph
       */
      setSpacingBefore: (value: number) => ReturnType
      /**
       * Set spacing after paragraph
       */
      setSpacingAfter: (value: number) => ReturnType
      /**
       * Set text indent (first line)
       */
      setIndent: (value: number) => ReturnType
      /**
       * Reset paragraph spacing
       */
      resetParagraphStyle: () => ReturnType
    }
  }
}

export const ParagraphStyleExtension = Extension.create<ParagraphStyleOptions>({
  name: 'paragraphStyle',

  addOptions() {
    return {
      types: ['paragraph'],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          marginTop: {
            default: null,
            parseHTML: (element) => {
              const value = element.style.marginTop
              return value ? parseFloat(value) : null
            },
            renderHTML: (attributes) => {
              if (!attributes.marginTop) {
                return {}
              }
              return {
                style: `margin-top: ${attributes.marginTop}pt`,
              }
            },
          },
          marginBottom: {
            default: null,
            parseHTML: (element) => {
              const value = element.style.marginBottom
              return value ? parseFloat(value) : null
            },
            renderHTML: (attributes) => {
              if (!attributes.marginBottom) {
                return {}
              }
              return {
                style: `margin-bottom: ${attributes.marginBottom}pt`,
              }
            },
          },
          textIndent: {
            default: null,
            parseHTML: (element) => {
              const value = element.style.textIndent
              return value ? parseFloat(value) : null
            },
            renderHTML: (attributes) => {
              if (!attributes.textIndent) {
                return {}
              }
              return {
                style: `text-indent: ${attributes.textIndent}pt`,
              }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      setSpacingBefore:
        (value: number) =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { marginTop: value })
          )
        },
      setSpacingAfter:
        (value: number) =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { marginBottom: value })
          )
        },
      setIndent:
        (value: number) =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.updateAttributes(type, { textIndent: value })
          )
        },
      resetParagraphStyle:
        () =>
        ({ commands }) => {
          return this.options.types.every((type) =>
            commands.resetAttributes(type, ['marginTop', 'marginBottom', 'textIndent'])
          )
        },
    }
  },
})
