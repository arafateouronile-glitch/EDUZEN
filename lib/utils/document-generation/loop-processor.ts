/**
 * Traitement des boucles dans les templates
 * Syntaxe : {FOR:nom_tableau}...contenu avec {prefixe_cle}...{ENDFOR}
 * Exemple : {FOR:modules}<tr><td>{module_nom}</td></tr>{ENDFOR}
 * Le préfixe est déduit du nom du tableau (modules -> module_)
 */

/** Élément de boucle (ex. module devis/facture) */
type LoopItem = Record<string, unknown>

/**
 * Traite les boucles FOR dans le contenu HTML
 * {FOR:modules}...{module_nom}...{module_prix_ht}...{ENDFOR} => une répétition du bloc par élément du tableau
 */
export function processLoops(
  html: string,
  variables: Record<string, unknown>
): string {
  const forRegex = /\{FOR:(\w+)\}([\s\S]*?)\{ENDFOR\}/g
  return html.replace(forRegex, (_match, arrayName, blockContent) => {
    let arr = variables[arrayName]
    if (!Array.isArray(arr) || arr.length === 0) return ''
    if (arrayName === 'modules') {
      const fallbackMontant = (variables.montant_ht ?? variables.montant ?? '0.00') as string
      const fallbackNom = (variables.formation_nom ?? variables.formation_name ?? 'Formation') as string
      arr = (arr as LoopItem[]).map((item: LoopItem) => {
        if (!item || typeof item !== 'object') return item
        const nom = item.nom != null && String(item.nom).trim() !== '' ? item.nom : fallbackNom
        const prixHt = item.prix_ht != null && String(item.prix_ht).trim() !== '' ? item.prix_ht : fallbackMontant
        const totalHt = item.total_ht != null && String(item.total_ht).trim() !== '' ? item.total_ht : fallbackMontant
        const quantite = item.quantite != null ? item.quantite : 1
        return { ...item, nom, prix_ht: prixHt, total_ht: totalHt, quantite }
      })
    }
    const prefix = arrayName.endsWith('s') ? arrayName.slice(0, -1) + '_' : arrayName + '_'
    if (!prefix) return blockContent
    return (arr as LoopItem[])
      .map((item: LoopItem) => {
        let out = blockContent
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          for (const [key, value] of Object.entries(item)) {
            const placeholder = new RegExp(`\\{${prefix}${key}\\}`, 'g')
            out = out.replace(placeholder, String(value ?? ''))
          }
        }
        return out
      })
      .join('')
  })
}

/**
 * Vérifie qu'un template n'a pas de boucle {FOR:tableau}...{ENDFOR} cassée :
 * soit vide (aucune variable {prefixe_...} à l'intérieur — elle ne
 * produira donc jamais rien), soit dont des variables {prefixe_...}
 * traînent en dehors du bloc (elles ne seront jamais remplacées).
 *
 * Piège fréquent en éditant un tableau dans l'éditeur visuel : les
 * balises {FOR:...} et {ENDFOR} se retrouvent séparées de la ligne
 * qu'elles étaient censées répéter (ex: incident du 25/08/2026 sur les
 * modèles de devis — tableau "Prix de la formation" resté vide).
 */
export function validateLoopBlocks(html: string): string[] {
  const warnings: string[] = []
  const forRegex = /\{FOR:(\w+)\}([\s\S]*?)\{ENDFOR\}/g
  const loopSpans: { start: number; end: number }[] = []
  const prefixes = new Set<string>()

  let match: RegExpExecArray | null
  while ((match = forRegex.exec(html)) !== null) {
    const [full, arrayName, blockContent] = match
    const prefix = arrayName.endsWith('s') ? arrayName.slice(0, -1) + '_' : arrayName + '_'
    prefixes.add(prefix)
    loopSpans.push({ start: match.index, end: match.index + full.length })
    if (!blockContent.includes(`{${prefix}`)) {
      warnings.push(
        `La boucle {FOR:${arrayName}}...{ENDFOR} ne contient aucune variable {${prefix}...} : elle restera toujours vide.`
      )
    }
  }

  for (const prefix of prefixes) {
    const varRegex = new RegExp(`\\{${prefix}\\w+\\}`, 'g')
    let varMatch: RegExpExecArray | null
    while ((varMatch = varRegex.exec(html)) !== null) {
      const insideLoop = loopSpans.some((span) => varMatch!.index >= span.start && varMatch!.index < span.end)
      if (insideLoop) continue
      const message = `La variable ${varMatch[0]} apparaît en dehors de son bloc {FOR:...}{ENDFOR} : elle ne sera jamais remplie. Vérifiez que {FOR:...} et {ENDFOR} entourent bien toute la ligne du tableau.`
      if (!warnings.includes(message)) warnings.push(message)
    }
  }

  return warnings
}
