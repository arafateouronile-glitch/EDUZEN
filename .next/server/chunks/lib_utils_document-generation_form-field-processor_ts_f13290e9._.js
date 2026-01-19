module.exports=[159091,e=>{"use strict";function t(e,a={}){let l=e;return(l=(l=(l=l.replace(/value="\{([^}]+)\}"/g,(e,t)=>{let l=a[t.trim()]||"";return`value="${l}"`})).replace(/placeholder="\{([^}]+)\}"/g,(e,t)=>{let l=a[t.trim()]||"";return`placeholder="${l}"`})).replace(/>\{([^}]+)\}<\/label>/g,(e,t)=>{let l=a[t.trim()]||t;return`>${l}</label>`})).includes("data-calculation-formula")&&(l+=`
      <script>
        (function() {
          // Fonction pour \xe9valuer les formules de calcul
          function evaluateFormula(formula, fieldValues) {
            try {
              // Remplacer les noms de champs par leurs valeurs
              let expression = formula
              Object.keys(fieldValues).forEach(fieldName => {
                const regex = new RegExp('\\\\b' + fieldName + '\\\\b', 'g')
                expression = expression.replace(regex, fieldValues[fieldName] || 0)
              })
              
              // \xc9valuer l'expression (attention \xe0 la s\xe9curit\xe9 en production)
              return Function('"use strict"; return (' + expression + ')')()
            } catch (error) {
              console.error('Erreur lors de l'\xe9valuation de la formule:', error)
              return 0
            }
          }

          // Fonction pour mettre \xe0 jour les calculs
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

            // Mettre \xe0 jour les champs calcul\xe9s
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

          // Ajouter les \xe9couteurs d'\xe9v\xe9nements
          document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('.form-field-interactive').forEach(field => {
              field.addEventListener('input', updateCalculations)
              field.addEventListener('change', updateCalculations)
            })
            
            // Mettre \xe0 jour les calculs au chargement
            updateCalculations()
          })
        })()
      </script>
    `),l.includes("form-field-interactive")&&(l+=`
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
                message = 'Minimum ' + min + ' caract\xe8res requis'
              }
            }

            // Validation maxlength
            if (field.hasAttribute('maxlength')) {
              const max = parseInt(field.getAttribute('maxlength'))
              if (field.value.length > max) {
                isValid = false
                message = 'Maximum ' + max + ' caract\xe8res autoris\xe9s'
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
    `),l}function a(e){return{}}e.s(["extractFormFieldValues",()=>a,"processFormFields",()=>t])}];

//# sourceMappingURL=lib_utils_document-generation_form-field-processor_ts_f13290e9._.js.map