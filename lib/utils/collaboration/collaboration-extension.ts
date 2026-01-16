/**
 * Extension Tiptap pour l'édition collaborative
 * Utilise Y.js pour la synchronisation
 */

import { Collaboration } from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import type { WebsocketProvider } from 'y-websocket'

export interface CollaborationConfig {
  ydoc: Y.Doc
  provider: WebsocketProvider
  field?: string
}

/**
 * Extension de collaboration personnalisée pour Tiptap
 * Note: Pour Tiptap v3, l'extension Collaboration est disponible
 * mais CollaborationCursor n'est pas encore disponible pour v3.
 * Nous utiliserons uniquement Collaboration pour la synchronisation du contenu.
 */
export const createCollaborationExtension = (config: CollaborationConfig) => {
  return [
    Collaboration.configure({
      document: config.ydoc,
      field: config.field || 'default',
    }),
  ]
}
