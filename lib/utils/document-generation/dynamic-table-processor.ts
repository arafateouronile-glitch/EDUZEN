/**
 * Traitement des tableaux dynamiques dans les templates
 * Permet de générer des tableaux à partir de données structurées
 */

/**
 * Traite les tableaux dynamiques dans le contenu HTML
 * Remplace les patterns de tableaux dynamiques par du HTML généré
 */
export function processDynamicTables(
  html: string,
  variables: Record<string, any>
): string {
  let result = html

  // Pattern pour les tableaux dynamiques : {{#table variable_name}}
  // Exemple : {{#table facture_items}}
  const tablePattern = /\{\{#table\s+(\w+)\}\}([\s\S]*?)\{\{\/table\}\}/g

  result = result.replace(tablePattern, (match, variableName, tableTemplate) => {
    const tableData = variables[variableName]

    // Si la variable n'existe pas ou n'est pas un tableau, retourner le template vide
    if (!tableData || !Array.isArray(tableData)) {
      return ''
    }

    // Si c'est une chaîne JSON, parser
    let items: any[] = []
    if (typeof tableData === 'string') {
      try {
        items = JSON.parse(tableData)
      } catch {
        return ''
      }
    } else {
      items = tableData
    }

    // Générer les lignes du tableau
    const rows = items.map((item, index) => {
      let row = tableTemplate

      // Remplacer les variables dans le template de ligne
      // Support pour {variable} et {item.variable}
      Object.keys(item).forEach((key) => {
        const value = item[key] !== null && item[key] !== undefined ? String(item[key]) : ''
        const regex = new RegExp(`\\{${key}\\}`, 'g')
        row = row.replace(regex, value)
        // Support pour {item.variable}
        const itemRegex = new RegExp(`\\{item\\.${key}\\}`, 'g')
        row = row.replace(itemRegex, value)
      })

      // Variables spéciales
      row = row.replace(/\{index\}/g, String(index + 1))
      row = row.replace(/\{row_number\}/g, String(index + 1))

      return row
    }).join('')

    return rows
  })

  // Pattern pour les tableaux simples avec boucle inline
  // Exemple : {{#each facture_items}}<tr><td>{description}</td></tr>{{/each}}
  const eachPattern = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g

  result = result.replace(eachPattern, (match, variableName, itemTemplate) => {
    const arrayData = variables[variableName]

    if (!arrayData || !Array.isArray(arrayData)) {
      return ''
    }

    let items: any[] = []
    if (typeof arrayData === 'string') {
      try {
        items = JSON.parse(arrayData)
      } catch {
        return ''
      }
    } else {
      items = arrayData
    }

    const rows = items.map((item, index) => {
      let row = itemTemplate

      // Remplacer les variables dans le template
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach((key) => {
          const value = item[key] !== null && item[key] !== undefined ? String(item[key]) : ''
          const regex = new RegExp(`\\{${key}\\}`, 'g')
          row = row.replace(regex, value)
        })
      } else {
        // Si l'item est une valeur simple, remplacer {this} ou {.}
        row = row.replace(/\{this\}/g, String(item))
        row = row.replace(/\{\.\}/g, String(item))
      }

      row = row.replace(/\{index\}/g, String(index))
      row = row.replace(/\{@index\}/g, String(index))

      return row
    }).join('')

    return rows
  })

  return result
}
