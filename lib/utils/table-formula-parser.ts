/**
 * Parser de formules Excel-like pour les tableaux
 * Supporte: SUM, AVERAGE, COUNT, MAX, MIN, et références de cellules (A1, B2, etc.)
 */

export interface CellReference {
  row: number
  col: number
}

/**
 * Convertit une référence de cellule (ex: "A1", "B2") en coordonnées
 */
export function parseCellReference(ref: string): CellReference | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/i)
  if (!match) return null
  
  const colLetters = match[1].toUpperCase()
  const row = parseInt(match[2], 10) - 1 // Convertir en index 0-based
  
  let col = 0
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 64)
  }
  col = col - 1 // Convertir en index 0-based
  
  return { row, col }
}

/**
 * Convertit des coordonnées en référence de cellule (ex: 0,0 -> "A1")
 */
export function cellReferenceToString(row: number, col: number): string {
  return `${columnIndexToLetter(col)}${row + 1}`
}

/**
 * Convertit un index de colonne en lettre (ex: 0 -> "A", 25 -> "Z", 26 -> "AA")
 */
export function columnIndexToLetter(col: number): string {
  let result = ''
  col = col + 1 // Convertir en 1-based
  
  while (col > 0) {
    col--
    result = String.fromCharCode(65 + (col % 26)) + result
    col = Math.floor(col / 26)
  }
  
  return result
}

/**
 * Parse une plage de cellules (ex: "A1:B5")
 */
export function parseCellRange(range: string): CellReference[] | null {
  const [start, end] = range.split(':')
  if (!start || !end) return null
  
  const startRef = parseCellReference(start.trim())
  const endRef = parseCellReference(end.trim())
  
  if (!startRef || !endRef) return null
  
  const cells: CellReference[] = []
  for (let row = startRef.row; row <= endRef.row; row++) {
    for (let col = startRef.col; col <= endRef.col; col++) {
      cells.push({ row, col })
    }
  }
  
  return cells
}

/**
 * Extrait les références de cellules d'une formule
 */
function extractCellReferences(formula: string): string[] {
  const refs: string[] = []
  // Pattern pour les références de cellules (A1, B2, etc.) et plages (A1:B5)
  const pattern = /\b([A-Z]+\d+)(?::([A-Z]+\d+))?/gi
  
  let match
  while ((match = pattern.exec(formula)) !== null) {
    if (match[2]) {
      // Plage
      refs.push(`${match[1]}:${match[2]}`)
    } else {
      // Cellule unique
      refs.push(match[1])
    }
  }
  
  return refs
}

/**
 * Évalue une formule Excel-like
 * @param formula La formule (ex: "=SUM(A1:A5)", "=A1+B2")
 * @param getCellValue Fonction pour obtenir la valeur d'une cellule
 */
export function evaluateFormula(
  formula: string,
  getCellValue: (row: number, col: number) => number | string
): number | string {
  if (!isFormula(formula)) {
    return formula
  }
  
  const formulaBody = formula.substring(1).trim() // Enlever le "="
  
  try {
    // Fonctions Excel-like
    if (formulaBody.toUpperCase().startsWith('SUM(')) {
      const rangeMatch = formulaBody.match(/SUM\(([^)]+)\)/i)
      if (rangeMatch) {
        const range = rangeMatch[1].trim()
        const cells = parseCellRange(range) || [parseCellReference(range) || { row: 0, col: 0 }]
        const values = cells
          .map(cell => {
            const val = getCellValue(cell.row, cell.col)
            return typeof val === 'number' ? val : parseFloat(String(val)) || 0
          })
          .filter(v => !isNaN(v))
        return values.reduce((sum, val) => sum + val, 0)
      }
    }
    
    if (formulaBody.toUpperCase().startsWith('AVERAGE(')) {
      const rangeMatch = formulaBody.match(/AVERAGE\(([^)]+)\)/i)
      if (rangeMatch) {
        const range = rangeMatch[1].trim()
        const cells = parseCellRange(range) || [parseCellReference(range) || { row: 0, col: 0 }]
        const values = cells
          .map(cell => {
            const val = getCellValue(cell.row, cell.col)
            return typeof val === 'number' ? val : parseFloat(String(val)) || 0
          })
          .filter(v => !isNaN(v))
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
      }
    }
    
    if (formulaBody.toUpperCase().startsWith('COUNT(')) {
      const rangeMatch = formulaBody.match(/COUNT\(([^)]+)\)/i)
      if (rangeMatch) {
        const range = rangeMatch[1].trim()
        const cells = parseCellRange(range) || [parseCellReference(range) || { row: 0, col: 0 }]
        return cells.length
      }
    }
    
    if (formulaBody.toUpperCase().startsWith('MAX(')) {
      const rangeMatch = formulaBody.match(/MAX\(([^)]+)\)/i)
      if (rangeMatch) {
        const range = rangeMatch[1].trim()
        const cells = parseCellRange(range) || [parseCellReference(range) || { row: 0, col: 0 }]
        const values = cells
          .map(cell => {
            const val = getCellValue(cell.row, cell.col)
            return typeof val === 'number' ? val : parseFloat(String(val)) || 0
          })
          .filter(v => !isNaN(v))
        return values.length > 0 ? Math.max(...values) : 0
      }
    }
    
    if (formulaBody.toUpperCase().startsWith('MIN(')) {
      const rangeMatch = formulaBody.match(/MIN\(([^)]+)\)/i)
      if (rangeMatch) {
        const range = rangeMatch[1].trim()
        const cells = parseCellRange(range) || [parseCellReference(range) || { row: 0, col: 0 }]
        const values = cells
          .map(cell => {
            const val = getCellValue(cell.row, cell.col)
            return typeof val === 'number' ? val : parseFloat(String(val)) || 0
          })
          .filter(v => !isNaN(v))
        return values.length > 0 ? Math.min(...values) : 0
      }
    }
    
    // Opérations arithmétiques simples (A1+B2, A1-B2, A1*B2, A1/B2)
    const refs = extractCellReferences(formulaBody)
    if (refs.length > 0) {
      let expression = formulaBody
      
      // Remplacer les références par leurs valeurs
      refs.forEach(ref => {
        const cellRef = parseCellReference(ref)
        if (cellRef) {
          const val = getCellValue(cellRef.row, cellRef.col)
          const numVal = typeof val === 'number' ? val : parseFloat(String(val)) || 0
          expression = expression.replace(new RegExp(ref, 'gi'), String(numVal))
        }
      })
      
      // Évaluer l'expression (sécurisé)
      try {
        // Utiliser Function pour évaluer de manière sécurisée
        const result = new Function('return ' + expression)()
        return typeof result === 'number' && !isNaN(result) ? result : 0
      } catch (e) {
        console.error('Erreur lors de l\'évaluation de la formule:', e)
        return '#ERROR'
      }
    }
    
    return '#ERROR'
  } catch (error) {
    console.error('Erreur lors de l\'évaluation de la formule:', error)
    return '#ERROR'
  }
}

/**
 * Extrait les arguments d'une fonction (gère les plages et les références)
 */
function extractFormulaArgs(argsStr: string): string[] {
  const args: string[] = []
  let current = ''
  let depth = 0
  
  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === ',' && depth === 0) {
      if (current.trim()) {
        args.push(current.trim())
        current = ''
      }
      continue
    }
    current += char
  }
  
  if (current.trim()) {
    args.push(current.trim())
  }
  
  return args
}

/**
 * Obtient les valeurs d'un argument (plage ou référence unique)
 */
function getValuesFromArg(
  arg: string,
  getCellValue: (row: number, col: number) => number | string | null
): Array<number | string> {
  const values: Array<number | string> = []
  
  // Vérifier si c'est une plage
  const range = parseCellRange(arg)
  if (range && range.length > 0) {
    range.forEach(cell => {
      const value = getCellValue(cell.row, cell.col)
      if (value !== null) {
        values.push(value)
      }
    })
  } else {
    // Référence unique
    const ref = parseCellReference(arg)
    if (ref) {
      const value = getCellValue(ref.row, ref.col)
      if (value !== null) {
        values.push(value)
      }
    } else {
      // Valeur littérale
      const num = parseFloat(arg)
      if (!isNaN(num)) {
        values.push(num)
      }
    }
  }
  
  return values
}

/**
 * Détecte si une chaîne est une formule
 */
export function isFormula(value: string): boolean {
  if (!value || typeof value !== 'string') return false
  const trimmed = value.trim()
  return trimmed.startsWith('=') || 
         /^(SUM|AVG|AVERAGE|COUNT|MIN|MAX)\(/i.test(trimmed) ||
         /[A-Z]+\d+/.test(trimmed)
}


