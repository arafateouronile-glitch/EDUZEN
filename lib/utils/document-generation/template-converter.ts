/**
 * Utilitaires pour convertir les anciennes balises template literals ${variable}
 * en nouvelles balises {variable} pour le système de génération de documents
 */

/**
 * Convertit les template literals JavaScript ${variable} en balises {variable}
 * dans le contenu HTML d'un template
 * 
 * @param html - Le contenu HTML avec des template literals ${variable}
 * @returns Le contenu HTML avec des balises {variable}
 */
export function convertTemplateLiteralsToTags(html: string): string {
  if (!html || typeof html !== 'string') {
    return html
  }

  // Pattern pour matcher ${variable} mais pas ${leftTitle} ou autres paramètres de fonction
  // On cherche ${ suivi d'un nom de variable (lettres, chiffres, underscore) suivi de }
  // Exclure les cas où c'est clairement un paramètre de fonction JavaScript
  // On doit être prudent pour ne pas convertir les template literals JavaScript légitimes
  // dans les fonctions helper (comme generateSignatureSection)
  
  // Convertir ${variable} en {variable} mais seulement si ce n'est pas dans un contexte
  // de template literal JavaScript (c'est-à-dire pas dans une fonction qui utilise des backticks)
  // Pour simplifier, on convertit tous les ${variable} qui sont dans le contenu HTML
  // et qui ne sont pas des paramètres de fonction (comme ${leftTitle}, ${rightTitle}, ${separator})
  
  // Liste des variables JavaScript qui ne doivent PAS être converties (paramètres de fonction)
  const jsVariables = ['leftTitle', 'rightTitle', 'separator']
  
  return html.replace(/\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, variable) => {
    // Ne pas convertir les paramètres de fonction JavaScript
    if (jsVariables.includes(variable)) {
      return match
    }
    // Convertir en balise {variable}
    return `{${variable}}`
  })
}

/**
 * Convertit les nodes TipTap <span data-type="variable"> en balises {variable}
 * Cette fonction est utilisée lors de la sauvegarde du template
 * 
 * @param html - Le contenu HTML avec des nodes TipTap
 * @returns Le contenu HTML avec des balises {variable}
 */
export function convertVariableNodesToTags(html: string): string {
  if (!html || typeof html !== 'string') {
    return html
  }

  // Convertir <span data-type="variable" data-value="{variable}">label</span> en {variable}
  // Pattern pour matcher les spans de variables TipTap
  return html.replace(
    /<span\s+data-type="variable"\s+data-id="([^"]+)"\s+data-label="[^"]*"\s+data-value="\{([^"]+)\}"[^>]*>([^<]*)<\/span>/g,
    (match, id, value, label) => {
      // Utiliser la valeur (value) si disponible, sinon l'id
      return `{${value || id}}`
    }
  )
}

/**
 * Convertit les balises {variable} en template literals ${variable}
 * (fonction inverse, utile pour la migration inverse si nécessaire)
 */
export function convertTagsToTemplateLiterals(html: string): string {
  if (!html || typeof html !== 'string') {
    return html
  }

  // Pattern pour matcher {variable} mais pas {IF ...} ou autres structures conditionnelles
  // On cherche { suivi d'un nom de variable simple (pas d'espaces, pas de &&, etc.) suivi de }
  return html.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, variable) => {
    // Ne pas convertir les structures conditionnelles
    if (variable === 'IF' || variable === 'ELSE' || variable === 'ENDIF') {
      return match
    }
    return `\${${variable}}`
  })
}

/**
 * Convertit les balises {variable} en HTML <span data-type="variable"> pour l'éditeur TipTap
 * Cette fonction est utilisée lors du chargement du HTML dans l'éditeur
 * 
 * @param html - Le contenu HTML avec des balises {variable}
 * @returns Le contenu HTML avec des balises <span data-type="variable">
 */
export function convertTagsToVariableNodes(html: string): string {
  if (!html || typeof html !== 'string') {
    return html
  }

  // Convertir {variable} en <span data-type="variable"> mais seulement si ce n'est pas déjà dans un span
  // et si ce n'est pas une structure conditionnelle {IF ...} ou {ENDIF}
  return html.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, variable) => {
    // Ne pas convertir les structures conditionnelles
    if (variable === 'IF' || variable === 'ELSE' || variable === 'ENDIF') {
      return match
    }
    
    // Ne pas convertir si c'est déjà dans un span data-type="variable"
    // (pour éviter les conversions multiples)
    const beforeMatch = html.substring(0, html.indexOf(match))
    const afterMatch = html.substring(html.indexOf(match) + match.length)
    
    // Vérifier si on est déjà dans un span variable
    const lastOpenSpan = beforeMatch.lastIndexOf('<span data-type="variable"')
    const lastCloseSpan = beforeMatch.lastIndexOf('</span>')
    
    if (lastOpenSpan > lastCloseSpan) {
      // On est déjà dans un span variable, ne pas convertir
      return match
    }
    
    // Convertir en span pour TipTap
    return `<span data-type="variable" data-id="${variable}" data-label="${variable}" data-value="{${variable}}">${variable}</span>`
  })
}

/**
 * Convertit récursivement tous les template literals dans un objet DocumentTemplate
 * 
 * @param template - Le template à convertir
 * @returns Le template avec les balises converties
 */
export function convertTemplateContent(template: any): any {
  if (!template) {
    return template
  }

  const converted = { ...template }

  // Convertir le contenu HTML du body
  if (converted.content) {
    if (typeof converted.content === 'string') {
      converted.content = convertTemplateLiteralsToTags(converted.content)
    } else if (converted.content.html) {
      converted.content = {
        ...converted.content,
        html: convertTemplateLiteralsToTags(converted.content.html),
      }
    } else if (converted.content.elements && Array.isArray(converted.content.elements)) {
      converted.content = {
        ...converted.content,
        elements: converted.content.elements.map((element: any) => {
          if (element.content && typeof element.content === 'string') {
            return {
              ...element,
              content: convertTemplateLiteralsToTags(element.content),
            }
          }
          return element
        }),
      }
    }
  }

  // Convertir le header
  if (converted.header) {
    if (typeof converted.header === 'string') {
      converted.header = convertTemplateLiteralsToTags(converted.header)
    } else if (converted.header.content) {
      converted.header = {
        ...converted.header,
        content: convertTemplateLiteralsToTags(converted.header.content),
      }
    }
  }

  // Convertir le footer
  if (converted.footer) {
    if (typeof converted.footer === 'string') {
      converted.footer = convertTemplateLiteralsToTags(converted.footer)
    } else if (converted.footer.content) {
      converted.footer = {
        ...converted.footer,
        content: convertTemplateLiteralsToTags(converted.footer.content),
      }
    }
  }

  return converted
}

