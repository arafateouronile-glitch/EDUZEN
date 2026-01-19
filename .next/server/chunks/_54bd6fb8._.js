module.exports=[480180,e=>{"use strict";async function t(e,r={},i){return e}e.s(["processAttachments",()=>t])},953530,e=>{"use strict";function t(e){let t={};return!function e(r,i=""){for(let l in r)if(r.hasOwnProperty(l)){let a=i?`${i}.${l}`:l,n=r[l];null===n||"object"!=typeof n||Array.isArray(n)||n instanceof Date?t[a]=n:e(n,a)}}(e),t}function r(e,t){let r=e;for(let e in t)if(t.hasOwnProperty(e)){let i=t[e];if(null!=i){let t=RegExp(`\\{${e.replace(/\./g,"\\.")}\\}`,"g");r=r.replace(t,String(i))}}return r}e.s(["flattenVariables",()=>t,"processNestedVariables",()=>r])},738654,e=>{"use strict";function t(e,t){return e}e.s(["processLoops",()=>t])},788734,e=>{"use strict";function t(e,t){return e}e.s(["processDynamicHyperlinks",()=>t])},498741,e=>{"use strict";function t(e,t){return e}e.s(["processCalculatedVariables",()=>t])},573172,e=>{"use strict";function t(e,t){return e}e.s(["processElementVisibility",()=>t])},861353,e=>{"use strict";function t(e,t){let r=e;return(r=r.replace(/\{\{#table\s+(\w+)\}\}([\s\S]*?)\{\{\/table\}\}/g,(e,r,i)=>{let l=t[r];if(!l||!Array.isArray(l))return"";let a=[];if("string"==typeof l)try{a=JSON.parse(l)}catch{return""}else a=l;return a.map((e,t)=>{let r=i;return Object.keys(e).forEach(t=>{let i=null!==e[t]&&void 0!==e[t]?String(e[t]):"",l=RegExp(`\\{${t}\\}`,"g");r=r.replace(l,i);let a=RegExp(`\\{item\\.${t}\\}`,"g");r=r.replace(a,i)}),r=(r=r.replace(/\{index\}/g,String(t+1))).replace(/\{row_number\}/g,String(t+1))}).join("")})).replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,(e,r,i)=>{let l=t[r];if(!l||!Array.isArray(l))return"";let a=[];if("string"==typeof l)try{a=JSON.parse(l)}catch{return""}else a=l;return a.map((e,t)=>{let r=i;return"object"==typeof e&&null!==e?Object.keys(e).forEach(t=>{let i=null!==e[t]&&void 0!==e[t]?String(e[t]):"",l=RegExp(`\\{${t}\\}`,"g");r=r.replace(l,i)}):r=(r=r.replace(/\{this\}/g,String(e))).replace(/\{\.\}/g,String(e)),r=(r=r.replace(/\{index\}/g,String(t))).replace(/\{@index\}/g,String(t))}).join("")})}e.s(["processDynamicTables",()=>t])},494438,e=>{"use strict";function t(e,t){if(!e)return e;let i=e;return(i=(e=>{let r=e,i=!0,l=0;for(;i&&l<10;){i=!1,l++;let e=/\{([a-zA-Z_][a-zA-Z0-9_]*)\s+&&\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+&&\s+([^}]+)\}/g;r=r.replace(e,(e,r,l,a)=>{let n=t[r.trim()],s=t[l.trim()];return n&&""!==n&&s&&""!==s?(i=!0,a):""})}return r})(i=(e=>{let r=e,i=!0,l=0;for(;i&&l<10;){let e;i=!1,l++;let a=/\{([a-zA-Z_][a-zA-Z0-9_]*)\s+&&\s+/g,n=[],s=[];for(;null!==(e=a.exec(r));)s.push({varName:e[1].trim(),start:e.index,varEnd:e.index+e[0].length});for(let e=s.length-1;e>=0;e--){let l=s[e],a=1,o=l.varEnd,d=!1,u="",c=!1,p=-1;for(;o<r.length&&!c;){let e=r[o];d?e===u&&"\\"!==r[o-1]&&(d=!1):'"'===e||"'"===e?(d=!0,u=e):"{"===e?a++:"}"===e&&0==--a&&(c=!0,p=o),o++}if(c&&p>l.start){let e=l.varName,a=r.substring(l.varEnd,p),s=t[e];s&&""!==s&&0!==s&&"0"!==s&&null!=s?n.push({start:l.start,end:p+1,replacement:a}):n.push({start:l.start,end:p+1,replacement:""}),i=!0}}for(let e of n)r=r.substring(0,e.start)+e.replacement+r.substring(e.end)}return r})(i))).replace(/\{IF\s+([^}]+)\}([\s\S]*?)(?:\{ELSE\}([\s\S]*?))?\{ENDIF\}/gi,(e,i,l,a="")=>!function(e,t){if(e=e.trim(),t.hasOwnProperty(e)){let r=t[e];return!!r&&""!==r&&0!==r&&"0"!==r}for(let i of["==","!=",">","<",">=","<="])if(e.includes(i)){let[l,a]=e.split(i).map(e=>e.trim()),n=r(l,t),s=r(a,t);switch(i){case"==":return n==s;case"!=":return n!=s;case">":return Number(n)>Number(s);case"<":return Number(n)<Number(s);case">=":return Number(n)>=Number(s);case"<=":return Number(n)<=Number(s);default:return!1}}return!1}(i.trim(),t)?a:l)}function r(e,t){return(e=e.trim()).startsWith('"')&&e.endsWith('"')||e.startsWith("'")&&e.endsWith("'")?e.slice(1,-1):isNaN(Number(e))?t[e]??e:Number(e)}e.s(["default",0,t,"evaluateConditionalContent",0,t,"processConditionals",()=>t])},159091,e=>{"use strict";function t(e,r={}){let i=e;return(i=(i=(i=i.replace(/value="\{([^}]+)\}"/g,(e,t)=>{let i=r[t.trim()]||"";return`value="${i}"`})).replace(/placeholder="\{([^}]+)\}"/g,(e,t)=>{let i=r[t.trim()]||"";return`placeholder="${i}"`})).replace(/>\{([^}]+)\}<\/label>/g,(e,t)=>{let i=r[t.trim()]||t;return`>${i}</label>`})).includes("data-calculation-formula")&&(i+=`
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
    `),i.includes("form-field-interactive")&&(i+=`
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
    `),i}function r(e){return{}}e.s(["extractFormFieldValues",()=>r,"processFormFields",()=>t])},745015,(e,t,r)=>{"use strict";Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"registerServerReference",{enumerable:!0,get:function(){return i.registerServerReference}});let i=e.r(997953)},195975,(e,t,r)=>{"use strict";function i(e){for(let t=0;t<e.length;t++){let r=e[t];if("function"!=typeof r)throw Object.defineProperty(Error(`A "use server" file can only export async functions, found ${typeof r}.
Read more: https://nextjs.org/docs/messages/invalid-use-server-value`),"__NEXT_ERROR_CODE",{value:"E352",enumerable:!1,configurable:!0})}}Object.defineProperty(r,"__esModule",{value:!0}),Object.defineProperty(r,"ensureServerEntryExports",{enumerable:!0,get:function(){return i}})},338021,e=>{"use strict";var t=e.i(745015),r=e.i(981838);async function i(){try{let{createClient:t}=await e.A(74166),r=await t();return{getSignaturesByDocument:async e=>{let{data:t,error:i}=await r.from("document_signatures").select(`
              *,
              signer:users!document_signatures_signer_id_fkey(id, full_name, email, role)
            `).eq("document_id",e).eq("status","signed").order("signed_at",{ascending:!0});if(i)throw i;return t||[]}}}catch(e){return console.warn("Impossible d'importer createClient côté serveur:",e),{getSignaturesByDocument:async()=>[]}}}async function l(e,t={},a){try{let l=Array.from(e.matchAll(/<signature-field\s+([^>]*?)\/>/gi));if(0===l.length)return e;let n=[];if(a)try{let e=await i();n=await e.getSignaturesByDocument(a)}catch(e){r.logger.warn("Erreur lors du chargement des signatures",{documentId:a,error:e instanceof Error?e.message:String(e)})}let s=e;for(let e of l){let r=e[0],i=e[1],l=function(e){let t,r={},i=/(\w+(?:-\w+)*)="([^"]*?)"|(\w+(?:-\w+)*)='([^']*?)'|(\w+(?:-\w+)*)=(\S+)/g;for(;null!==(t=i.exec(e));){let e=t[1]||t[3]||t[5],i=t[2]||t[4]||t[6];e&&i&&(r[e]=i)}return{id:r.id||`signature-${Date.now()}`,type:r.type||"signature",label:r.label,required:"true"===r.required,signerRole:r["signer-role"],signerEmail:r["signer-email"],width:r.width?parseInt(r.width):200,height:r.height?parseInt(r.height):80,page:r.page?parseInt(r.page):1}}(i),a=n.find(e=>!!l.signerRole&&e.signer_role===l.signerRole||!!l.signerEmail&&e.signer_email===l.signerEmail),o=a?function(e,t){let r=t.width||200,i=t.height||80;if("date"===t.type){let r=e.signed_at?new Date(e.signed_at).toLocaleDateString("fr-FR",{year:"numeric",month:"long",day:"numeric"}):"";return`
      <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
        ${t.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${t.label}</p>`:""}
        <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px 12px; background-color: #f0fdf4; display: inline-block;">
          <p style="margin: 0; font-size: 11pt; color: #047857; font-weight: 500;">${r}</p>
        </div>
      </div>
    `}return"text"===t.type&&e.comment?`
      <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
        ${t.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${t.label}</p>`:""}
        <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px 12px; background-color: #f0fdf4; display: inline-block; min-width: ${r}px;">
          <p style="margin: 0; font-size: 11pt; color: #047857;">${e.comment}</p>
        </div>
      </div>
    `:`
    <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
      ${t.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${t.label}</p>`:""}
      <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px; background-color: #f0fdf4; display: inline-block;">
        <img
          src="${e.signature_data}"
          alt="Signature de ${e.signer_name||"utilisateur"}"
          style="max-width: ${r}px; max-height: ${i}px; display: block;"
        />
        <p style="margin: 8px 0 0 0; font-size: 9pt; color: #047857; text-align: center;">
          Sign\xe9 par ${e.signer_name||"utilisateur"} le ${new Date(e.signed_at).toLocaleDateString("fr-FR")}
        </p>
      </div>
    </div>
  `}(a,l):function(e,t){let r=e.width||200,i=e.height||80,l=e.id.replace(/-/g,"_"),a=t[l]||t[`signature_${l}`];return a&&"string"==typeof a?a.startsWith("data:image")||a.startsWith("http")?`
        <div class="signature-field filled-from-variable" style="display: inline-block; margin: 10px 0;">
          ${e.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${e.label}</p>`:""}
          <div style="border: 1px solid #3b82f6; border-radius: 4px; padding: 8px; background-color: #eff6ff; display: inline-block;">
            <img
              src="${a}"
              alt="${e.label||"Signature"}"
              style="max-width: ${r}px; max-height: ${i}px; display: block;"
            />
          </div>
        </div>
      `:`
      <div class="signature-field filled-from-variable" style="display: inline-block; margin: 10px 0;">
        ${e.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${e.label}</p>`:""}
        <div style="border: 1px solid #3b82f6; border-radius: 4px; padding: 8px 12px; background-color: #eff6ff; display: inline-block; min-width: ${r}px;">
          <p style="margin: 0; font-size: 11pt; color: #1e40af;">${a}</p>
        </div>
      </div>
    `:"date"===e.type?`
      <div class="signature-field empty" style="display: inline-block; margin: 10px 0;">
        ${e.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${e.label}${e.required?' <span style="color: #ef4444;">*</span>':""}</p>`:""}
        <div style="border: 2px dashed #d1d5db; border-radius: 4px; padding: 8px 12px; background-color: #f9fafb; display: inline-block; min-width: 150px;">
          <p style="margin: 0; font-size: 10pt; color: #9ca3af; text-align: center;">Date \xe0 remplir</p>
        </div>
      </div>
    `:"text"===e.type?`
      <div class="signature-field empty" style="display: inline-block; margin: 10px 0; width: 100%; max-width: 400px;">
        ${e.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${e.label}${e.required?' <span style="color: #ef4444;">*</span>':""}</p>`:""}
        <div style="border: 2px dashed #d1d5db; border-radius: 4px; padding: 12px; background-color: #f9fafb; min-height: 60px;">
          <p style="margin: 0; font-size: 10pt; color: #9ca3af;">Texte \xe0 remplir</p>
        </div>
      </div>
    `:`
    <div class="signature-field empty" style="display: inline-block; margin: 10px 0;">
      ${e.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${e.label}${e.required?' <span style="color: #ef4444;">*</span>':""}</p>`:""}
      <div style="border: 2px dashed #d1d5db; border-radius: 4px; padding: 12px; background-color: #f9fafb; width: ${r}px; height: ${i}px; display: flex; align-items: center; justify-content: center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" style="opacity: 0.5;">
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <path d="M3 20.05V5.5a2.5 2.5 0 0 1 5 0V20.05" />
          <path d="M7 13.5h9.5" />
          <path d="M20 20.5V10.5a2.5 2.5 0 0 0-5 0V20.5" />
        </svg>
      </div>
      ${e.signerRole||e.signerEmail?`<p style="margin: 5px 0 0 0; font-size: 9pt; color: #6b7280;">${e.signerRole||e.signerEmail}</p>`:""}
    </div>
  `}(l,t);s=s.replace(r,o)}return s}catch(t){return r.logger.error("Erreur lors du traitement des signatures",t instanceof Error?t:Error(String(t)),{documentId:a}),e}}(0,e.i(195975).ensureServerEntryExports)([l]),(0,t.registerServerReference)(l,"70bafc011444c60487d1ee4847afd169e191567030",null),e.s(["processSignatures",()=>l])}];

//# sourceMappingURL=_54bd6fb8._.js.map