/**
 * Utilitaires pour gérer les cookies côté client
 */

export function setCookie(name: string, value: string, options: { maxAge?: number } = {}) {
  if (typeof window === 'undefined') return

  const { maxAge = 365 * 24 * 60 * 60 } = options // 1 an par défaut
  const expires = new Date()
  expires.setTime(expires.getTime() + maxAge * 1000)

  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

export function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

export function deleteCookie(name: string) {
  if (typeof window === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}



