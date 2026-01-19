module.exports=[405050,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0});var d={callServer:function(){return f.callServer},createServerReference:function(){return h.createServerReference},findSourceMapURL:function(){return g.findSourceMapURL}};for(var e in d)Object.defineProperty(c,e,{enumerable:!0,get:d[e]});let f=a.r(120611),g=a.r(1722),h=a.r(738783)},789001,a=>{"use strict";var b=a.i(284144);function c(a,b){let c=a;return(c=c.replace(/\{\{#table\s+(\w+)\}\}([\s\S]*?)\{\{\/table\}\}/g,(a,c,d)=>{let e=b[c];if(!e||!Array.isArray(e))return"";let f=[];if("string"==typeof e)try{f=JSON.parse(e)}catch{return""}else f=e;return f.map((a,b)=>{let c=d;return Object.keys(a).forEach(b=>{let d=null!==a[b]&&void 0!==a[b]?String(a[b]):"",e=RegExp(`\\{${b}\\}`,"g");c=c.replace(e,d);let f=RegExp(`\\{item\\.${b}\\}`,"g");c=c.replace(f,d)}),c=(c=c.replace(/\{index\}/g,String(b+1))).replace(/\{row_number\}/g,String(b+1))}).join("")})).replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,(a,c,d)=>{let e=b[c];if(!e||!Array.isArray(e))return"";let f=[];if("string"==typeof e)try{f=JSON.parse(e)}catch{return""}else f=e;return f.map((a,b)=>{let c=d;return"object"==typeof a&&null!==a?Object.keys(a).forEach(b=>{let d=null!==a[b]&&void 0!==a[b]?String(a[b]):"",e=RegExp(`\\{${b}\\}`,"g");c=c.replace(e,d)}):c=(c=c.replace(/\{this\}/g,String(a))).replace(/\{\.\}/g,String(a)),c=(c=c.replace(/\{index\}/g,String(b))).replace(/\{@index\}/g,String(b))}).join("")})}function d(a){let b={};return!function a(c,d=""){for(let e in c)if(c.hasOwnProperty(e)){let f=d?`${d}.${e}`:e,g=c[e];null===g||"object"!=typeof g||Array.isArray(g)||g instanceof Date?b[f]=g:a(g,f)}}(a),b}function e(a,b){let c=a;for(let a in b)if(b.hasOwnProperty(a)){let d=b[a];if(null!=d){let b=RegExp(`\\{${a.replace(/\./g,"\\.")}\\}`,"g");c=c.replace(b,String(d))}}return c}var f=a.i(405050);let g=(0,f.createServerReference)("70bafc011444c60487d1ee4847afd169e191567030",f.callServer,void 0,f.findSourceMapURL,"processSignatures");async function h(a,b={},c){return a}function i(a,b={}){let c=a;return(c=(c=(c=c.replace(/value="\{([^}]+)\}"/g,(a,c)=>{let d=b[c.trim()]||"";return`value="${d}"`})).replace(/placeholder="\{([^}]+)\}"/g,(a,c)=>{let d=b[c.trim()]||"";return`placeholder="${d}"`})).replace(/>\{([^}]+)\}<\/label>/g,(a,c)=>{let d=b[c.trim()]||c;return`>${d}</label>`})).includes("data-calculation-formula")&&(c+=`
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
    `),c.includes("form-field-interactive")&&(c+=`
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
    `),c}async function j(a){try{if(a.startsWith("data:"))return console.log(`[convertImageUrlToBase64] URL d\xe9j\xe0 en base64`),a;if(!a||!a.trim())return console.warn("[convertImageUrlToBase64] URL vide"),null;console.log(`[convertImageUrlToBase64] T\xe9l\xe9chargement de l'image depuis: ${a.substring(0,80)}...`);let b=new AbortController,c=setTimeout(()=>b.abort(),1e4);try{let d=await fetch(a,{headers:{Accept:"image/*"},signal:b.signal});if(clearTimeout(c),!d.ok)return console.warn(`[convertImageUrlToBase64] \xc9chec du t\xe9l\xe9chargement: ${d.status} ${d.statusText}`),null;let e=await d.arrayBuffer(),f=Buffer.from(e).toString("base64"),g=d.headers.get("content-type")||"image/png",h=`data:${g};base64,${f}`;return console.log(`[convertImageUrlToBase64] ✅ Image convertie en base64 (${h.substring(0,50)}..., taille: ${f.length} caract\xe8res)`),h}catch(a){return clearTimeout(c),a instanceof Error&&"AbortError"===a.name?console.error(`[convertImageUrlToBase64] Timeout lors du t\xe9l\xe9chargement`):console.error("[convertImageUrlToBase64] Erreur fetch:",a),null}}catch(a){return console.error("[convertImageUrlToBase64] Erreur lors de la conversion:",a),null}}async function k(a,b){if(!a||"string"!=typeof a)return a;let c=a,d=["ecole_logo","organization_logo"];for(let e of(console.log("[processLogos] Début du traitement, longueur HTML:",a.length),console.log("[processLogos] Variables disponibles:",Object.keys(b).filter(a=>d.includes(a))),d.forEach(a=>{let d=b[a]&&String(b[a]).trim()?String(b[a]):null;if(d&&d.includes("supabase.co")){let b=d.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),e=!1,f=RegExp(b,"gi"),g=[...c.matchAll(f)];for(let b=g.length-1;b>=0;b--){let f=g[b];if(!f.index)continue;let h=f.index,i=c.substring(Math.max(0,h-150),h);c.substring(h+d.length,Math.min(c.length,h+d.length+50));let j=i.match(/src\s*=\s*"[^"]*$/),k=i.match(/href\s*=\s*"[^"]*$/),l=i.match(/<img[^>]*$/);if(!j&&!k)if(l)continue;else console.log(`[processLogos] 🔄 Remplacement URL texte par balise img \xe0 l'offset ${h}`),e=!0,c=c.substring(0,h)+`<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${a}}" />`+c.substring(h+d.length)}e&&console.log(`[processLogos] ✅ URLs textuelles remplac\xe9es par des balises img avec data-logo-var`)}}),[...d,"organisation_logo"])){let a=b[e]&&String(b[e]).trim()?String(b[e]):null;if(console.log(`[processLogos] Traitement de ${e}, logoValue:`,a?`${a.substring(0,50)}...`:"null"),a){let b=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),d=!1;for(let a of[`<img([^>]*?)data-logo-var\\s*=\\s*"\\{${b}\\}"([^>]*?)>`,`<img([^>]*?)\\s+data-logo-var\\s*=\\s*"\\{${b}\\}"([^>]*?)>`,`<img[^>]*?data-logo-var\\s*=\\s*"\\{${b}\\}"[^>]*?>`]){let b=RegExp(a,"gi"),e=c.match(b);if(e&&e.length>0){console.log(`[processLogos] ✅ Pattern trouv\xe9: ${a.substring(0,80)}...`),console.log(`[processLogos] Nombre de correspondances: ${e.length}`),console.log("[processLogos] Exemples:",e.slice(0,2).map(a=>a.substring(0,150))),d=!0;break}}if(!d&&(console.warn(`[processLogos] ⚠️ Aucune balise logo trouv\xe9e avec ${e}`),c.includes("data-logo-var"))){console.warn(`[processLogos] ⚠️ data-logo-var trouv\xe9 dans le HTML mais pattern ne correspond pas`);let a=c.indexOf("data-logo-var");console.warn("[processLogos] Extrait HTML:",c.substring(Math.max(0,a-50),Math.min(c.length,a+200)))}let f=RegExp(`<img([^>]*?)data-logo-var\\s*=\\s*"\\{${b}\\}"([^>]*?)>`,"gi"),g=a;if(a&&(a.includes("supabase.co")||a.startsWith("http"))){console.log(`[processLogos] Conversion de l'URL en base64 pour ${e}...`);try{let b=await j(a);b?(g=b,console.log(`[processLogos] ✅ Image convertie en base64 avec succ\xe8s`)):console.warn(`[processLogos] ⚠️ \xc9chec de la conversion en base64, utilisation de l'URL originale`)}catch(a){console.error(`[processLogos] ❌ Erreur lors de la conversion en base64:`,a)}}else console.log(`[processLogos] URL ne n\xe9cessite pas de conversion (pas une URL HTTP/Supabase)`);c=c.replace(f,(a,b,c)=>{console.log(`[processLogos] ✅ Correspondance trouv\xe9e:`,a.substring(0,150));let d=(b+" "+c).trim(),e=a.match(/style\s*=\s*"([^"]*)"/),f=e?e[1]:"",h=a.match(/alt\s*=\s*"([^"]*)"/),i=h?h[1]:"Logo",j=d.replace(/\s+src\s*=\s*"[^"]*"/g,"").replace(/\s+data-logo-var\s*=\s*"[^"]*"/g,"").trim(),k=`<img src="${g}" alt="${i}"${j?" "+j:""} style="${f}">`;return console.log(`[processLogos] ✅ Remplacement effectu\xe9:`,k.substring(0,150)),k})}else{console.log(`[processLogos] Pas de logo pour ${e}, masquage de l'image`);let a=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");c=c.replace(RegExp(`<img([^>]*?)data-logo-var\\s*=\\s*"\\{${a}\\}"([^>]*?)>`,"gi"),(a,b,c)=>{let d=a.match(/style\s*=\s*"([^"]*)"/),f=d?d[1]:"";return`<img${b} data-logo-var="{${e}}"${c} style="${f}; display: none;">`})}}return d.forEach(a=>{let d=b[a];if(d&&"string"==typeof d&&d.trim()){let b=d.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),e=RegExp(`(?!<img[^>]*src\\s*=\\s*"[^"]*${b}[^"]*"[^>]*>)${b}(?![^<]*</img>)`,"gi");c!==(c=c.replace(e,(a,b)=>{let d=c.substring(Math.max(0,b-50),b),e=c.substring(b+a.length,Math.min(c.length,b+a.length+50));return(d+a+e).match(/src\s*=\s*"[^"]*$/)?a:(console.log(`[processLogos] 🗑️ Suppression de l'URL texte du logo: ${a.substring(0,80)}...`),"")}))&&console.log(`[processLogos] ✅ URLs textuelles supprim\xe9es pour ${a}`)}}),c}function l(a,b){let c=a;c=(c=c.replace(/<img([^>]*?)class="qr-code-dynamic"([^>]*?)data-qr-data="([^"]*)"([^>]*?)>/g,(a,c,d,e,f)=>{let g=e;Object.entries(b).forEach(([a,b])=>{let c=RegExp(`\\{${a}\\}`,"g");g=g.replace(c,String(b))});let h=a.match(/max-width:\s*(\d+)px/),i=h?h[1]:"200",j=`https://api.qrserver.com/v1/create-qr-code/?size=${i}x${i}&data=${encodeURIComponent(g)}`;return`<img${c}${d}src="${j}" data-qr-data="${g}"${f}>`})).replace(/<img([^>]*?)class="barcode-dynamic"([^>]*?)data-barcode-data="([^"]*)"([^>]*?)data-barcode-type="([^"]*)"([^>]*?)>/g,(a,c,d,e,f,g,h)=>{let i=e;Object.entries(b).forEach(([a,b])=>{let c=RegExp(`\\{${a}\\}`,"g");i=i.replace(c,String(b))});let j=a.match(/max-width:\s*(\d+)px/),k=a.match(/height:\s*(\d+)px/);j&&j[1],k&&k[1];let l=`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(i)}&code=${g}&dpi=96&dataseparator=`;return`<img${c}${d}src="${l}" data-barcode-data="${i}"${f}data-barcode-type="${g}"${h}>`});let d=["ecole_logo","organization_logo","organisation_logo"];return Object.keys(b).filter(a=>!d.includes(a)).sort((a,b)=>b.length-a.length).forEach(a=>{let d=b[a],e=a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),f=RegExp(`\\{${e}\\}`,"g"),g=null==d?"":String(d).replace(/</g,"&lt;").replace(/>/g,"&gt;");c=c.replace(f,(a,b)=>{let d=c.substring(Math.max(0,b-100),b),e=c.substring(b+a.length,Math.min(c.length,b+a.length+100));return d.includes("data-logo-var")||e.includes("data-logo-var")?a:g})}),c=(c=c.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g,a=>{let b=a.slice(1,-1);return"IF"===b||"ELSE"===b||"ENDIF"===b?a:""})).replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\s+&&\s+[^}]*\}/g,"")}async function m(a,f,j,m){try{var n,o,p,q,r,s,t,u,v,w,x,y;console.log("[HTML Generator] Début de la génération HTML"),console.log("[HTML Generator] Template:",{id:a.id,type:a.type,name:a.name,hasHeader:!!a.header,headerType:typeof a.header});let m="";if(a.content){let b=a.content;console.log("[HTML Generator] Template content structure:",{hasHtml:!!b.html,htmlLength:b.html?.length||0,hasElements:!!b.elements,elementsCount:b.elements?.length||0}),b.html?(m=b.html,console.log("[HTML Generator] Using content.html, length:",m.length)):b.elements&&Array.isArray(b.elements)&&b.elements.length>0&&(m=b.elements.map(a=>a.content||"").filter(a=>a&&a.trim()).join("\n"),console.log("[HTML Generator] Using content.elements, length:",m.length))}else console.warn("[HTML Generator] Template content is null or undefined");m&&0!==m.trim().length||(console.warn("[HTML Generator] Template content is empty after extraction, template:",{id:a.id,type:a.type,name:a.name}),m="");let z=d(f),A=a.header?.content||"",B=`
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
  `,C=a.header_enabled??!0,D=a.footer_enabled??!0,E=a.header?.height||a.header_height||30,F=a.footer?.height||a.footer_height||20;if(console.log("[HTML Generator] Header/Footer config:",{headerEnabled:C,headerContentLength:A.length,headerContent:A.substring(0,100),footerEnabled:D,footerContentLength:B.length,footerContent:B.substring(0,100),templateHeader:a.header,templateFooter:a.footer}),C&&(!A||0===A.trim().length)){let a,b,c,d,e,f,g;a=z.ecole_nom||z.organization_name||"",b=z.ecole_adresse||z.organization_address||"",c=z.ecole_code_postal||"",d=z.ecole_ville||"",e=z.ecole_email||z.organization_email||"",f=z.ecole_telephone||z.organization_phone||"",g=z.ecole_logo||z.organization_logo||"",A=`
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0 0 15px 0; border-bottom: 2px solid #1A1A1A; margin-bottom: 20px;">
      <div style="flex: 1;">
        <p style="font-weight: bold; font-size: 14pt; margin: 0; color: #1A1A1A; line-height: 1.3;">${a}</p>
        ${b?`<p style="font-size: 9pt; color: #666; margin: 4px 0 0 0; line-height: 1.4;">${b}</p>`:""}
        ${c||d?`<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">${c} ${d}</p>`:""}
        ${e?`<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">Email : ${e}</p>`:""}
        ${f?`<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">Tel : ${f}</p>`:""}
      </div>
      ${g?`
      <div style="text-align: right; min-width: 100px;">
        <img src="${g}" alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" />
      </div>
      `:""}
    </div>
  `,console.log("[HTML Generator] Génération automatique de l'en-tête professionnel")}console.log("[HTML Generator] Header avant traitement (premiers 500 chars):",A.substring(0,500)),console.log("[HTML Generator] Header contient tableau?",A.includes("<table")),console.log("[HTML Generator] Header contient {ecole_logo}?",A.includes("{ecole_logo}"));let G=d(f),H=A,I=m,J=B;console.log("[HTML Generator] Header initial (premiers 800 chars):",A.substring(0,800)),console.log("[HTML Generator] Header contient {ecole_logo}?",H.includes("{ecole_logo}")),console.log("[HTML Generator] Header contient URL supabase comme texte?",A.includes("supabase.co")&&!A.includes('src="')),["ecole_logo","organization_logo","organisation_logo"].forEach(a=>{let b=RegExp(`\\{${a}\\}`,"g");if(H.includes(`{${a}}`)){let c=G[a];c&&String(c).trim()?(console.log(`[HTML Generator] 🔄 Remplacement de {${a}} par balise img avec data-logo-var`),H=H.replace(b,`<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${a}}" />`),console.log(`[HTML Generator] ✅ {${a}} remplac\xe9 par balise img`)):(console.log(`[HTML Generator] ⚠️ {${a}} est vide ou undefined, suppression de la balise`),H=H.replace(b,""))}}),console.log("[HTML Generator] Variables disponibles pour logos:",{ecole_logo:G.ecole_logo?`${String(G.ecole_logo).substring(0,50)}...`:"undefined",organization_logo:G.organization_logo?`${String(G.organization_logo).substring(0,50)}...`:"undefined",organisation_logo:G.organisation_logo?`${String(G.organisation_logo).substring(0,50)}...`:"undefined"});let K=["ecole_logo","organization_logo","organisation_logo"].map(a=>{let b=G[a];return b&&"string"==typeof b&&b.includes("supabase.co")?{key:a,url:b}:null}).filter(Boolean);console.log("[HTML Generator] URLs de logo trouvées:",K.length),K.forEach(({key:a,url:b})=>{let c=0,d=b.length,e=[];for(;-1!==(c=H.indexOf(b,c));){let b=H.substring(Math.max(0,c-300),c);H.substring(c+d,Math.min(H.length,c+d+100));let f=/src\s*=\s*"[^"]*$/.test(b),g=/href\s*=\s*"[^"]*$/.test(b);f||g||(e.push({start:c,end:c+d,key:a}),console.log(`[HTML Generator] 🔄 URL texte d\xe9tect\xe9e \xe0 l'offset ${c}, sera remplac\xe9e par balise img`)),c+=d}for(let a=e.length-1;a>=0;a--){let{start:b,end:c,key:d}=e[a],f=`<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${d}}" />`;H=H.substring(0,b)+f+H.substring(c),console.log(`[HTML Generator] ✅ URL texte remplac\xe9e par balise img avec data-logo-var="{${d}}"`)}e.length>0&&console.log(`[HTML Generator] ✅ ${e.length} URL(s) texte remplac\xe9e(s) par des balises img`)}),console.log("[HTML Generator] Traitement des logos - Header avant (premiers 500 chars):",H.substring(0,500)),console.log("[HTML Generator] Header contient data-logo-var?",H.includes("data-logo-var")),console.log("[HTML Generator] Header contient URL supabase?",H.includes("supabase.co"));try{H=await k(H,G),console.log("[HTML Generator] Traitement des logos - Header après (premiers 500 chars):",H.substring(0,500)),console.log("[HTML Generator] Header après contient data:image?",H.includes("data:image")),console.log("[HTML Generator] Header après contient URL supabase?",H.includes("supabase.co"))}catch(a){console.error("[HTML Generator] Erreur lors du traitement des logos dans le header:",a),a instanceof Error&&(console.error("[HTML Generator] Message:",a.message),console.error("[HTML Generator] Stack:",a.stack))}try{I=await k(I,G)}catch(a){console.error("[HTML Generator] Erreur lors du traitement des logos dans le content:",a)}try{J=await k(J,G)}catch(a){console.error("[HTML Generator] Erreur lors du traitement des logos dans le footer:",a)}H=c(H,G),I=c(I,G),J=c(J,G),n=H,H=n,o=I,I=o,p=J,J=p,H=(0,b.evaluateConditionalContent)(H,G),I=(0,b.evaluateConditionalContent)(I,G),J=(0,b.evaluateConditionalContent)(J,G),q=H,H=q,r=I,I=r,s=J,J=s,t=H,H=t,u=I,I=u,v=J,J=v,H=e(H,G),I=e(I,G),J=e(J,G),w=H,H=w,x=I,I=x,y=J,J=y,H=await g(H,G,j),I=await g(I,G,j),J=await g(J,G,j),H=await h(H,G,j),I=await h(I,G,j),J=await h(J,G,j),H=l(H,G),I=l(I,G),J=l(J,G);let L=a=>a.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g,a=>{let b=a.slice(1,-1);return"IF"===b||"ELSE"===b||"ENDIF"===b?a:""});H=L(H),I=L(I),J=L(J),H=i(H,G),I=i(I,G),J=i(J,G),J=`
    <div style="padding: 12px 0 8px 0; margin-top: 25px; background-color: #FAFAFA; font-family: 'Times New Roman', Times, serif;">
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #1A1A1A; margin: 0; text-align: center; font-weight: 500; line-height: 1.4;">
        ${G.ecole_nom||G.organization_name||""} | ${G.ecole_adresse||G.organization_address||""} ${G.ecole_ville||""} ${G.ecole_code_postal||""} | Num\xe9ro SIRET: ${G.ecole_siret||""}
      </p>
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 4px 0 0 0; text-align: center; line-height: 1.3;">
        Num\xe9ro de d\xe9claration d'activit\xe9: ${G.ecole_numero_declaration||""} <em>(aupr\xe8s du pr\xe9fet de r\xe9gion de: ${G.ecole_region||""})</em>
      </p>
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #888; font-style: italic; margin: 3px 0 0 0; text-align: center; line-height: 1.3;">
        Cet enregistrement ne vaut pas l'agr\xe9ment de l'\xc9tat.
      </p>
    </div>
  `,a.content?.pageSize||a.page_size;let M={top:15,right:15,bottom:15,left:15},N=a.margins||M,O={top:N.top??M.top,right:N.right??M.right,bottom:N.bottom??M.bottom,left:N.left??M.left},P=3.78*O.top,Q=3.78*O.bottom,R=3.78*O.left,S=3.78*O.right,T=3.78*E,U=3.78*F,V=C?P+T+5:P,W=D?Q+U+5:Q,X=1123-V-W;console.log("[HTML Generator] Building full HTML:",{hasHeader:C&&H.length>0,headerLength:H.length,headerHeight:E,headerHeightPx:T,hasFooter:D&&J.length>0,footerLength:J.length,footerHeight:F,footerHeightPx:U,margins:O,marginTopPx:P,marginBottomPx:Q,marginLeftPx:R,marginRightPx:S,pageWidthPx:794,pageHeightPx:1123,contentWidthPx:794-R-S,contentTopPxFirstPage:V,contentBottomPx:W,contentHeightPx:X,headerRepeatOnAllPages:!1,footerRepeatOnAllPages:!0});let Y=`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${a.name||"Document"}</title>
  <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
  <style>
    /* Paged.js - D\xe9finition de la page physique A4 */
    @page {
      size: A4;
      margin-top: ${O.top}mm;
      margin-bottom: ${D?F+5:O.bottom}mm;
      margin-left: ${O.left}mm;
      margin-right: ${O.right}mm;
      
      /* Footer sur toutes les pages */
      ${D?`@bottom-center {
        content: element(footerEnv);
      }`:""}
    }
    @page:first {
      margin-top: ${C?E+5:O.top}mm;
      
      /* Header uniquement sur la premi\xe8re page */
      ${C?`@top-center {
        content: element(headerEnv);
      }`:""}
      ${D?`@bottom-center {
        content: element(footerEnv);
      }`:""}
    }
    
    /* Style de l'En-t\xeate HTML - Extrait du flux normal */
    ${C?`.document-header {
      position: running(headerEnv);
      width: 100%;
      background: #ffffff;
      padding: 0;
      margin: 0;
      font-size: ${.85*(a.font_size||10)}pt;
      line-height: 1.2;
    }`:""}
    
    /* Style du Pied de page HTML - Extrait du flux normal */
    ${D?`.document-footer {
      position: running(footerEnv);
      width: 100%;
      background: #ffffff;
      padding: 5px 0;
      margin: 0;
      font-size: ${.85*(a.font_size||10)}pt;
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
      font-size: ${a.font_size||10}pt;
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
      max-height: ${T-10}px !important;
      overflow: visible !important;
    }
    .header img {
      max-height: ${.6*T}px !important;
      width: auto !important;
    }
    /* Note: Le header sera visible uniquement sur la premi\xe8re page lors de la g\xe9n\xe9ration PDF
       si repeatOnAllPages est false, car html2canvas capture le document en une seule fois */
    .content {
      position: relative !important;
      top: auto !important;
      bottom: auto !important;
      left: ${R}px !important;
      right: ${S}px !important;
      width: calc(100% - ${R+S}px) !important;
      min-height: ${X}px !important;
      max-height: none !important;
      background: #ffffff !important;
      overflow: visible !important;
      padding: 10px 0 ${D?U+Q+20:20}px 0 !important;
      margin: ${C?T+P+5:P}px 0 0 0 !important;
      z-index: 1 !important;
    }
    .footer * {
      max-height: ${U-10}px !important;
      overflow: visible !important;
    }
    .footer img {
      max-height: ${.6*U}px !important;
      width: auto !important;
    }
    /* Styles pour les tableaux */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      table-layout: auto;
      border-spacing: 0;
      font-size: ${.9*(a.font_size||10)}pt;
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
      font-size: ${.9*(a.font_size||10)}pt;
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
      font-size: ${a.font_size||10}pt;
      line-height: 1.4;
    }
    h1 {
      font-size: ${1.6*(a.font_size||10)}pt;
      line-height: 1.3;
      margin-bottom: 8px;
      margin-top: 12px;
    }
    h2 {
      font-size: ${1.4*(a.font_size||10)}pt;
      line-height: 1.3;
      margin-bottom: 6px;
      margin-top: 10px;
    }
    h3 {
      font-size: ${1.2*(a.font_size||10)}pt;
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
  ${C?`<header class="document-header">${H}</header>`:""}
  ${D&&J?`<footer class="document-footer">${J}</footer>`:""}
  <main class="document-content">
    ${I}
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
  `.trim(),Z=Math.max(1,Math.ceil(I.length/3e3));return console.log("[HTML Generator] ✅ Génération HTML réussie, longueur:",Y.length,"pages estimées:",Z),{html:Y,pageCount:Z}}catch(b){throw console.error("[HTML Generator] ❌ ERREUR lors de la génération HTML:",b),b instanceof Error&&(console.error("[HTML Generator] Message:",b.message),console.error("[HTML Generator] Stack:",b.stack),console.error("[HTML Generator] Name:",b.name)),console.error("[HTML Generator] Template info:",{id:a?.id,type:a?.type,name:a?.name,headerLength:a?.header?"string"==typeof a.header?a.header.length:JSON.stringify(a.header).length:0}),console.error("[HTML Generator] Variables keys:",Object.keys(f||{}).slice(0,20)),b}}a.s(["generateHTML",()=>m],789001)}];

//# sourceMappingURL=_615fde3a._.js.map