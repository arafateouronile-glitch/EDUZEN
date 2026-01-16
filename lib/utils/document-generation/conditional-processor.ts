/**
 * Traite les conditions conditionnelles dans le HTML
 * Supporte les syntaxes : {IF variable}...{ENDIF}, {IF variable}...{ELSE}...{ENDIF}
 */

export interface DocumentVariables {
  [key: string]: any
}

/**
 * Traite les conditions IF/ELSE/ENDIF dans le HTML
 * Supporte aussi la syntaxe JSX : {variable && ...}
 */
export function processConditionals(html: string, variables: DocumentVariables): string {
  if (!html) return html

  let result = html

  // 1. Traiter la syntaxe JSX : {variable && <tag>...</tag>}
  // Utiliser un parser qui gère correctement les balises HTML imbriquées
  const processJSXConditionals = (text: string): string => {
    let processed = text
    let changed = true
    let iterations = 0
    const maxIterations = 10
    
    while (changed && iterations < maxIterations) {
      changed = false
      iterations++
      
      // Trouver toutes les occurrences de {variable && ...
      const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\s+&&\s+/g
      let match
      const replacements: Array<{ start: number; end: number; replacement: string }> = []
      
      // Trouver toutes les correspondances et les traiter de droite à gauche
      const matches: Array<{ varName: string; start: number; varEnd: number }> = []
      while ((match = pattern.exec(processed)) !== null) {
        matches.push({
          varName: match[1].trim(),
          start: match.index,
          varEnd: match.index + match[0].length,
        })
      }
      
      // Traiter de droite à gauche pour préserver les indices
      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i]
        let depth = 1 // On est déjà dans une accolade ouvrante
        let pos = m.varEnd
        let inString = false
        let stringChar = ''
        let foundEnd = false
        let endPos = -1
        
        // Chercher la fin de la conditionnelle en gérant les accolades imbriquées et les strings
        while (pos < processed.length && !foundEnd) {
          const char = processed[pos]
          
          if (!inString) {
            if (char === '"' || char === "'") {
              inString = true
              stringChar = char
            } else if (char === '{') {
              depth++
            } else if (char === '}') {
              depth--
              if (depth === 0) {
                foundEnd = true
                endPos = pos
              }
            }
          } else {
            if (char === stringChar && processed[pos - 1] !== '\\') {
              inString = false
            }
          }
          
          pos++
        }
        
        if (foundEnd && endPos > m.start) {
          const varName = m.varName
          const content = processed.substring(m.varEnd, endPos)
          const value = variables[varName]
          const conditionValue = Boolean(value) && value !== '' && value !== 0 && value !== '0' && value !== null && value !== undefined
          
          if (conditionValue) {
            replacements.push({
              start: m.start,
              end: endPos + 1,
              replacement: content,
            })
            changed = true
          } else {
            replacements.push({
              start: m.start,
              end: endPos + 1,
              replacement: '',
            })
            changed = true
          }
        }
      }
      
      // Appliquer les remplacements de droite à gauche
      for (const rep of replacements) {
        processed = processed.substring(0, rep.start) + rep.replacement + processed.substring(rep.end)
      }
    }
    
    return processed
  }

  result = processJSXConditionals(result)

  // 2. Traiter aussi les conditionnels avec plusieurs variables : {var1 && var2 && ...}
  const processMultiConditionals = (text: string): string => {
    let processed = text
    let changed = true
    let iterations = 0
    const maxIterations = 10
    
    while (changed && iterations < maxIterations) {
      changed = false
      iterations++
      
      const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\s+&&\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+&&\s+([^}]+)\}/g
      
      processed = processed.replace(pattern, (match, var1, var2, content) => {
        const val1 = variables[var1.trim()]
        const val2 = variables[var2.trim()]
        const conditionValue = Boolean(val1) && val1 !== '' && Boolean(val2) && val2 !== ''
        
        if (conditionValue) {
          changed = true
          return content
        }
        return ''
      })
    }
    
    return processed
  }

  result = processMultiConditionals(result)

  // 3. Traiter la syntaxe IF/ELSE/ENDIF classique
  const conditionalPattern = /\{IF\s+([^}]+)\}([\s\S]*?)(?:\{ELSE\}([\s\S]*?))?\{ENDIF\}/gi

  result = result.replace(conditionalPattern, (match, condition, ifContent, elseContent = '') => {
    // Évaluer la condition
    const conditionValue = evaluateCondition(condition.trim(), variables)
    
    // Retourner le contenu approprié
    return conditionValue ? ifContent : elseContent
  })

  return result
}

/**
 * Alias pour processConditionals (utilisé par html-generator)
 */
export const evaluateConditionalContent = processConditionals

// Export par défaut pour compatibilité
export default processConditionals

/**
 * Évalue une condition
 */
function evaluateCondition(condition: string, variables: DocumentVariables): boolean {
  // Supprimer les espaces
  condition = condition.trim()

  // Vérifier si c'est une variable simple
  if (variables.hasOwnProperty(condition)) {
    const value = variables[condition]
    // Considérer comme vrai si la valeur existe et n'est pas vide/false/0
    return Boolean(value) && value !== '' && value !== 0 && value !== '0'
  }

  // Vérifier les opérateurs de comparaison
  const operators = ['==', '!=', '>', '<', '>=', '<=']
  
  for (const op of operators) {
    if (condition.includes(op)) {
      const [left, right] = condition.split(op).map(s => s.trim())
      const leftValue = getVariableValue(left, variables)
      const rightValue = getVariableValue(right, variables)
      
      switch (op) {
        case '==':
          return leftValue == rightValue
        case '!=':
          return leftValue != rightValue
        case '>':
          return Number(leftValue) > Number(rightValue)
        case '<':
          return Number(leftValue) < Number(rightValue)
        case '>=':
          return Number(leftValue) >= Number(rightValue)
        case '<=':
          return Number(leftValue) <= Number(rightValue)
        default:
          return false
      }
    }
  }

  // Par défaut, retourner false
  return false
}

/**
 * Récupère la valeur d'une variable ou retourne la valeur littérale
 */
function getVariableValue(expression: string, variables: DocumentVariables): any {
  expression = expression.trim()
  
  // Si c'est une chaîne entre guillemets, retourner la valeur sans guillemets
  if ((expression.startsWith('"') && expression.endsWith('"')) ||
      (expression.startsWith("'") && expression.endsWith("'"))) {
    return expression.slice(1, -1)
  }
  
  // Si c'est un nombre, retourner le nombre
  if (!isNaN(Number(expression))) {
    return Number(expression)
  }
  
  // Sinon, chercher dans les variables
  return variables[expression] ?? expression
}
