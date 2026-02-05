/**
 * Utilitaires DOM pour éviter les erreurs removeChild et centraliser les portails.
 *
 * - getPortalRoot() : racine unique pour createPortal, évite d'ajouter/supprimer
 *   des enfants directs de document.body (réduit les conflits avec le frame Vercel/Cursor).
 * - safeRemoveChild() : supprime un nœud uniquement s'il a encore un parent,
 *   évite NotFoundError "The node to be removed is not a child of this node".
 */

const PORTAL_ROOT_ID = 'eduzen-portal-root'

/**
 * Retourne un conteneur unique appendu à document.body, utilisé pour tous les portails
 * (sidebar mobile, dropdowns Select, etc.). On ne retire jamais ce nœud, ce qui évite
 * les removeChild dans le frame parent (preview Vercel/Cursor).
 */
export function getPortalRoot(): HTMLElement {
  if (typeof document === 'undefined') {
    throw new Error('getPortalRoot can only be called in the browser')
  }
  let root = document.getElementById(PORTAL_ROOT_ID)
  if (!root) {
    root = document.createElement('div')
    root.id = PORTAL_ROOT_ID
    root.setAttribute('aria-hidden', 'true')
    root.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;'
    document.body.appendChild(root)
  }
  return root as HTMLElement
}

/**
 * Supprime un nœud du DOM uniquement s'il a encore un parent.
 * Évite : NotFoundError: Failed to execute 'removeChild' on 'Node':
 * The node to be removed is not a child of this node.
 */
export function safeRemoveChild(node: Node | null | undefined): void {
  if (!node) return
  const parent = node.parentNode
  if (parent) parent.removeChild(node)
}
