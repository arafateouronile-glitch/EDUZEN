/**
 * Processeur pour les champs de formulaire interactifs
 * Rend les champs de formulaire fonctionnels dans les documents générés
 */

/**
 * Traite les champs de formulaire dans le HTML et les rend interactifs
 */
export function processFormFields(html: string, variables: Record<string, any> = {}): string {
  // Remplacer les variables dans les attributs data-* des champs
  let processedHTML = html

  // Remplacer les variables dans les valeurs par défaut
  processedHTML = processedHTML.replace(
    /value="\{([^}]+)\}"/g,
    (match, varName) => {
      const value = variables[varName.trim()] || ''
      return `value="${value}"`
    }
  )

  // Remplacer les variables dans les placeholders
  processedHTML = processedHTML.replace(
    /placeholder="\{([^}]+)\}"/g,
    (match, varName) => {
      const value = variables[varName.trim()] || ''
      return `placeholder="${value}"`
    }
  )

  // Remplacer les variables dans les labels
  processedHTML = processedHTML.replace(
    />\{([^}]+)\}<\/label>/g,
    (match, varName) => {
      const value = variables[varName.trim()] || varName
      return `>${value}</label>`
    }
  )

  // Ajouter le script pour les calculs automatiques
  if (processedHTML.includes('data-calculation-formula')) {
    processedHTML += `
      <script>
        (function() {
          // Fonction pour évaluer les formules de calcul
          function evaluateFormula(formula, fieldValues) {
            try {
              // Remplacer les noms de champs par leurs valeurs
              let expression = formula
              Object.keys(fieldValues).forEach(fieldName => {
                const regex = new RegExp('\\\\b' + fieldName + '\\\\b', 'g')
                expression = expression.replace(regex, fieldValues[fieldName] || 0)
              })
              
              // Évaluer l'expression (attention à la sécurité en production)
              return Function('"use strict"; return (' + expression + ')')()
            } catch (error) {
              logger.error('Erreur lors de l\'évaluation de la formule:', error)
              return 0
            }
          }

          // Fonction pour mettre à jour les calculs
          function updateCalculations() {
            const calculatedFields = document.querySelectorAll('[data-calculation-formula]')
            const fieldValues = {}
            
            // Collecter toutes les valeurs de champs
            document.querySelectorAll('.form-field-interactive').forEach(field => {
              const fieldName = field.getAttribute('data-field-name')
              if (fieldName) {
                if (field.type === 'checkbox' || field.type === 'radio') {
                  fieldValues[fieldName] = field.checked ? parseFloat(field.value) || 1 : 0
                } else {
                  fieldValues[fieldName] = parseFloat(field.value) || 0
                }
              }
            })

            // Mettre à jour les champs calculés
            calculatedFields.forEach(field => {
              const formula = field.getAttribute('data-calculation-formula')
              const targetField = field.getAttribute('data-calculation-target')
              
              if (formula) {
                const result = evaluateFormula(formula, fieldValues)
                
                if (targetField) {
                  const target = document.querySelector('[name="' + targetField + '"]')
                  if (target) {
                    target.value = result
                  }
                } else {
                  field.value = result
                }
              }
            })
          }

          // Ajouter les écouteurs d'événements
          document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.form-field-interactive').forEach(field => {
              field.addEventListener('input', updateCalculations)
              field.addEventListener('change', updateCalculations)
            })
            
            // Mettre à jour les calculs au chargement
            updateCalculations()
          })
        })()
      </script>
    `
  }

  // Ajouter la validation des champs
  if (processedHTML.includes('form-field-interactive')) {
    processedHTML += `
      <script>
        (function() {
          function validateField(field) {
            const validationMessage = field.parentElement.querySelector('.validation-message')
            let isValid = true
            let message = ''

            // Validation requise
            if (field.hasAttribute('required') && !field.value.trim()) {
              isValid = false
              message = 'Ce champ est obligatoire'
            }

            // Validation minlength
            if (field.hasAttribute('minlength')) {
              const min = parseInt(field.getAttribute('minlength'))
              if (field.value.length < min) {
                isValid = false
                message = 'Minimum ' + min + ' caractères requis'
              }
            }

            // Validation maxlength
            if (field.hasAttribute('maxlength')) {
              const max = parseInt(field.getAttribute('maxlength'))
              if (field.value.length > max) {
                isValid = false
                message = 'Maximum ' + max + ' caractères autorisés'
              }
            }

            // Validation pattern
            if (field.hasAttribute('pattern')) {
              const pattern = new RegExp(field.getAttribute('pattern'))
              if (!pattern.test(field.value)) {
                isValid = false
                message = field.getAttribute('data-validation-message') || 'Format invalide'
              }
            }

            // Validation min/max pour les nombres
            if (field.type === 'number') {
              if (field.hasAttribute('min')) {
                const min = parseFloat(field.getAttribute('min'))
                if (parseFloat(field.value) < min) {
                  isValid = false
                  message = 'La valeur minimale est ' + min
                }
              }
              if (field.hasAttribute('max')) {
                const max = parseFloat(field.getAttribute('max'))
                if (parseFloat(field.value) > max) {
                  isValid = false
                  message = 'La valeur maximale est ' + max
                }
              }
            }

            // Afficher/masquer le message d'erreur
            if (validationMessage) {
              if (isValid) {
                validationMessage.style.display = 'none'
                field.style.borderColor = '#d1d5db'
              } else {
                validationMessage.style.display = 'block'
                validationMessage.textContent = message
                field.style.borderColor = '#ef4444'
              }
            }

            return isValid
          }

          document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.form-field-interactive').forEach(field => {
              field.addEventListener('blur', function() {
                validateField(this)
              })
              
              field.addEventListener('input', function() {
                const validationMessage = this.parentElement.querySelector('.validation-message')
                if (validationMessage) {
                  validationMessage.style.display = 'none'
                  this.style.borderColor = '#d1d5db'
                }
              })
            })
          })
        })()
      </script>
    `
  }

  return processedHTML
}

/**
 * Extrait les valeurs des champs de formulaire depuis le HTML
 * Note: Cette fonction doit être utilisée uniquement côté client (navigateur)
 */
export function extractFormFieldValues(html: string): Record<string, any> {
  if (typeof window === 'undefined') {
    // Côté serveur, retourner un objet vide
    return {}
  }

  const values: Record<string, any> = {}
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  doc.querySelectorAll('.form-field-interactive').forEach((field: any) => {
    const fieldName = field.getAttribute('name') || field.getAttribute('data-field-name')
    if (fieldName) {
      if (field.type === 'checkbox') {
        values[fieldName] = field.checked
      } else if (field.type === 'radio') {
        if (field.checked) {
          values[fieldName] = field.value
        }
      } else {
        values[fieldName] = field.value
      }
    }
  })
  
  return values
}
