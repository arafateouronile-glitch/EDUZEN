(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,677159,e=>{"use strict";function t(e,t){if(!e)return e;let r=e;return(r=(e=>{let o=e,r=!0,a=0;for(;r&&a<10;){r=!1,a++;let e=/\{([a-zA-Z_][a-zA-Z0-9_]*)\s+&&\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+&&\s+([^}]+)\}/g;o=o.replace(e,(e,o,a,n)=>{let l=t[o.trim()],i=t[a.trim()];return l&&""!==l&&i&&""!==i?(r=!0,n):""})}return o})(r=(e=>{let o=e,r=!0,a=0;for(;r&&a<10;){let e;r=!1,a++;let n=/\{([a-zA-Z_][a-zA-Z0-9_]*)\s+&&\s+/g,l=[],i=[];for(;null!==(e=n.exec(o));)i.push({varName:e[1].trim(),start:e.index,varEnd:e.index+e[0].length});for(let e=i.length-1;e>=0;e--){let a=i[e],n=1,s=a.varEnd,c=!1,g="",d=!1,p=-1;for(;s<o.length&&!d;){let e=o[s];c?e===g&&"\\"!==o[s-1]&&(c=!1):'"'===e||"'"===e?(c=!0,g=e):"{"===e?n++:"}"===e&&0==--n&&(d=!0,p=s),s++}if(d&&p>a.start){let e=a.varName,n=o.substring(a.varEnd,p),i=t[e];i&&""!==i&&0!==i&&"0"!==i&&null!=i?l.push({start:a.start,end:p+1,replacement:n}):l.push({start:a.start,end:p+1,replacement:""}),r=!0}}for(let e of l)o=o.substring(0,e.start)+e.replacement+o.substring(e.end)}return o})(r))).replace(/\{IF\s+([^}]+)\}([\s\S]*?)(?:\{ELSE\}([\s\S]*?))?\{ENDIF\}/gi,(e,r,a,n="")=>!function(e,t){if(e=e.trim(),t.hasOwnProperty(e)){let o=t[e];return!!o&&""!==o&&0!==o&&"0"!==o}for(let r of["==","!=",">","<",">=","<="])if(e.includes(r)){let[a,n]=e.split(r).map(e=>e.trim()),l=o(a,t),i=o(n,t);switch(r){case"==":return l==i;case"!=":return l!=i;case">":return Number(l)>Number(i);case"<":return Number(l)<Number(i);case">=":return Number(l)>=Number(i);case"<=":return Number(l)<=Number(i);default:return!1}}return!1}(r.trim(),t)?n:a)}function o(e,t){return(e=e.trim()).startsWith('"')&&e.endsWith('"')||e.startsWith("'")&&e.endsWith("'")?e.slice(1,-1):isNaN(Number(e))?t[e]??e:Number(e)}e.s(["evaluateConditionalContent",0,t,"processConditionals",()=>t])},95187,(e,t,o)=>{"use strict";Object.defineProperty(o,"__esModule",{value:!0});var r={callServer:function(){return n.callServer},createServerReference:function(){return i.createServerReference},findSourceMapURL:function(){return l.findSourceMapURL}};for(var a in r)Object.defineProperty(o,a,{enumerable:!0,get:r[a]});let n=e.r(132120),l=e.r(92245),i=e.r(235326)},875976,e=>{"use strict";var t=e.i(467034),o=e.i(677159);function r(e,t){let o=e;return(o=o.replace(/\{\{#table\s+(\w+)\}\}([\s\S]*?)\{\{\/table\}\}/g,(e,o,r)=>{let a=t[o];if(!a||!Array.isArray(a))return"";let n=[];if("string"==typeof a)try{n=JSON.parse(a)}catch{return""}else n=a;return n.map((e,t)=>{let o=r;return Object.keys(e).forEach(t=>{let r=null!==e[t]&&void 0!==e[t]?String(e[t]):"",a=RegExp(`\\{${t}\\}`,"g");o=o.replace(a,r);let n=RegExp(`\\{item\\.${t}\\}`,"g");o=o.replace(n,r)}),o=(o=o.replace(/\{index\}/g,String(t+1))).replace(/\{row_number\}/g,String(t+1))}).join("")})).replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,(e,o,r)=>{let a=t[o];if(!a||!Array.isArray(a))return"";let n=[];if("string"==typeof a)try{n=JSON.parse(a)}catch{return""}else n=a;return n.map((e,t)=>{let o=r;return"object"==typeof e&&null!==e?Object.keys(e).forEach(t=>{let r=null!==e[t]&&void 0!==e[t]?String(e[t]):"",a=RegExp(`\\{${t}\\}`,"g");o=o.replace(a,r)}):o=(o=o.replace(/\{this\}/g,String(e))).replace(/\{\.\}/g,String(e)),o=(o=o.replace(/\{index\}/g,String(t))).replace(/\{@index\}/g,String(t))}).join("")})}function a(e){let t={};return!function e(o,r=""){for(let a in o)if(o.hasOwnProperty(a)){let n=r?`${r}.${a}`:a,l=o[a];null===l||"object"!=typeof l||Array.isArray(l)||l instanceof Date?t[n]=l:e(l,n)}}(e),t}function n(e,t){let o=e;for(let e in t)if(t.hasOwnProperty(e)){let r=t[e];if(null!=r){let t=RegExp(`\\{${e.replace(/\./g,"\\.")}\\}`,"g");o=o.replace(t,String(r))}}return o}var l=e.i(95187);let i=(0,l.createServerReference)("70bafc011444c60487d1ee4847afd169e191567030",l.callServer,void 0,l.findSourceMapURL,"processSignatures");async function s(e,t={},o){return e}function c(e,t={}){let o=e;return(o=(o=(o=o.replace(/value="\{([^}]+)\}"/g,(e,o)=>{let r=t[o.trim()]||"";return`value="${r}"`})).replace(/placeholder="\{([^}]+)\}"/g,(e,o)=>{let r=t[o.trim()]||"";return`placeholder="${r}"`})).replace(/>\{([^}]+)\}<\/label>/g,(e,o)=>{let r=t[o.trim()]||o;return`>${r}</label>`})).includes("data-calculation-formula")&&(o+=`
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
    `),o.includes("form-field-interactive")&&(o+=`
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
    `),o}async function g(e){try{if(e.startsWith("data:"))return console.log(`[convertImageUrlToBase64] URL d\xe9j\xe0 en base64`),e;if(!e||!e.trim())return console.warn("[convertImageUrlToBase64] URL vide"),null;console.log(`[convertImageUrlToBase64] T\xe9l\xe9chargement de l'image depuis: ${e.substring(0,80)}...`);let o=new AbortController,r=setTimeout(()=>o.abort(),1e4);try{let a=await fetch(e,{headers:{Accept:"image/*"},signal:o.signal});if(clearTimeout(r),!a.ok)return console.warn(`[convertImageUrlToBase64] \xc9chec du t\xe9l\xe9chargement: ${a.status} ${a.statusText}`),null;let n=await a.arrayBuffer(),l=t.Buffer.from(n).toString("base64"),i=a.headers.get("content-type")||"image/png",s=`data:${i};base64,${l}`;return console.log(`[convertImageUrlToBase64] ✅ Image convertie en base64 (${s.substring(0,50)}..., taille: ${l.length} caract\xe8res)`),s}catch(e){return clearTimeout(r),e instanceof Error&&"AbortError"===e.name?console.error(`[convertImageUrlToBase64] Timeout lors du t\xe9l\xe9chargement`):console.error("[convertImageUrlToBase64] Erreur fetch:",e),null}}catch(e){return console.error("[convertImageUrlToBase64] Erreur lors de la conversion:",e),null}}async function d(e,t){if(!e||"string"!=typeof e)return e;let o=e,r=["ecole_logo","organization_logo"];for(let a of(console.log("[processLogos] Début du traitement, longueur HTML:",e.length),console.log("[processLogos] Variables disponibles:",Object.keys(t).filter(e=>r.includes(e))),r.forEach(e=>{let r=t[e]&&String(t[e]).trim()?String(t[e]):null;if(r&&r.includes("supabase.co")){let t=r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),a=!1,n=RegExp(t,"gi"),l=[...o.matchAll(n)];for(let t=l.length-1;t>=0;t--){let n=l[t];if(!n.index)continue;let i=n.index,s=o.substring(Math.max(0,i-150),i);o.substring(i+r.length,Math.min(o.length,i+r.length+50));let c=s.match(/src\s*=\s*"[^"]*$/),g=s.match(/href\s*=\s*"[^"]*$/),d=s.match(/<img[^>]*$/);if(!c&&!g)if(d)continue;else console.log(`[processLogos] 🔄 Remplacement URL texte par balise img \xe0 l'offset ${i}`),a=!0,o=o.substring(0,i)+`<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${e}}" />`+o.substring(i+r.length)}a&&console.log(`[processLogos] ✅ URLs textuelles remplac\xe9es par des balises img avec data-logo-var`)}}),[...r,"organisation_logo"])){let e=t[a]&&String(t[a]).trim()?String(t[a]):null;if(console.log(`[processLogos] Traitement de ${a}, logoValue:`,e?`${e.substring(0,50)}...`:"null"),e){let t=a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),r=!1;for(let e of[`<img([^>]*?)data-logo-var\\s*=\\s*"\\{${t}\\}"([^>]*?)>`,`<img([^>]*?)\\s+data-logo-var\\s*=\\s*"\\{${t}\\}"([^>]*?)>`,`<img[^>]*?data-logo-var\\s*=\\s*"\\{${t}\\}"[^>]*?>`]){let t=RegExp(e,"gi"),a=o.match(t);if(a&&a.length>0){console.log(`[processLogos] ✅ Pattern trouv\xe9: ${e.substring(0,80)}...`),console.log(`[processLogos] Nombre de correspondances: ${a.length}`),console.log("[processLogos] Exemples:",a.slice(0,2).map(e=>e.substring(0,150))),r=!0;break}}if(!r&&(console.warn(`[processLogos] ⚠️ Aucune balise logo trouv\xe9e avec ${a}`),o.includes("data-logo-var"))){console.warn(`[processLogos] ⚠️ data-logo-var trouv\xe9 dans le HTML mais pattern ne correspond pas`);let e=o.indexOf("data-logo-var");console.warn("[processLogos] Extrait HTML:",o.substring(Math.max(0,e-50),Math.min(o.length,e+200)))}let n=RegExp(`<img([^>]*?)data-logo-var\\s*=\\s*"\\{${t}\\}"([^>]*?)>`,"gi"),l=e;if(e&&(e.includes("supabase.co")||e.startsWith("http"))){console.log(`[processLogos] Conversion de l'URL en base64 pour ${a}...`);try{let t=await g(e);t?(l=t,console.log(`[processLogos] ✅ Image convertie en base64 avec succ\xe8s`)):console.warn(`[processLogos] ⚠️ \xc9chec de la conversion en base64, utilisation de l'URL originale`)}catch(e){console.error(`[processLogos] ❌ Erreur lors de la conversion en base64:`,e)}}else console.log(`[processLogos] URL ne n\xe9cessite pas de conversion (pas une URL HTTP/Supabase)`);o=o.replace(n,(e,t,o)=>{console.log(`[processLogos] ✅ Correspondance trouv\xe9e:`,e.substring(0,150));let r=(t+" "+o).trim(),a=e.match(/style\s*=\s*"([^"]*)"/),n=a?a[1]:"",i=e.match(/alt\s*=\s*"([^"]*)"/),s=i?i[1]:"Logo",c=r.replace(/\s+src\s*=\s*"[^"]*"/g,"").replace(/\s+data-logo-var\s*=\s*"[^"]*"/g,"").trim(),g=`<img src="${l}" alt="${s}"${c?" "+c:""} style="${n}">`;return console.log(`[processLogos] ✅ Remplacement effectu\xe9:`,g.substring(0,150)),g})}else{console.log(`[processLogos] Pas de logo pour ${a}, masquage de l'image`);let e=a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");o=o.replace(RegExp(`<img([^>]*?)data-logo-var\\s*=\\s*"\\{${e}\\}"([^>]*?)>`,"gi"),(e,t,o)=>{let r=e.match(/style\s*=\s*"([^"]*)"/),n=r?r[1]:"";return`<img${t} data-logo-var="{${a}}"${o} style="${n}; display: none;">`})}}return r.forEach(e=>{let r=t[e];if(r&&"string"==typeof r&&r.trim()){let t=r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),a=RegExp(`(?!<img[^>]*src\\s*=\\s*"[^"]*${t}[^"]*"[^>]*>)${t}(?![^<]*</img>)`,"gi");o!==(o=o.replace(a,(e,t)=>{let r=o.substring(Math.max(0,t-50),t),a=o.substring(t+e.length,Math.min(o.length,t+e.length+50));return(r+e+a).match(/src\s*=\s*"[^"]*$/)?e:(console.log(`[processLogos] 🗑️ Suppression de l'URL texte du logo: ${e.substring(0,80)}...`),"")}))&&console.log(`[processLogos] ✅ URLs textuelles supprim\xe9es pour ${e}`)}}),o}function p(e,t){let o=e;o=(o=o.replace(/<img([^>]*?)class="qr-code-dynamic"([^>]*?)data-qr-data="([^"]*)"([^>]*?)>/g,(e,o,r,a,n)=>{let l=a;Object.entries(t).forEach(([e,t])=>{let o=RegExp(`\\{${e}\\}`,"g");l=l.replace(o,String(t))});let i=e.match(/max-width:\s*(\d+)px/),s=i?i[1]:"200",c=`https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&data=${encodeURIComponent(l)}`;return`<img${o}${r}src="${c}" data-qr-data="${l}"${n}>`})).replace(/<img([^>]*?)class="barcode-dynamic"([^>]*?)data-barcode-data="([^"]*)"([^>]*?)data-barcode-type="([^"]*)"([^>]*?)>/g,(e,o,r,a,n,l,i)=>{let s=a;Object.entries(t).forEach(([e,t])=>{let o=RegExp(`\\{${e}\\}`,"g");s=s.replace(o,String(t))});let c=e.match(/max-width:\s*(\d+)px/),g=e.match(/height:\s*(\d+)px/);c&&c[1],g&&g[1];let d=`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(s)}&code=${l}&dpi=96&dataseparator=`;return`<img${o}${r}src="${d}" data-barcode-data="${s}"${n}data-barcode-type="${l}"${i}>`});let r=["ecole_logo","organization_logo","organisation_logo"];return Object.keys(t).filter(e=>!r.includes(e)).sort((e,t)=>t.length-e.length).forEach(e=>{let r=t[e],a=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),n=RegExp(`\\{${a}\\}`,"g"),l=null==r?"":String(r).replace(/</g,"&lt;").replace(/>/g,"&gt;");o=o.replace(n,(e,t)=>{let r=o.substring(Math.max(0,t-100),t),a=o.substring(t+e.length,Math.min(o.length,t+e.length+100));return r.includes("data-logo-var")||a.includes("data-logo-var")?e:l})}),o=(o=o.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g,e=>{let t=e.slice(1,-1);return"IF"===t||"ELSE"===t||"ENDIF"===t?e:""})).replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\s+&&\s+[^}]*\}/g,"")}async function m(e,t,l,g){try{var m,u,f,h,x,b,v,$,y,L,T,E;console.log("[HTML Generator] Début de la génération HTML"),console.log("[HTML Generator] Template:",{id:e.id,type:e.type,name:e.name,hasHeader:!!e.header,headerType:typeof e.header});let g="";if(e.content){let t=e.content;console.log("[HTML Generator] Template content structure:",{hasHtml:!!t.html,htmlLength:t.html?.length||0,hasElements:!!t.elements,elementsCount:t.elements?.length||0}),t.html?(g=t.html,console.log("[HTML Generator] Using content.html, length:",g.length)):t.elements&&Array.isArray(t.elements)&&t.elements.length>0&&(g=t.elements.map(e=>e.content||"").filter(e=>e&&e.trim()).join("\n"),console.log("[HTML Generator] Using content.elements, length:",g.length))}else console.warn("[HTML Generator] Template content is null or undefined");g&&0!==g.trim().length||(console.warn("[HTML Generator] Template content is empty after extraction, template:",{id:e.id,type:e.type,name:e.name}),g="");let _=a(t),M=e.header?.content||"",w=`
    <div style="border-top: 1px solid #E5E7EB; padding: 12px 0 8px 0; margin-top: 25px; background-color: #FAFAFA;">
      <p style="font-size: 9pt; color: #1A1A1A; margin: 0; text-align: center; font-weight: 500; line-height: 1.4;">
        {ecole_nom} | {ecole_adresse} {ecole_ville} {ecole_code_postal} | Num\xe9ro SIRET: {ecole_siret}
      </p>
      <p style="font-size: 8pt; color: #666; margin: 4px 0 0 0; text-align: center; line-height: 1.3;">
        Num\xe9ro de d\xe9claration d'activit\xe9: {ecole_numero_declaration} <em>(aupr\xe8s du pr\xe9fet de r\xe9gion de: {ecole_region})</em>
      </p>
      <p style="font-size: 8pt; color: #888; font-style: italic; margin: 3px 0 0 0; text-align: center; line-height: 1.3;">
        Cet enregistrement ne vaut pas l'agr\xe9ment de l'\xc9tat.
      </p>
    </div>
  `,A=e.header_enabled??!0,H=e.footer_enabled??!0,z=e.header?.height||e.header_height||30,S=e.footer?.height||e.footer_height||20;if(console.log("[HTML Generator] Header/Footer config:",{headerEnabled:A,headerContentLength:M.length,headerContent:M.substring(0,100),footerEnabled:H,footerContentLength:w.length,footerContent:w.substring(0,100),templateHeader:e.header,templateFooter:e.footer}),A&&(!M||0===M.trim().length)){let e,t,o,r,a,n,l;e=_.ecole_nom||_.organization_name||"",t=_.ecole_adresse||_.organization_address||"",o=_.ecole_code_postal||"",r=_.ecole_ville||"",a=_.ecole_email||_.organization_email||"",n=_.ecole_telephone||_.organization_phone||"",l=_.ecole_logo||_.organization_logo||"",M=`
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0 0 15px 0; border-bottom: 2px solid #1A1A1A; margin-bottom: 20px;">
      <div style="flex: 1;">
        <p style="font-weight: bold; font-size: 14pt; margin: 0; color: #1A1A1A; line-height: 1.3;">${e}</p>
        ${t?`<p style="font-size: 9pt; color: #666; margin: 4px 0 0 0; line-height: 1.4;">${t}</p>`:""}
        ${o||r?`<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">${o} ${r}</p>`:""}
        ${a?`<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">Email : ${a}</p>`:""}
        ${n?`<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">Tel : ${n}</p>`:""}
      </div>
      ${l?`
      <div style="text-align: right; min-width: 100px;">
        <img src="${l}" alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" />
      </div>
      `:""}
    </div>
  `,console.log("[HTML Generator] Génération automatique de l'en-tête professionnel")}console.log("[HTML Generator] Header avant traitement (premiers 500 chars):",M.substring(0,500)),console.log("[HTML Generator] Header contient tableau?",M.includes("<table")),console.log("[HTML Generator] Header contient {ecole_logo}?",M.includes("{ecole_logo}"));let R=a(t),G=M,j=g,N=w;console.log("[HTML Generator] Header initial (premiers 800 chars):",M.substring(0,800)),console.log("[HTML Generator] Header contient {ecole_logo}?",G.includes("{ecole_logo}")),console.log("[HTML Generator] Header contient URL supabase comme texte?",M.includes("supabase.co")&&!M.includes('src="')),["ecole_logo","organization_logo","organisation_logo"].forEach(e=>{let t=RegExp(`\\{${e}\\}`,"g");if(G.includes(`{${e}}`)){let o=R[e];o&&String(o).trim()?(console.log(`[HTML Generator] 🔄 Remplacement de {${e}} par balise img avec data-logo-var`),G=G.replace(t,`<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${e}}" />`),console.log(`[HTML Generator] ✅ {${e}} remplac\xe9 par balise img`)):(console.log(`[HTML Generator] ⚠️ {${e}} est vide ou undefined, suppression de la balise`),G=G.replace(t,""))}}),console.log("[HTML Generator] Variables disponibles pour logos:",{ecole_logo:R.ecole_logo?`${String(R.ecole_logo).substring(0,50)}...`:"undefined",organization_logo:R.organization_logo?`${String(R.organization_logo).substring(0,50)}...`:"undefined",organisation_logo:R.organisation_logo?`${String(R.organisation_logo).substring(0,50)}...`:"undefined"});let F=["ecole_logo","organization_logo","organisation_logo"].map(e=>{let t=R[e];return t&&"string"==typeof t&&t.includes("supabase.co")?{key:e,url:t}:null}).filter(Boolean);console.log("[HTML Generator] URLs de logo trouvées:",F.length),F.forEach(({key:e,url:t})=>{let o=0,r=t.length,a=[];for(;-1!==(o=G.indexOf(t,o));){let t=G.substring(Math.max(0,o-300),o);G.substring(o+r,Math.min(G.length,o+r+100));let n=/src\s*=\s*"[^"]*$/.test(t),l=/href\s*=\s*"[^"]*$/.test(t);n||l||(a.push({start:o,end:o+r,key:e}),console.log(`[HTML Generator] 🔄 URL texte d\xe9tect\xe9e \xe0 l'offset ${o}, sera remplac\xe9e par balise img`)),o+=r}for(let e=a.length-1;e>=0;e--){let{start:t,end:o,key:r}=a[e],n=`<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${r}}" />`;G=G.substring(0,t)+n+G.substring(o),console.log(`[HTML Generator] ✅ URL texte remplac\xe9e par balise img avec data-logo-var="{${r}}"`)}a.length>0&&console.log(`[HTML Generator] ✅ ${a.length} URL(s) texte remplac\xe9e(s) par des balises img`)}),console.log("[HTML Generator] Traitement des logos - Header avant (premiers 500 chars):",G.substring(0,500)),console.log("[HTML Generator] Header contient data-logo-var?",G.includes("data-logo-var")),console.log("[HTML Generator] Header contient URL supabase?",G.includes("supabase.co"));try{G=await d(G,R),console.log("[HTML Generator] Traitement des logos - Header après (premiers 500 chars):",G.substring(0,500)),console.log("[HTML Generator] Header après contient data:image?",G.includes("data:image")),console.log("[HTML Generator] Header après contient URL supabase?",G.includes("supabase.co"))}catch(e){console.error("[HTML Generator] Erreur lors du traitement des logos dans le header:",e),e instanceof Error&&(console.error("[HTML Generator] Message:",e.message),console.error("[HTML Generator] Stack:",e.stack))}try{j=await d(j,R)}catch(e){console.error("[HTML Generator] Erreur lors du traitement des logos dans le content:",e)}try{N=await d(N,R)}catch(e){console.error("[HTML Generator] Erreur lors du traitement des logos dans le footer:",e)}G=r(G,R),j=r(j,R),N=r(N,R),m=G,G=m,u=j,j=u,f=N,N=f,G=(0,o.evaluateConditionalContent)(G,R),j=(0,o.evaluateConditionalContent)(j,R),N=(0,o.evaluateConditionalContent)(N,R),h=G,G=h,x=j,j=x,b=N,N=b,v=G,G=v,$=j,j=$,y=N,N=y,G=n(G,R),j=n(j,R),N=n(N,R),L=G,G=L,T=j,j=T,E=N,N=E,G=await i(G,R,l),j=await i(j,R,l),N=await i(N,R,l),G=await s(G,R,l),j=await s(j,R,l),N=await s(N,R,l),G=p(G,R),j=p(j,R),N=p(N,R);let C=e=>e.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g,e=>{let t=e.slice(1,-1);return"IF"===t||"ELSE"===t||"ENDIF"===t?e:""});G=C(G),j=C(j),N=C(N),G=c(G,R),j=c(j,R),N=c(N,R),N=`
    <div style="padding: 12px 0 8px 0; margin-top: 25px; background-color: #FAFAFA; font-family: 'Times New Roman', Times, serif;">
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #1A1A1A; margin: 0; text-align: center; font-weight: 500; line-height: 1.4;">
        ${R.ecole_nom||R.organization_name||""} | ${R.ecole_adresse||R.organization_address||""} ${R.ecole_ville||""} ${R.ecole_code_postal||""} | Num\xe9ro SIRET: ${R.ecole_siret||""}
      </p>
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 4px 0 0 0; text-align: center; line-height: 1.3;">
        Num\xe9ro de d\xe9claration d'activit\xe9: ${R.ecole_numero_declaration||""} <em>(aupr\xe8s du pr\xe9fet de r\xe9gion de: ${R.ecole_region||""})</em>
      </p>
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #888; font-style: italic; margin: 3px 0 0 0; text-align: center; line-height: 1.3;">
        Cet enregistrement ne vaut pas l'agr\xe9ment de l'\xc9tat.
      </p>
    </div>
  `,e.content?.pageSize||e.page_size;let U={top:15,right:15,bottom:15,left:15},k=e.margins||U,P={top:k.top??U.top,right:k.right??U.right,bottom:k.bottom??U.bottom,left:k.left??U.left},O=3.78*P.top,V=3.78*P.bottom,q=3.78*P.left,I=3.78*P.right,B=3.78*z,D=3.78*S,Z=A?O+B+5:O,W=H?V+D+5:V,J=1123-Z-W;console.log("[HTML Generator] Building full HTML:",{hasHeader:A&&G.length>0,headerLength:G.length,headerHeight:z,headerHeightPx:B,hasFooter:H&&N.length>0,footerLength:N.length,footerHeight:S,footerHeightPx:D,margins:P,marginTopPx:O,marginBottomPx:V,marginLeftPx:q,marginRightPx:I,pageWidthPx:794,pageHeightPx:1123,contentWidthPx:794-q-I,contentTopPxFirstPage:Z,contentBottomPx:W,contentHeightPx:J,headerRepeatOnAllPages:!1,footerRepeatOnAllPages:!0});let K=`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e.name||"Document"}</title>
  <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
  <style>
    /* Paged.js - D\xe9finition de la page physique A4 */
    @page {
      size: A4;
      margin-top: ${P.top}mm;
      margin-bottom: ${H?S+5:P.bottom}mm;
      margin-left: ${P.left}mm;
      margin-right: ${P.right}mm;
      
      /* Footer sur toutes les pages */
      ${H?`@bottom-center {
        content: element(footerEnv);
      }`:""}
    }
    @page:first {
      margin-top: ${A?z+5:P.top}mm;
      
      /* Header uniquement sur la premi\xe8re page */
      ${A?`@top-center {
        content: element(headerEnv);
      }`:""}
      ${H?`@bottom-center {
        content: element(footerEnv);
      }`:""}
    }
    
    /* Style de l'En-t\xeate HTML - Extrait du flux normal */
    ${A?`.document-header {
      position: running(headerEnv);
      width: 100%;
      background: #ffffff;
      padding: 0;
      margin: 0;
      font-size: ${.85*(e.font_size||10)}pt;
      line-height: 1.2;
    }`:""}
    
    /* Style du Pied de page HTML - Extrait du flux normal */
    ${H?`.document-footer {
      position: running(footerEnv);
      width: 100%;
      background: #ffffff;
      padding: 5px 0;
      margin: 0;
      font-size: ${.85*(e.font_size||10)}pt;
      line-height: 1.2;
      text-align: center;
      border-top: 1px solid #E5E7EB;
    }`:""}
    
    /* Le contenu principal - Plus besoin de marges bizarres */
    .document-content {
      font-family: 'Arial', sans-serif;
      line-height: 1.5;
      padding: 0;
      margin: 0;
    }
    
    /* Styles existants */
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      color-adjust: exact;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 794px;
      height: auto;
    }
    body {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: ${e.font_size||10}pt;
      line-height: 1.4;
      color: #000;
      background: #ffffff;
      min-height: 1123px;
    }
    .document-container {
      width: 794px !important;
      min-height: 1123px !important;
      height: auto !important;
      background: #ffffff !important;
      position: relative !important;
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
    }
    .header * {
      max-height: ${B-10}px !important;
      overflow: visible !important;
    }
    .header img {
      max-height: ${.6*B}px !important;
      width: auto !important;
    }
    /* Note: Le header sera visible uniquement sur la premi\xe8re page lors de la g\xe9n\xe9ration PDF
       si repeatOnAllPages est false, car html2canvas capture le document en une seule fois */
    .content {
      position: relative !important;
      top: auto !important;
      bottom: auto !important;
      left: ${q}px !important;
      right: ${I}px !important;
      width: calc(100% - ${q+I}px) !important;
      min-height: ${J}px !important;
      max-height: none !important;
      background: #ffffff !important;
      overflow: visible !important;
      padding: 10px 0 ${H?D+V+20:20}px 0 !important;
      margin: ${A?B+O+5:O}px 0 0 0 !important;
      z-index: 1 !important;
    }
    .footer * {
      max-height: ${D-10}px !important;
      overflow: visible !important;
    }
    .footer img {
      max-height: ${.6*D}px !important;
      width: auto !important;
    }
    /* Styles pour les tableaux */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      table-layout: auto;
      border-spacing: 0;
      font-size: ${.9*(e.font_size||10)}pt;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 4px 6px;
      text-align: left;
      word-wrap: break-word;
      overflow-wrap: break-word;
      vertical-align: top;
    }
    table th {
      background-color: #f3f4f6;
      font-weight: bold;
      font-size: ${.9*(e.font_size||10)}pt;
    }
    /* Images */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    /* Pr\xe9server les flexbox */
    [style*="display: flex"], [style*="display:flex"] {
      display: flex !important;
    }
    /* Pr\xe9server les gradients et couleurs */
    [style*="gradient"], [style*="background"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    /* Assurer que les bordures sont visibles */
    [style*="border"] {
      border-style: solid !important;
    }
    /* Pr\xe9server les espacements */
    p, div, span {
      margin: 0;
      padding: 0;
    }
    p {
      margin-bottom: 0.5em;
      font-size: ${e.font_size||10}pt;
      line-height: 1.4;
    }
    h1 {
      font-size: ${1.6*(e.font_size||10)}pt;
      line-height: 1.3;
      margin-bottom: 8px;
      margin-top: 12px;
    }
    h2 {
      font-size: ${1.4*(e.font_size||10)}pt;
      line-height: 1.3;
      margin-bottom: 6px;
      margin-top: 10px;
    }
    h3 {
      font-size: ${1.2*(e.font_size||10)}pt;
      line-height: 1.3;
      margin-bottom: 4px;
      margin-top: 8px;
    }
    /* R\xe9duire les espacements g\xe9n\xe9raux */
    .header {
      margin-bottom: 12px !important;
    }
    .footer {
      padding-top: 12px !important;
    }
    /* Header uniquement sur la premi\xe8re page si repeatOnAllPages est false */
    .header-first-page-only {
      display: block !important;
    }
    /* Footer toujours visible sur toutes les pages */
    .footer {
      display: block !important;
    }
  </style>
</head>
<body>
  ${A?`<header class="document-header">${G}</header>`:""}
  ${H&&N?`<footer class="document-footer">${N}</footer>`:""}
  <main class="document-content">
    ${j}
  </main>
  <script>
    // Attendre que Paged.js ait fini le calcul du rendu
    if (typeof window !== 'undefined' && window.PagedPolyfill) {
      window.addEventListener('pagedjsReady', function() {
        window.pagedjs_finished = true;
      });
    }
  </script>
</body>
</html>
  `.trim(),Y=Math.max(1,Math.ceil(j.length/3e3));return console.log("[HTML Generator] ✅ Génération HTML réussie, longueur:",K.length,"pages estimées:",Y),{html:K,pageCount:Y}}catch(o){throw console.error("[HTML Generator] ❌ ERREUR lors de la génération HTML:",o),o instanceof Error&&(console.error("[HTML Generator] Message:",o.message),console.error("[HTML Generator] Stack:",o.stack),console.error("[HTML Generator] Name:",o.name)),console.error("[HTML Generator] Template info:",{id:e?.id,type:e?.type,name:e?.name,headerLength:e?.header?"string"==typeof e.header?e.header.length:JSON.stringify(e.header).length:0}),console.error("[HTML Generator] Variables keys:",Object.keys(t||{}).slice(0,20)),o}}e.s(["generateHTML",()=>m],875976)}]);