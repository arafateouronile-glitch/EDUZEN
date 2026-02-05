/**
 * Prépare une chaîne de caractères pour un rendu PDF sécurisé.
 * Limite la longueur et supprime les caractères non-standard (évite crashs pdf-lib et débordements).
 */
export function sanitizeForPDF(text: string, maxLength: number = 60): string {
  if (!text) return ''

  return text
    .normalize('NFC') // Normalisation Unicode
    .replace(/[^\x20-\x7E\xC0-\xFF]/g, '') // Garde ASCII étendu (accents), vire émojis et symboles techniques
    .substring(0, maxLength) // Coupe pour éviter de déborder des marges
    .trim()
}
