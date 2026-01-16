/**
 * Palette de couleurs premium pour les avatars
 * Inspirée de TrendTrack, Revolut et des meilleures pratiques UI/UX 2025
 */
export const AVATAR_COLORS = [
  // Bleus (professionnel, confiance)
  { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', text: '#ffffff', name: 'blue' },
  { bg: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', text: '#ffffff', name: 'sky-blue' },
  { bg: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', text: '#ffffff', name: 'cyan' },
  
  // Violets/Pourpres (créativité, premium)
  { bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', text: '#ffffff', name: 'violet' },
  { bg: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)', text: '#ffffff', name: 'purple' },
  { bg: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', text: '#ffffff', name: 'indigo' },
  
  // Roses/Magentas (énergie, dynamisme)
  { bg: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)', text: '#ffffff', name: 'pink' },
  { bg: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)', text: '#ffffff', name: 'rose' },
  
  // Verts (croissance, succès)
  { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', text: '#ffffff', name: 'emerald' },
  { bg: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)', text: '#ffffff', name: 'green' },
  { bg: 'linear-gradient(135deg, #335ACF 0%, #1D4ED8 100%)', text: '#ffffff', name: 'royal-blue' },
  
  // Oranges/Ambers (chaleur, optimisme)
  { bg: 'linear-gradient(135deg, #34B9EE 0%, #0EA5E9 100%)', text: '#ffffff', name: 'cyan' },
  { bg: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)', text: '#ffffff', name: 'orange' },
  
  // Rouges (passion, urgence)
  { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', text: '#ffffff', name: 'red' },
  { bg: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)', text: '#ffffff', name: 'rose-red' },
  
  // Teals (calme, professionnel)
  { bg: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)', text: '#ffffff', name: 'teal' },
  
  // Violets profonds (luxe, premium)
  { bg: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)', text: '#ffffff', name: 'deep-purple' },
] as const

/**
 * Génère un hash simple à partir d'une chaîne de caractères
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Obtient une couleur d'avatar de manière déterministe basée sur un identifiant
 * Toujours retourne la même couleur pour le même identifiant
 */
export function getAvatarColor(identifier: string): typeof AVATAR_COLORS[number] {
  if (!identifier) {
    // Couleur par défaut
    return AVATAR_COLORS[0]
  }
  
  const hash = hashString(identifier.toLowerCase().trim())
  const index = hash % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

/**
 * Extrait les initiales d'un nom (prénom + nom)
 */
export function getInitials(name?: string, maxLength = 2): string {
  if (!name) return ''
  
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].slice(0, maxLength).toUpperCase()
  }
  
  // Prendre la première lettre de chaque mot
  return parts
    .slice(0, maxLength)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, maxLength)
}

/**
 * Génère un gradient premium basé sur les initiales
 * Plus sophistiqué que la simple sélection de couleur
 */
export function getPremiumGradient(identifier: string): {
  gradient: string
  textColor: string
  shadowColor: string
} {
  const color = getAvatarColor(identifier)
  
  // Extraire les couleurs du gradient pour créer un shadow matching
  const gradientMatch = color.bg.match(/#([0-9a-f]{6})/gi)
  const shadowColor = gradientMatch ? gradientMatch[0] : '#6366f1'
  
  return {
    gradient: color.bg,
    textColor: color.text,
    shadowColor: shadowColor + '80', // 50% opacity
  }
}

