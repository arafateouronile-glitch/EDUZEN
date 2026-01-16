/**
 * Utilitaires pour les raccourcis clavier personnalisables
 */

export interface ShortcutConfig {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
}

export interface Shortcuts {
  [key: string]: ShortcutConfig
}

export const DEFAULT_SHORTCUTS: Shortcuts = {
  save: { key: 's', ctrl: true },
  undo: { key: 'z', ctrl: true },
  redo: { key: 'y', ctrl: true },
  copy: { key: 'c', ctrl: true },
  paste: { key: 'v', ctrl: true },
  cut: { key: 'x', ctrl: true },
  selectAll: { key: 'a', ctrl: true },
  bold: { key: 'b', ctrl: true },
  italic: { key: 'i', ctrl: true },
  underline: { key: 'u', ctrl: true },
}

/**
 * Charge les raccourcis personnalisés depuis le localStorage
 */
export function loadCustomShortcuts(): Shortcuts {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const stored = localStorage.getItem('custom-keyboard-shortcuts')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Erreur lors du chargement des raccourcis personnalisés:', error)
  }

  return {}
}

/**
 * Sauvegarde les raccourcis personnalisés dans le localStorage
 */
export function saveCustomShortcuts(shortcuts: Shortcuts): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem('custom-keyboard-shortcuts', JSON.stringify(shortcuts))
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des raccourcis personnalisés:', error)
  }
}

/**
 * Récupère la configuration d'un raccourci
 */
export function getShortcutConfig(shortcutId: string): ShortcutConfig {
  return DEFAULT_SHORTCUTS[shortcutId] || { key: '' }
}

/**
 * Vérifie si un événement clavier correspond à un raccourci
 */
export function matchesShortcut(
  event: KeyboardEvent,
  config: ShortcutConfig
): boolean {
  if (event.key.toLowerCase() !== config.key.toLowerCase()) {
    return false
  }

  if (config.ctrl && !event.ctrlKey && !event.metaKey) {
    return false
  }

  if (config.shift && !event.shiftKey) {
    return false
  }

  if (config.alt && !event.altKey) {
    return false
  }

  if (config.meta && !event.metaKey) {
    return false
  }

  // Vérifier qu'on n'a pas de modificateurs non désirés
  if (!config.ctrl && (event.ctrlKey || event.metaKey)) {
    return false
  }

  if (!config.shift && event.shiftKey) {
    return false
  }

  if (!config.alt && event.altKey) {
    return false
  }

  if (!config.meta && event.metaKey) {
    return false
  }

  return true
}
