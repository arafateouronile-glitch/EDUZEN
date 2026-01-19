module.exports=[981838,e=>{"use strict";let t=new class{isDevelopment=!1;isProduction=!0;sentryEnabled=!0;initSentry(){this.sentryEnabled}constructor(){this.sentryEnabled&&this.initSentry()}error(t,r,n){let a={message:t,error:r instanceof Error?{name:r.name,message:r.message,stack:r.stack}:r,context:n,timestamp:new Date().toISOString(),level:"error"};this.isProduction&&this.sentryEnabled,this.isProduction&&t.includes("[CRITICAL]")&&e.A(789044).then(({alertService:e})=>{let i=r instanceof Error?r:Error(t);e.sendCriticalError(i,{context:n,timestamp:a.timestamp}).catch(e=>{this.isDevelopment&&console.error("Failed to send critical alert:",e)})}).catch(()=>{}),(this.isDevelopment||!this.isProduction)&&console.error("❌ [ERROR]",t,{error:r,context:n,timestamp:a.timestamp})}warn(e,t){let r={message:e,context:t,timestamp:new Date().toISOString(),level:"warn"};this.isDevelopment&&console.warn("⚠️ [WARN]",e,{context:t,timestamp:r.timestamp})}info(e,t){let r={message:e,context:t,timestamp:new Date().toISOString(),level:"info"};this.isDevelopment&&console.info("ℹ️ [INFO]",e,{context:t,timestamp:r.timestamp})}debug(e,t){this.isDevelopment&&console.debug("🐛 [DEBUG]",e,{context:t,timestamp:new Date().toISOString()})}apiError(e,t,r){this.error(`API Error: ${e}`,t,{...r,endpoint:e})}mutationError(e,t,r){this.error(`Mutation Error: ${e}`,t,{...r,mutationName:e})}queryError(e,t,r){this.error(`Query Error: ${e}`,t,{...r,queryKey:e})}};function r(e){if(!e)return"[NO_EMAIL]";let[t,r]=e.split("@");return r?`${t.substring(0,2)}***@${r}`:"[INVALID_EMAIL]"}function n(e){return e?e.substring(0,8)+"...":"[NO_ID]"}function a(e){return e?{message:e.message,code:e.code,name:e.name,...{}}:{}}e.s(["logger",0,t,"maskEmail",()=>r,"maskId",()=>n,"sanitizeError",()=>a])},338992,e=>{"use strict";let t=new class{async blobToBase64(e){return new Promise((t,r)=>{let n=new FileReader;n.onloadend=()=>{t(n.result.split(",")[1])},n.onerror=r,n.readAsDataURL(e)})}async sendEmail(e){try{let t=e.attachments?await Promise.all(e.attachments.map(async e=>{let t;if(e.content instanceof Blob)t=await this.blobToBase64(e.content);else if(e.content instanceof ArrayBuffer){let r=new Blob([e.content],{type:e.contentType});t=await this.blobToBase64(r)}else t=e.content;return{filename:e.filename,content:t,contentType:e.contentType}})):void 0,r=await fetch("/api/email/send",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({to:e.to,subject:e.subject,html:e.html,text:e.text,attachments:t,cc:e.cc,bcc:e.bcc,replyTo:e.replyTo})});if(!r.ok){let e=await r.json();throw Error(e.message||"Erreur lors de l'envoi de l'email")}let n=await r.json();return{success:!0,message:n.message||"Email envoyé avec succès"}}catch(e){throw Error(e instanceof Error?e.message:"Erreur lors de l'envoi de l'email")}}async sendDocument(e,t,r,n,a,i){return this.sendEmail({to:e,subject:t,html:a,text:i,attachments:[{filename:n,content:r,contentType:"application/pdf"}]})}async sendMultipleDocuments(e,t,r,n,a){return this.sendEmail({to:e,subject:t,html:n,text:a,attachments:r.map(e=>({filename:e.filename,content:e.blob,contentType:"application/pdf"}))})}};e.s(["emailService",0,t])},737492,e=>{"use strict";var t=e.i(981838),r=e.i(338992);class n{async sendAlert(e){let{level:r,title:n,message:a,details:i={},channel:s="email",recipients:o,organizationId:l}=e;try{t.logger["critical"===r||"error"===r?"error":"warn"](`[ALERT ${r.toUpperCase()}] ${n}: ${a}`,i);let o=[];("email"===s||"both"===s)&&o.push(this.sendEmailAlert(e)),("slack"===s||"both"===s)&&o.push(this.sendSlackAlert(e)),await Promise.allSettled(o)}catch(e){t.logger.error("Failed to send alert:",e)}}async sendEmailAlert(e){let{level:n,title:a,message:i,details:s,recipients:o,organizationId:l}=e,c=[];if(0===(c=o&&o.length>0?o:await this.getAdminEmails(l)).length)return void t.logger.warn("No email recipients found for alert");let d=`[${n.toUpperCase()}] ${a}`,m=this.buildEmailContent(n,a,i,s);for(let e of c)try{await r.emailService.sendEmail({to:e,subject:d,html:m})}catch(r){t.logger.error(`Failed to send alert email to ${e}:`,r)}}async sendSlackAlert(e){let{level:r,title:n,message:a,details:i,organizationId:s}=e,o=process.env.SLACK_WEBHOOK_URL;if(!o)return void t.logger.warn("SLACK_WEBHOOK_URL not configured, skipping Slack alert");try{let e={text:`*[${r.toUpperCase()}] ${n}*`,attachments:[{color:{info:"#36a64f",warning:"#ffa500",error:"#ff0000",critical:"#8b0000"}[r],fields:[{title:"Message",value:a,short:!1},...s?[{title:"Organization ID",value:s,short:!0}]:[],...i&&Object.keys(i).length>0?[{title:"Details",value:"```"+JSON.stringify(i,null,2)+"```",short:!1}]:[],{title:"Timestamp",value:new Date().toISOString(),short:!0}]}]},t=await fetch(o,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!t.ok)throw Error(`Slack API returned ${t.status}`)}catch(e){throw t.logger.error("Failed to send Slack alert:",e),e}}async getAdminEmails(e){let t=process.env.ADMIN_EMAILS?.split(",")||[];if(t.length>0)return t.filter(e=>e.trim().length>0);let r=process.env.SUPPORT_EMAIL;return r?[r]:[]}buildEmailContent(e,t,r,n){let a={info:"#36a64f",warning:"#ffa500",error:"#ff0000",critical:"#8b0000"}[e],i=new Date().toLocaleString("fr-FR",{dateStyle:"full",timeStyle:"long"});return`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${a}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .details { background-color: white; padding: 15px; margin-top: 15px; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            pre { background-color: #f4f4f4; padding: 10px; border-radius: 3px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>[${e.toUpperCase()}] ${t}</h2>
            </div>
            <div class="content">
              <p><strong>Message:</strong></p>
              <p>${r}</p>
              ${n&&Object.keys(n).length>0?`
                <div class="details">
                  <p><strong>D\xe9tails:</strong></p>
                  <pre>${JSON.stringify(n,null,2)}</pre>
                </div>
              `:""}
            </div>
            <div class="footer">
              <p>Alert g\xe9n\xe9r\xe9e le ${i}</p>
              <p>EDUZEN - Syst\xe8me de gestion scolaire</p>
            </div>
          </div>
        </body>
      </html>
    `}async sendCriticalError(e,t){await this.sendAlert({level:"critical",title:"Erreur Critique",message:e.message,details:{error:e.name,stack:e.stack,...t},channel:"both"})}async sendSystemError(e,t){await this.sendAlert({level:"error",title:"Erreur Système",message:e,details:t,channel:"email"})}async sendWarning(e,t){await this.sendAlert({level:"warning",title:"Avertissement",message:e,details:t,channel:"email"})}async sendInfo(e,t){await this.sendAlert({level:"info",title:"Information",message:e,details:t,channel:"email"})}}let a=new n;e.s(["AlertService",()=>n,"alertService",0,a])},789044,e=>{e.v(t=>Promise.all(["server/chunks/lib_1eef5d81._.js"].map(t=>e.l(t))).then(()=>t(737492)))}];

//# sourceMappingURL=lib_1eef5d81._.js.map