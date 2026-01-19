module.exports=[162036,e=>{"use strict";var t=e.i(494438),o=e.i(738654),r=e.i(498741),a=e.i(861353),n=e.i(573172),s=e.i(953530),i=e.i(788734),l=e.i(338021),g=e.i(480180),c=e.i(159091);async function p(e){try{if(e.startsWith("data:"))return console.log(`[convertImageUrlToBase64] URL d\xe9j\xe0 en base64`),e;if(!e||!e.trim())return console.warn("[convertImageUrlToBase64] URL vide"),null;console.log(`[convertImageUrlToBase64] T\xe9l\xe9chargement de l'image depuis: ${e.substring(0,80)}...`);let t=new AbortController,o=setTimeout(()=>t.abort(),1e4);try{let r=await fetch(e,{headers:{Accept:"image/*"},signal:t.signal});if(clearTimeout(o),!r.ok)return console.warn(`[convertImageUrlToBase64] \xc9chec du t\xe9l\xe9chargement: ${r.status} ${r.statusText}`),null;let a=await r.arrayBuffer(),n=Buffer.from(a).toString("base64"),s=r.headers.get("content-type")||"image/png",i=`data:${s};base64,${n}`;return console.log(`[convertImageUrlToBase64] ✅ Image convertie en base64 (${i.substring(0,50)}..., taille: ${n.length} caract\xe8res)`),i}catch(e){return clearTimeout(o),e instanceof Error&&"AbortError"===e.name?console.error(`[convertImageUrlToBase64] Timeout lors du t\xe9l\xe9chargement`):console.error("[convertImageUrlToBase64] Erreur fetch:",e),null}}catch(e){return console.error("[convertImageUrlToBase64] Erreur lors de la conversion:",e),null}}async function d(e,t){if(!e||"string"!=typeof e)return e;let o=e,r=["ecole_logo","organization_logo"];for(let a of(console.log("[processLogos] Début du traitement, longueur HTML:",e.length),console.log("[processLogos] Variables disponibles:",Object.keys(t).filter(e=>r.includes(e))),r.forEach(e=>{let r=t[e]&&String(t[e]).trim()?String(t[e]):null;if(r&&r.includes("supabase.co")){let t=r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),a=!1,n=RegExp(t,"gi"),s=[...o.matchAll(n)];for(let t=s.length-1;t>=0;t--){let n=s[t];if(!n.index)continue;let i=n.index,l=o.substring(Math.max(0,i-150),i);o.substring(i+r.length,Math.min(o.length,i+r.length+50));let g=l.match(/src\s*=\s*"[^"]*$/),c=l.match(/href\s*=\s*"[^"]*$/),p=l.match(/<img[^>]*$/);if(!g&&!c)if(p)continue;else console.log(`[processLogos] 🔄 Remplacement URL texte par balise img \xe0 l'offset ${i}`),a=!0,o=o.substring(0,i)+`<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${e}}" />`+o.substring(i+r.length)}a&&console.log(`[processLogos] ✅ URLs textuelles remplac\xe9es par des balises img avec data-logo-var`)}}),[...r,"organisation_logo"])){let e=t[a]&&String(t[a]).trim()?String(t[a]):null;if(console.log(`[processLogos] Traitement de ${a}, logoValue:`,e?`${e.substring(0,50)}...`:"null"),e){let t=a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),r=!1;for(let e of[`<img([^>]*?)data-logo-var\\s*=\\s*"\\{${t}\\}"([^>]*?)>`,`<img([^>]*?)\\s+data-logo-var\\s*=\\s*"\\{${t}\\}"([^>]*?)>`,`<img[^>]*?data-logo-var\\s*=\\s*"\\{${t}\\}"[^>]*?>`]){let t=RegExp(e,"gi"),a=o.match(t);if(a&&a.length>0){console.log(`[processLogos] ✅ Pattern trouv\xe9: ${e.substring(0,80)}...`),console.log(`[processLogos] Nombre de correspondances: ${a.length}`),console.log("[processLogos] Exemples:",a.slice(0,2).map(e=>e.substring(0,150))),r=!0;break}}if(!r&&(console.warn(`[processLogos] ⚠️ Aucune balise logo trouv\xe9e avec ${a}`),o.includes("data-logo-var"))){console.warn(`[processLogos] ⚠️ data-logo-var trouv\xe9 dans le HTML mais pattern ne correspond pas`);let e=o.indexOf("data-logo-var");console.warn("[processLogos] Extrait HTML:",o.substring(Math.max(0,e-50),Math.min(o.length,e+200)))}let n=RegExp(`<img([^>]*?)data-logo-var\\s*=\\s*"\\{${t}\\}"([^>]*?)>`,"gi"),s=e;if(e&&(e.includes("supabase.co")||e.startsWith("http"))){console.log(`[processLogos] Conversion de l'URL en base64 pour ${a}...`);try{let t=await p(e);t?(s=t,console.log(`[processLogos] ✅ Image convertie en base64 avec succ\xe8s`)):console.warn(`[processLogos] ⚠️ \xc9chec de la conversion en base64, utilisation de l'URL originale`)}catch(e){console.error(`[processLogos] ❌ Erreur lors de la conversion en base64:`,e)}}else console.log(`[processLogos] URL ne n\xe9cessite pas de conversion (pas une URL HTTP/Supabase)`);o=o.replace(n,(e,t,o)=>{console.log(`[processLogos] ✅ Correspondance trouv\xe9e:`,e.substring(0,150));let r=(t+" "+o).trim(),a=e.match(/style\s*=\s*"([^"]*)"/),n=a?a[1]:"",i=e.match(/alt\s*=\s*"([^"]*)"/),l=i?i[1]:"Logo",g=r.replace(/\s+src\s*=\s*"[^"]*"/g,"").replace(/\s+data-logo-var\s*=\s*"[^"]*"/g,"").trim(),c=`<img src="${s}" alt="${l}"${g?" "+g:""} style="${n}">`;return console.log(`[processLogos] ✅ Remplacement effectu\xe9:`,c.substring(0,150)),c})}else{console.log(`[processLogos] Pas de logo pour ${a}, masquage de l'image`);let e=a.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");o=o.replace(RegExp(`<img([^>]*?)data-logo-var\\s*=\\s*"\\{${e}\\}"([^>]*?)>`,"gi"),(e,t,o)=>{let r=e.match(/style\s*=\s*"([^"]*)"/),n=r?r[1]:"";return`<img${t} data-logo-var="{${a}}"${o} style="${n}; display: none;">`})}}return r.forEach(e=>{let r=t[e];if(r&&"string"==typeof r&&r.trim()){let t=r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),a=RegExp(`(?!<img[^>]*src\\s*=\\s*"[^"]*${t}[^"]*"[^>]*>)${t}(?![^<]*</img>)`,"gi");o!==(o=o.replace(a,(e,t)=>{let r=o.substring(Math.max(0,t-50),t),a=o.substring(t+e.length,Math.min(o.length,t+e.length+50));return(r+e+a).match(/src\s*=\s*"[^"]*$/)?e:(console.log(`[processLogos] 🗑️ Suppression de l'URL texte du logo: ${e.substring(0,80)}...`),"")}))&&console.log(`[processLogos] ✅ URLs textuelles supprim\xe9es pour ${e}`)}}),o}function m(e,t){let o=e;o=(o=o.replace(/<img([^>]*?)class="qr-code-dynamic"([^>]*?)data-qr-data="([^"]*)"([^>]*?)>/g,(e,o,r,a,n)=>{let s=a;Object.entries(t).forEach(([e,t])=>{let o=RegExp(`\\{${e}\\}`,"g");s=s.replace(o,String(t))});let i=e.match(/max-width:\s*(\d+)px/),l=i?i[1]:"200",g=`https://api.qrserver.com/v1/create-qr-code/?size=${l}x${l}&data=${encodeURIComponent(s)}`;return`<img${o}${r}src="${g}" data-qr-data="${s}"${n}>`})).replace(/<img([^>]*?)class="barcode-dynamic"([^>]*?)data-barcode-data="([^"]*)"([^>]*?)data-barcode-type="([^"]*)"([^>]*?)>/g,(e,o,r,a,n,s,i)=>{let l=a;Object.entries(t).forEach(([e,t])=>{let o=RegExp(`\\{${e}\\}`,"g");l=l.replace(o,String(t))});let g=e.match(/max-width:\s*(\d+)px/),c=e.match(/height:\s*(\d+)px/);g&&g[1],c&&c[1];let p=`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(l)}&code=${s}&dpi=96&dataseparator=`;return`<img${o}${r}src="${p}" data-barcode-data="${l}"${n}data-barcode-type="${s}"${i}>`});let r=["ecole_logo","organization_logo","organisation_logo"];return Object.keys(t).filter(e=>!r.includes(e)).sort((e,t)=>t.length-e.length).forEach(e=>{let r=t[e],a=e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),n=RegExp(`\\{${a}\\}`,"g"),s=null==r?"":String(r).replace(/</g,"&lt;").replace(/>/g,"&gt;");o=o.replace(n,(e,t)=>{let r=o.substring(Math.max(0,t-100),t),a=o.substring(t+e.length,Math.min(o.length,t+e.length+100));return r.includes("data-logo-var")||a.includes("data-logo-var")?e:s})}),o=(o=o.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g,e=>{let t=e.slice(1,-1);return"IF"===t||"ELSE"===t||"ENDIF"===t?e:""})).replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\s+&&\s+[^}]*\}/g,"")}async function h(e,p,h,u){try{console.log("[HTML Generator] Début de la génération HTML"),console.log("[HTML Generator] Template:",{id:e.id,type:e.type,name:e.name,hasHeader:!!e.header,headerType:typeof e.header});let u="";if(e.content){let t=e.content;console.log("[HTML Generator] Template content structure:",{hasHtml:!!t.html,htmlLength:t.html?.length||0,hasElements:!!t.elements,elementsCount:t.elements?.length||0}),t.html?(u=t.html,console.log("[HTML Generator] Using content.html, length:",u.length)):t.elements&&Array.isArray(t.elements)&&t.elements.length>0&&(u=t.elements.map(e=>e.content||"").filter(e=>e&&e.trim()).join("\n"),console.log("[HTML Generator] Using content.elements, length:",u.length))}else console.warn("[HTML Generator] Template content is null or undefined");u&&0!==u.trim().length||(console.warn("[HTML Generator] Template content is empty after extraction, template:",{id:e.id,type:e.type,name:e.name}),u="");let f=(0,s.flattenVariables)(p),x=e.header?.content||"",b=`
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
  `,$=e.header_enabled??!0,y=e.footer_enabled??!0,L=e.header?.height||e.header_height||30,v=e.footer?.height||e.footer_height||20;if(console.log("[HTML Generator] Header/Footer config:",{headerEnabled:$,headerContentLength:x.length,headerContent:x.substring(0,100),footerEnabled:y,footerContentLength:b.length,footerContent:b.substring(0,100),templateHeader:e.header,templateFooter:e.footer}),$&&(!x||0===x.trim().length)){let e,t,o,r,a,n,s;e=f.ecole_nom||f.organization_name||"",t=f.ecole_adresse||f.organization_address||"",o=f.ecole_code_postal||"",r=f.ecole_ville||"",a=f.ecole_email||f.organization_email||"",n=f.ecole_telephone||f.organization_phone||"",s=f.ecole_logo||f.organization_logo||"",x=`
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0 0 15px 0; border-bottom: 2px solid #1A1A1A; margin-bottom: 20px;">
      <div style="flex: 1;">
        <p style="font-weight: bold; font-size: 14pt; margin: 0; color: #1A1A1A; line-height: 1.3;">${e}</p>
        ${t?`<p style="font-size: 9pt; color: #666; margin: 4px 0 0 0; line-height: 1.4;">${t}</p>`:""}
        ${o||r?`<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">${o} ${r}</p>`:""}
        ${a?`<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">Email : ${a}</p>`:""}
        ${n?`<p style="font-size: 9pt; color: #666; margin: 2px 0; line-height: 1.4;">Tel : ${n}</p>`:""}
      </div>
      ${s?`
      <div style="text-align: right; min-width: 100px;">
        <img src="${s}" alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" />
      </div>
      `:""}
    </div>
  `,console.log("[HTML Generator] Génération automatique de l'en-tête professionnel")}console.log("[HTML Generator] Header avant traitement (premiers 500 chars):",x.substring(0,500)),console.log("[HTML Generator] Header contient tableau?",x.includes("<table")),console.log("[HTML Generator] Header contient {ecole_logo}?",x.includes("{ecole_logo}"));let T=(0,s.flattenVariables)(p),_=x,H=u,w=b;console.log("[HTML Generator] Header initial (premiers 800 chars):",x.substring(0,800)),console.log("[HTML Generator] Header contient {ecole_logo}?",_.includes("{ecole_logo}")),console.log("[HTML Generator] Header contient URL supabase comme texte?",x.includes("supabase.co")&&!x.includes('src="')),["ecole_logo","organization_logo","organisation_logo"].forEach(e=>{let t=RegExp(`\\{${e}\\}`,"g");if(_.includes(`{${e}}`)){let o=T[e];o&&String(o).trim()?(console.log(`[HTML Generator] 🔄 Remplacement de {${e}} par balise img avec data-logo-var`),_=_.replace(t,`<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${e}}" />`),console.log(`[HTML Generator] ✅ {${e}} remplac\xe9 par balise img`)):(console.log(`[HTML Generator] ⚠️ {${e}} est vide ou undefined, suppression de la balise`),_=_.replace(t,""))}}),console.log("[HTML Generator] Variables disponibles pour logos:",{ecole_logo:T.ecole_logo?`${String(T.ecole_logo).substring(0,50)}...`:"undefined",organization_logo:T.organization_logo?`${String(T.organization_logo).substring(0,50)}...`:"undefined",organisation_logo:T.organisation_logo?`${String(T.organisation_logo).substring(0,50)}...`:"undefined"});let M=["ecole_logo","organization_logo","organisation_logo"].map(e=>{let t=T[e];return t&&"string"==typeof t&&t.includes("supabase.co")?{key:e,url:t}:null}).filter(Boolean);console.log("[HTML Generator] URLs de logo trouvées:",M.length),M.forEach(({key:e,url:t})=>{let o=0,r=t.length,a=[];for(;-1!==(o=_.indexOf(t,o));){let t=_.substring(Math.max(0,o-300),o);_.substring(o+r,Math.min(_.length,o+r+100));let n=/src\s*=\s*"[^"]*$/.test(t),s=/href\s*=\s*"[^"]*$/.test(t);n||s||(a.push({start:o,end:o+r,key:e}),console.log(`[HTML Generator] 🔄 URL texte d\xe9tect\xe9e \xe0 l'offset ${o}, sera remplac\xe9e par balise img`)),o+=r}for(let e=a.length-1;e>=0;e--){let{start:t,end:o,key:r}=a[e],n=`<img alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" data-logo-var="{${r}}" />`;_=_.substring(0,t)+n+_.substring(o),console.log(`[HTML Generator] ✅ URL texte remplac\xe9e par balise img avec data-logo-var="{${r}}"`)}a.length>0&&console.log(`[HTML Generator] ✅ ${a.length} URL(s) texte remplac\xe9e(s) par des balises img`)}),console.log("[HTML Generator] Traitement des logos - Header avant (premiers 500 chars):",_.substring(0,500)),console.log("[HTML Generator] Header contient data-logo-var?",_.includes("data-logo-var")),console.log("[HTML Generator] Header contient URL supabase?",_.includes("supabase.co"));try{_=await d(_,T),console.log("[HTML Generator] Traitement des logos - Header après (premiers 500 chars):",_.substring(0,500)),console.log("[HTML Generator] Header après contient data:image?",_.includes("data:image")),console.log("[HTML Generator] Header après contient URL supabase?",_.includes("supabase.co"))}catch(e){console.error("[HTML Generator] Erreur lors du traitement des logos dans le header:",e),e instanceof Error&&(console.error("[HTML Generator] Message:",e.message),console.error("[HTML Generator] Stack:",e.stack))}try{H=await d(H,T)}catch(e){console.error("[HTML Generator] Erreur lors du traitement des logos dans le content:",e)}try{w=await d(w,T)}catch(e){console.error("[HTML Generator] Erreur lors du traitement des logos dans le footer:",e)}_=(0,a.processDynamicTables)(_,T),H=(0,a.processDynamicTables)(H,T),w=(0,a.processDynamicTables)(w,T),_=(0,o.processLoops)(_,T),H=(0,o.processLoops)(H,T),w=(0,o.processLoops)(w,T),_=(0,t.evaluateConditionalContent)(_,T),H=(0,t.evaluateConditionalContent)(H,T),w=(0,t.evaluateConditionalContent)(w,T),_=(0,n.processElementVisibility)(_,T),H=(0,n.processElementVisibility)(H,T),w=(0,n.processElementVisibility)(w,T),_=(0,r.processCalculatedVariables)(_,T),H=(0,r.processCalculatedVariables)(H,T),w=(0,r.processCalculatedVariables)(w,T),_=(0,s.processNestedVariables)(_,T),H=(0,s.processNestedVariables)(H,T),w=(0,s.processNestedVariables)(w,T),_=(0,i.processDynamicHyperlinks)(_,T),H=(0,i.processDynamicHyperlinks)(H,T),w=(0,i.processDynamicHyperlinks)(w,T),_=await (0,l.processSignatures)(_,T,h),H=await (0,l.processSignatures)(H,T,h),w=await (0,l.processSignatures)(w,T,h),_=await (0,g.processAttachments)(_,T,h),H=await (0,g.processAttachments)(H,T,h),w=await (0,g.processAttachments)(w,T,h),_=m(_,T),H=m(H,T),w=m(w,T);let E=e=>e.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g,e=>{let t=e.slice(1,-1);return"IF"===t||"ELSE"===t||"ENDIF"===t?e:""});_=E(_),H=E(H),w=E(w),_=(0,c.processFormFields)(_,T),H=(0,c.processFormFields)(H,T),w=(0,c.processFormFields)(w,T),w=`
    <div style="padding: 12px 0 8px 0; margin-top: 25px; background-color: #FAFAFA; font-family: 'Times New Roman', Times, serif;">
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #1A1A1A; margin: 0; text-align: center; font-weight: 500; line-height: 1.4;">
        ${T.ecole_nom||T.organization_name||""} | ${T.ecole_adresse||T.organization_address||""} ${T.ecole_ville||""} ${T.ecole_code_postal||""} | Num\xe9ro SIRET: ${T.ecole_siret||""}
      </p>
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 4px 0 0 0; text-align: center; line-height: 1.3;">
        Num\xe9ro de d\xe9claration d'activit\xe9: ${T.ecole_numero_declaration||""} <em>(aupr\xe8s du pr\xe9fet de r\xe9gion de: ${T.ecole_region||""})</em>
      </p>
      <p style="font-size: 8pt; font-family: 'Times New Roman', Times, serif; color: #888; font-style: italic; margin: 3px 0 0 0; text-align: center; line-height: 1.3;">
        Cet enregistrement ne vaut pas l'agr\xe9ment de l'\xc9tat.
      </p>
    </div>
  `,e.content?.pageSize||e.page_size;let z={top:15,right:15,bottom:15,left:15},A=e.margins||z,G={top:A.top??z.top,right:A.right??z.right,bottom:A.bottom??z.bottom,left:A.left??z.left},R=3.78*G.top,k=3.78*G.bottom,U=3.78*G.left,S=3.78*G.right,j=3.78*L,F=3.78*v,C=$?R+j+5:R,P=y?k+F+5:k,I=1123-C-P;console.log("[HTML Generator] Building full HTML:",{hasHeader:$&&_.length>0,headerLength:_.length,headerHeight:L,headerHeightPx:j,hasFooter:y&&w.length>0,footerLength:w.length,footerHeight:v,footerHeightPx:F,margins:G,marginTopPx:R,marginBottomPx:k,marginLeftPx:U,marginRightPx:S,pageWidthPx:794,pageHeightPx:1123,contentWidthPx:794-U-S,contentTopPxFirstPage:C,contentBottomPx:P,contentHeightPx:I,headerRepeatOnAllPages:!1,footerRepeatOnAllPages:!0});let N=`
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
      margin-top: ${G.top}mm;
      margin-bottom: ${y?v+5:G.bottom}mm;
      margin-left: ${G.left}mm;
      margin-right: ${G.right}mm;
      
      /* Footer sur toutes les pages */
      ${y?`@bottom-center {
        content: element(footerEnv);
      }`:""}
    }
    @page:first {
      margin-top: ${$?L+5:G.top}mm;
      
      /* Header uniquement sur la premi\xe8re page */
      ${$?`@top-center {
        content: element(headerEnv);
      }`:""}
      ${y?`@bottom-center {
        content: element(footerEnv);
      }`:""}
    }
    
    /* Style de l'En-t\xeate HTML - Extrait du flux normal */
    ${$?`.document-header {
      position: running(headerEnv);
      width: 100%;
      background: #ffffff;
      padding: 0;
      margin: 0;
      font-size: ${.85*(e.font_size||10)}pt;
      line-height: 1.2;
    }`:""}
    
    /* Style du Pied de page HTML - Extrait du flux normal */
    ${y?`.document-footer {
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
      max-height: ${j-10}px !important;
      overflow: visible !important;
    }
    .header img {
      max-height: ${.6*j}px !important;
      width: auto !important;
    }
    /* Note: Le header sera visible uniquement sur la premi\xe8re page lors de la g\xe9n\xe9ration PDF
       si repeatOnAllPages est false, car html2canvas capture le document en une seule fois */
    .content {
      position: relative !important;
      top: auto !important;
      bottom: auto !important;
      left: ${U}px !important;
      right: ${S}px !important;
      width: calc(100% - ${U+S}px) !important;
      min-height: ${I}px !important;
      max-height: none !important;
      background: #ffffff !important;
      overflow: visible !important;
      padding: 10px 0 ${y?F+k+20:20}px 0 !important;
      margin: ${$?j+R+5:R}px 0 0 0 !important;
      z-index: 1 !important;
    }
    .footer * {
      max-height: ${F-10}px !important;
      overflow: visible !important;
    }
    .footer img {
      max-height: ${.6*F}px !important;
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
  ${$?`<header class="document-header">${_}</header>`:""}
  ${y&&w?`<footer class="document-footer">${w}</footer>`:""}
  <main class="document-content">
    ${H}
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
  `.trim(),V=Math.max(1,Math.ceil(H.length/3e3));return console.log("[HTML Generator] ✅ Génération HTML réussie, longueur:",N.length,"pages estimées:",V),{html:N,pageCount:V}}catch(t){throw console.error("[HTML Generator] ❌ ERREUR lors de la génération HTML:",t),t instanceof Error&&(console.error("[HTML Generator] Message:",t.message),console.error("[HTML Generator] Stack:",t.stack),console.error("[HTML Generator] Name:",t.name)),console.error("[HTML Generator] Template info:",{id:e?.id,type:e?.type,name:e?.name,headerLength:e?.header?"string"==typeof e.header?e.header.length:JSON.stringify(e.header).length:0}),console.error("[HTML Generator] Variables keys:",Object.keys(p||{}).slice(0,20)),t}}e.s(["generateHTML",()=>h])}];

//# sourceMappingURL=lib_utils_document-generation_html-generator_ts_a73d1fd6._.js.map