module.exports=[338992,e=>{"use strict";let t=new class{async blobToBase64(e){return new Promise((t,r)=>{let a=new FileReader;a.onloadend=()=>{t(a.result.split(",")[1])},a.onerror=r,a.readAsDataURL(e)})}async sendEmail(e){try{let t=e.attachments?await Promise.all(e.attachments.map(async e=>{let t;if(e.content instanceof Blob)t=await this.blobToBase64(e.content);else if(e.content instanceof ArrayBuffer){let r=new Blob([e.content],{type:e.contentType});t=await this.blobToBase64(r)}else t=e.content;return{filename:e.filename,content:t,contentType:e.contentType}})):void 0,r=await fetch("/api/email/send",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({to:e.to,subject:e.subject,html:e.html,text:e.text,attachments:t,cc:e.cc,bcc:e.bcc,replyTo:e.replyTo})});if(!r.ok){let e=await r.json();throw Error(e.message||"Erreur lors de l'envoi de l'email")}let a=await r.json();return{success:!0,message:a.message||"Email envoyé avec succès"}}catch(e){throw Error(e instanceof Error?e.message:"Erreur lors de l'envoi de l'email")}}async sendDocument(e,t,r,a,n,l){return this.sendEmail({to:e,subject:t,html:n,text:l,attachments:[{filename:a,content:r,contentType:"application/pdf"}]})}async sendMultipleDocuments(e,t,r,a,n){return this.sendEmail({to:e,subject:t,html:a,text:n,attachments:r.map(e=>({filename:e.filename,content:e.blob,contentType:"application/pdf"}))})}};e.s(["emailService",0,t])},737492,e=>{"use strict";var t=e.i(981838),r=e.i(338992);class a{async sendAlert(e){let{level:r,title:a,message:n,details:l={},channel:i="email",recipients:s,organizationId:o}=e;try{t.logger["critical"===r||"error"===r?"error":"warn"](`[ALERT ${r.toUpperCase()}] ${a}: ${n}`,l);let s=[];("email"===i||"both"===i)&&s.push(this.sendEmailAlert(e)),("slack"===i||"both"===i)&&s.push(this.sendSlackAlert(e)),await Promise.allSettled(s)}catch(e){t.logger.error("Failed to send alert:",e)}}async sendEmailAlert(e){let{level:a,title:n,message:l,details:i,recipients:s,organizationId:o}=e,c=[];if(0===(c=s&&s.length>0?s:await this.getAdminEmails(o)).length)return void t.logger.warn("No email recipients found for alert");let d=`[${a.toUpperCase()}] ${n}`,p=this.buildEmailContent(a,n,l,i);for(let e of c)try{await r.emailService.sendEmail({to:e,subject:d,html:p})}catch(r){t.logger.error(`Failed to send alert email to ${e}:`,r)}}async sendSlackAlert(e){let{level:r,title:a,message:n,details:l,organizationId:i}=e,s=process.env.SLACK_WEBHOOK_URL;if(!s)return void t.logger.warn("SLACK_WEBHOOK_URL not configured, skipping Slack alert");try{let e={text:`*[${r.toUpperCase()}] ${a}*`,attachments:[{color:{info:"#36a64f",warning:"#ffa500",error:"#ff0000",critical:"#8b0000"}[r],fields:[{title:"Message",value:n,short:!1},...i?[{title:"Organization ID",value:i,short:!0}]:[],...l&&Object.keys(l).length>0?[{title:"Details",value:"```"+JSON.stringify(l,null,2)+"```",short:!1}]:[],{title:"Timestamp",value:new Date().toISOString(),short:!0}]}]},t=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!t.ok)throw Error(`Slack API returned ${t.status}`)}catch(e){throw t.logger.error("Failed to send Slack alert:",e),e}}async getAdminEmails(e){let t=process.env.ADMIN_EMAILS?.split(",")||[];if(t.length>0)return t.filter(e=>e.trim().length>0);let r=process.env.SUPPORT_EMAIL;return r?[r]:[]}buildEmailContent(e,t,r,a){let n={info:"#36a64f",warning:"#ffa500",error:"#ff0000",critical:"#8b0000"}[e],l=new Date().toLocaleString("fr-FR",{dateStyle:"full",timeStyle:"long"});return`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${n}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
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
              ${a&&Object.keys(a).length>0?`
                <div class="details">
                  <p><strong>D\xe9tails:</strong></p>
                  <pre>${JSON.stringify(a,null,2)}</pre>
                </div>
              `:""}
            </div>
            <div class="footer">
              <p>Alert g\xe9n\xe9r\xe9e le ${l}</p>
              <p>EDUZEN - Syst\xe8me de gestion scolaire</p>
            </div>
          </div>
        </body>
      </html>
    `}async sendCriticalError(e,t){await this.sendAlert({level:"critical",title:"Erreur Critique",message:e.message,details:{error:e.name,stack:e.stack,...t},channel:"both"})}async sendSystemError(e,t){await this.sendAlert({level:"error",title:"Erreur Système",message:e,details:t,channel:"email"})}async sendWarning(e,t){await this.sendAlert({level:"warning",title:"Avertissement",message:e,details:t,channel:"email"})}async sendInfo(e,t){await this.sendAlert({level:"info",title:"Information",message:e,details:t,channel:"email"})}}let n=new a;e.s(["AlertService",()=>a,"alertService",0,n])}];

//# sourceMappingURL=lib_services_64af2586._.js.map