module.exports=[981838,e=>{"use strict";let r=new class{isDevelopment=!1;isProduction=!0;sentryEnabled=!0;initSentry(){this.sentryEnabled}constructor(){this.sentryEnabled&&this.initSentry()}error(r,t,i){let n={message:r,error:t instanceof Error?{name:t.name,message:t.message,stack:t.stack}:t,context:i,timestamp:new Date().toISOString(),level:"error"};this.isProduction&&this.sentryEnabled,this.isProduction&&r.includes("[CRITICAL]")&&e.A(789044).then(({alertService:e})=>{let s=t instanceof Error?t:Error(r);e.sendCriticalError(s,{context:i,timestamp:n.timestamp}).catch(e=>{this.isDevelopment&&console.error("Failed to send critical alert:",e)})}).catch(()=>{}),(this.isDevelopment||!this.isProduction)&&console.error("❌ [ERROR]",r,{error:t,context:i,timestamp:n.timestamp})}warn(e,r){let t={message:e,context:r,timestamp:new Date().toISOString(),level:"warn"};this.isDevelopment&&console.warn("⚠️ [WARN]",e,{context:r,timestamp:t.timestamp})}info(e,r){let t={message:e,context:r,timestamp:new Date().toISOString(),level:"info"};this.isDevelopment&&console.info("ℹ️ [INFO]",e,{context:r,timestamp:t.timestamp})}debug(e,r){this.isDevelopment&&console.debug("🐛 [DEBUG]",e,{context:r,timestamp:new Date().toISOString()})}apiError(e,r,t){this.error(`API Error: ${e}`,r,{...t,endpoint:e})}mutationError(e,r,t){this.error(`Mutation Error: ${e}`,r,{...t,mutationName:e})}queryError(e,r,t){this.error(`Query Error: ${e}`,r,{...t,queryKey:e})}};function t(e){if(!e)return"[NO_EMAIL]";let[r,t]=e.split("@");return t?`${r.substring(0,2)}***@${t}`:"[INVALID_EMAIL]"}function i(e){return e?e.substring(0,8)+"...":"[NO_ID]"}function n(e){return e?{message:e.message,code:e.code,name:e.name,...{}}:{}}e.s(["logger",0,r,"maskEmail",()=>t,"maskId",()=>i,"sanitizeError",()=>n])},997953,(e,r,t)=>{"use strict";r.exports=e.r(442315).vendored["react-rsc"].ReactServerDOMTurbopackServer},745015,(e,r,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"registerServerReference",{enumerable:!0,get:function(){return i.registerServerReference}});let i=e.r(997953)},195975,(e,r,t)=>{"use strict";function i(e){for(let r=0;r<e.length;r++){let t=e[r];if("function"!=typeof t)throw Object.defineProperty(Error(`A "use server" file can only export async functions, found ${typeof t}.
Read more: https://nextjs.org/docs/messages/invalid-use-server-value`),"__NEXT_ERROR_CODE",{value:"E352",enumerable:!1,configurable:!0})}}Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"ensureServerEntryExports",{enumerable:!0,get:function(){return i}})},338021,e=>{"use strict";var r=e.i(745015),t=e.i(981838);async function i(){try{let{createClient:r}=await e.A(74166),t=await r();return{getSignaturesByDocument:async e=>{let{data:r,error:i}=await t.from("document_signatures").select(`
              *,
              signer:users!document_signatures_signer_id_fkey(id, full_name, email, role)
            `).eq("document_id",e).eq("status","signed").order("signed_at",{ascending:!0});if(i)throw i;return r||[]}}}catch(e){return console.warn("Impossible d'importer createClient côté serveur:",e),{getSignaturesByDocument:async()=>[]}}}async function n(e,r={},s){try{let n=Array.from(e.matchAll(/<signature-field\s+([^>]*?)\/>/gi));if(0===n.length)return e;let a=[];if(s)try{let e=await i();a=await e.getSignaturesByDocument(s)}catch(e){t.logger.warn("Erreur lors du chargement des signatures",{documentId:s,error:e instanceof Error?e.message:String(e)})}let l=e;for(let e of n){let t=e[0],i=e[1],n=function(e){let r,t={},i=/(\w+(?:-\w+)*)="([^"]*?)"|(\w+(?:-\w+)*)='([^']*?)'|(\w+(?:-\w+)*)=(\S+)/g;for(;null!==(r=i.exec(e));){let e=r[1]||r[3]||r[5],i=r[2]||r[4]||r[6];e&&i&&(t[e]=i)}return{id:t.id||`signature-${Date.now()}`,type:t.type||"signature",label:t.label,required:"true"===t.required,signerRole:t["signer-role"],signerEmail:t["signer-email"],width:t.width?parseInt(t.width):200,height:t.height?parseInt(t.height):80,page:t.page?parseInt(t.page):1}}(i),s=a.find(e=>!!n.signerRole&&e.signer_role===n.signerRole||!!n.signerEmail&&e.signer_email===n.signerEmail),o=s?function(e,r){let t=r.width||200,i=r.height||80;if("date"===r.type){let t=e.signed_at?new Date(e.signed_at).toLocaleDateString("fr-FR",{year:"numeric",month:"long",day:"numeric"}):"";return`
      <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
        ${r.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${r.label}</p>`:""}
        <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px 12px; background-color: #f0fdf4; display: inline-block;">
          <p style="margin: 0; font-size: 11pt; color: #047857; font-weight: 500;">${t}</p>
        </div>
      </div>
    `}return"text"===r.type&&e.comment?`
      <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
        ${r.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${r.label}</p>`:""}
        <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px 12px; background-color: #f0fdf4; display: inline-block; min-width: ${t}px;">
          <p style="margin: 0; font-size: 11pt; color: #047857;">${e.comment}</p>
        </div>
      </div>
    `:`
    <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
      ${r.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${r.label}</p>`:""}
      <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px; background-color: #f0fdf4; display: inline-block;">
        <img
          src="${e.signature_data}"
          alt="Signature de ${e.signer_name||"utilisateur"}"
          style="max-width: ${t}px; max-height: ${i}px; display: block;"
        />
        <p style="margin: 8px 0 0 0; font-size: 9pt; color: #047857; text-align: center;">
          Sign\xe9 par ${e.signer_name||"utilisateur"} le ${new Date(e.signed_at).toLocaleDateString("fr-FR")}
        </p>
      </div>
    </div>
  `}(s,n):function(e,r){let t=e.width||200,i=e.height||80,n=e.id.replace(/-/g,"_"),s=r[n]||r[`signature_${n}`];return s&&"string"==typeof s?s.startsWith("data:image")||s.startsWith("http")?`
        <div class="signature-field filled-from-variable" style="display: inline-block; margin: 10px 0;">
          ${e.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${e.label}</p>`:""}
          <div style="border: 1px solid #3b82f6; border-radius: 4px; padding: 8px; background-color: #eff6ff; display: inline-block;">
            <img
              src="${s}"
              alt="${e.label||"Signature"}"
              style="max-width: ${t}px; max-height: ${i}px; display: block;"
            />
          </div>
        </div>
      `:`
      <div class="signature-field filled-from-variable" style="display: inline-block; margin: 10px 0;">
        ${e.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${e.label}</p>`:""}
        <div style="border: 1px solid #3b82f6; border-radius: 4px; padding: 8px 12px; background-color: #eff6ff; display: inline-block; min-width: ${t}px;">
          <p style="margin: 0; font-size: 11pt; color: #1e40af;">${s}</p>
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
      <div style="border: 2px dashed #d1d5db; border-radius: 4px; padding: 12px; background-color: #f9fafb; width: ${t}px; height: ${i}px; display: flex; align-items: center; justify-content: center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" style="opacity: 0.5;">
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <path d="M3 20.05V5.5a2.5 2.5 0 0 1 5 0V20.05" />
          <path d="M7 13.5h9.5" />
          <path d="M20 20.5V10.5a2.5 2.5 0 0 0-5 0V20.5" />
        </svg>
      </div>
      ${e.signerRole||e.signerEmail?`<p style="margin: 5px 0 0 0; font-size: 9pt; color: #6b7280;">${e.signerRole||e.signerEmail}</p>`:""}
    </div>
  `}(n,r);l=l.replace(t,o)}return l}catch(r){return t.logger.error("Erreur lors du traitement des signatures",r instanceof Error?r:Error(String(r)),{documentId:s}),e}}(0,e.i(195975).ensureServerEntryExports)([n]),(0,r.registerServerReference)(n,"70bafc011444c60487d1ee4847afd169e191567030",null),e.s(["processSignatures",()=>n])},789044,e=>{e.v(r=>Promise.all(["server/chunks/lib_5f693213._.js"].map(r=>e.l(r))).then(()=>r(737492)))},74166,e=>{e.v(r=>Promise.all(["server/chunks/node_modules_d8e54b2d._.js","server/chunks/node_modules_@supabase_supabase-js_dist_index_mjs_669a44bf._.js","server/chunks/_db7d6d15._.js"].map(r=>e.l(r))).then(()=>r(89660)))}];

//# sourceMappingURL=_6cf6feb3._.js.map