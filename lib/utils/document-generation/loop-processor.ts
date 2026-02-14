/**
 * Traitement des boucles dans les templates
 * Syntaxe : {FOR:nom_tableau}...contenu avec {prefixe_cle}...{ENDFOR}
 * Exemple : {FOR:modules}<tr><td>{module_nom}</td></tr>{ENDFOR}
 * Le préfixe est déduit du nom du tableau (modules -> module_)
 */

/**
 * Traite les boucles FOR dans le contenu HTML
 * {FOR:modules}...{module_nom}...{module_prix_ht}...{ENDFOR} => une répétition du bloc par élément du tableau
 */
export function processLoops(
  html: string,
  variables: Record<string, any>
): string {
  const forRegex = /\{FOR:(\w+)\}([\s\S]*?)\{ENDFOR\}/g
  return html.replace(forRegex, (_match, arrayName, blockContent) => {
    let arr = variables[arrayName]
    if (!Array.isArray(arr) || arr.length === 0) return ''
    // Pour la boucle "modules" (devis/facture), compléter les champs manquants avec les variables globales
    if (arrayName === 'modules') {
      const fallbackMontant = variables.montant_ht ?? variables.montant ?? '0.00'
      const fallbackNom = variables.formation_nom ?? variables.formation_name ?? 'Formation'
      arr = arr.map((item: Record<string, any>) => {
        if (!item || typeof item !== 'object') return item
        return {
          ...item,
          nom: item.nom != null && String(item.nom).trim() !== '' ? item.nom : fallbackNom,
          prix_ht: item.prix_ht != null && String(item.prix_ht).trim() !== '' ? item.prix_ht : fallbackMontant,
          total_ht: item.total_ht != null && String(item.total_ht).trim() !== '' ? item.total_ht : fallbackMontant,
          quantite: item.quantite != null ? item.quantite : 1,
        }
      })
    }
    const prefix = arrayName.endsWith('s') ? arrayName.slice(0, -1) + '_' : arrayName + '_' // modules -> module_
    if (!prefix) return blockContent
    return arr
      .map((item: Record<string, any>) => {
        let out = blockContent
        if (item && typeof item === 'object') {
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
