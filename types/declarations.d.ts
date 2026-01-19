/**
 * Déclarations de types pour les modules sans types TypeScript
 */

// react-signature-canvas
declare module 'react-signature-canvas' {
  import { Component } from 'react'

  interface SignatureCanvasProps {
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>
    clearOnResize?: boolean
    dotSize?: number | (() => number)
    minWidth?: number
    maxWidth?: number
    minDistance?: number
    backgroundColor?: string
    penColor?: string
    velocityFilterWeight?: number
    onBegin?: () => void
    onEnd?: () => void
  }

  class SignatureCanvas extends Component<SignatureCanvasProps> {
    clear(): void
    isEmpty(): boolean
    toDataURL(type?: string, encoderOptions?: number): string
    fromDataURL(dataURL: string, options?: { ratio?: number; width?: number; height?: number; xOffset?: number; yOffset?: number }): void
    toData(): Array<{ x: number; y: number; time: number }>
    fromData(pointGroups: Array<{ x: number; y: number; time: number }>): void
    off(): void
    on(): void
    getCanvas(): HTMLCanvasElement
    getTrimmedCanvas(): HTMLCanvasElement
    getSignaturePad(): any
  }

  export default SignatureCanvas
}

// @tinymce/tinymce-react
declare module '@tinymce/tinymce-react' {
  import { Component } from 'react'

  interface IAllProps {
    apiKey?: string
    id?: string
    init?: Record<string, any>
    initialValue?: string
    inline?: boolean
    onEditorChange?: (content: string, editor: any) => void
    onInit?: (evt: any, editor: any) => void
    plugins?: string | string[]
    tagName?: string
    textareaName?: string
    toolbar?: string | string[] | boolean
    value?: string
    disabled?: boolean
    cloudChannel?: string
    scriptLoading?: {
      async?: boolean
      defer?: boolean
      delay?: number
    }
  }

  export class Editor extends Component<IAllProps> {}
}
