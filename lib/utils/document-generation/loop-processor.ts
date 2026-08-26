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

/** Préfixes de boucle connus, et le nom de tableau qu'ils désignent */
const KNOWN_LOOPS: { prefix: string; arrayName: string }[] = [
  { prefix: 'module_', arrayName: 'modules' },
]

/**
 * Répare automatiquement une boucle {FOR:tableau}...{ENDFOR} cassée par une
 * manipulation du tableau dans l'éditeur visuel (balises supprimées, ou
 * séparées de la ligne <tr> qu'elles étaient censées répéter — cf. incidents
 * des 25 et 26/08/2026 sur les modèles de devis).
 *
 * Ne modifie le HTML que si un problème est détecté (`validateLoopBlocks`
 * non vide) : sur un template déjà correct, c'est un no-op garanti, donc
 * cette fonction ne peut pas dégrader un modèle qui fonctionne. Si la
 * structure est trop inhabituelle pour être réparée avec confiance (pas de
 * <tr> repérable), elle abandonne sans rien changer et laisse l'appelant
 * gérer le cas (avertissement bloquant à l'enregistrement).
 */
export function repairLoopBlocks(html: string): { html: string; repaired: boolean } {
  let result = html
  let anyChange = false

  for (let pass = 0; pass < 5; pass++) {
    if (validateLoopBlocks(result).length === 0) break

    let changedThisPass = false

    for (const { prefix, arrayName } of KNOWN_LOOPS) {
      if (!result.includes(`{${prefix}`)) continue

      // 1) Supprime toute boucle {FOR:arrayName}...{ENDFOR} qui ne contient
      // aucune variable {prefix...} (boucle vide/orpheline laissée derrière).
      const forRegex = new RegExp(`\\{FOR:${arrayName}\\}([\\s\\S]*?)\\{ENDFOR\\}`, 'g')
      const purged = result.replace(forRegex, (full: string, block: string) =>
        block.includes(`{${prefix}`) ? full : ''
      )
      if (purged !== result) {
        result = purged
        changedThisPass = true
      }

      // 2) Repère la première variable {prefix...} qui traîne hors de toute
      // boucle {FOR:arrayName} restante, et entoure son <tr> englobant.
      const loopSpans: Array<[number, number]> = []
      const scanRe = new RegExp(`\\{FOR:${arrayName}\\}[\\s\\S]*?\\{ENDFOR\\}`, 'g')
      let m: RegExpExecArray | null
      while ((m = scanRe.exec(result))) loopSpans.push([m.index, m.index + m[0].length])

      const varRe = new RegExp(`\\{${prefix}\\w+\\}`, 'g')
      let vm: RegExpExecArray | null
      let orphanIndex = -1
      while ((vm = varRe.exec(result))) {
        const inside = loopSpans.some(([s, e]) => vm!.index >= s && vm!.index < e)
        if (!inside) {
          orphanIndex = vm.index
          break
        }
      }

      if (orphanIndex !== -1) {
        const trStart = result.lastIndexOf('<tr>', orphanIndex)
        const trEndTagIdx = result.indexOf('</tr>', orphanIndex)
        if (trStart !== -1 && trEndTagIdx !== -1) {
          const trEnd = trEndTagIdx + '</tr>'.length
          result =
            result.slice(0, trStart) +
            `{FOR:${arrayName}}` +
            result.slice(trStart, trEnd) +
            '{ENDFOR}' +
            result.slice(trEnd)
          changedThisPass = true
        }
      }
    }

    if (!changedThisPass) break
    anyChange = true
  }

  return { html: result, repaired: anyChange }
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

  // Préfixes connus à vérifier même en l'absence totale de {FOR:...} dans le
  // document (ex: {ENDFOR}/{FOR:modules} entièrement supprimés en éditant le
  // tableau — les variables {module_...} restent alors seules, sans aucune
  // boucle nulle part à repérer via le regex ci-dessous).
  for (const { prefix } of KNOWN_LOOPS) {
    if (html.includes(`{${prefix}`)) prefixes.add(prefix)
  }

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
