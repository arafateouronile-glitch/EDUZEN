module.exports=[895070,a=>{"use strict";let b=new class{isDevelopment=!1;isProduction=!0;sentryEnabled=!0;initSentry(){this.sentryEnabled}constructor(){this.sentryEnabled&&this.initSentry()}error(b,c,d){let e={message:b,error:c instanceof Error?{name:c.name,message:c.message,stack:c.stack}:c,context:d,timestamp:new Date().toISOString(),level:"error"};this.isProduction&&this.sentryEnabled,this.isProduction&&b.includes("[CRITICAL]")&&a.A(1018).then(({alertService:a})=>{let f=c instanceof Error?c:Error(b);a.sendCriticalError(f,{context:d,timestamp:e.timestamp}).catch(a=>{this.isDevelopment&&console.error("Failed to send critical alert:",a)})}).catch(()=>{}),(this.isDevelopment||!this.isProduction)&&console.error("❌ [ERROR]",b,{error:c,context:d,timestamp:e.timestamp})}warn(a,b){let c={message:a,context:b,timestamp:new Date().toISOString(),level:"warn"};this.isDevelopment&&console.warn("⚠️ [WARN]",a,{context:b,timestamp:c.timestamp})}info(a,b){let c={message:a,context:b,timestamp:new Date().toISOString(),level:"info"};this.isDevelopment&&console.info("ℹ️ [INFO]",a,{context:b,timestamp:c.timestamp})}debug(a,b){this.isDevelopment&&console.debug("🐛 [DEBUG]",a,{context:b,timestamp:new Date().toISOString()})}apiError(a,b,c){this.error(`API Error: ${a}`,b,{...c,endpoint:a})}mutationError(a,b,c){this.error(`Mutation Error: ${a}`,b,{...c,mutationName:a})}queryError(a,b,c){this.error(`Query Error: ${a}`,b,{...c,queryKey:a})}};a.s(["logger",0,b])},137936,(a,b,c)=>{"use strict";Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"registerServerReference",{enumerable:!0,get:function(){return d.registerServerReference}});let d=a.r(211857)},713095,(a,b,c)=>{"use strict";function d(a){for(let b=0;b<a.length;b++){let c=a[b];if("function"!=typeof c)throw Object.defineProperty(Error(`A "use server" file can only export async functions, found ${typeof c}.
Read more: https://nextjs.org/docs/messages/invalid-use-server-value`),"__NEXT_ERROR_CODE",{value:"E352",enumerable:!1,configurable:!0})}}Object.defineProperty(c,"__esModule",{value:!0}),Object.defineProperty(c,"ensureServerEntryExports",{enumerable:!0,get:function(){return d}})},75120,a=>{"use strict";var b=a.i(137936),c=a.i(895070);async function d(){try{let{createClient:b}=await a.A(224312),c=await b();return{getSignaturesByDocument:async a=>{let{data:b,error:d}=await c.from("document_signatures").select(`
              *,
              signer:users!document_signatures_signer_id_fkey(id, full_name, email, role)
            `).eq("document_id",a).eq("status","signed").order("signed_at",{ascending:!0});if(d)throw d;return b||[]}}}catch(a){return console.warn("Impossible d'importer createClient côté serveur:",a),{getSignaturesByDocument:async()=>[]}}}async function e(a,b={},f){try{let e=Array.from(a.matchAll(/<signature-field\s+([^>]*?)\/>/gi));if(0===e.length)return a;let g=[];if(f)try{let a=await d();g=await a.getSignaturesByDocument(f)}catch(a){c.logger.warn("Erreur lors du chargement des signatures",{documentId:f,error:a instanceof Error?a.message:String(a)})}let h=a;for(let a of e){let c=a[0],d=a[1],e=function(a){let b,c={},d=/(\w+(?:-\w+)*)="([^"]*?)"|(\w+(?:-\w+)*)='([^']*?)'|(\w+(?:-\w+)*)=(\S+)/g;for(;null!==(b=d.exec(a));){let a=b[1]||b[3]||b[5],d=b[2]||b[4]||b[6];a&&d&&(c[a]=d)}return{id:c.id||`signature-${Date.now()}`,type:c.type||"signature",label:c.label,required:"true"===c.required,signerRole:c["signer-role"],signerEmail:c["signer-email"],width:c.width?parseInt(c.width):200,height:c.height?parseInt(c.height):80,page:c.page?parseInt(c.page):1}}(d),f=g.find(a=>!!e.signerRole&&a.signer_role===e.signerRole||!!e.signerEmail&&a.signer_email===e.signerEmail),i=f?function(a,b){let c=b.width||200,d=b.height||80;if("date"===b.type){let c=a.signed_at?new Date(a.signed_at).toLocaleDateString("fr-FR",{year:"numeric",month:"long",day:"numeric"}):"";return`
      <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
        ${b.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${b.label}</p>`:""}
        <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px 12px; background-color: #f0fdf4; display: inline-block;">
          <p style="margin: 0; font-size: 11pt; color: #047857; font-weight: 500;">${c}</p>
        </div>
      </div>
    `}return"text"===b.type&&a.comment?`
      <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
        ${b.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${b.label}</p>`:""}
        <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px 12px; background-color: #f0fdf4; display: inline-block; min-width: ${c}px;">
          <p style="margin: 0; font-size: 11pt; color: #047857;">${a.comment}</p>
        </div>
      </div>
    `:`
    <div class="signature-field signed" style="display: inline-block; margin: 10px 0;">
      ${b.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${b.label}</p>`:""}
      <div style="border: 1px solid #10b981; border-radius: 4px; padding: 8px; background-color: #f0fdf4; display: inline-block;">
        <img
          src="${a.signature_data}"
          alt="Signature de ${a.signer_name||"utilisateur"}"
          style="max-width: ${c}px; max-height: ${d}px; display: block;"
        />
        <p style="margin: 8px 0 0 0; font-size: 9pt; color: #047857; text-align: center;">
          Sign\xe9 par ${a.signer_name||"utilisateur"} le ${new Date(a.signed_at).toLocaleDateString("fr-FR")}
        </p>
      </div>
    </div>
  `}(f,e):function(a,b){let c=a.width||200,d=a.height||80,e=a.id.replace(/-/g,"_"),f=b[e]||b[`signature_${e}`];return f&&"string"==typeof f?f.startsWith("data:image")||f.startsWith("http")?`
        <div class="signature-field filled-from-variable" style="display: inline-block; margin: 10px 0;">
          ${a.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${a.label}</p>`:""}
          <div style="border: 1px solid #3b82f6; border-radius: 4px; padding: 8px; background-color: #eff6ff; display: inline-block;">
            <img
              src="${f}"
              alt="${a.label||"Signature"}"
              style="max-width: ${c}px; max-height: ${d}px; display: block;"
            />
          </div>
        </div>
      `:`
      <div class="signature-field filled-from-variable" style="display: inline-block; margin: 10px 0;">
        ${a.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${a.label}</p>`:""}
        <div style="border: 1px solid #3b82f6; border-radius: 4px; padding: 8px 12px; background-color: #eff6ff; display: inline-block; min-width: ${c}px;">
          <p style="margin: 0; font-size: 11pt; color: #1e40af;">${f}</p>
        </div>
      </div>
    `:"date"===a.type?`
      <div class="signature-field empty" style="display: inline-block; margin: 10px 0;">
        ${a.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${a.label}${a.required?' <span style="color: #ef4444;">*</span>':""}</p>`:""}
        <div style="border: 2px dashed #d1d5db; border-radius: 4px; padding: 8px 12px; background-color: #f9fafb; display: inline-block; min-width: 150px;">
          <p style="margin: 0; font-size: 10pt; color: #9ca3af; text-align: center;">Date \xe0 remplir</p>
        </div>
      </div>
    `:"text"===a.type?`
      <div class="signature-field empty" style="display: inline-block; margin: 10px 0; width: 100%; max-width: 400px;">
        ${a.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${a.label}${a.required?' <span style="color: #ef4444;">*</span>':""}</p>`:""}
        <div style="border: 2px dashed #d1d5db; border-radius: 4px; padding: 12px; background-color: #f9fafb; min-height: 60px;">
          <p style="margin: 0; font-size: 10pt; color: #9ca3af;">Texte \xe0 remplir</p>
        </div>
      </div>
    `:`
    <div class="signature-field empty" style="display: inline-block; margin: 10px 0;">
      ${a.label?`<p style="font-size: 10pt; color: #666; margin: 0 0 5px 0;">${a.label}${a.required?' <span style="color: #ef4444;">*</span>':""}</p>`:""}
      <div style="border: 2px dashed #d1d5db; border-radius: 4px; padding: 12px; background-color: #f9fafb; width: ${c}px; height: ${d}px; display: flex; align-items: center; justify-content: center;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" style="opacity: 0.5;">
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          <path d="M3 20.05V5.5a2.5 2.5 0 0 1 5 0V20.05" />
          <path d="M7 13.5h9.5" />
          <path d="M20 20.5V10.5a2.5 2.5 0 0 0-5 0V20.5" />
        </svg>
      </div>
      ${a.signerRole||a.signerEmail?`<p style="margin: 5px 0 0 0; font-size: 9pt; color: #6b7280;">${a.signerRole||a.signerEmail}</p>`:""}
    </div>
  `}(e,b);h=h.replace(c,i)}return h}catch(b){return c.logger.error("Erreur lors du traitement des signatures",b instanceof Error?b:Error(String(b)),{documentId:f}),a}}(0,a.i(713095).ensureServerEntryExports)([e]),(0,b.registerServerReference)(e,"70bafc011444c60487d1ee4847afd169e191567030",null),a.s(["processSignatures",()=>e])},73604,a=>{"use strict";var b=a.i(75120);a.s([],322923),a.i(322923),a.s(["70bafc011444c60487d1ee4847afd169e191567030",()=>b.processSignatures],73604)},1018,a=>{a.v(b=>Promise.all(["server/chunks/ssr/lib_services_alert_service_ts_2d0142e7._.js"].map(b=>a.l(b))).then(()=>b(756424)))},224312,a=>{a.v(b=>Promise.all(["server/chunks/ssr/_587fb1da._.js"].map(b=>a.l(b))).then(()=>b(998310)))}];

//# sourceMappingURL=_9a754014._.js.map